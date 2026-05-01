"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/Field";
import { FormNavigation } from "@/components/FormNavigation";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";

const relationshipDetailsSchema = z.object({
  genuine_ongoing_de_facto: z.enum(["Yes", "No"]).optional(),
  financial_aspects: z.string().optional(),
  nature_of_household: z.string().optional(),
  social_aspects: z.string().optional(),
  commitment_details: z.string().optional(),
  development_of_relationship: z.string().optional(),
}).superRefine((data, ctx) => {
  // If genuine ongoing de facto is Yes, require at least one detail field
  if (data.genuine_ongoing_de_facto === "Yes") {
    const hasAnyDetails = 
      (data.financial_aspects && data.financial_aspects.trim() !== "") ||
      (data.nature_of_household && data.nature_of_household.trim() !== "") ||
      (data.social_aspects && data.social_aspects.trim() !== "") ||
      (data.commitment_details && data.commitment_details.trim() !== "") ||
      (data.development_of_relationship && data.development_of_relationship.trim() !== "");
    
    if (!hasAnyDetails) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please provide at least one detail about your relationship",
        path: ["financial_aspects"],
      });
    }
  }
});

export default function RelationshipDetailsPage() {
  const router = useRouter();
  const { startNavigation } = useNavigationLoading();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const draftSnap = useSnapshot(draftStore);
  const saveTimeoutRef = useRef(null);

  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  // Get visa type from pathname
  const visaType = getVisaTypeFromPath(pathname);

  // Set application ID from URL params if available
  useEffect(() => {
    const appIdFromUrl = searchParams.get('applicationId');
    if (appIdFromUrl && appIdFromUrl !== draftSnap.currentApplicationId) {
      draftStore.setApplicationId(appIdFromUrl);
      draftStore.loadDraft(appIdFromUrl);
    } else if (!appIdFromUrl && draftSnap.currentApplicationId) {
      const newUrl = `${pathname}?applicationId=${draftSnap.currentApplicationId}`;
      router.replace(newUrl);
    }
  }, [searchParams, draftSnap.currentApplicationId, pathname, router]);

  // Load section data from relationships.relationshipDetails
  const sectionData = draftStore.getSectionData('relationships.relationshipDetails');

  const form = useForm({
    resolver: zodResolver(relationshipDetailsSchema),
    mode: "onChange",
    defaultValues: {
      genuine_ongoing_de_facto: sectionData?.genuine_ongoing_de_facto || "No",
      financial_aspects: sectionData?.financial_aspects || "",
      nature_of_household: sectionData?.nature_of_household || "",
      social_aspects: sectionData?.social_aspects || "",
      commitment_details: sectionData?.commitment_details || "",
      development_of_relationship: sectionData?.development_of_relationship || "",
    },
  });
  const { reset, getValues } = form;
  const isDirty = form.formState.isDirty;

  // Watch form values for conditional rendering
  const genuineOngoingDeFacto = form.watch("genuine_ongoing_de_facto");

  // Watch all form values for auto-save
  const watchedValues = useWatch({ control: form.control });

  // Sync form with store data once it's loaded from the database
  useEffect(() => {
    if (!draftSnap.isLoading && sectionData && Object.keys(sectionData).length > 0 && !isDirty) {
      reset({
        genuine_ongoing_de_facto: sectionData.genuine_ongoing_de_facto || "No",
        financial_aspects: sectionData.financial_aspects || "",
        nature_of_household: sectionData.nature_of_household || "",
        social_aspects: sectionData.social_aspects || "",
        commitment_details: sectionData.commitment_details || "",
        development_of_relationship: sectionData.development_of_relationship || "",
      }, { keepDefaultValues: true });
    }
  }, [draftSnap.isLoading, sectionData, reset, isDirty]);

  // Auto-save form data with debounce
  useEffect(() => {
    if (!draftSnap.currentApplicationId) {
      console.warn('No application ID set for auto-save');
      return;
    }
    if (!watchedValues || Object.keys(watchedValues).length === 0) return;
    if (draftSnap.isLoading) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      const currentFormValues = getValues();
      draftStore.saveSectionData('relationships.relationshipDetails', currentFormValues);
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [watchedValues, draftSnap.currentApplicationId, draftSnap.isLoading, getValues]);

  const onSubmit = async (data) => {
    if (!draftSnap.currentApplicationId) {
      toast({
        title: "Error",
        description: "Application ID required. Please return to the applications page and try again.",
        variant: "destructive",
      });
      return;
    }

    // Clear auto-save timeout to prevent race condition
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    setIsSaving(true);
    try {
      const result = await draftStore.saveSectionData('relationships.relationshipDetails', data);

      if (result.success) {
        await draftStore.markPageComplete('partner/relationships/relationship-details', null, 'relationships.relationshipDetails');
        const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId);
        startNavigation(next);
        if (next) router.push(next);
      } else {
        toast({
          title: "Error saving draft",
          description: result.error || "Failed to save draft. Please try again.",
          variant: "destructive",
        });
        setIsSaving(false);
      }
    } catch (error) {
      toast({
        title: "Error saving draft",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      setIsSaving(false);
    }
  };

  const handlePrevious = () => {
    const prev = getPreviousRoute(pathname, visaType, draftSnap.currentApplicationId);
    startNavigation(prev);
    if (prev) router.push(prev);
  };

  const handleSave = async () => {
    // Clear auto-save timeout to prevent race condition
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    if (!draftSnap.currentApplicationId) {
      toast({
        title: "Error",
        description: "Application ID required. Please return to the applications page and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const isValid = await form.trigger();
      
      if (!isValid) {
        console.log("Validation Errors:", form.formState.errors);
        toast({
          title: "Validation error",
          description: "Please check the console for specific field errors.",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

      const currentData = getValues();
      const result = await draftStore.saveSectionData('relationships.relationshipDetails', currentData);

      if (result.success) {
        await draftStore.markPageComplete('partner/relationships/relationship-details', null, 'relationships.relationshipDetails');
        toast({
          title: "Draft saved",
          description: "Progress saved successfully.",
        });
      } else {
        toast({
          title: "Error saving draft",
          description: result.error || "Failed to save draft. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Save Error:", error);
      toast({
        title: "Error saving draft",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Card className="rounded-2xl shadow-md bg-white">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Relationship Details</CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            In the Relationships section you are to provide details about the relationship between the main applicant and their spouse/partner.
          </p>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
              }
            }}
            className="space-y-8"
          >
            {/* Are you and your Partner in a genuine, ongoing de facto relationship together to the exclusion of all others? */}
            <div>
              <Field
                type="radio"
                name="genuine_ongoing_de_facto"
                control={form.control}
                label="Are you and your Partner in a genuine, ongoing de facto relationship together to the exclusion of all others?"
                options={[
                  { value: "Yes", label: "Yes" },
                  { value: "No", label: "No" },
                ]}
              />

              {genuineOngoingDeFacto === "Yes" && (
                <div className="mt-6 space-y-6">
                  <div>
                    <Label htmlFor="financial_aspects" className="mb-2 block">
                      Enter details of the financial aspects of your relationship that demonstrate that it is genuine and continuing
                    </Label>
                    <Textarea
                      id="financial_aspects"
                      {...form.register("financial_aspects")}
                      rows={6}
                      placeholder="Enter details about financial aspects of your relationship"
                      data-testid="textarea-financial-aspects"
                      className="resize-y"
                    />
                  </div>

                  <div>
                    <Label htmlFor="nature_of_household" className="mb-2 block">
                      Enter details of the nature of the household that demonstrates your relationship is genuine and continuing
                    </Label>
                    <Textarea
                      id="nature_of_household"
                      {...form.register("nature_of_household")}
                      rows={6}
                      placeholder="Enter details about the nature of your household"
                      data-testid="textarea-nature-of-household"
                      className="resize-y"
                    />
                  </div>

                  <div>
                    <Label htmlFor="social_aspects" className="mb-2 block">
                      Enter details of the social aspects of your relationship that demonstrates your relationship is genuine and continuing
                    </Label>
                    <Textarea
                      id="social_aspects"
                      {...form.register("social_aspects")}
                      rows={6}
                      placeholder="Enter details about social aspects of your relationship"
                      data-testid="textarea-social-aspects"
                      className="resize-y"
                    />
                  </div>

                  <div>
                    <Label htmlFor="commitment_details" className="mb-2 block">
                      Enter details of the commitment between you, that demonstrates your relationship is genuine and continuing
                    </Label>
                    <Textarea
                      id="commitment_details"
                      {...form.register("commitment_details")}
                      rows={6}
                      placeholder="Enter details about your commitment to each other"
                      data-testid="textarea-commitment-details"
                      className="resize-y"
                    />
                  </div>

                  <div>
                    <Label htmlFor="development_of_relationship" className="mb-2 block">
                      Enter details of the development of your relationship, that demonstrate that it is genuine and continuing
                    </Label>
                    <Textarea
                      id="development_of_relationship"
                      {...form.register("development_of_relationship")}
                      rows={6}
                      placeholder="Enter details about the development of your relationship"
                      data-testid="textarea-development-of-relationship"
                      className="resize-y"
                    />
                  </div>

                  {form.formState.errors.financial_aspects && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.financial_aspects.message}</p>
                  )}
                </div>
              )}
            </div>

            <FormNavigation
              onPrev={handlePrevious}
              onSave={handleSave}
              onNext={form.handleSubmit(onSubmit)}
              disabledNext={!form.formState.isValid}
              loading={isSaving}
            />
          </form>
        </CardContent>
      </Card>
    </>
  );
}

