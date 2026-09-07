"use client";

import { useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSnapshot } from "valtio";
import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormNavigation } from "@/components/FormNavigation";
import { TemporaryWorkReviewSummary } from "@/components/intake/TemporaryWorkReviewSummary";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";
import { useToast } from "@/hooks/use-toast";
import { draftStore } from "@/stores/draftStore";
import { applicationsStore } from "@/stores/applicationsStore";
import { appDataStore } from "@/stores/appDataStore";
import { buildIntakeHref, getIntakeSlugForContext, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { getIncompleteChecklist } from "@/lib/submitCompletion";
import { buildTargetVisaReviewSections, formatTargetReviewLabel } from "@/lib/targetVisaReview";

const COMPLETE_DOCUMENT_STATUSES = new Set(["approved", "awaiting approval", "complete", "completed", "not required", "submitted", "under review", "uploaded", "verified"]);
const SUBMIT_INSTRUCTIONS = [
  "Please review your answers carefully to ensure everything is accurate.",
  "Once submitted, your questionnaire will be locked. If you need to make changes afterwards, please contact our team.",
  "You will receive a confirmation email once your questionnaire has been submitted.",
  "If you have not already done so, please go to the Upload Documents tab in the portal and upload the supporting documents for your visa application.",
];

function missingDocuments(documents, local = false) {
  return (Array.isArray(documents) ? documents : [])
    .filter((doc) => !local || doc.required === true || doc.matterDocumentId)
    .filter((doc) => !COMPLETE_DOCUMENT_STATUSES.has(String(doc.Document_Status || doc.status || "").trim().toLowerCase()))
    .map((doc) => `Upload Documents: ${doc.Name || doc.Matter_Document_Name || doc.Document_Name || doc.File_Name || doc.name || "Required document"}`);
}

export default function TargetVisaSubmitPage() {
  const pathname = usePathname();
  const router = useRouter();
  const visaType = getVisaTypeFromPath(pathname);
  const draftSnap = useSnapshot(draftStore);
  const { startNavigation } = useNavigationLoading();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [documentItems, setDocumentItems] = useState([]);
  const submissionInFlight = useRef(false);
  const questionnaireItems = useMemo(() => getIncompleteChecklist({
    visaType, draft: draftSnap.draft, completionStatus: draftSnap.completionStatus,
  }), [visaType, draftSnap.draft, draftSnap.completionStatus]);
  const incompleteItems = [...questionnaireItems, ...documentItems];
  const reviewSections = useMemo(() => buildTargetVisaReviewSections({
    visaType, draft: draftSnap.draft, appId: draftSnap.currentApplicationId,
  }), [visaType, draftSnap.draft, draftSnap.currentApplicationId]);

  const navigate = (href) => {
    if (!href) return;
    startNavigation(href);
    router.push(href);
  };

  const checkDocuments = async (appId) => {
    const application = applicationsStore.applications.find((app) => String(app.id) === String(appId));
    if (!application?.zohoId) return missingDocuments(appDataStore.loadUploads(appId) || [], true);
    try {
      const response = await fetch(`/api/uploads/matter-documents?dealId=${encodeURIComponent(application.zohoId)}`);
      const result = await response.json();
      if (!response.ok || !result.success) return ["Upload Documents: Unable to verify required document uploads"];
      return missingDocuments(result.documents);
    } catch {
      return ["Upload Documents: Unable to verify required document uploads"];
    }
  };

  const handleSubmit = async () => {
    if (submissionInFlight.current) return;
    submissionInFlight.current = true;
    setIsSubmitting(true);
    try {
      const appId = draftStore.currentApplicationId;
      if (!appId) throw new Error("No application ID found");
      const requiredDocuments = await checkDocuments(appId);
      if (draftStore.currentApplicationId !== appId) throw new Error("The current application changed. Please review it before submitting.");
      setDocumentItems(requiredDocuments);
      const requiredQuestions = getIncompleteChecklist({ visaType, draft: draftStore.draft, completionStatus: draftStore.completionStatus });
      if (requiredQuestions.length || requiredDocuments.length) {
        setConfirmOpen(true);
        return;
      }
      const result = await applicationsStore.updateApplication(appId, { status: "submitted", submittedAt: new Date().toISOString() });
      if (!result.success) throw new Error(result.error || "Failed to update application status");
      toast({ title: "Application Submitted Successfully", description: "Your application has been submitted and is now under review." });
      navigate(buildIntakeHref({ appId, internalHref: `/intake/${visaType}/start`, visaType }));
    } catch (error) {
      toast({ title: "Submission Failed", description: error.message || "Failed to submit application. Please try again.", variant: "destructive" });
    } finally {
      submissionInFlight.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="rounded-2xl shadow-md bg-white">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Review &amp; Submit</CardTitle>
        <p className="text-sm text-gray-600 mt-2">Take a moment to review your answers before submitting.</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {questionnaireItems.length === 0 && (
            <div className="p-6 rounded-lg border bg-green-50 border-green-200">
              <div className="flex items-start gap-4">
                <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                <div><h3 className="font-semibold text-green-900">Questionnaire Complete</h3>
                  <p className="text-sm mt-1 text-green-700">All sections have now been completed. When you are ready, you may submit your questionnaire.</p></div>
              </div>
            </div>
          )}
          <div className="p-6 rounded-lg border border-gray-200 bg-white">
            <h3 className="font-semibold text-gray-900 mb-3">Before You Submit</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              {SUBMIT_INSTRUCTIONS.map((instruction) => <li key={instruction} className="flex items-start gap-2"><span className="text-gray-400 mt-1">•</span><span>{instruction}</span></li>)}
            </ul>
          </div>
          <TemporaryWorkReviewSummary sections={reviewSections} formatLabel={formatTargetReviewLabel} />
          <FormNavigation onPrev={() => navigate(getPreviousRoute(pathname, visaType, draftSnap.currentApplicationId))} onNext={handleSubmit} nextLabel="Submit" loading={isSubmitting} disabledNext={isSubmitting} />
        </div>
      </CardContent>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Complete Required Items Before Submitting</DialogTitle>
            <DialogDescription>Complete the following questionnaire items and required document uploads before submitting.</DialogDescription>
          </DialogHeader>
          <div className="max-h-72 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-4">
            <ul className="space-y-2 text-sm text-slate-700">{incompleteItems.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul>
          </div>
          <div className="mt-2 flex justify-end gap-3">
            {documentItems.length > 0 && <Button type="button" variant="outline" onClick={() => navigate(`/applications/${getIntakeSlugForContext(visaType)}/${encodeURIComponent(draftSnap.currentApplicationId)}/uploads`)}>Upload Documents</Button>}
            <Button type="button" onClick={() => setConfirmOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
