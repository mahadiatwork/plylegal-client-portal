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
import { CheckCircle2 } from "lucide-react";
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
    </Card>
  );
}
