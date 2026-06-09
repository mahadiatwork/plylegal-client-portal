"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { applicationsStore } from "@/stores/applicationsStore";
import { appDataStore } from "@/stores/appDataStore";
import { useToast } from "@/hooks/use-toast";
import {
  buildIntakeHref,
  getIntakeSlugForContext,
  getPreviousRoute,
  getVisaTypeFromPath,
} from "@/lib/routes";
import { AlertTriangle, CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import { FormNavigation } from "@/components/FormNavigation";
import { TemporaryWorkReviewSummary } from "@/components/intake/TemporaryWorkReviewSummary";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";
import { getIncompleteChecklist } from "@/lib/submitCompletion";
import { buildTemporaryWorkReviewSections } from "@/lib/temporaryWorkReview";

const COMPLETE_DOCUMENT_STATUSES = new Set([
  "approved",
  "awaiting approval",
  "complete",
  "completed",
  "not required",
  "submitted",
  "under review",
  "uploaded",
  "verified",
]);

function normalizeDocumentStatus(status) {
  return String(status || "").trim().toLowerCase();
}

function isDocumentIncomplete(status) {
  const normalized = normalizeDocumentStatus(status);
  if (!normalized) return true;
  return !COMPLETE_DOCUMENT_STATUSES.has(normalized);
}

function getMatterDocumentName(doc) {
  return (
    doc?.Name ||
    doc?.Matter_Document_Name ||
    doc?.Document_Name ||
    doc?.File_Name ||
    doc?.name ||
    "Required document"
  );
}

function buildDocumentUploadChecklist(documents, { requireExplicitRequirement = false } = {}) {
  if (!Array.isArray(documents) || documents.length === 0) return [];

  return documents
    .filter((doc) => {
      if (requireExplicitRequirement && doc?.required !== true && !doc?.matterDocumentId) {
        return false;
      }
      return isDocumentIncomplete(doc?.Document_Status || doc?.status);
    })
    .map((doc) => `Upload Documents: ${getMatterDocumentName(doc)}`);
}

const RESET_CONFIRMATION_PHRASE = "reset my questionnaire";

function getApplicationResetReference(application, appId) {
  return String(application?.reference || application?.id || appId || "").trim();
}

export default function SubmitPage() {
  const router = useRouter();
  const { startNavigation } = useNavigationLoading();
  const pathname = usePathname();
  const visaType = getVisaTypeFromPath(pathname);
  const { toast } = useToast();
  const draftSnap = useSnapshot(draftStore);
  const applicationsSnap = useSnapshot(applicationsStore);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingRequirements, setIsCheckingRequirements] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [completionData, setCompletionData] = useState({ percentage: 0, completed: 0, total: 0 });
  const [documentIncompleteItems, setDocumentIncompleteItems] = useState([]);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetReferenceInput, setResetReferenceInput] = useState("");
  const [resetPhraseInput, setResetPhraseInput] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    const data = draftStore.getCompletionPercentage();
    setCompletionData(data);
  }, [draftSnap.completionStatus]);

  useEffect(() => {
    if (draftSnap.currentApplicationId) {
      appDataStore.loadUploads(draftSnap.currentApplicationId);
    }
  }, [draftSnap.currentApplicationId]);

  const completionPercentage = completionData.percentage;
  const isFullyComplete = completionPercentage === 100;
  const intakeSlug = getIntakeSlugForContext(visaType, draftSnap.visaContext);
  const questionnaireIncompleteItems = useMemo(
    () =>
      getIncompleteChecklist({
        visaType,
        visaContext: draftSnap.visaContext,
        completionStatus: draftSnap.completionStatus,
        draft: draftSnap.draft,
      }),
    [visaType, draftSnap.visaContext, draftSnap.completionStatus, draftSnap.draft]
  );
  const incompleteItems = useMemo(
    () => [...questionnaireIncompleteItems, ...documentIncompleteItems],
    [questionnaireIncompleteItems, documentIncompleteItems]
  );
  const hasDocumentUploadIssues = incompleteItems.some((item) => item.startsWith("Upload Documents:"));
  const currentApplication = useMemo(() => {
    const appId = draftSnap.currentApplicationId;
    if (!appId) return null;
    return applicationsSnap.applications.find((app) => String(app.id) === String(appId)) || null;
  }, [applicationsSnap.applications, draftSnap.currentApplicationId]);
  const resetReference = getApplicationResetReference(currentApplication, draftSnap.currentApplicationId);
  const resetReferenceLabel = currentApplication?.reference ? "application reference" : "application ID";
  const canResetQuestionnaire =
    visaType === "temporary-work" &&
    (draftSnap.visaContext === "186" || draftSnap.visaContext === "482");
  const canConfirmReset =
    canResetQuestionnaire &&
    Boolean(resetReference) &&
    resetReferenceInput.trim() === resetReference &&
    resetPhraseInput.trim() === RESET_CONFIRMATION_PHRASE &&
    !isResetting;
  const reviewSections = useMemo(
    () =>
      buildTemporaryWorkReviewSections({
        draft: draftSnap.draft,
        visaContext: draftSnap.visaContext,
        appId: draftSnap.currentApplicationId,
        slug: intakeSlug,
      }),
    [draftSnap.draft, draftSnap.visaContext, draftSnap.currentApplicationId, intakeSlug]
  );

  const handlePrevious = () => {
    const prev = getPreviousRoute(pathname, visaType, draftSnap.currentApplicationId, draftSnap.visaContext);
    if (prev) {
      startNavigation(prev);
      router.push(prev);
    }
  };

  const getDocumentUploadIncompleteItems = async () => {
    const appId = draftStore.currentApplicationId || draftSnap.currentApplicationId;
    if (!appId) return [];

    const application =
      applicationsStore.applications.find((app) => app.id === appId) ||
      applicationsSnap.applications.find((app) => app.id === appId);

    if (application?.zohoId) {
      try {
        const response = await fetch(`/api/uploads/matter-documents?dealId=${application.zohoId}`);
        const result = await response.json();

        if (!response.ok || !result.success) {
          return ["Upload Documents: Unable to verify required document uploads"];
        }

        return buildDocumentUploadChecklist(result.documents || []);
      } catch {
        return ["Upload Documents: Unable to verify required document uploads"];
      }
    }

    const localUploads = appDataStore.loadUploads(appId) || [];
    return buildDocumentUploadChecklist(localUploads, { requireExplicitRequirement: true });
  };

  const getCurrentIncompleteItems = async () => {
    const questionnaireItems = getIncompleteChecklist({
      visaType,
      visaContext: draftStore.visaContext ?? draftStore.draft?.visaContext,
      completionStatus: draftStore.completionStatus,
      draft: draftStore.draft,
    });
    const documentItems = await getDocumentUploadIncompleteItems();
    setDocumentIncompleteItems(documentItems);
    return [...questionnaireItems, ...documentItems];
  };

  const blockSubmission = (items) => {
    if (items.length === 0) return false;

    setConfirmOpen(true);
    toast({
      title: "Submission blocked",
      description: "Please complete all required questionnaire items and document uploads before submitting.",
      variant: "destructive",
    });
    return true;
  };

  const submitApplication = async () => {
    const currentIncompleteItems = await getCurrentIncompleteItems();
    if (blockSubmission(currentIncompleteItems)) return;

    setIsSubmitting(true);
    try {
      const appId = draftSnap.currentApplicationId;

      if (!appId) {
        throw new Error("No application ID found");
      }

      const result = await applicationsStore.updateApplication(appId, {
        status: "submitted",
        submittedAt: new Date().toISOString(),
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to update application status");
      }

      toast({
        title: "Application Submitted Successfully",
        description: "Your application has been submitted and is now under review.",
      });

      const startHref = buildIntakeHref({
        appId,
        internalHref: `/intake/${visaType}/start`,
        visaType,
        visaContext: draftSnap.visaContext,
      });
      startNavigation(startHref);
      router.push(startHref);
    } catch (error) {
      console.error("Submission error:", error);
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting || isCheckingRequirements) return;

    setIsCheckingRequirements(true);
    try {
      const currentIncompleteItems = await getCurrentIncompleteItems();
      if (blockSubmission(currentIncompleteItems)) return;

      await submitApplication();
    } finally {
      setIsCheckingRequirements(false);
    }
  };

  const handleGoToUploads = () => {
    const appId = draftSnap.currentApplicationId;
    if (!appId) return;

    const slug = getIntakeSlugForContext(visaType, draftSnap.visaContext);
    const uploadsHref = `/applications/${slug}/${encodeURIComponent(appId)}/uploads`;
    setConfirmOpen(false);
    startNavigation(uploadsHref);
    router.push(uploadsHref);
  };

  const handleResetOpenChange = (open) => {
    if (isResetting) return;
    setResetOpen(open);
    if (!open) {
      setResetReferenceInput("");
      setResetPhraseInput("");
    }
  };

  const handleResetQuestionnaire = async () => {
    if (!canConfirmReset) return;

    const appId = draftStore.currentApplicationId || draftSnap.currentApplicationId;
    const visaContext = draftStore.visaContext ?? draftStore.draft?.visaContext ?? draftSnap.visaContext;
    if (!appId || (visaContext !== "186" && visaContext !== "482")) return;

    setIsResetting(true);
    try {
      const result = await draftStore.resetQuestionnaire(appId, { visaContext });
      if (!result.success) {
        throw new Error(result.error || "Failed to reset questionnaire");
      }

      toast({
        title: "Questionnaire reset",
        description: "Your questionnaire answers have been cleared. You can start again now.",
      });

      setResetOpen(false);
      setResetReferenceInput("");
      setResetPhraseInput("");

      const startHref = buildIntakeHref({
        appId,
        internalHref: "/intake/temporary-work/start",
        visaType: "temporary-work",
        visaContext,
      });
      startNavigation(startHref);
      router.push(startHref);
    } catch (error) {
      console.error("Questionnaire reset error:", error);
      toast({
        title: "Reset failed",
        description: error.message || "We could not reset your questionnaire. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Card className="rounded-2xl shadow-md bg-white">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">
          Review &amp; Submit
        </CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          Take a moment to review your answers before submitting.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {isFullyComplete && (
            <div className="p-6 rounded-lg border bg-green-50 border-green-200">
              <div className="flex items-start gap-4">
                <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-green-900">Questionnaire Complete</h3>
                  <p className="text-sm mt-1 text-green-700">
                    All sections have now been completed. When you are ready, you may submit your questionnaire.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Submission Information */}
          <div className="p-6 rounded-lg border border-gray-200 bg-white">
            <h3 className="font-semibold text-gray-900 mb-3">Before You Submit</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-gray-400 mt-1">•</span>
                <span>Please review your answers carefully to ensure everything is accurate.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400 mt-1">•</span>
                <span>Once submitted, your questionnaire will be locked. If you need to make changes afterwards, please contact our team.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400 mt-1">•</span>
                <span>You will receive a confirmation email once your questionnaire has been submitted.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400 mt-1">•</span>
                <span>If you have not already done so, please go to the Upload Documents tab in the portal and upload the supporting documents for your visa application.</span>
              </li>
            </ul>
          </div>

          <TemporaryWorkReviewSummary sections={reviewSections} />

          {canResetQuestionnaire && (
            <div className="rounded-lg border border-red-200 bg-red-50/40 p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
                  <div>
                    <h3 className="font-semibold text-red-950">Danger Zone</h3>
                    <p className="mt-1 text-sm leading-6 text-red-800">
                      Resetting clears all saved questionnaire answers, included applicants, family members, and completion for this application. Uploaded documents and messages are kept.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleResetOpenChange(true)}
                  disabled={isSubmitting || isCheckingRequirements || isResetting}
                  data-testid="button-open-reset-questionnaire"
                  className="min-h-10 flex-shrink-0 border-red-300 bg-white text-red-700 hover:bg-red-50 hover:text-red-800"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset questionnaire
                </Button>
              </div>
            </div>
          )}

          {/* Form Navigation */}
          <FormNavigation
            onPrev={handlePrevious}
            onNext={handleSubmit}
            nextLabel={isSubmitting ? "Submitting..." : isCheckingRequirements ? "Checking..." : "Submit"}
            disabledNext={isSubmitting || isCheckingRequirements}
            loading={isSubmitting || isCheckingRequirements}
            onSave={null} // No save button
          />
        </div>
      </CardContent>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Complete Required Items Before Submitting</DialogTitle>
            <DialogDescription>
              Submission is blocked until every required question, detail field, and required document upload is complete.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-72 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-4">
            <ul className="space-y-2 text-sm text-slate-700">
              {incompleteItems.map((item, index) => (
                <li key={`${item}-${index}`} className="flex items-start gap-2">
                  <span className="mt-1 text-slate-400">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-2 flex justify-end gap-3">
            {hasDocumentUploadIssues && (
              <Button
                type="button"
                variant="outline"
                onClick={handleGoToUploads}
                disabled={isSubmitting || isCheckingRequirements}
              >
                Upload Documents
              </Button>
            )}
            <Button
              type="button"
              onClick={() => setConfirmOpen(false)}
              disabled={isSubmitting || isCheckingRequirements}
              className="bg-[#4F726B] text-white hover:bg-[#4F726B]"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={resetOpen} onOpenChange={handleResetOpenChange}>
        <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0">
          <div className="p-6 sm:p-8">
            <DialogHeader>
              <DialogTitle className="text-2xl">Reset Questionnaire</DialogTitle>
              <DialogDescription className="pt-2 text-base leading-7">
                This will permanently clear your saved questionnaire answers for this application.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="border-y border-slate-200 bg-slate-50 p-6 sm:p-8">
            <div className="space-y-6">
              <div>
                <label htmlFor="reset-reference" className="text-sm font-semibold text-slate-900">
                  To confirm, type the {resetReferenceLabel} <span className="font-bold">{resetReference}</span>
                </label>
                <Input
                  id="reset-reference"
                  value={resetReferenceInput}
                  onChange={(event) => setResetReferenceInput(event.target.value)}
                  disabled={isResetting}
                  data-testid="input-reset-reference"
                  className="mt-3 h-11 bg-white"
                  autoComplete="off"
                />
              </div>

              <div>
                <label htmlFor="reset-phrase" className="text-sm font-semibold text-slate-900">
                  To confirm, type <span className="font-bold">{RESET_CONFIRMATION_PHRASE}</span>
                </label>
                <Input
                  id="reset-phrase"
                  value={resetPhraseInput}
                  onChange={(event) => setResetPhraseInput(event.target.value)}
                  disabled={isResetting}
                  data-testid="input-reset-phrase"
                  className="mt-3 h-11 bg-white"
                  autoComplete="off"
                />
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="mb-6 flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-red-800">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <p className="text-sm font-medium leading-6">
                Resetting this questionnaire cannot be undone.
              </p>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleResetOpenChange(false)}
                disabled={isResetting}
                data-testid="button-cancel-reset-questionnaire"
                className="min-h-11"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleResetQuestionnaire}
                disabled={!canConfirmReset}
                data-testid="button-confirm-reset-questionnaire"
                className="min-h-11 min-w-[180px]"
              >
                {isResetting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  "Reset questionnaire"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
