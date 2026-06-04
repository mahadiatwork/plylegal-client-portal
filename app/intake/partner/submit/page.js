"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { applicationsStore } from "@/stores/applicationsStore";
import { useToast } from "@/hooks/use-toast";
import { buildIntakeHref, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { FormNavigation } from "@/components/FormNavigation";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";
import { getIncompleteChecklist } from "@/lib/submitCompletion";

export default function SubmitPage() {
  const router = useRouter();
  const { startNavigation } = useNavigationLoading();
  const pathname = usePathname();
  const visaType = getVisaTypeFromPath(pathname);
  const { toast } = useToast();
  const draftSnap = useSnapshot(draftStore);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [completionData, setCompletionData] = useState({ percentage: 0, completed: 0, total: 0 });

  useEffect(() => {
    const data = draftStore.getCompletionPercentage();
    setCompletionData(data);
  }, [draftSnap.completionStatus]);

  const completionPercentage = completionData.percentage;
  const isFullyComplete = completionPercentage === 100;
  const incompleteItems = useMemo(
    () =>
      getIncompleteChecklist({
        visaType,
        visaContext: draftSnap.visaContext,
        completionStatus: draftSnap.completionStatus,
        draft: draftSnap.draft,
      }),
    [visaType, draftSnap.visaContext, draftSnap.completionStatus, draftSnap.draft]
  );

  const handlePrevious = () => {
    const prev = getPreviousRoute(pathname, visaType);
    startNavigation(prev);
    if (prev) router.push(prev);
  };

  const submitApplication = async () => {
    setIsSubmitting(true);
    try {
      const appId = draftSnap.currentApplicationId;

      if (!appId) {
        throw new Error("No application ID found");
      }

      // Update application status to submitted
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

      // Navigate back to the intake start page using dynamic routing
      const startHref = buildIntakeHref({
        appId,
        internalHref: `/intake/${visaType}/start`,
        visaType,
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
    if (isSubmitting) return;

    if (incompleteItems.length > 0) {
      setConfirmOpen(true);
      return;
    }

    await submitApplication();
  };

  return (
    <Card className="rounded-2xl shadow-md bg-white">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">
          Review & Submit
        </CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          Take a moment to review your answers before submitting.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Completion Status */}
          <div className={`p-6 rounded-lg border ${isFullyComplete ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
            <div className="flex items-start gap-4">
              {isFullyComplete ? (
                <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <h3 className={`font-semibold ${isFullyComplete ? 'text-green-900' : 'text-yellow-900'}`}>
                  {isFullyComplete ? 'Questionnaire Complete' : 'Questionnaire Incomplete'}
                </h3>
                <p className={`text-sm mt-1 ${isFullyComplete ? 'text-green-700' : 'text-yellow-700'}`}>
                  {isFullyComplete
                    ? 'All sections have now been completed. When you are ready, you may submit your questionnaire.'
                    : `You have completed ${completionPercentage}% of the questionnaire. Please complete all sections before submitting.`
                  }
                </p>
              </div>
            </div>
          </div>

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

          {/* Action Buttons - Desktop */}
          <FormNavigation
            onPrev={handlePrevious}
            onNext={handleSubmit}
            disabledNext={isSubmitting}
            nextLabel={isSubmitting ? "Submitting..." : "Submit"}
            loading={isSubmitting}
          />
        </div>
      </CardContent>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>You Still Have Unfinished Items</DialogTitle>
            <DialogDescription>
              You still have items that are not finished. Are you sure you want to submit?
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
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={async () => {
                setConfirmOpen(false);
                await submitApplication();
              }}
              disabled={isSubmitting}
              className="bg-[#4F726B] text-white hover:bg-[#4F726B]"
            >
              Submit Anyway
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card >
  );
}
