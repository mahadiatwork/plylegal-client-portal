"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { authStore } from "@/stores";
import { useToast } from "@/hooks/use-toast";
import { buildIntakeHref, getNextRoute, getVisaTypeFromPath } from "@/lib/routes";
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, ArrowRight } from "lucide-react";
import DependentSelector from "@/components/intake/DependentSelector";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";

export default function PartnerDependentsPage() {
  const router = useRouter();
  const { startNavigation } = useNavigationLoading();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const visaType = getVisaTypeFromPath(pathname);
  const draftSnap = useSnapshot(draftStore);
  const authSnap = useSnapshot(authStore);
  const { toast } = useToast();

  const [selectedIds, setSelectedIds] = useState([]);
  const [excludedIds, setExcludedIds] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const userId = authSnap.user?.id;

  // Load application ID from URL
  useEffect(() => {
    const appIdFromUrl = searchParams.get("applicationId");
    if (appIdFromUrl && appIdFromUrl !== draftSnap.currentApplicationId) {
      draftStore.setApplicationId(appIdFromUrl);
      draftStore.loadDraft(appIdFromUrl);
    }
  }, [searchParams, draftSnap.currentApplicationId]);

  // Restore previously saved selections from draft
  useEffect(() => {
    if (draftSnap.draft?.selectedDependentIds) {
      setSelectedIds(draftSnap.draft.selectedDependentIds);
    }
    if (draftSnap.draft?.excludedDependentIds) {
      setExcludedIds(draftSnap.draft.excludedDependentIds);
    }
  }, [draftSnap.draft?.selectedDependentIds, draftSnap.draft?.excludedDependentIds]);

  const handleChange = useCallback((newSelected, newExcluded) => {
    setSelectedIds(newSelected);
    setExcludedIds(newExcluded);
  }, []);

  const handleSaveAndContinue = async () => {
    setIsSaving(true);

    try {
      const appId = draftSnap.currentApplicationId;
      if (!appId || !userId) {
        toast({ title: "Error", description: "Missing application or user context.", variant: "destructive" });
        setIsSaving(false);
        return;
      }

      // Save selection to draftStore (local + persist) and API (server-side)
      await draftStore.saveDependentSelection(selectedIds, excludedIds);

      const res = await fetch("/api/intake/dependents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          applicationId: appId,
          selectedDependentIds: selectedIds,
          excludedDependentIds: excludedIds,
        }),
      });

      const result = await res.json();
      if (!result.success) {
        toast({ title: "Warning", description: "Selection saved locally but server sync failed." });
      }

      // Mark page complete
      await draftStore.markPageComplete(`${visaType}/dependents`, null, false);

      toast({ title: "Saved", description: "Dependent selection saved successfully." });

      // Navigate to next route — for partner visa, go to Family Sponsor
      setIsNavigating(true);
      const next = buildIntakeHref({
        appId,
        internalHref: "/intake/partner/family-sponsor/details",
        visaType,
      });
      startNavigation(next);
      router.push(next);
    } catch (error) {
      console.error("Error saving dependent selection:", error);
      toast({ title: "Error", description: "Failed to save selection.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#022C22] flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl">Select Dependents</CardTitle>
              <CardDescription>
                Choose which dependents from previous applications to include in this partner visa application.
                Dependents you add in the Children step are automatically included.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <DependentSelector
            userId={userId}
            zohoContactId={authSnap.userProfile?.zohoContactId}
            selectedIds={selectedIds}
            excludedIds={excludedIds}
            onChange={handleChange}
          />

          <div className="flex justify-end pt-4 border-t">
            <Button
              onClick={handleSaveAndContinue}
              disabled={isSaving || isNavigating}
              className="bg-[#022C22] hover:bg-[#022C22] text-white min-w-[160px]"
            >
              {isSaving || isNavigating ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
