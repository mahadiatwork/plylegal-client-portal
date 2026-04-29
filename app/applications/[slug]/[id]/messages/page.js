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
import { Paperclip, Send, Loader2, X, RefreshCw } from "lucide-react";

export default function MessagesPage() {
  const params = useParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const applicationsSnap = useSnapshot(applicationsStore);
  const authSnap = useSnapshot(authStore);
  const { toast } = useToast();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const appId = params.id;
  const slug = params.slug;
  const application = applicationsSnap.applications.find(app => app.id === appId);
  const dealId = application?.zohoId;

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load messages from Zoho CRM
  const loadMessages = async () => {
    if (!dealId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsRefreshing(true);
      const response = await fetch(`/api/messages/fetch?dealId=${dealId}`);
      const data = await response.json();

      if (data.success) {
        setMessages(data.messages || []);
      } else {
        console.error('Failed to load messages:', data.error);
        toast({
          title: "Error",
          description: data.error || "Failed to load messages",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading messages:', error);
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
        // Wait for auth to be ready
        if (!authSnap.isAuthenticated && !authSnap.user) {
          await authStore.checkSession();
        }

        const userId = authSnap.user?.id;
        if (!userId) {
          setIsLoading(false);
          return;
        }

        // Load applications if not already loaded
        if (applicationsSnap.applications.length === 0) {
          await applicationsStore.loadApplications(userId);
        }

        // Load messages from Zoho
        await loadMessages();
      } catch (error) {
        console.error('Error loading data:', error);
        setIsLoading(false);
      }
    };

    loadData();
  }, [appId, dealId, authSnap.isAuthenticated, authSnap.user?.id]);

  // Handle file attachment
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove attachment
  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      
      return date.toLocaleDateString('en-AU', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return '';
    }
  };

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!messageText.trim() && attachments.length === 0) {
      toast({
        title: "Error",
        description: "Please enter a message or attach a file",
        variant: "destructive",
      });
      return;
    }

    if (!dealId) {
      toast({
        title: "Error",
        description: "Application not found",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const formData = new FormData();
      formData.append('dealId', dealId);
      formData.append('message', messageText.trim());
      
      // Add attachments
      attachments.forEach((file) => {
        formData.append('attachments', file);
      });

      const response = await fetch('/api/messages/create', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        // Clear input and attachments
        setMessageText("");
        setAttachments([]);
        
        // Reload messages
        await loadMessages();
        
        toast({
          title: "Message sent",
          description: "Your message has been sent to Ply Legal.",
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to send message",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  // Show loading state while data is being loaded
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
            <AppSidebar mode="contextual" application={application} onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}
      
      <div className="flex-1 flex flex-col">
        <AppHeader 
          onMenuClick={() => setSidebarOpen(true)} 
        />
        
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
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {/* Messages Area - Scrollable */}
            <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2">
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
                  // Check if this message has a reply
                  const hasReply = msg.Reply_Message && msg.Reply_Message.trim() !== '';
                  const clientMessage = msg.Message_from_Client || '';
                  
                  return (
                    <div key={msg.id} className="space-y-3">
                      {/* Client Message */}
                      {clientMessage && (
                        <div className="flex justify-end">
                          <div className="max-w-[80%] lg:max-w-[70%]">
                            <div className="bg-[#285646] text-white rounded-lg px-4 py-3 shadow-sm">
                              <p className="text-sm whitespace-pre-wrap">{clientMessage}</p>
                            </div>
                            <div className="text-xs text-gray-500 mt-1 text-right">
                              {formatTimestamp(msg.Time_Sent)}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Ply Legal Reply */}
                      {hasReply && (
                        <div className="flex justify-start">
                          <div className="max-w-[80%] lg:max-w-[70%]">
                            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 shadow-sm">
                              <div className="flex items-center mb-1">
                                <span className="text-sm font-medium text-gray-900">Ply Legal</span>
                              </div>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{msg.Reply_Message}</p>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {formatTimestamp(msg.Time_Replied)}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area - Fixed at Bottom */}
            <div className="border-t border-gray-200 pt-4">
              {/* Attachment Preview */}
              {attachments.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {attachments.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 text-sm"
                    >
                      <Paperclip className="w-4 h-4 text-gray-600" />
                      <span className="text-gray-700 truncate max-w-[200px]">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Message Input Form */}
              <form onSubmit={handleSendMessage} className="flex gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-input"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-shrink-0"
                  data-testid="button-attach-file"
                >
                  <Paperclip className="w-5 h-5" />
                </Button>
                
                <Textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type your message..."
                  rows={3}
                  className="flex-1 resize-none"
                  data-testid="input-message-text"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                />
                
                <Button
                  type="submit"
                  disabled={isSending || (!messageText.trim() && attachments.length === 0)}
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
