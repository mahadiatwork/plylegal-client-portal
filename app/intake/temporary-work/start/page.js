"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { applicationsStore } from "@/stores/applicationsStore";
import { authStore } from "@/stores";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { getNextRoute, getVisaTypeFromPath } from "@/lib/routes";

function isLikely482Application(app, currentId) {
  if (!app?.id || app.id === currentId) return false;
  const type = (app.type || "").toLowerCase();
  const ref = (app.reference || "").toLowerCase();
  if (type.includes("186") || ref.includes("186")) return false;
  if (type.includes("employer") && type.includes("nomination")) return false;
  return (
    type.includes("482") ||
    type.includes("temporary work") ||
    type.includes("skills in demand") ||
    type.includes("tss") ||
    ref.includes("482")
  );
}

export default function IntakeStartPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const visaType = getVisaTypeFromPath(pathname);
  const draftSnap = useSnapshot(draftStore);
  const appsSnap = useSnapshot(applicationsStore);
  const authSnap = useSnapshot(authStore);
  const { toast } = useToast();
  const [started, setStarted] = useState(false);
  const [error, setError] = useState("");
  const [completionData, setCompletionData] = useState({ percentage: 0, completed: 0, total: 0 });
  const [importSourceId, setImportSourceId] = useState("");
  const [importing, setImporting] = useState(false);

  // Set application ID from URL params if available
  useEffect(() => {
    const appIdFromUrl = searchParams.get('applicationId');
    if (appIdFromUrl && appIdFromUrl !== draftSnap.currentApplicationId) {
      draftStore.setApplicationId(appIdFromUrl);
      draftStore.loadDraft(appIdFromUrl);
    }
  }, [searchParams, draftSnap.currentApplicationId]);

  useEffect(() => {
    if (authSnap.user?.id) {
      applicationsStore.loadApplications(authSnap.user.id);
    }
  }, [authSnap.user?.id]);

  useEffect(() => {
    if (draftSnap.draft.started) {
      setStarted(true);
    }

    const data = draftStore.getCompletionPercentage();
    setCompletionData(data);
  }, [draftSnap.draft.started, draftSnap.completionStatus, draftSnap.visaContext]);

  const currentApp = appsSnap.applications.find(app => app.id === draftSnap.currentApplicationId);
  const isSubmitted = currentApp?.status === "submitted";
  const completionPercentage = completionData.percentage;
  const is186 = draftSnap.visaContext === "186";
  const importCandidates = appsSnap.applications.filter((app) =>
    isLikely482Application(app, draftSnap.currentApplicationId)
  );

  const handleImportFrom482 = async () => {
    if (!importSourceId) {
      toast({ title: "Select an application", description: "Choose a Subclass 482 application to import from.", variant: "destructive" });
      return;
    }
    setImporting(true);
    try {
      const result = await draftStore.importQuestionnaireFrom482Application(importSourceId);
      if (result.success) {
        toast({
          title: "Answers imported",
          description: "Questionnaire data from your 482 application has been copied. Review and update each section as needed.",
        });
        const data = draftStore.getCompletionPercentage();
        setCompletionData(data);
        if (draftStore.draft.started) setStarted(true);
      } else {
        toast({ title: "Import failed", description: result.error || "Could not import data.", variant: "destructive" });
      }
    } finally {
      setImporting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!started) {
      setError("You must check the box to begin the application");
      return;
    }

    await draftStore.saveDraft({ started: true });
    await draftStore.markPageComplete(`${visaType}/start`);

    const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId, draftSnap.visaContext);
    if (next) router.push(next);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="rounded-2xl shadow-md bg-white">
        <CardHeader className="space-y-3 pb-6">
          <CardTitle className="text-3xl font-semibold text-slate-800">
            Get Started
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

            {is186 && !isSubmitted && importCandidates.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-3">
                <p className="text-sm font-medium text-slate-800">Import from Subclass 482</p>
                <p className="text-sm text-slate-600">
                  If you already completed questionnaire answers on a Temporary Skill Shortage (482) application, you can copy them here to save time. You can edit everything after import.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="import-482">482 application</Label>
                    <Select value={importSourceId} onValueChange={setImportSourceId}>
                      <SelectTrigger id="import-482" data-testid="select-import-482-source">
                        <SelectValue placeholder="Select application…" />
                      </SelectTrigger>
                      <SelectContent>
                        {importCandidates.map((app) => (
                          <SelectItem key={app.id} value={app.id}>
                            {app.reference || app.type || app.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={importing || !importSourceId}
                    onClick={handleImportFrom482}
                    data-testid="button-import-from-482"
                  >
                    {importing ? "Importing…" : "Import answers"}
                  </Button>
                </div>
              </div>
            )}

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
