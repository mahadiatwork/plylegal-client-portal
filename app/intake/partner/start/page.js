"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { applicationsStore } from "@/stores/applicationsStore";
import { IntakeStartPageContent } from "@/components/intake/IntakeStartPageContent";
import { useState, useEffect } from "react";
import { getNextRoute, getVisaTypeFromPath } from "@/lib/routes";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";

export default function IntakeStartPage() {
  const router = useRouter();
  const { startNavigation } = useNavigationLoading();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const visaType = getVisaTypeFromPath(pathname);
  const draftSnap = useSnapshot(draftStore);
  const appsSnap = useSnapshot(applicationsStore);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState("");
  const [completionData, setCompletionData] = useState({ percentage: 0, completed: 0, total: 0 });
  const [submitting, setSubmitting] = useState(false);

  // Set application ID from URL params if available
  useEffect(() => {
    const appIdFromUrl = searchParams.get('applicationId');
    if (appIdFromUrl && appIdFromUrl !== draftSnap.currentApplicationId) {
      draftStore.setApplicationId(appIdFromUrl);
      draftStore.loadDraft(appIdFromUrl);
    } else if (!appIdFromUrl && draftSnap.currentApplicationId) {
      // If we have applicationId in store but not in URL, update URL to include it
      const newUrl = `${pathname}?applicationId=${draftSnap.currentApplicationId}`;
      router.replace(newUrl);
    }
  }, [searchParams, draftSnap.currentApplicationId, pathname, router]);

  useEffect(() => {
    // Load existing draft value if present
    if (draftSnap.draft.started) {
      setStarted(true);
    }
    
    // Get completion data
    const data = draftStore.getCompletionPercentage();
    setCompletionData(data);
  }, [draftSnap.draft.started, draftSnap.completionStatus]);
  
  // Get current application
  const currentApp = appsSnap.applications.find(app => app.id === draftSnap.currentApplicationId);
  const isSubmitted = currentApp?.status === "submitted";
  const completionPercentage = completionData.percentage;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!started) {
      setError("You must check the box to begin the application");
      return;
    }

    // Ensure we have an applicationId before proceeding
    const appId = searchParams.get('applicationId') || draftSnap.currentApplicationId;
    if (!appId) {
      setError("Application ID is required. Please return to the applications page and try again.");
      return;
    }

    setSubmitting(true);
    try {
      await draftStore.saveDraft({ started: true });
      await draftStore.markPageComplete(`${visaType}/start`);

      const next = getNextRoute(pathname, visaType, appId);
      if (next) {
        startNavigation(next);
        router.push(next);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <IntakeStartPageContent
      started={started}
      error={error}
      isSubmitted={isSubmitted}
      completionPercentage={completionPercentage}
      submitting={submitting}
      onStartedChange={(checked) => {
        setStarted(checked);
        setError("");
      }}
      onSubmit={handleSubmit}
      onBackToApplications={() => {
        startNavigation("/applications");
        router.push("/applications");
      }}
    />
  );
}
