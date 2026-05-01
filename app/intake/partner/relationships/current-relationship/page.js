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
import { Input } from "@/components/ui/input";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { DateSelector } from "@/components/DateSelecters";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";

const currentRelationshipSchema = z.object({
  related_by_blood_marriage_adoption: z.enum(["Yes", "No"]).optional(),
  related_details: z.string().optional(),
  met_in_person: z.enum(["Yes", "No"]).optional(),
  first_met_day: z.string().optional(),
  first_met_month: z.string().optional(),
  first_met_year: z.string().optional(),
  first_met_location: z.string().optional(),
  committed_de_facto_date_day: z.string().optional(),
  committed_de_facto_date_month: z.string().optional(),
  committed_de_facto_date_year: z.string().optional(),
  committed_shared_life_date_day: z.string().optional(),
  committed_shared_life_date_month: z.string().optional(),
  committed_shared_life_date_year: z.string().optional(),
  relationship_registered: z.enum(["Yes", "No"]).optional(),
  number_of_children: z.string().optional(),
  living_together: z.enum(["Yes", "No"]).optional(),
  lived_apart: z.enum(["Yes", "No"]).optional(),
}).superRefine((data, ctx) => {
  // If related by blood/marriage/adoption is Yes, require details
  if (data.related_by_blood_marriage_adoption === "Yes") {
    if (!data.related_details || data.related_details.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please provide details",
        path: ["related_details"],
      });
    }
  }
  
  // If met in person is Yes, require first met date and location
  if (data.met_in_person === "Yes") {
    if (!data.first_met_day || !data.first_met_month || !data.first_met_year) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Date when you first met is required",
        path: ["first_met_day"],
      });
    }
    if (!data.first_met_location || data.first_met_location.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Location where you first met is required",
        path: ["first_met_location"],
      });
    }
  }
});

