"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { applicationsStore } from "@/stores/applicationsStore";
import { useToast } from "@/hooks/use-toast";
import { getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { CheckCircle2, AlertCircle, Send } from "lucide-react";
import { StickyNav } from "@/components/StickyNav";

export default function SubmitPage() {
  const router = useRouter();
  const pathname = usePathname();
  const visaType = getVisaTypeFromPath(pathname);
  const { toast } = useToast();
  const draftSnap = useSnapshot(draftStore);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completionData, setCompletionData] = useState({ percentage: 0, completed: 0, total: 0 });

  useEffect(() => {
    const data = draftStore.getCompletionPercentage();
    setCompletionData(data);
  }, [draftSnap.completionStatus]);

  const completionPercentage = completionData.percentage;
  const isFullyComplete = completionPercentage === 100;

  const handlePrevious = () => {
    const prev = getPreviousRoute(pathname, visaType, draftSnap.currentApplicationId);
    if (prev) router.push(prev);
  };

  const handleSubmit = async () => {
    if (!isFullyComplete) {
      toast({
        title: "Incomplete Application",
        description: "Please complete all sections before submitting.",
        variant: "destructive",
      });
      return;
    }

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

      router.push(`/intake/${visaType}/start`);
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

  return (
    <Card className="rounded-2xl shadow-md bg-white">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">
          Review & Submit
        </CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          Review your application before final submission
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
                  {isFullyComplete ? 'Application Complete' : 'Application Incomplete'}
                </h3>
                <p className={`text-sm mt-1 ${isFullyComplete ? 'text-green-700' : 'text-yellow-700'}`}>
                  {isFullyComplete
                    ? 'All sections have been completed. You may now submit your application.'
                    : `You have completed ${completionPercentage}% of the application. Please complete all sections before submitting.`
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
                <span>Review all sections to ensure accuracy</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400 mt-1">•</span>
                <span>Make sure all required documents are uploaded</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400 mt-1">•</span>
                <span>Once submitted, you may need to contact support to make changes</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400 mt-1">•</span>
                <span>You will receive a confirmation email after submission</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons - Desktop */}
          <div className="hidden lg:flex items-center justify-between pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              className="min-h-9"
              data-testid="button-previous"
            >
              ← Previous
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isFullyComplete || isSubmitting}
              className="min-h-9 bg-[#285646] hover:bg-[#1e4336] text-white"
              data-testid="button-submit"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-pulse">Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Application
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
      {/* Mobile Navigation */}
      <StickyNav
        onPrevious={handlePrevious}
        onNext={handleSubmit}
        nextLabel={isSubmitting ? "Submitting..." : "Submit Application"}
        nextDisabled={!isFullyComplete || isSubmitting}
        previousTestId="button-previous-mobile"
        nextTestId="button-submit-mobile"
      />
    </Card>
  );
}
