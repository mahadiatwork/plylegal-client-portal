"use client";

import { useRouter, usePathname } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/Field";
import { StickyNav } from "@/components/StickyNav";
import { detailsSchema } from "@/lib/validation";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

export default function MainApplicantDetailsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const draftSnap = useSnapshot(draftStore);
  const saveTimeoutRef = useRef(null);
  const { toast } = useToast();
  
  // Get visa type from pathname
  const visaType = getVisaTypeFromPath(pathname);

  // Load section data
  const sectionData = draftStore.getSectionData('mainApplicant.details');

  const { control, handleSubmit, getValues, formState: { errors, isValid } } = useForm({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      is_main_applicant: sectionData.is_main_applicant,
      prefix: sectionData.prefix,
      family_name: sectionData.family_name || "",
      given_names: sectionData.given_names || "",
      preferred_names: sectionData.preferred_names || "",
      gender: sectionData.gender,
      dob: sectionData.dob || "",
      country_of_birth: sectionData.country_of_birth || "",
      suburb_of_birth: sectionData.suburb_of_birth || "",
      city_of_birth: sectionData.city_of_birth || "",
      state_of_birth: sectionData.state_of_birth || "",
      marital_status: sectionData.marital_status,
    },
  });

  // Watch all form values for auto-save
  const watchedValues = useWatch({ control });

  // Auto-save form data with debounce
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      if (watchedValues && Object.keys(watchedValues).length > 0) {
        draftStore.saveSectionData('mainApplicant.details', watchedValues);
      }
    }, 2000); // Save 2 seconds after user stops typing

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [watchedValues]);

  const onSubmit = (data) => {
    draftStore.saveSectionData('mainApplicant.details', data);
    draftStore.markPageComplete('partner/main-applicant/details');
    const next = getNextRoute(pathname, visaType);
    if (next) router.push(next);
  };

  const handlePrevious = () => {
    const prev = getPreviousRoute(pathname, visaType);
    if (prev) router.push(prev);
  };

  const handleSave = async () => {
    // Manual save trigger
    const currentData = getValues();
    const result = await draftStore.saveSectionData('mainApplicant.details', currentData);
    
    if (result.success) {
      // Mark this page as complete
      await draftStore.markPageComplete('partner/main-applicant/details');
      
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
  };

  return (
    <>
      <Card className="rounded-2xl shadow-md bg-white">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Main Applicant Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {Object.keys(errors).length > 0 && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-red-800 mb-2">
                  Please correct the following errors:
                </h3>
                <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                  {Object.entries(errors).map(([field, error]) => (
                    <li key={field}>
                      {field.replace(/_/g, ' ')}: {error.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Field
              type="radio"
              name="is_main_applicant"
              control={control}
              label="Are you the main applicant?"
              required
              options={[
                { value: "Yes", label: "Yes" },
                { value: "No", label: "No" },
              ]}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Field
                type="select"
                name="prefix"
                control={control}
                label="Title/Prefix"
                options={[
                  { value: "Mr", label: "Mr" },
                  { value: "Mrs", label: "Mrs" },
                  { value: "Miss", label: "Miss" },
                  { value: "Ms", label: "Ms" },
                  { value: "Dr", label: "Dr" },
                  { value: "Other", label: "Other" },
                ]}
              />

              <Field
                type="select"
                name="gender"
                control={control}
                label="Gender"
                required
                options={[
                  { value: "Male", label: "Male" },
                  { value: "Female", label: "Female" },
                  { value: "Other", label: "Other" },
                ]}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Field
                type="text"
                name="family_name"
                control={control}
                label="Family Name"
                required
                placeholder="Smith"
              />

              <Field
                type="text"
                name="given_names"
                control={control}
                label="Given Names"
                required
                placeholder="John David"
              />
            </div>

            <Field
              type="text"
              name="preferred_names"
              control={control}
              label="Preferred Name(s)"
              placeholder="John"
            />

            <Field
              type="date"
              name="dob"
              control={control}
              label="Date of Birth"
              required
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Field
                type="text"
                name="country_of_birth"
                control={control}
                label="Country of Birth"
                required
                placeholder="United Kingdom"
              />

              <Field
                type="text"
                name="suburb_of_birth"
                control={control}
                label="Suburb of Birth"
                placeholder="Westminster"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Field
                type="text"
                name="city_of_birth"
                control={control}
                label="City/Town of Birth"
                placeholder="London"
              />

              <Field
                type="text"
                name="state_of_birth"
                control={control}
                label="State/Province of Birth"
                placeholder="Greater London"
              />
            </div>

            <Field
              type="select"
              name="marital_status"
              control={control}
              label="Marital Status"
              required
              options={[
                { value: "Never Married", label: "Never Married" },
                { value: "Married", label: "Married" },
                { value: "De Facto", label: "De Facto" },
                { value: "Divorced", label: "Divorced" },
                { value: "Widowed", label: "Widowed" },
                { value: "Separated", label: "Separated" },
              ]}
            />

            <div className="hidden lg:flex justify-between items-center pt-6 border-t border-border">
              <button
                type="button"
                onClick={handlePrevious}
                className="text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-previous"
              >
                ← Previous
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="button-save-draft"
                >
                  Save Draft
                </button>
                <button
                  type="submit"
                  disabled={!isValid}
                  className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  data-testid="button-continue"
                >
                  Continue →
                </button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <StickyNav
        onPrev={handlePrevious}
        onSave={handleSave}
        onNext={handleSubmit(onSubmit)}
        disabledNext={!isValid}
      />
    </>
  );
}
