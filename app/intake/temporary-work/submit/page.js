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
import { StickyNav } from "@/components/StickyNav"; // Should be able to remove this line potentially, but StickyNav is used in line 176... wait, I am replacing the usage.
import { FormNavigation } from "@/components/FormNavigation";

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
          Submit Questionnaire
        </CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          Please review your answers before submitting your questionnaire to your migration agent.
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
                <span>By clicking <strong>Submit</strong>, the information you have provided in this questionnaire will be sent to your migration agent for review.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400 mt-1">•</span>
                <span>Once submitted, your migration agent will review your responses and contact you if additional information is required.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400 mt-1">•</span>
                <span>Please ensure all details provided are accurate and complete before proceeding.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400 mt-1">•</span>
                <span>Incomplete or incorrect information may result in delays or refusal of your visa application.</span>
              </li>
            </ul>
          </div>

          {/* Form Navigation */}
          <FormNavigation
            onPrev={handlePrevious}
            onNext={handleSubmit}
            nextLabel={isSubmitting ? "Submitting..." : "Submit Questionnaire"}
            disabledNext={!isFullyComplete || isSubmitting}
            loading={isSubmitting}
            onSave={null} // No save button
          />
        </div>
      </CardContent>
    </Card>
  );
}

