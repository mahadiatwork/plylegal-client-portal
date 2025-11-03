"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { useToast } from "@/hooks/use-toast";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { StickyNav } from "@/components/StickyNav";

const formSchema = z.object({
  previous_visa_refusal: z.enum(["yes", "no"]).optional(),
  current_visa_held: z.enum(["yes", "no"]).optional(),
});

export default function Page() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const visaType = getVisaTypeFromPath(pathname);
  const { toast } = useToast();
  const draftSnap = useSnapshot(draftStore);

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
      previous_visa_refusal: "",
      current_visa_held: "",
    },
  });

  useEffect(() => {
    const savedData = draftSnap.draft?.temporary_work_visas || {};
    if (Object.keys(savedData).length > 0) {
      Object.keys(savedData).forEach((key) => {
        if (savedData[key] !== undefined && savedData[key] !== null) {
          form.setValue(key, savedData[key]);
        }
      });
    }
  }, []);

  const onSubmit = async (data) => {
    await draftStore.saveSectionData("temporary_work_visas", data);
    await draftStore.markPageComplete(`${visaType}/all-applicants/visas`);
    const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId);
    if (next) router.push(next);
  };

  const handlePrevious = () => {
    const prev = getPreviousRoute(pathname, visaType, draftSnap.currentApplicationId);
    if (prev) router.push(prev);
  };

  const handleSave = async () => {
    const values = form.getValues();
    const result = await draftStore.saveSectionData("temporary_work_visas", values);
    if (result.success) {
      toast({
        title: "Draft saved",
        description: "Your changes have been saved successfully",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to save draft",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <StickyNav
        onPrevious={handlePrevious}
        onSave={handleSave}
        onContinue={form.handleSubmit(onSubmit)}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Visas</h1>
          <p className="text-muted-foreground mt-2">
            Provide information about previous visa applications and current visas held.
          </p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="bg-card border border-border rounded-lg p-6 space-y-6">
            <div className="space-y-2">
              <Label>Have you or any family member ever had a visa refusal or cancellation for any country?</Label>
              <RadioGroup
                value={form.watch("previous_visa_refusal")}
                onValueChange={(value) => form.setValue("previous_visa_refusal", value)}
              >
                <div className="flex gap-4">
                  {["yes", "no"].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`refusal-${option}`} data-testid={`radio-visa-refusal-${option}`} />
                      <Label htmlFor={`refusal-${option}`}>{option === "yes" ? "Yes" : "No"}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Do you or any family member currently hold a visa for any country?</Label>
              <RadioGroup
                value={form.watch("current_visa_held")}
                onValueChange={(value) => form.setValue("current_visa_held", value)}
              >
                <div className="flex gap-4">
                  {["yes", "no"].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`held-${option}`} data-testid={`radio-visa-held-${option}`} />
                      <Label htmlFor={`held-${option}`}>{option === "yes" ? "Yes" : "No"}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
