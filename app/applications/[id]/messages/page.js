"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useSnapshot } from "valtio";
import { Loader2, Send } from "lucide-react";
import { applicationsStore } from "@/stores/applicationsStore";
import { authStore } from "@/stores/authStore";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { PillNav } from "@/components/PillNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const formatTimestamp = (value) => {
  if (!value) return "";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString("en-AU", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
};

export default function MessagesPage() {
  const params = useParams();
  const { toast } = useToast();
  const applicationsSnap = useSnapshot(applicationsStore);
  const authSnap = useSnapshot(authStore);
  const appId = params.id;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoadingApp, setIsLoadingApp] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [messages, setMessages] = useState([]);
  const [olderCursor, setOlderCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [errorPayload, setErrorPayload] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);
  const conversationRef = useRef(null);
  const latestCursorRef = useRef(null);
  const initialLoadedRef = useRef(false);

  const application = useMemo(
    () => applicationsSnap.applications.find((app) => app.id === appId),
    [applicationsSnap.applications, appId]
  );
  const matterId = application?.zohoId;
  const contactId = authSnap.userProfile?.zohoContactId;
  const contactEmail = authSnap.user?.email || authSnap.userProfile?.email;

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!authSnap.isAuthenticated && !authSnap.user) {
          await authStore.checkSession();
        }

        const userId = authSnap.user?.id;
        if (!userId) {
          setIsLoadingApp(false);
          return;
        }

        if (applicationsSnap.applications.length === 0) {
          await applicationsStore.loadApplications(userId);
        }
      } catch (err) {
        console.error("Error loading application:", err);
        setError(err.message || "Unable to load application.");
      } finally {
        setIsLoadingApp(false);
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

  const mergeMessages = useCallback((incoming = [], existing = []) => {
    if (!incoming.length) return existing;
    const map = new Map(existing.map((msg) => [msg.id, msg]));
    incoming.forEach((msg) => {
      if (msg?.id) {
        map.set(msg.id, msg);
      }
    });
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.createdTime).getTime() - new Date(b.createdTime).getTime()
    );
  }, []);

  const markMessagesSeen = useCallback(
    async (msgs = []) => {
      if (!matterId) return;
      const unseen = msgs
        .filter((msg) => msg.senderType === "agent" && msg.status !== "Seen")
        .map((msg) => msg.id);

      if (unseen.length === 0) return;

      try {
        await fetch(`/api/messages/${matterId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: unseen }),
        });
        setMessages((prev) =>
          prev.map((msg) =>
            unseen.includes(msg.id) ? { ...msg, status: "Seen" } : msg
          )
        );
      } catch (err) {
        console.error("Failed to mark messages as seen:", err);
      }
    },
    [matterId]
  );

  const loadInitialMessages = useCallback(async () => {
    if (!matterId) return;
    setIsLoadingMessages(true);
    setError(null);

    try {
      const response = await fetch(`/api/messages/${matterId}?limit=30`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to load messages");
      }

      setMessages(result.messages || []);
      setHasMore(Boolean(result.hasMore));
      setOlderCursor(result.olderCursor || null);
      latestCursorRef.current = result.newestCursor || null;
      await markMessagesSeen(result.messages || []);
      initialLoadedRef.current = true;
      scrollToBottom();
    } catch (err) {
      console.error("Error loading messages:", err);
      setError(err.message || "Failed to load messages.");
    } finally {
      setIsLoadingMessages(false);
    }
  }, [matterId, markMessagesSeen, scrollToBottom]);

  useEffect(() => {
    if (matterId) {
      loadInitialMessages();
    }
  }, [matterId, loadInitialMessages]);

  const loadOlderMessages = async () => {
    if (!matterId || !olderCursor) return;
    setLoadingOlder(true);
    setError(null);

    const scrollContainer = conversationRef.current;
    const previousScrollHeight = scrollContainer?.scrollHeight || 0;

    try {
      const response = await fetch(
        `/api/messages/${matterId}?limit=30&before=${encodeURIComponent(olderCursor)}`
      );
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to load older messages");
      }

      setMessages((prev) => mergeMessages(result.messages || [], prev));
      setHasMore(Boolean(result.hasMore));
      setOlderCursor(result.olderCursor || null);

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

  const fetchNewMessages = useCallback(async () => {
    if (!matterId || !initialLoadedRef.current || !latestCursorRef.current) {
      return;
    }

    try {
      const response = await fetch(
        `/api/messages/${matterId}?after=${encodeURIComponent(latestCursorRef.current)}`
      );
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to refresh messages");
      }

      if (result.messages?.length) {
        setMessages((prev) => mergeMessages(result.messages, prev));
        latestCursorRef.current = result.newestCursor || latestCursorRef.current;
        await markMessagesSeen(result.messages);
        scrollToBottom();
      }
    } catch (err) {
      console.error("Polling error:", err);
    }
  }, [matterId, mergeMessages, markMessagesSeen, scrollToBottom]);

  useEffect(() => {
    if (!matterId) return undefined;
    const interval = setInterval(() => {
      fetchNewMessages();
    }, 12000);
    return () => clearInterval(interval);
  }, [matterId, fetchNewMessages]);

  const handleSendMessage = async () => {
    if (!matterId || !contactId) {
      toast({
        variant: "destructive",
        title: "Missing contact",
        description: "We were unable to determine your contact record. Please contact support.",
      });
      return;
    }

    if (!messageText.trim()) {
      return;
    }

    setSending(true);
    setError(null);

    try {
      const response = await fetch(`/api/messages/${matterId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: messageText.trim(),
          contactId,
          email: contactEmail,
        }),
      });
      const result = await response.json();

      if (!result.success) {
        // Store error, payload, and details for display
        setError(result.error || "Failed to send message");
        setErrorPayload(result.payload || null);
        setErrorDetails(result.details || null);
        throw new Error(result.error || "Failed to send message");
      }

      // Clear any previous errors
      setError(null);
      setErrorPayload(null);
      setErrorDetails(null);

      setMessages((prev) => mergeMessages([result.message], prev));
      latestCursorRef.current = result.message?.createdTime || latestCursorRef.current;
      setMessageText("");
      scrollToBottom();
      toast({
        title: "Message sent",
        description: "Your message has been delivered to Ply Legal.",
      });
    } catch (err) {
      console.error("Send message error:", err);
      toast({
        variant: "destructive",
        title: "Failed to send",
        description: err.message || "Something went wrong. Please try again.",
      });
    } finally {
      setSending(false);
    }
  };

  const isSendDisabled = sending || !messageText.trim() || !matterId || !contactId;

  if (isLoadingApp || !application) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading portal...</span>
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
            <AppSidebar mode="contextual" application={application} onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col">
        <AppHeader onMenuClick={() => setSidebarOpen(true)} />

        <div className="lg:hidden">
          <PillNav appId={appId} />
        </div>

        <main className="flex-1 px-6 py-6">
          <div className="max-w-6xl mx-auto space-y-6">
            <div>
              <h1 className="font-semibold text-2xl">Send Message</h1>
              <p className="text-muted-foreground text-sm">
                Chat in real time with your Ply Legal team about this matter.
              </p>
            </div>

            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 space-y-4">
                <div className="text-sm font-semibold text-destructive">{error}</div>
                
                {errorDetails && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-destructive/80">Zoho Error Details:</div>
                    <pre className="text-xs bg-background border border-border rounded p-3 overflow-auto max-h-96 font-mono">
                      {JSON.stringify(errorDetails, null, 2)}
                    </pre>
                  </div>
                )}
                
                {errorPayload && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-destructive/80">JSON Payload sent to Zoho CRM:</div>
                    <pre className="text-xs bg-background border border-border rounded p-3 overflow-auto max-h-96 font-mono">
                      {errorPayload}
                    </pre>
                  </div>
                )}
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle>New message</CardTitle>
                  <CardDescription>
                    Attach files or send a quick update to your legal team.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Write your message..."
                    value={messageText}
                    onChange={(event) => setMessageText(event.target.value)}
                    className="min-h-[160px] resize-none"
                  />

                  <div className="flex justify-end">
                    <Button onClick={handleSendMessage} disabled={isSendDisabled} className="w-full">
                      {sending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send
                        </>
                      )}
                    </Button>
                  </div>

                  {!contactId && (
                    <p className="text-xs text-muted-foreground">
                      We could not find your Zoho contact record. Please contact support to enable messaging.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="flex flex-col min-h-[600px]">
                <CardHeader className="flex-none">
                  <CardTitle>Conversation</CardTitle>
                  <CardDescription>
                    Messages are grouped by the matter (deal) you are viewing.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
                  {hasMore && (
                    <div className="flex justify-center">
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
                          "Load older"
                        )}
                      </Button>
                    </div>
                  )}

                  <div
                    ref={conversationRef}
                    className="flex-1 overflow-y-auto pr-2 space-y-4"
                  >
                    {isLoadingMessages ? (
                      <div className="flex justify-center py-10 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="text-center text-muted-foreground py-12">
                        No messages yet. Start a conversation with your legal team.
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex flex-col ${
                            message.senderType === "client" ? "items-end" : "items-start"
                          }`}
                        >
                          <div className="text-xs text-muted-foreground mb-1">
                            {message.senderName}
                          </div>
                          <div
                            className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                              message.senderType === "client"
                                ? "bg-emerald-500 text-white rounded-br-sm"
                                : "bg-muted text-foreground rounded-bl-sm"
                            }`}
                          >
                            {message.body && (
                              <p className="whitespace-pre-line text-sm">{message.body}</p>
                            )}

                          </div>
                          <div className="text-[11px] text-muted-foreground mt-1 flex gap-2">
                            <span>{formatTimestamp(message.createdTime)}</span>
                            {message.senderType === "client" && message.status && (
                              <span>&middot; {message.status}</span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
