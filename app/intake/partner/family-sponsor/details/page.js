"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { applicationsStore } from "@/stores/applicationsStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/Field";
import { FormNavigation } from "@/components/FormNavigation";
import { DateSelector } from "@/components/DateSelecters";
import { Label } from "@/components/ui/label";
import { COUNTRIES } from "@/reuseable/countries";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";

const RELATIONSHIP_OPTIONS = [
  "Parent",
  "Spouse/Partner",
  "Child",
  "Sibling",
  "Other Relative"
];

const MARITAL_STATUS_OPTIONS = [
  "Never Married",
  "Married",
  "De Facto Relationship",
  "Divorced",
  "Widowed",
  "Separated"
];

const familySponsorDetailsSchema = z.object({
  is_sponsor_correct: z.enum(["Yes", "No"]).optional(),
  family_name: z.string().optional(),
  given_names: z.string().optional(),
  gender: z.enum(["Male", "Female", "Other"]).optional(),
  relationship: z.string().optional(),
  birth_day: z.string().optional(),
  birth_month: z.string().optional(),
  birth_year: z.string().optional(),
  country_of_birth: z.string().optional(),
  suburb_of_birth: z.string().optional(),
  city_of_birth: z.string().optional(),
  state_of_birth: z.string().optional(),
  marital_status: z.string().optional(),
});

