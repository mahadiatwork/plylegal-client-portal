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
import { FileText, Loader2 } from "lucide-react"; // Import Loader2 icon

export default function QuestionnairePage() {
  const params = useParams();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 1. New state for navigation feedback
  const [isNavigating, setIsNavigating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const applicationsSnap = useSnapshot(applicationsStore);
  const draftSnap = useSnapshot(draftStore);
  const authSnap = useSnapshot(authStore);

  const rawId = params?.id;
  const appId = Array.isArray(rawId) ? rawId[0] : rawId;

  const application = applicationsSnap.applications.find(
    app => String(app.id) === String(appId)
  );

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
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [appId, authSnap.isAuthenticated, authSnap.user?.id, applicationsSnap.applications.length]);

  useEffect(() => {
    if (appId) {
      draftStore.setApplicationId(appId);
      draftStore.loadDraft(appId);
    }
  }, [appId]);

  const handleStartQuestionnaire = (e) => {
    e.preventDefault();

    if (!application) return;

    // 2. Set loading state immediately upon click
    setIsNavigating(true);

    let visaTypeCode = application.visaTypeCode?.toLowerCase();
    let visaContext = null;

    if (application.type) {
      const typeLower = application.type.toLowerCase();
      if (typeLower.includes('protection')) {
        visaTypeCode = 'protection';
      } else if (typeLower.includes('partner')) {
        visaTypeCode = 'partner';
      } else if (typeLower.includes('nomination') || typeLower.includes('186')) {
        visaTypeCode = 'temporary-work';
        visaContext = '186';
      } else if (typeLower.includes('temporary') || typeLower.includes('work')) {
        visaTypeCode = 'temporary-work';
        visaContext = '482';
      }
    }

    let route;
    if (visaTypeCode === 'protection') {
      route = `/intake/protection/start?applicationId=${appId}`;
    } else if (visaTypeCode === 'partner') {
      route = `/intake/partner/start?applicationId=${appId}`;
    } else {
      route = `/intake/temporary-work/start?applicationId=${appId}`;
      if (visaContext) {
        draftStore.setVisaContext(visaContext);
        draftStore.saveDraft({ visaContext }, appId);
      }
    }

    router.push(route);
    // Note: We don't set setIsNavigating(false) because the page will unmount
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-gray-600">Loading application data...</div>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-red-600">Application not found.</div>
          <Button className="mt-4" onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </Button>
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

        <main className="flex-1 p-4 sm:p-6">
          <div className="max-w-4xl mx-auto">
            <Card className="rounded-xl sm:rounded-2xl shadow-sm text-center py-8 sm:py-12 px-4 sm:px-6">
              <CardContent className="space-y-6">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileText className="w-8 h-8 text-primary" />
                </div>

                <div>
                  <h2 className="font-serif text-xl sm:text-2xl font-bold mb-2">
                    {application.type} Questionnaire
                  </h2>
                  <p className="text-muted-foreground max-w-lg mx-auto">
                    This questionnaire helps us build your application properly from the beginning. If you’re unsure about any question, let us know and we’ll guide you through it.
                  </p>
                </div>

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

                {/* 3. Updated Button with Loading State */}
                <Button
                  size="lg"
                  type="button"
                  onClick={handleStartQuestionnaire}
                  disabled={isNavigating} // Disable button while navigating
                  className="mt-4 min-w-[200px]" // Add min-width to prevent resize
                >
                  {isNavigating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading Questionnaire...
                    </>
                  ) : (
                    draftSnap.draft && Object.keys(draftSnap.draft).length > 0
                      ? "Continue"
                      : "Start Questionnaire"
                  )}
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