export default function CurrentRelationshipPage() {
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

  // Load section data from relationships.currentRelationship
  const sectionData = draftStore.getSectionData('relationships.currentRelationship');

  const form = useForm({
    resolver: zodResolver(currentRelationshipSchema),
    mode: "onChange",
    defaultValues: {
      related_by_blood_marriage_adoption: sectionData?.related_by_blood_marriage_adoption || "No",
      related_details: sectionData?.related_details || "",
      met_in_person: sectionData?.met_in_person || "No",
      first_met_day: sectionData?.first_met_day || "",
      first_met_month: sectionData?.first_met_month || "",
      first_met_year: sectionData?.first_met_year || "",
      first_met_location: sectionData?.first_met_location || "",
      committed_de_facto_date_day: sectionData?.committed_de_facto_date_day || "",
      committed_de_facto_date_month: sectionData?.committed_de_facto_date_month || "",
      committed_de_facto_date_year: sectionData?.committed_de_facto_date_year || "",
      committed_shared_life_date_day: sectionData?.committed_shared_life_date_day || "",
      committed_shared_life_date_month: sectionData?.committed_shared_life_date_month || "",
      committed_shared_life_date_year: sectionData?.committed_shared_life_date_year || "",
      relationship_registered: sectionData?.relationship_registered || "No",
      number_of_children: sectionData?.number_of_children || "",
      living_together: sectionData?.living_together || "No",
      lived_apart: sectionData?.lived_apart || "No",
    },
  });
  const { reset, getValues } = form;
  const isDirty = form.formState.isDirty;

  // Watch form values for conditional rendering
  const relatedByBlood = form.watch("related_by_blood_marriage_adoption");
  const metInPerson = form.watch("met_in_person");

  // Watch all form values for auto-save
  const watchedValues = useWatch({ control: form.control });

  // Sync form with store data once it's loaded from the database
  useEffect(() => {
    if (!draftSnap.isLoading && sectionData && Object.keys(sectionData).length > 0 && !isDirty) {
      reset({
        related_by_blood_marriage_adoption: sectionData.related_by_blood_marriage_adoption || "No",
        related_details: sectionData.related_details || "",
        met_in_person: sectionData.met_in_person || "No",
        first_met_day: sectionData.first_met_day || "",
        first_met_month: sectionData.first_met_month || "",
        first_met_year: sectionData.first_met_year || "",
        first_met_location: sectionData.first_met_location || "",
        committed_de_facto_date_day: sectionData.committed_de_facto_date_day || "",
        committed_de_facto_date_month: sectionData.committed_de_facto_date_month || "",
        committed_de_facto_date_year: sectionData.committed_de_facto_date_year || "",
        committed_shared_life_date_day: sectionData.committed_shared_life_date_day || "",
        committed_shared_life_date_month: sectionData.committed_shared_life_date_month || "",
        committed_shared_life_date_year: sectionData.committed_shared_life_date_year || "",
        relationship_registered: sectionData.relationship_registered || "No",
        number_of_children: sectionData.number_of_children || "",
        living_together: sectionData.living_together || "No",
        lived_apart: sectionData.lived_apart || "No",
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
      draftStore.saveSectionData('relationships.currentRelationship', currentFormValues);
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
      const result = await draftStore.saveSectionData('relationships.currentRelationship', data);

      if (result.success) {
        await draftStore.markPageComplete('partner/relationships/current-relationship', null, 'relationships.currentRelationship');
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
      const result = await draftStore.saveSectionData('relationships.currentRelationship', currentData);

      if (result.success) {
        await draftStore.markPageComplete('partner/relationships/current-relationship', null, 'relationships.currentRelationship');
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
          <CardTitle className="text-2xl font-semibold">Current Relationship</CardTitle>
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
            {/* Are you and your Spouse/Partner related by blood, marriage or adoption? */}
            <div>
              <Field
                type="radio"
                name="related_by_blood_marriage_adoption"
                control={form.control}
                label="Are you and your Spouse/Partner related by blood, marriage or adoption?"
                options={[
                  { value: "Yes", label: "Yes" },
                  { value: "No", label: "No" },
                ]}
              />

              {relatedByBlood === "Yes" && (
                <div className="mt-4">
                  <Label htmlFor="related_details" className="mb-2 block">
                    Give Details
                  </Label>
                  <Textarea
                    id="related_details"
                    {...form.register("related_details")}
                    rows={4}
                    placeholder="Enter details about how you are related"
                    data-testid="textarea-related-details"
                  />
                  {form.formState.errors.related_details && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.related_details.message}</p>
                  )}
                </div>
              )}
            </div>

            {/* Have you and your Spouse/Partner met in person? */}
            <div>
              <Field
                type="radio"
                name="met_in_person"
                control={form.control}
                label="Have you and your Spouse/Partner met in person?"
                options={[
                  { value: "Yes", label: "Yes" },
                  { value: "No", label: "No" },
                ]}
              />

              {metInPerson === "Yes" && (
                <div className="mt-4 space-y-4">
                  <DateSelector
                    label="When did you and your Spouse/Partner first meet in person?"
                    values={{
                      day: form.watch("first_met_day") || "",
                      month: form.watch("first_met_month") || "",
                      year: form.watch("first_met_year") || "",
                    }}
                    onValueChange={(type, value) => {
                      const fieldName = `first_met_${type}`;
                      form.setValue(fieldName, value, { shouldValidate: true });
                    }}
                    testIdPrefix="select-first-met"
                    required
                  />
                  {form.formState.errors.first_met_day && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.first_met_day.message}</p>
                  )}

                  <div>
                    <Label htmlFor="first_met_location" className="mb-2 block">
                      Where did you and your Spouse/Partner first meet in person?
                    </Label>
                    <Input
                      id="first_met_location"
                      {...form.register("first_met_location")}
                      placeholder="Enter location"
                      data-testid="input-first-met-location"
                    />
                    {form.formState.errors.first_met_location && (
                      <p className="text-sm text-red-600 mt-1">{form.formState.errors.first_met_location.message}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* What date did your committed de-facto relationship begin? */}
            <div>
              <DateSelector
                label="What date did your committed de-facto relationship begin?"
                values={{
                  day: form.watch("committed_de_facto_date_day") || "",
                  month: form.watch("committed_de_facto_date_month") || "",
                  year: form.watch("committed_de_facto_date_year") || "",
                }}
                onValueChange={(type, value) => {
                  const fieldName = `committed_de_facto_date_${type}`;
                  form.setValue(fieldName, value);
                }}
                testIdPrefix="select-committed-de-facto"
              />
            </div>

            {/* What date did you commit to a shared life together to the exclusion of all others? */}
            <div>
              <DateSelector
                label="What date did you commit to a shared life together to the exclusion of all others?"
                values={{
                  day: form.watch("committed_shared_life_date_day") || "",
                  month: form.watch("committed_shared_life_date_month") || "",
                  year: form.watch("committed_shared_life_date_year") || "",
                }}
                onValueChange={(type, value) => {
                  const fieldName = `committed_shared_life_date_${type}`;
                  form.setValue(fieldName, value);
                }}
                testIdPrefix="select-committed-shared-life"
              />
            </div>

            {/* Has your relationship been registered as a prescribed relationship in an Australian State or Territory? */}
            <div>
              <Field
                type="radio"
                name="relationship_registered"
                control={form.control}
                label="Has your relationship been registered as a prescribed relationship in an Australian State or Territory?"
                options={[
                  { value: "Yes", label: "Yes" },
                  { value: "No", label: "No" },
                ]}
              />
            </div>

            {/* Number of Children from this Relationship */}
            <div>
              <Label htmlFor="number_of_children" className="mb-2 block">
                Number of Children from this Relationship
              </Label>
              <Input
                id="number_of_children"
                type="number"
                {...form.register("number_of_children")}
                placeholder="Enter number"
                data-testid="input-number-of-children"
              />
            </div>

            {/* Are you and your Spouse/Partner living together? */}
            <div>
              <Field
                type="radio"
                name="living_together"
                control={form.control}
                label="Are you and your Spouse/Partner living together?"
                options={[
                  { value: "Yes", label: "Yes" },
                  { value: "No", label: "No" },
                ]}
              />
            </div>

            {/* Since you and your Spouse/Partner committed to an exclusive relationship together, have you lived apart for any time? */}
            <div>
              <Field
                type="radio"
                name="lived_apart"
                control={form.control}
                label="Since you and your Spouse/Partner committed to an exclusive relationship together, have you lived apart for any time?"
                options={[
                  { value: "Yes", label: "Yes" },
                  { value: "No", label: "No" },
                ]}
              />
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

