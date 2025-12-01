"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSnapshot } from "valtio";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { applicationsStore } from "@/stores/applicationsStore";
import { appDataStore, addMessage } from "@/stores/appDataStore";
import { authStore } from "@/stores/authStore";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { PillNav } from "@/components/PillNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const messageSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
});

export default function MessagesPage() {
  const params = useParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const applicationsSnap = useSnapshot(applicationsStore);
  const appDataSnap = useSnapshot(appDataStore);
  const authSnap = useSnapshot(authStore);
  const { toast } = useToast();
  
  const appId = params.id;
  const application = applicationsSnap.applications.find(app => app.id === appId);
  const messages = appDataSnap.cache[appId]?.messages || [];

  // Load applications and messages data on mount
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

        // Load messages data from localStorage
        if (appId && !appDataSnap.cache[appId]?.messages) {
          appDataStore.loadMessages(appId);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [appId, authSnap.isAuthenticated, authSnap.user?.id, applicationsSnap.applications.length]);
  
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(messageSchema),
  });
  
  const onSubmit = (data) => {
    const newMessage = {
      id: `msg-${Date.now()}`,
      from: "client",
      subject: data.subject,
      text: data.message,
      date: new Date().toISOString(),
    };
    
    addMessage(appId, newMessage);
    
    toast({
      title: "Message sent",
      description: "Your message has been sent to Ply Legal.",
    });
    
    reset();
  };
  
  // Show loading state while data is being loaded
  if (isLoading || !application) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
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
          <PillNav appId={appId} />
        </div>
        
        <main className="flex-1 px-6 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <h1 className="font-semibold text-gray-900 text-2xl mb-2">Send Message</h1>
              <p className="text-sm text-gray-700">Communicate securely with your legal team</p>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <CardHeader className="border-b border-gray-200">
                  <CardTitle className="text-gray-900">New Message</CardTitle>
                  <CardDescription className="text-gray-700">Send a message to Ply Legal</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="p-4 bg-gray-50 rounded-lg space-y-3 border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Message Information</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-gray-600 mb-1">Visa Number</div>
                        <div className="text-sm font-medium text-gray-900">{application.reference}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 mb-1">Application Type</div>
                        <div className="text-sm font-medium text-gray-900">{application.type}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 mb-1">Contact Name</div>
                        <div className="text-sm font-medium text-gray-900">{authSnap.user?.name || 'User'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 mb-1">Email</div>
                        <div className="text-sm font-medium text-gray-900">{authSnap.user?.email || 'user@example.com'}</div>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="subject" className="text-gray-900">Subject</Label>
                      <Input
                        id="subject"
                        placeholder="Subject"
                        {...register("subject")}
                        data-testid="input-message-subject"
                        className="bg-white"
                      />
                      {errors.subject && (
                        <p className="text-sm text-red-600">{errors.subject.message}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="message" className="text-gray-900">Message</Label>
                      <Textarea
                        id="message"
                        placeholder="Type your message..."
                        rows={6}
                        {...register("message")}
                        data-testid="input-message-text"
                        className="bg-white"
                      />
                      {errors.message && (
                        <p className="text-sm text-red-600">{errors.message.message}</p>
                      )}
                    </div>
                    
                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                      data-testid="button-send-message"
                      className="w-full bg-[#285646] hover:bg-[#1f4236] text-sm"
                    >
                      Send
                    </Button>
                  </form>
                </CardContent>
              </Card>
              
              <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <CardHeader className="border-b border-gray-200">
                  <CardTitle className="text-gray-900">Conversation</CardTitle>
                  <CardDescription className="text-gray-700">Message history</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {messages.length > 0 ? (
                      messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`p-4 rounded-lg border ${
                            msg.from === 'plylegal' 
                              ? 'bg-green-50 border-green-200' 
                              : 'bg-gray-50 border-gray-200'
                          }`}
                          data-testid={`message-${msg.id}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-900">
                              {msg.from === 'plylegal' ? 'Ply Legal' : 'You'}
                            </span>
                            <span className="text-xs text-gray-600">
                              {msg.subject ? msg.subject : 'Today'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{msg.text}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-600 text-center py-4">No messages yet</p>
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
