"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { useToast } from "@/hooks/use-toast";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { StickyNav } from "@/components/StickyNav";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { FormNavigation } from "@/components/FormNavigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";
const formSchema = z.object({
  medical_condition: z.enum(["yes", "no"]).optional(),
  requires_assistance: z.enum(["yes", "no"]).optional(),
  health_insurance: z.enum(["yes", "no"]).optional(),
});
export default function Page() {
  const router = useRouter();
  const { startNavigation } = useNavigationLoading();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const visaType = getVisaTypeFromPath(pathname);
  const { toast } = useToast();
  const draftSnap = useSnapshot(draftStore);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  useEffect(() => {
    const appIdFromUrl = searchParams.get('applicationId');
    if (appIdFromUrl && appIdFromUrl !== draftSnap.currentApplicationId) {
      draftStore.setApplicationId(appIdFromUrl);
      draftStore.loadDraft(appIdFromUrl);
    }
  }, [searchParams, draftSnap.currentApplicationId]);
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      medical_condition: "no",
      requires_assistance: "no",
      health_insurance: "no",
    },
  });
  useEffect(() => {
    const savedData = draftSnap.draft?.protection_health || {};
    if (Object.keys(savedData).length > 0) {
      form.reset({
        medical_condition: savedData.medical_condition || "",
        requires_assistance: savedData.requires_assistance || "",
        health_insurance: savedData.health_insurance || "",
      });
    }
  }, [draftSnap.draft?.protection_health]);
  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      await draftStore.saveSectionData("protection_health", data);
      await draftStore.markPageComplete(`${visaType}/all-applicants/health`, null, "protection_health");
      const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId);
      startNavigation(next);
      if (next) router.push(next);
    } catch (error) {
      console.error("Error submitting:", error);
      toast({ title: "Error", description: "Failed to submit", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  const handlePrevious = () => {
    const prev = getPreviousRoute(pathname, visaType, draftSnap.currentApplicationId);
    startNavigation(prev);
    if (prev) router.push(prev);
  };
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const isValid = await form.trigger();
      if (!isValid) {
        toast({
          title: "Validation Error",
          description: "Please fix the errors in the form before saving",
          variant: "destructive",
        });
        return;
      }
      const formData = form.getValues();
      console.log("Saving protection_health data:", formData);
      const result = await draftStore.saveSectionData("protection_health", formData);

      if (result.success) {
        toast({
          title: "Draft saved",
          description: "Your changes have been saved successfully",
        });
      } else {
        console.error("Save failed:", result.error);
        toast({
          title: "Error",
          description: result.error || "Failed to save changes",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error in handleSave:", error);
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <div className="min-h-screen bg-[#E0E7FF]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <CardTitle className="text-2xl font-semibold">Health</CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Provide health information for all applicants.
          </p>
        </div>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="bg-card border border-border rounded-lg p-6 space-y-6">
            <div className="space-y-2">
              <Label>Do you or any family member have any significant medical conditions?</Label>
              <RadioGroup
                value={form.watch("medical_condition")}
                onValueChange={(value) => form.setValue("medical_condition", value)}
              >
                <div className="flex gap-4">
                  {["yes", "no"].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`medical-${option}`} data-testid={`radio-medical-${option}`} />
                      <Label htmlFor={`medical-${option}`}>{option === "yes" ? "Yes" : "No"}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>Do you or any family member require assistance with mobility or self-care?</Label>
              <RadioGroup
                value={form.watch("requires_assistance")}
                onValueChange={(value) => form.setValue("requires_assistance", value)}
              >
                <div className="flex gap-4">
                  {["yes", "no"].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`assistance-${option}`} data-testid={`radio-assistance-${option}`} />
                      <Label htmlFor={`assistance-${option}`}>{option === "yes" ? "Yes" : "No"}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>Do you have adequate health insurance coverage for Australia?</Label>
              <RadioGroup
                value={form.watch("health_insurance")}
                onValueChange={(value) => form.setValue("health_insurance", value)}
              >
                <div className="flex gap-4">
                  {["yes", "no"].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`insurance-${option}`} data-testid={`radio-insurance-${option}`} />
                      <Label htmlFor={`insurance-${option}`}>{option === "yes" ? "Yes" : "No"}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>
          </div>
          <FormNavigation
            onPrev={handlePrevious}
            onNext={form.handleSubmit(onSubmit)}
            onSave={handleSave}
            loading={isSaving}
            submitting={isSubmitting}
            disabledNext={!form.formState.isValid}
          />
        </form>
      </div>
    </div >
  );
}