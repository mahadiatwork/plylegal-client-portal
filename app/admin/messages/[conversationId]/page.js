"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSnapshot } from "valtio";
import { authStore } from "@/stores/authStore";
import { auth } from "@/lib/firebase";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, ArrowLeft, RefreshCw, Mail } from "lucide-react";

export default function AdminMessageThreadPage() {
  const params = useParams();
  const router = useRouter();
  const authSnap = useSnapshot(authStore);
  const { toast } = useToast();
  const messagesEndRef = useRef(null);

  const conversationId = params.conversationId;

  const [messages, setMessages] = useState([]);
  const [conversation, setConversation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [messageText, setMessageText] = useState("");

  const loadMessages = async () => {
    try {
      setIsRefreshing(true);
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch(
        `/api/chat/messages?applicationId=${conversationId}`,
        {
          headers: { Authorization: `Bearer ${idToken}` },
        }
      );
      const data = await response.json();

      if (data.success) {
        setMessages(data.messages || []);
        setConversation(data.conversation || null);
      } else {
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

  useEffect(() => {
    if (!authSnap.isAuthenticated) {
      authStore.checkSession();
      return;
    }
    if (authSnap.userProfile && authSnap.userProfile.role !== "admin") {
      router.push("/access-denied");
      return;
    }
    if (conversationId) {
      loadMessages();
    }
  }, [authSnap.isAuthenticated, authSnap.userProfile, conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      if (diffMins < 60)
        return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
      if (diffHours < 24)
        return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
      if (diffDays < 7)
        return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

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

    setIsSending(true);

    const optimisticBubble = {
      id: `temp-${Date.now()}`,
      senderRole: "admin",
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
          applicationId: conversationId,
          body: optimisticBubble.body,
        }),
      });

      const data = await response.json();

      if (data.success) {
        await loadMessages();
        toast({
          title: "Message sent",
          description: "Reply sent to client.",
        });
      } else {
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      <main className="flex-1 flex flex-col px-4 sm:px-6 py-6 sm:py-8 overflow-hidden">
        <div className="max-w-4xl mx-auto w-full flex flex-col h-full">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/admin/messages")}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <div>
                <h1 className="font-semibold text-gray-900 text-xl">
                  {conversation?.clientName || "Client"}
                </h1>
                <p className="text-xs text-gray-500">
                  {conversation?.applicationType || "Visa Application"} ·{" "}
                  {conversationId}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadMessages}
              disabled={isRefreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto mb-4 space-y-3 pr-2 bg-white border border-gray-200 rounded-lg p-4">
            {isRefreshing && messages.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-600" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600">
                  No messages yet. Start the conversation!
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isAdmin = msg.senderRole === "admin";
                const isClient = msg.senderRole === "client";

                return (
                  <div
                    key={msg.id}
                    className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
                  >
                    <div className="max-w-[80%] lg:max-w-[70%]">
                      {isClient && (
                        <p className="text-xs font-medium text-gray-500 mb-1 ml-1">
                          {conversation?.clientName || "Client"}
                        </p>
                      )}

                      <div
                        className={
                          isAdmin
                            ? "bg-[#285646] text-white rounded-lg px-4 py-3 shadow-sm"
                            : "bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 shadow-sm"
                        }
                      >
                        <p
                          className={`text-sm whitespace-pre-wrap ${
                            isClient ? "text-gray-700" : ""
                          } ${msg.isOptimistic ? "opacity-60" : ""}`}
                        >
                          {msg.body || ""}
                        </p>
                      </div>

                      <div
                        className={`text-xs text-gray-500 mt-1 ${
                          isAdmin ? "text-right" : "text-left"
                        }`}
                      >
                        {msg.isOptimistic
                          ? "Sending..."
                          : formatTimestamp(msg.createdAt)}
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
                placeholder="Type your reply..."
                rows={3}
                className="flex-1 resize-none"
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
  );
}
