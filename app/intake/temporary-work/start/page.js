"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { applicationsStore } from "@/stores/applicationsStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    }
  }, [searchParams, draftSnap.currentApplicationId]);

  useEffect(() => {
    if (draftSnap.draft.started) {
      setStarted(true);
    }

    const data = draftStore.getCompletionPercentage();
    setCompletionData(data);
  }, [draftSnap.draft.started, draftSnap.completionStatus]);

  const currentApp = appsSnap.applications.find(app => app.id === draftSnap.currentApplicationId);
  const isSubmitted = currentApp?.status === "submitted";
  const completionPercentage = completionData.percentage;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!started) {
      setError("You must check the box to begin the application");
      return;
    }

    await draftStore.saveDraft({ started: true });
    await draftStore.markPageComplete(`${visaType}/start`);

    const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId);
    if (next) router.push(next);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="rounded-2xl shadow-md bg-white">
        <CardHeader className="space-y-3 pb-6">
          <CardTitle className="text-3xl font-semibold text-slate-800">
            Before You Begin
          </CardTitle>
        </CardHeader>
        <CardContent>
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
            <div className="space-y-4">
              <p className="text-base text-slate-700 leading-relaxed">
                This questionnaire is the foundation of your visa application. Please complete each section carefully and provide as much detail as you can. If you're unsure about a question, answer what you can and continue. You can save your progress and return at any time before submitting.
              </p>
              <p className="text-base text-slate-700 leading-relaxed">
                Once submitted, we will review your responses and use this information to prepare your visa application.
              </p>
            </div>

            <div className="bg-blue-50 rounded-lg p-5">
              <p className="text-sm text-slate-700 leading-relaxed">
                <span className="font-semibold">Accuracy matters.</span> Incomplete or incorrect information can lead to delays, refusal, or visa cancellation. If you're unsure about anything, let us know.
              </p>
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
                  I confirm that the information I provide will be accurate to the best of my knowledge.
                </Label>
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
                {isSubmitted ? "Application Submitted" : "Continue"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
