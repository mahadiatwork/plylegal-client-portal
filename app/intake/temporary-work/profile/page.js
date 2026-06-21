"use client";

import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { applicationsStore } from "@/stores/applicationsStore";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Loader2 } from "lucide-react";
import { authStore } from "@/stores";
import { usePathname, useSearchParams } from "next/navigation";
import { getApplicationIdFromPathname } from "@/lib/routes";
import { getApplicationIdFromSearchParams } from "@/lib/intakeQueryParams";
import VisaProfilePage from "@/components/intake/VisaProfilePage";

const RELATIONSHIPS = [
  { value: "main_applicant", label: "Main Applicant (Nominated Worker)" },
  { value: "spouse", label: "Spouse or De Facto Partner" },
  { value: "child", label: "Dependent Child" },
  { value: "other", label: "Other Dependent" },
];

const INFO_ITEMS = [
  "Main applicant",
  "Spouse or de facto partner",
  "Dependent children",
];

function isLikelyQuestionnaireImportSource(app, currentId) {
  if (!app?.id || app.id === currentId) return false;
  const type = String(app.type || "").toLowerCase();
  const reference = String(app.reference || "").toLowerCase();
  const combined = `${type} ${reference}`;
  return (
    combined.includes("482") ||
    combined.includes("186") ||
    combined.includes("temporary work") ||
    combined.includes("skills in demand") ||
    combined.includes("skill shortage") ||
    combined.includes("temporary skill") ||
    combined.includes("tss") ||
    combined.includes("employer nomination")
  );
}

function getApplicationImportLabel(app) {
  return [app?.reference, app?.type].filter(Boolean).join(" · ") || app?.id || "Previous application";
}

/**
 * 186-specific import section — rendered only when visaContext === '186'.
 * Passed as `extraContent` to the shared VisaProfilePage component.
 */
function ImportSection() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const draftSnap = useSnapshot(draftStore);
  const appsSnap = useSnapshot(applicationsStore);
  const authSnap = useSnapshot(authStore);
  const { toast } = useToast();

  const [importSourceId, setImportSourceId] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState(null);

  useEffect(() => {
    if (authSnap.user?.id && appsSnap.applications.length === 0) {
      applicationsStore.loadApplications(authSnap.user.id);
    }
  }, [authSnap.user?.id, appsSnap.applications.length]);

  // Sync application ID from URL
  useEffect(() => {
    const appIdFromUrl =
      getApplicationIdFromSearchParams(searchParams) ?? getApplicationIdFromPathname(pathname);
    if (appIdFromUrl && appIdFromUrl !== draftSnap.currentApplicationId) {
      draftStore.setApplicationId(appIdFromUrl);
      draftStore.loadDraft(appIdFromUrl);
    }
  }, [searchParams, pathname, draftSnap.currentApplicationId]);

  const profiles = draftSnap.draft?.profiles || [];
  const hasMainApplicant = profiles.some(p => p.relationship === "main_applicant");
  const is186 = draftSnap.visaContext === "186";
  const currentApp = appsSnap.applications.find((app) => String(app.id) === String(draftSnap.currentApplicationId));
  const isSubmitted = currentApp?.status === "submitted";
  const importCandidates = appsSnap.applications.filter((app) =>
    isLikelyQuestionnaireImportSource(app, draftSnap.currentApplicationId)
  );

  const handleImportQuestionnaire = async () => {
    if (!importSourceId) {
      toast({
        title: "Select an application",
        description: "Choose a previous 482 or 186 matter to import from.",
        variant: "destructive",
      });
      return;
    }
    if (!hasMainApplicant) {
      toast({
        title: "Add the primary applicant first",
        description: "Complete the Included Applicants list before importing answers.",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    try {
      const result = await draftStore.importQuestionnaireFromApplication(importSourceId, {
        targetProfiles: profiles,
        targetVisaContext: "186",
      });
      if (result.success) {
        setImportSummary(result.summary || null);
        const matchedCount = result.summary?.matchedApplicants?.length || 0;
        const unmatchedCount = result.summary?.unmatchedTargetApplicants?.length || 0;
        toast({
          title: "Answers imported",
          description: `${matchedCount} applicant${matchedCount === 1 ? "" : "s"} matched.${unmatchedCount ? ` ${unmatchedCount} applicant${unmatchedCount === 1 ? "" : "s"} still need completion.` : " Review each section before submitting."}`,
        });
      } else {
        toast({
          title: "Import failed",
          description: result.error || "Could not import questionnaire data.",
          variant: "destructive",
        });
      }
    } finally {
      setIsImporting(false);
    }
  };

  if (!is186 || !hasMainApplicant || isSubmitted || importCandidates.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-800">Import Existing Information</p>
        <p className="text-sm text-slate-600">
          If you have previously completed a Ply Legal questionnaire for another visa application, you may be able to import your information to save time. All details can be reviewed and edited after import.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="import-questionnaire-source">Previous visa application</Label>
          <Select value={importSourceId} onValueChange={setImportSourceId}>
            <SelectTrigger id="import-questionnaire-source" data-testid="select-import-questionnaire-source">
              <SelectValue placeholder="Select previous application…" />
            </SelectTrigger>
            <SelectContent>
              {importCandidates.map((app) => (
                <SelectItem key={app.id} value={app.id}>
                  {getApplicationImportLabel(app)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={isImporting || !importSourceId}
          onClick={handleImportQuestionnaire}
          data-testid="button-import-questionnaire"
        >
          {isImporting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Importing…
            </>
          ) : (
            "Import information"
          )}
        </Button>
      </div>

      {importSummary && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 space-y-2">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Import summary</p>
              <p>
                {importSummary.matchedApplicants?.length || 0} matched · {importSummary.skippedSourceApplicants?.length || 0} skipped · {importSummary.unmatchedTargetApplicants?.length || 0} need completion
              </p>
            </div>
          </div>
          {importSummary.unmatchedTargetApplicants?.length > 0 && (
            <p className="text-xs text-emerald-800">
              Needs completion: {importSummary.unmatchedTargetApplicants.map((person) => person.name).join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function ApplicationProfilePage() {
  return (
    <VisaProfilePage
      relationships={RELATIONSHIPS}
      detailsSectionKey="temporary_work_details"
      continueHref="/intake/temporary-work/main-applicant/details"
      infoItems={INFO_ITEMS}
      extraContent={<ImportSection />}
    />
  );
}
