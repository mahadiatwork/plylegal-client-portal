"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSnapshot } from "valtio";
import { applicationsStore, draftStore, authStore } from "@/stores";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { PillNav } from "@/components/PillNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

export default function QuestionnairePage() {
  const params = useParams();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const applicationsSnap = useSnapshot(applicationsStore);
  const draftSnap = useSnapshot(draftStore);
  const authSnap = useSnapshot(authStore);
  
  const appId = params.id;
  const application = applicationsSnap.applications.find(app => app.id === appId);
  
  // Load applications data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Wait for auth to be ready
        if (!authSnap.isAuthenticated && !authSnap.user) {
          // Check session first
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
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [appId, authSnap.isAuthenticated, authSnap.user?.id, applicationsSnap.applications.length]);

  useEffect(() => {
    // Set application context for draft store
    if (appId) {
      draftStore.setApplicationId(appId);
      // Load draft for this application
      draftStore.loadDraft(appId);
    }
  }, [appId]);
  
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
  
  const deriveVisaTypeCode = (app) => {
    if (!app) return "partner";
    if (app.visaTypeCode) return app.visaTypeCode;
    const typeLower = (app.type || "").toLowerCase();
    if (typeLower.includes("protection")) return "protection";
    if (typeLower.includes("work") || typeLower.includes("temporary") || typeLower.includes("482")) return "temporary-work";
    return "partner";
  };

  const handleStartQuestionnaire = () => {
    // Route to visa-type-specific intake
    const visaTypeRoutes = {
      'partner': `/intake/partner/start?applicationId=${appId}`,
      'protection': `/intake/protection/start?applicationId=${appId}`,
      'temporary-work': `/intake/temporary-work/start?applicationId=${appId}`,
    };
    const visaTypeCode = deriveVisaTypeCode(application);
    const route = visaTypeRoutes[visaTypeCode] || `/intake/partner/start?applicationId=${appId}`;
    router.push(route);
  };
  
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
        
        <main className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            <Card className="rounded-2xl shadow-sm text-center py-12">
              <CardContent className="space-y-6">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileText className="w-8 h-8 text-primary" />
                </div>
                
                <div>
                  <h2 className="font-serif text-2xl font-bold mb-2">
                    {application.type} Questionnaire
                  </h2>
                  <p className="text-muted-foreground max-w-lg mx-auto">
                    Complete the comprehensive questionnaire to gather all necessary information for your visa application.
                  </p>
                </div>
                
                {/* Completion Progress */}
                {draftSnap.completionStatus && Object.keys(draftSnap.completionStatus).length > 0 && (
                  <div className="max-w-md mx-auto">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-foreground">Progress</span>
                      <span className="text-sm font-semibold text-primary">
                        {draftStore.getCompletionPercentage().percentage}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${draftStore.getCompletionPercentage().percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {draftStore.getCompletionPercentage().completed} of {draftStore.getCompletionPercentage().total} sections complete
                    </p>
                  </div>
                )}
                
                <Button
                  size="lg"
                  onClick={handleStartQuestionnaire}
                  data-testid="button-start-questionnaire"
                  className="mt-4"
                >
                  {draftSnap.draft && Object.keys(draftSnap.draft).length > 0 
                    ? "Continue Questionnaire" 
                    : "Start Questionnaire"}
                </Button>
                
                {draftSnap.lastSaved && (
                  <p className="text-xs text-muted-foreground">
                    Last saved: {new Date(draftSnap.lastSaved).toLocaleString()}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
