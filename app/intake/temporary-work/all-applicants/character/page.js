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
  criminal_record: z.enum(["yes", "no"]).optional(),
  visa_refusal_other_country: z.enum(["yes", "no"]).optional(),
  deportation: z.enum(["yes", "no"]).optional(),
  war_crimes: z.enum(["yes", "no"]).optional(),
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
      criminal_record: "",
      visa_refusal_other_country: "",
      deportation: "",
      war_crimes: "",
    },
  });

  useEffect(() => {
    const savedData = draftSnap.draft?.temporary_work_character || {};
    if (Object.keys(savedData).length > 0) {
      Object.keys(savedData).forEach((key) => {
        if (savedData[key] !== undefined && savedData[key] !== null) {
          form.setValue(key, savedData[key]);
        }
      });
    }
  }, []);

  const onSubmit = async (data) => {
    await draftStore.saveSectionData("temporary_work_character", data);
    await draftStore.markPageComplete(`${visaType}/all-applicants/character`, null, "temporary_work_character");
    const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId);
    if (next) router.push(next);
  };

  const handlePrevious = () => {
    const prev = getPreviousRoute(pathname, visaType, draftSnap.currentApplicationId);
    if (prev) router.push(prev);
  };

  const handleSave = async () => {
    const values = form.getValues();
    const result = await draftStore.saveSectionData("temporary_work_character", values);
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
          <h1 className="text-3xl font-bold text-foreground">Character</h1>
          <p className="text-muted-foreground mt-2">
            Provide character information for all applicants.
          </p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="bg-card border border-border rounded-lg p-6 space-y-6">
            <div className="space-y-2">
              <Label>Have you or any family member ever been convicted of a criminal offence in any country?</Label>
              <RadioGroup
                value={form.watch("criminal_record")}
                onValueChange={(value) => form.setValue("criminal_record", value)}
              >
                <div className="flex gap-4">
                  {["yes", "no"].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`criminal-${option}`} data-testid={`radio-criminal-${option}`} />
                      <Label htmlFor={`criminal-${option}`}>{option === "yes" ? "Yes" : "No"}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Have you or any family member been refused a visa to any country?</Label>
              <RadioGroup
                value={form.watch("visa_refusal_other_country")}
                onValueChange={(value) => form.setValue("visa_refusal_other_country", value)}
              >
                <div className="flex gap-4">
                  {["yes", "no"].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`refusal-${option}`} data-testid={`radio-refusal-${option}`} />
                      <Label htmlFor={`refusal-${option}`}>{option === "yes" ? "Yes" : "No"}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Have you or any family member been deported or removed from any country?</Label>
              <RadioGroup
                value={form.watch("deportation")}
                onValueChange={(value) => form.setValue("deportation", value)}
              >
                <div className="flex gap-4">
                  {["yes", "no"].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`deportation-${option}`} data-testid={`radio-deportation-${option}`} />
                      <Label htmlFor={`deportation-${option}`}>{option === "yes" ? "Yes" : "No"}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Have you or any family member been involved in war crimes, crimes against humanity, or genocide?</Label>
              <RadioGroup
                value={form.watch("war_crimes")}
                onValueChange={(value) => form.setValue("war_crimes", value)}
              >
                <div className="flex gap-4">
                  {["yes", "no"].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`war-${option}`} data-testid={`radio-war-${option}`} />
                      <Label htmlFor={`war-${option}`}>{option === "yes" ? "Yes" : "No"}</Label>
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
