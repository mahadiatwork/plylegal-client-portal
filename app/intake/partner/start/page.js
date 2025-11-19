"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { applicationsStore } from "@/stores/applicationsStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { getNextRoute, getVisaTypeFromPath } from "@/lib/routes";

export default function IntakeStartPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const visaType = getVisaTypeFromPath(pathname);
  const draftSnap = useSnapshot(draftStore);
  const appsSnap = useSnapshot(applicationsStore);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState("");
  const [completionData, setCompletionData] = useState({ percentage: 0, completed: 0, total: 0 });

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

    // Save to draft
    await draftStore.saveDraft({ started: true });
    
    // Mark this page as complete
    await draftStore.markPageComplete(`${visaType}/start`);
    
    // Navigate to first page using dynamic routing, preserving applicationId
    const next = getNextRoute(pathname, visaType, appId);
    if (next) router.push(next);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="rounded-2xl shadow-md bg-white">
        <CardHeader className="space-y-3 pb-6">
          <CardTitle className="text-3xl font-semibold">
            Immigration Application Intake
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Submission Success Banner */}
          {isSubmitted && (
            <div className="mb-6 p-6 rounded-xl bg-green-50 border-2 border-green-200">
              <div className="flex items-start gap-4">
                <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-green-900 text-lg">
                    Application Submitted Successfully
                  </h3>
                  <p className="text-sm text-green-700 mt-1">
                    Your application has been submitted and is now under review. 
                    You completed {completionPercentage}% of all sections.
                  </p>
                  <div className="mt-4">
                    <Button
                      onClick={() => router.push("/applications")}
                      variant="outline"
                      className="border-green-600 text-green-700 hover:bg-green-100"
                      data-testid="button-back-to-applications"
                    >
                      Back to Applications
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <form 
            onSubmit={handleSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
              }
            }}
            className="space-y-8"
          >
            <div className="bg-gray-50 rounded-xl p-6 space-y-4">
              <h3 className="text-lg font-medium">Before You Begin</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-[#285646] mt-0.5">•</span>
                  <span>Have your passport and identity documents ready</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#285646] mt-0.5">•</span>
                  <span>Allow 30-45 minutes to complete all sections</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#285646] mt-0.5">•</span>
                  <span>You can return at any time to continue where you left off</span>
                </li>
              </ul>
            </div>

            <div className="flex items-start space-x-3 p-6 bg-white rounded-xl border-2">
              <Checkbox
                id="started"
                data-testid="checkbox-started"
                checked={started}
                onCheckedChange={(checked) => {
                  setStarted(!!checked);
                  setError("");
                }}
                className="mt-1"
              />
              <div className="space-y-1 leading-none">
                <Label htmlFor="started" className="text-base font-medium cursor-pointer">
                  I understand and wish to begin the application
                </Label>
                <p className="text-sm text-gray-600">
                  By checking this box, you confirm that you will provide accurate information
                </p>
                {error && (
                  <p className="text-sm text-red-600 mt-2">
                    {error}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="submit"
                size="lg"
                disabled={!started || isSubmitted}
                data-testid="button-begin"
                className="min-h-11 px-8 bg-[#285646] hover:bg-[#1f4236]"
              >
                {isSubmitted ? "Application Submitted" : "Begin Application"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
