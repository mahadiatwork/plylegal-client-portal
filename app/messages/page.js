"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSnapshot } from "valtio";
import { Loader2, Send } from "lucide-react";
import { applicationsStore, authStore } from "@/stores";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { sendMessage, fetchMessages, markMessagesSeen } from "@/lib/chatService";

const formatTimestamp = (value) => {
  if (!value) return "";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (messageDate.getTime() === today.getTime()) {
      return date.toLocaleTimeString("en-AU", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    
    return date.toLocaleString("en-AU", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
};

export default function MessagesPage() {
  const { toast } = useToast();
  const applicationsSnap = useSnapshot(applicationsStore);
  const authSnap = useSnapshot(authStore);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [olderCursor, setOlderCursor] = useState(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const conversationRef = useRef(null);
  const latestCursorRef = useRef(null);
  const initialLoadedRef = useRef(false);

  // Use Firebase Auth UID for userId (must match request.auth.uid in Firestore rules)
  const userId = authSnap.user?.uid || authSnap.user?.id;
  const senderUid = authSnap.user?.uid || authSnap.user?.id;
  const senderName = authSnap.userProfile?.name || authSnap.user?.displayName || authSnap.user?.email || "You";

  // Load applications and messages
  useEffect(() => {
    const loadData = async () => {
      try {
        if (!authSnap.isAuthenticated && !authSnap.user) {
          await authStore.checkSession();
        }

        const currentUserId = authSnap.user?.id;
        if (!currentUserId) {
          setIsLoading(false);
          return;
        }

        if (applicationsSnap.applications.length === 0) {
          await applicationsStore.loadApplications(currentUserId);
        }

        // Load messages from Firestore
        await loadInitialMessages();
      } catch (err) {
        console.error("Error loading data:", err);
        setError(err.message || "Unable to load messages.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [authSnap.isAuthenticated, authSnap.user?.id, applicationsSnap.applications.length]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (conversationRef.current) {
        conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
      }
    });
  }, []);

  const loadInitialMessages = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchMessages({
        userId,
        limitCount: 30,
      });

      setMessages(result.messages || []);
      setHasMore(Boolean(result.hasMore));
      setOlderCursor(result.olderCursor || null);
      latestCursorRef.current = result.newestCursor || null;
      initialLoadedRef.current = true;
      scrollToBottom();

      // Mark agent messages as seen
      const unseenAgentMessages = (result.messages || [])
        .filter((msg) => msg.senderType === "agent" && msg.status !== "seen")
        .map((msg) => msg.id);
      if (unseenAgentMessages.length > 0) {
        await markMessagesSeen(unseenAgentMessages);
      }
    } catch (err) {
      console.error("Error loading messages:", err);
      setError(err.message || "Failed to load messages.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadOlderMessages = async () => {
    if (!userId || !olderCursor) return;
    
    setLoadingOlder(true);
    setError(null);

    const scrollContainer = conversationRef.current;
    const previousScrollHeight = scrollContainer?.scrollHeight || 0;

    try {
      const result = await fetchMessages({
        userId,
        limitCount: 30,
        before: olderCursor,
      });

      // Merge messages, avoiding duplicates
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const newMessages = (result.messages || []).filter((m) => !existingIds.has(m.id));
        const merged = [...newMessages, ...prev];
        // Sort by createdAt
        merged.sort((a, b) => {
          const timeA = new Date(a.createdAt || 0).getTime();
          const timeB = new Date(b.createdAt || 0).getTime();
          return timeA - timeB;
        });
        return merged;
      });

      setHasMore(Boolean(result.hasMore));
      setOlderCursor(result.olderCursor || null);

      // Maintain scroll position
      requestAnimationFrame(() => {
        if (scrollContainer) {
          const newScrollHeight = scrollContainer.scrollHeight;
          const delta = newScrollHeight - previousScrollHeight;
          scrollContainer.scrollTop = delta;
        }
      });
    } catch (err) {
      console.error("Error loading older messages:", err);
      setError(err.message || "Failed to load older messages.");
    } finally {
      setLoadingOlder(false);
    }
  };

  const markMessagesSeenLocal = async (msgs = []) => {
    if (!userId) return;
    
    const unseen = msgs
      .filter((msg) => msg.senderType === "agent" && msg.status !== "seen")
      .map((msg) => msg.id);

    if (unseen.length === 0) return;

    try {
      await markMessagesSeen(unseen);
      setMessages((prev) =>
        prev.map((msg) =>
          unseen.includes(msg.id) ? { ...msg, status: "seen" } : msg
        )
      );
    } catch (err) {
      console.error("Failed to mark messages as seen:", err);
    }
  };

  const fetchNewMessages = useCallback(async () => {
    if (!userId || !initialLoadedRef.current || !latestCursorRef.current) {
      return;
    }

    try {
      const result = await fetchMessages({
        userId,
        after: latestCursorRef.current,
        limitCount: 30,
      });

      if (result.messages?.length) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const newMessages = result.messages.filter((m) => !existingIds.has(m.id));
          const merged = [...prev, ...newMessages];
          // Sort by createdAt
          merged.sort((a, b) => {
            const timeA = new Date(a.createdAt || 0).getTime();
            const timeB = new Date(b.createdAt || 0).getTime();
            return timeA - timeB;
          });
          return merged;
        });
        latestCursorRef.current = result.newestCursor || latestCursorRef.current;
        await markMessagesSeenLocal(result.messages);
        scrollToBottom();
      }
    } catch (err) {
      console.error("Polling error:", err);
    }
  }, [userId, scrollToBottom]);

  // Poll for new messages
  useEffect(() => {
    if (!userId) return undefined;
    const interval = setInterval(() => {
      fetchNewMessages();
    }, 12000);
    return () => clearInterval(interval);
  }, [userId, fetchNewMessages]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !userId || !senderUid) {
      if (!userId) {
        toast({
          variant: "destructive",
          title: "Not authenticated",
          description: "Please log in to send messages.",
        });
      }
      return;
    }

    setSending(true);
    setError(null);

    try {
      // Get the first application's matterId if available (optional)
      const firstApp = applicationsSnap.applications.find(app => app.zohoId);
      const matterId = firstApp?.zohoId || undefined;

      const newMessage = await sendMessage({
        userId,
        senderType: "client",
        senderUid,
        senderName,
        body: messageText.trim(),
        matterId,
      });

      // Add the new message to the list
      setMessages((prev) => {
        const merged = [...prev, newMessage];
        merged.sort((a, b) => {
          const timeA = new Date(a.createdAt || 0).getTime();
          const timeB = new Date(b.createdAt || 0).getTime();
          return timeA - timeB;
        });
        return merged;
      });
      latestCursorRef.current = newMessage?.createdAt || latestCursorRef.current;
      setMessageText("");
      scrollToBottom();
      toast({
        title: "Message sent",
        description: "Your message has been delivered to Ply Legal.",
      });
    } catch (err) {
      console.error("Send message error:", err);
      setError(err.message || "Failed to send message");
      toast({
        variant: "destructive",
        title: "Failed to send",
        description: err.message || "Something went wrong. Please try again.",
      });
    } finally {
      setSending(false);
    }
  };

  const isSendDisabled = sending || !messageText.trim() || !userId || !senderUid;

  if (isLoading && messages.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading messages...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden lg:block">
        <AppSidebar mode="global" />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0">
            <AppSidebar mode="global" onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col">
        <AppHeader onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Chat Header */}
          <div className="border-b border-border bg-card px-6 py-4">
            <h1 className="font-semibold text-xl">Messages</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Chat with your Ply Legal team
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mx-6 mt-4 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Conversation Area */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4" ref={conversationRef}>
              {hasMore && (
                <div className="flex justify-center pb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadOlderMessages}
                    disabled={loadingOlder}
                  >
                    {loadingOlder ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      "Load older messages"
                    )}
                  </Button>
                </div>
              )}

              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-muted-foreground">
                    <p className="text-lg font-medium mb-2">No messages yet</p>
                    <p className="text-sm">Start a conversation with your legal team</p>
                  </div>
                </div>
              ) : (
                      messages.map((message) => {
                      const createdAt = message.createdAt;
                      return (
                    <div
                      key={message.id}
                      className={`flex flex-col ${
                        message.senderType === "client" ? "items-end" : "items-start"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-muted-foreground">
                          {message.senderName}
                        </span>
                        {message.matterId && message.applicationReference && (
                          <span className="text-xs text-muted-foreground/70">
                            • {message.applicationReference}
                          </span>
                        )}
                      </div>
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${
                          message.senderType === "client"
                            ? "bg-emerald-500 text-white rounded-br-sm"
                            : "bg-muted text-foreground rounded-bl-sm"
                        }`}
                      >
                        <p className="whitespace-pre-line text-sm leading-relaxed">
                          {message.body}
                        </p>
                        <div
                          className={`text-xs mt-1.5 flex items-center gap-2 ${
                            message.senderType === "client"
                              ? "text-white/70"
                              : "text-muted-foreground"
                          }`}
                        >
                          <span>{formatTimestamp(createdAt)}</span>
                          {message.senderType === "client" && (
                            <span>
                              {message.status === "seen" ? "✓✓ Seen" : "✓ Sent"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Message Composer */}
            <div className="border-t border-border bg-card px-6 py-4">
              <div className="flex gap-3 items-end">
                <Textarea
                  placeholder="Type your message here..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (!isSendDisabled) {
                        handleSendMessage();
                      }
                    }
                  }}
                  className="flex-1 min-h-[60px] max-h-[120px] resize-none"
                  rows={2}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={isSendDisabled}
                  size="icon"
                  className="h-[60px] w-[60px] rounded-full bg-emerald-500 hover:bg-emerald-600"
                >
                  {sending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </div>
              {!userId && (
                <p className="text-xs text-muted-foreground mt-2">
                  Please log in to send messages.
                </p>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
