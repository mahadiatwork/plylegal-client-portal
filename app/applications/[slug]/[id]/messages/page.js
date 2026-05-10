"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useSnapshot } from "valtio";
import { applicationsStore } from "@/stores/applicationsStore";
import { authStore } from "@/stores/authStore";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { PillNav } from "@/components/PillNav";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Send, Loader2, RefreshCw } from "lucide-react";
import { auth } from "@/lib/firebase";

export default function MessagesPage() {
  const params = useParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const applicationsSnap = useSnapshot(applicationsStore);
  const authSnap = useSnapshot(authStore);
  const { toast } = useToast();
  const messagesEndRef = useRef(null);

  const appId = params.id;
  const slug = params.slug;
  const application = applicationsSnap.applications.find((app) => app.id === appId);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadMessages = async () => {
    if (!appId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsRefreshing(true);
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch(`/api/chat/messages?applicationId=${appId}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await response.json();

      if (data.success) {
        setMessages(data.messages || []);
      } else {
        console.error("Failed to load messages:", data.error);
        toast({
          title: "Error",
          description: data.error || "Failed to load messages",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error loading messages:", error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Load messages on mount and when dealId changes
  useEffect(() => {
    const loadData = async () => {
      try {
        if (!authSnap.isAuthenticated && !authSnap.user) {
          await authStore.checkSession();
        }

        const userId = authSnap.user?.id;
        if (!userId) {
          setIsLoading(false);
          return;
        }

        if (applicationsSnap.applications.length === 0) {
          await applicationsStore.loadApplications(userId);
        }

        await loadMessages();
      } catch (error) {
        console.error("Error loading data:", error);
        setIsLoading(false);
      }
    };

    loadData();
  }, [appId, authSnap.isAuthenticated, authSnap.user?.id]);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "";
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

      return date.toLocaleDateString("en-AU", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (_) {
      return "";
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!messageText.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message",
        variant: "destructive",
      });
      return;
    }

    if (!appId) {
      toast({
        title: "Error",
        description: "Application not found",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    // Optimistic UI — append the new message immediately as a chat bubble
    const optimisticBubble = {
      id: `temp-${Date.now()}`,
      senderRole: "client",
      senderUid: authSnap.user?.id,
      body: messageText.trim(),
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };
    setMessages((prev) => [...prev, optimisticBubble]);
    setMessageText("");

    try {
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch("/api/chat/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          applicationId: appId,
          body: optimisticBubble.body,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Reload to get canonical state from Firebase
        await loadMessages();
        toast({
          title: "Message sent",
          description: "Your message has been sent to Ply Legal.",
        });
      } else {
        // Rollback optimistic bubble on failure
        setMessages((prev) => prev.filter((m) => !m.isOptimistic));
        setMessageText(optimisticBubble.body);
        toast({
          title: "Error",
          description: data.error || "Failed to send message",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => prev.filter((m) => !m.isOptimistic));
      setMessageText(optimisticBubble.body);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading || !application) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-600" />
          <div className="text-lg text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden lg:block">
        <AppSidebar mode="contextual" application={application} />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0">
            <AppSidebar
              mode="contextual"
              application={application}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col">
        <AppHeader onMenuClick={() => setSidebarOpen(true)} />

        <div className="lg:hidden">
          <PillNav appId={appId} slug={slug} />
        </div>

        <main className="flex-1 flex flex-col px-6 py-8 overflow-hidden">
          <div className="max-w-4xl mx-auto w-full flex flex-col h-full">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="font-semibold text-gray-900 text-2xl mb-2">Send Message</h1>
                <p className="text-sm text-gray-700">Communicate securely with your legal team</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={loadMessages}
                disabled={isRefreshing}
                className="flex items-center gap-2"
                data-testid="button-refresh-messages"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>

            {/* Messages Area — rendered from Client_Messages related list records */}
            <div className="flex-1 overflow-y-auto mb-4 space-y-3 pr-2">
              {isRefreshing && messages.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-600" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-gray-600">No messages yet. Start a conversation!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isClient = msg.senderRole === "client";
                  const isAdmin = msg.senderRole === "admin";

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isClient ? "justify-end" : "justify-start"}`}
                    >
                      <div className="max-w-[80%] lg:max-w-[70%]">
                        {/* Sender label for admin messages */}
                        {isAdmin && (
                          <p className="text-xs font-medium text-gray-500 mb-1 ml-1">Ply Legal</p>
                        )}

                        {/* Message bubble */}
                        <div
                          className={
                            isClient
                              ? "bg-[#285646] text-white rounded-lg px-4 py-3 shadow-sm"
                              : "bg-green-50 border border-green-200 rounded-lg px-4 py-3 shadow-sm"
                          }
                        >
                          <p
                            className={`text-sm whitespace-pre-wrap ${
                              isAdmin ? "text-gray-700" : ""
                            } ${msg.isOptimistic ? "opacity-60" : ""}`}
                          >
                            {msg.body || ""}
                          </p>
                        </div>

                        {/* Timestamp */}
                        <div
                          className={`text-xs text-gray-500 mt-1 ${
                            isClient ? "text-right" : "text-left"
                          }`}
                        >
                          {msg.isOptimistic ? "Sending..." : formatTimestamp(msg.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-200 pt-4">
              <form onSubmit={handleSendMessage} className="flex gap-3">
                <Textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type your message..."
                  rows={3}
                  className="flex-1 resize-none"
                  data-testid="input-message-text"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                />

                <Button
                  type="submit"
                  disabled={isSending || !messageText.trim()}
                  className="flex-shrink-0 bg-[#285646] hover:bg-[#1f4236] text-white"
                  data-testid="button-send-message"
                >
                  {isSending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
