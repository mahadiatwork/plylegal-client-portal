"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSnapshot } from "valtio";
import { authStore } from "@/stores/authStore";
import { auth } from "@/lib/firebase";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MessageSquare, MailOpen, Mail, ArrowRight } from "lucide-react";

export default function AdminMessagesPage() {
  const router = useRouter();
  const authSnap = useSnapshot(authStore);
  const { toast } = useToast();

  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch(`/api/chat/admin/conversations?filter=${filter}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await response.json();

      if (data.success) {
        setConversations(data.conversations || []);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to load conversations",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
    loadConversations();
  }, [authSnap.isAuthenticated, authSnap.userProfile, filter]);

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
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString("en-AU", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (_) {
      return "";
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      <main className="flex-1 px-4 sm:px-6 py-6 sm:py-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="font-semibold text-gray-900 text-2xl">Client Messages</h1>
              <p className="text-sm text-gray-700 mt-1">
                Manage conversations with visa applicants
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("all")}
              >
                All
              </Button>
              <Button
                variant={filter === "unread" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("unread")}
              >
                Unread
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-12 text-center">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No conversations</h3>
              <p className="text-gray-600">
                {filter === "unread"
                  ? "No unread conversations."
                  : "No client conversations yet."}
              </p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-200">
                {conversations.map((conv) => (
                  <div
                    key={conv.conversationId}
                    onClick={() =>
                      router.push(`/admin/messages/${conv.conversationId}`)
                    }
                    className="p-4 sm:p-5 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">
                            {conv.clientName || "Unknown Client"}
                          </h3>
                          {conv.unreadForAdmin && (
                            <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-red-500 rounded-full">
                              !
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mb-1">
                          {conv.applicationType || "Visa Application"} ·{" "}
                          {conv.applicationId}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          {conv.latestSenderRole === "client" ? (
                            <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          ) : (
                            <MailOpen className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          )}
                          <p className="text-sm text-gray-600 truncate">
                            {conv.latestMessagePreview || "No messages yet"}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-xs text-gray-400">
                          {formatTimestamp(conv.latestMessageAt)}
                        </span>
                        <ArrowRight className="w-4 h-4 text-gray-400 mt-1" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