export default function FamilySponsorDetailsPage() {
  const router = useRouter();
  const { startNavigation } = useNavigationLoading();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const draftSnap = useSnapshot(draftStore);
  const appsSnap = useSnapshot(applicationsStore);
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

  // Load section data from familySponsor.details
  const sectionData = draftStore.getSectionData('familySponsor.details');
  
  // Get main applicant name for relationship label
  const mainApplicantDetails = draftStore.getSectionData('mainApplicant.details');
  const mainApplicantName = mainApplicantDetails?.given_names || "Main Applicant";
  
  // Get sponsor name from previous question (if available)
  const sponsorName = sectionData?.given_names && sectionData?.family_name
    ? `${sectionData.given_names} ${sectionData.family_name}`
    : sectionData?.given_names || sectionData?.family_name || "the sponsor";

  const form = useForm({
    resolver: zodResolver(familySponsorDetailsSchema),
    mode: "onChange",
    defaultValues: {
      is_sponsor_correct: sectionData?.is_sponsor_correct || "",
      family_name: sectionData?.family_name || "",
      given_names: sectionData?.given_names || "",
      gender: sectionData?.gender || "",
      relationship: sectionData?.relationship || "",
      birth_day: sectionData?.birth_day || "",
      birth_month: sectionData?.birth_month || "",
      birth_year: sectionData?.birth_year || "",
      country_of_birth: sectionData?.country_of_birth || "",
      suburb_of_birth: sectionData?.suburb_of_birth || "",
      city_of_birth: sectionData?.city_of_birth || "",
      state_of_birth: sectionData?.state_of_birth || "",
      marital_status: sectionData?.marital_status || "",
    },
  });

  const { control, handleSubmit, watch, getValues, setValue, reset, trigger, formState: { errors, isValid, isDirty } } = form;
  const saveTimeoutRef = useRef(null);

  // Watch all form values for auto-save
  const watchedValues = useWatch({ control });

  // Sync form with store data once it's loaded from the database
  useEffect(() => {
    // Only reset if we have an ID, aren't loading, and form is not dirty
    // This prevents overwriting user input immediately after a save
    const hasData = sectionData && Object.keys(sectionData).length > 0;
    
    if (!draftSnap.isLoading && hasData && !isDirty) {
      reset({
        is_sponsor_correct: sectionData.is_sponsor_correct || "",
        family_name: sectionData.family_name || "",
        given_names: sectionData.given_names || "",
        gender: sectionData.gender || "",
        relationship: sectionData.relationship || "",
        birth_day: sectionData.birth_day || "",
        birth_month: sectionData.birth_month || "",
        birth_year: sectionData.birth_year || "",
        country_of_birth: sectionData.country_of_birth || "",
        suburb_of_birth: sectionData.suburb_of_birth || "",
        city_of_birth: sectionData.city_of_birth || "",
        state_of_birth: sectionData.state_of_birth || "",
        marital_status: sectionData.marital_status || "",
      }, { keepDefaultValues: true });
    }
  }, [draftSnap.isLoading, sectionData, reset, isDirty]);

  // Auto-save form data with debounce
  useEffect(() => {
    if (!draftSnap.currentApplicationId) {
      console.warn('[FamilySponsorDetailsPage] Auto-save skipped: currentApplicationId is missing');
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      // Use getValues() to get the actual current state of all fields
      const currentFormValues = getValues();
      const existingData = draftStore.getSectionData('familySponsor.details') || {};
      const mergedData = { ...existingData, ...currentFormValues };
      
      draftStore.saveSectionData('familySponsor.details', mergedData);
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [watchedValues, draftSnap.currentApplicationId, getValues]);

  const onSubmit = async (data) => {
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
      // Get existing section data to preserve any other fields
      const existingData = draftStore.getSectionData('familySponsor.details') || {};
      
      // Merge existing data with form submission data to preserve all fields
      const finalData = {
        ...existingData, // Preserve any existing fields
        ...data, // Override with form data
      };
      
      const result = await draftStore.saveSectionData('familySponsor.details', finalData);

      if (result.success) {
        await draftStore.markPageComplete('partner/family-sponsor/details', null, 'familySponsor.details');
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
    // Clear auto-save timeout to prevent race condition with manual save
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
      // Trigger validation and check for errors
      const isFormValid = await trigger();
      
      if (!isFormValid) {
        // DEBUG: Log validation errors to console for debugging
        console.error('[FamilySponsorDetailsPage] Validation failed:', errors);
        console.log('[FamilySponsorDetailsPage] Form values:', getValues());
        
        toast({
          title: "Validation error",
          description: "Please check the console for specific field errors.",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

      const currentData = getValues();
      const existingData = draftStore.getSectionData('familySponsor.details') || {};
      const mergedData = { ...existingData, ...currentData };
      
      const result = await draftStore.saveSectionData('familySponsor.details', mergedData);

      if (result.success) {
        await draftStore.markPageComplete('partner/family-sponsor/details', null, 'familySponsor.details');
        toast({
          title: "Draft saved",
          description: "Your changes have been saved successfully.",
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
          <CardTitle className="text-2xl font-semibold">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
              }
            }}
            className="space-y-8"
          >
            {Object.keys(errors).length > 0 && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-red-800 mb-2">
                  Please correct the following errors:
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                  {Object.entries(errors).map(([field, error]) => (
                    <li key={field}>{error.message}</li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <p className="text-sm text-gray-700 mb-4">
                If your application is being sponsored by a family member, in the Family Sponsor section you are to provide details about the person who is sponsoring this application.
              </p>
            </div>

            <Field
              type="radio"
              name="is_sponsor_correct"
              control={control}
              label={`In a previous question you have indicated that application is to be sponsored by ${sponsorName}. Is this correct?`}
              options={[
                { value: "Yes", label: "Yes" },
                { value: "No", label: "No" },
              ]}
              data-testid="radio-is-sponsor-correct"
            />

            <div>
              <Label className="mb-2 block font-semibold">Personal Details</Label>
              <div className="space-y-4 mt-4">
                <Field
                  type="text"
                  name="family_name"
                  control={control}
                  label="Family Name"
                  data-testid="input-family-name"
                />

                <Field
                  type="text"
                  name="given_names"
                  control={control}
                  label="Given Names"
                  data-testid="input-given-names"
                />

                <Field
                  type="radio"
                  name="gender"
                  control={control}
                  label="Gender"
                  options={[
                    { value: "Male", label: "Male" },
                    { value: "Female", label: "Female" },
                  ]}
                />

                <Field
                  type="select"
                  name="relationship"
                  control={control}
                  label={`This person is the Main Applicant (${mainApplicantName})'s:`}
                  required
                  options={RELATIONSHIP_OPTIONS.map(rel => ({ value: rel, label: rel }))}
                  placeholder="Choose Relationship"
                  data-testid="select-relationship"
                />

                <DateSelector
                  label="Date of Birth"
                  values={{
                    day: watch("birth_day") || "",
                    month: watch("birth_month") || "",
                    year: watch("birth_year") || "",
                  }}
                  onValueChange={(type, value) => {
                    const fieldName = `birth_${type}`;
                    setValue(fieldName, value, { shouldValidate: true });
                  }}
                  errors={{
                    day: errors.birth_day,
                    month: errors.birth_month,
                    year: errors.birth_year,
                  }}
                  testIdPrefix="select-birth"
                />

                <Field
                  type="select"
                  name="country_of_birth"
                  control={control}
                  label="Country of Birth"
                  options={COUNTRIES.map(country => ({ value: country, label: country }))}
                  placeholder="Choose Country"
                  data-testid="select-country-of-birth"
                />

                <Field
                  type="text"
                  name="suburb_of_birth"
                  control={control}
                  label="Suburb of Birth"
                  data-testid="input-suburb-of-birth"
                />

                <Field
                  type="text"
                  name="city_of_birth"
                  control={control}
                  label="City or Town of Birth"
                  data-testid="input-city-of-birth"
                />

                <Field
                  type="text"
                  name="state_of_birth"
                  control={control}
                  label="State or Province of Birth"
                  data-testid="input-state-of-birth"
                />

                <Field
                  type="select"
                  name="marital_status"
                  control={control}
                  label="What is the marital status of your sponsor?"
                  options={MARITAL_STATUS_OPTIONS.map(status => ({ value: status, label: status }))}
                  placeholder="Choose Marital Status"
                  data-testid="select-marital-status"
                />
              </div>
            </div>

            <FormNavigation
              onPrev={handlePrevious}
              onSave={handleSave}
              onNext={handleSubmit(onSubmit)}
              disabledNext={!isValid}
              loading={isSaving}
            />
          </form>
        </CardContent>
      </Card>
    </>
  );
}
