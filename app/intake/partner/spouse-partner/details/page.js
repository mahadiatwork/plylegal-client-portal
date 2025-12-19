"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { applicationsStore } from "@/stores/applicationsStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormNavigation } from "@/components/FormNavigation";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { COUNTRIES } from "@/reuseable/countries";
import { DateSelector } from "@/components/DateSelecters";

const spousePartnerDetailsSchema = z.object({
  family_name: z.string().optional(),
  given_names: z.string().optional(),
  preferred_names: z.string().optional(),
  gender: z.enum(["Male", "Female", "Other"]).optional(),
  birth_day: z.string().optional(),
  birth_month: z.string().optional(),
  birth_year: z.string().optional(),
  intending_to_migrate: z.enum(["Yes", "No", "Other - they are my Sponsor"]).optional(),
  country_of_birth: z.string().optional(),
  suburb_of_birth: z.string().optional(),
  city_of_birth: z.string().optional(),
  state_of_birth: z.string().optional(),
});

export default function SpousePartnerDetailsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const draftSnap = useSnapshot(draftStore);
  const appsSnap = useSnapshot(applicationsStore);
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

  // Load section data
  const sectionData = draftStore.getSectionData('spousePartner.details');

  const form = useForm({
    resolver: zodResolver(spousePartnerDetailsSchema),
    mode: "onChange",
    defaultValues: {
      family_name: sectionData?.family_name || "",
      given_names: sectionData?.given_names || "",
      preferred_names: sectionData?.preferred_names || "",
      gender: sectionData?.gender || "",
      birth_day: sectionData?.birth_day || "",
      birth_month: sectionData?.birth_month || "",
      birth_year: sectionData?.birth_year || "",
      intending_to_migrate: sectionData?.intending_to_migrate || "",
      country_of_birth: sectionData?.country_of_birth || "",
      suburb_of_birth: sectionData?.suburb_of_birth || "",
      city_of_birth: sectionData?.city_of_birth || "",
      state_of_birth: sectionData?.state_of_birth || "",
    },
  });
  const { reset } = form;

  // Watch all form values for auto-save
  const watchedValues = useWatch({ control: form.control });

  // Watch country_of_birth for debugging
  const countryOfBirth = form.watch("country_of_birth");

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/519dbf1a-c78f-43ac-bfdc-ba79f1bb9226', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'spouse-partner/details/page.js:90', message: 'country_of_birth value changed', data: { countryValue: countryOfBirth, watchedValuesCountry: watchedValues?.country_of_birth, formStateValues: form.getValues("country_of_birth") }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' }) }).catch(() => { });
  }, [countryOfBirth, watchedValues?.country_of_birth, form]);
  // #endregion

  // Sync form with store data once it's loaded from the database
  useEffect(() => {
    // Only reset if we have an ID and aren't loading
    if (!draftSnap.isLoading && sectionData && Object.keys(sectionData).length > 0) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/519dbf1a-c78f-43ac-bfdc-ba79f1bb9226', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'spouse-partner/details/page.js:95', message: 'reset useEffect triggered', data: { countryOfBirthInSectionData: sectionData.country_of_birth, currentFormValue: form.getValues("country_of_birth"), isLoading: draftSnap.isLoading }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' }) }).catch(() => { });
      // #endregion
      // Use 'keepDefaultValues: true' to prevent flickering
      reset({
        family_name: sectionData.family_name || "",
        given_names: sectionData.given_names || "",
        preferred_names: sectionData.preferred_names || "",
        gender: sectionData.gender || "",
        birth_day: sectionData.birth_day || "",
        birth_month: sectionData.birth_month || "",
        birth_year: sectionData.birth_year || "",
        intending_to_migrate: sectionData.intending_to_migrate || "",
        country_of_birth: sectionData.country_of_birth || "",
        suburb_of_birth: sectionData.suburb_of_birth || "",
        city_of_birth: sectionData.city_of_birth || "",
        state_of_birth: sectionData.state_of_birth || "",
      }, { keepDefaultValues: true });
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/519dbf1a-c78f-43ac-bfdc-ba79f1bb9226', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'spouse-partner/details/page.js:110', message: 'after reset', data: { countryOfBirthAfterReset: form.getValues("country_of_birth"), watchedValue: form.watch("country_of_birth") }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' }) }).catch(() => { });
      // #endregion
    }
  }, [draftSnap.isLoading, sectionData, reset, form]);

  // // Auto-save form data with debounce
  // useEffect(() => {
  //   if (!draftSnap.currentApplicationId) return;
  //   if (!watchedValues || Object.keys(watchedValues).length === 0) return;
  //   // Don't auto-save immediately after form reset or while loading
  //   if (draftSnap.isLoading) return;

  //   if (saveTimeoutRef.current) {
  //     clearTimeout(saveTimeoutRef.current);
  //   }

  //   saveTimeoutRef.current = setTimeout(() => {
  //     // Use form.getValues() to get the actual current state of all fields
  //     const currentFormValues = form.getValues();
  //     const existingData = draftStore.getSectionData('spousePartner.details') || {};
  //     const mergedData = { ...existingData, ...currentFormValues };

  //     draftStore.saveSectionData('spousePartner.details', mergedData);
  //   }, 2000);

  //   return () => {
  //     if (saveTimeoutRef.current) {
  //       clearTimeout(saveTimeoutRef.current);
  //     }
  //   };
  // }, [watchedValues, draftSnap.currentApplicationId, draftSnap.isLoading, form]);

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
      // Merge with existing section data to preserve other fields
      const existingData = draftStore.getSectionData('spousePartner.details') || {};
      const mergedData = { ...existingData, ...data };

      const result = await draftStore.saveSectionData('spousePartner.details', mergedData);

      if (result.success) {
        await draftStore.markPageComplete('partner/spouse-partner/details');
        const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId);
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
    if (prev) router.push(prev);
  };

  const handleSave = async () => {
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
      const isValid = await form.trigger();

      if (!isValid) {
        // DEBUG: This will show you exactly what is stopping the save in the browser console
        console.log("Validation Errors:", form.formState.errors);

        toast({
          title: "Validation error",
          description: "Please check the console for specific field errors.",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

      // Merge with existing section data to preserve other fields
      const existingData = draftStore.getSectionData('spousePartner.details') || {};
      const currentData = form.getValues();
      const mergedData = { ...existingData, ...currentData };

      const result = await draftStore.saveSectionData('spousePartner.details', mergedData);

      if (result.success) {
        await draftStore.markPageComplete('partner/spouse-partner/details');
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
          <CardTitle className="text-2xl font-semibold">Personal Details</CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            In the Spouse/Partner section you are to provide details about the main applicant's spouse/partner. You are to provide information even if this person is not going to be included in the application.
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
            {Object.keys(form.formState.errors).length > 0 && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-red-800 mb-2">
                  Please correct the following errors:
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                  {Object.entries(form.formState.errors).map(([field, error]) => (
                    <li key={field}>{error.message}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Family Name */}
            <div>
              <Label htmlFor="family_name">Family Name</Label>
              <Input
                id="family_name"
                {...form.register("family_name")}
                data-testid="input-family-name"
              />
              {form.formState.errors.family_name && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.family_name.message}</p>
              )}
            </div>

            {/* Given Names */}
            <div>
              <Label htmlFor="given_names">Given Names</Label>
              <Input
                id="given_names"
                {...form.register("given_names")}
                data-testid="input-given-names"
              />
              {form.formState.errors.given_names && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.given_names.message}</p>
              )}
            </div>

            {/* Preferred Names */}
            <div>
              <Label htmlFor="preferred_names">Preferred Names</Label>
              <Input
                id="preferred_names"
                {...form.register("preferred_names")}
                data-testid="input-preferred-names"
              />
              {form.formState.errors.preferred_names && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.preferred_names.message}</p>
              )}
            </div>

            {/* Gender */}
            <div>
              <Label>Gender</Label>
              <RadioGroup
                value={form.watch("gender")}
                onValueChange={(value) => form.setValue("gender", value, { shouldValidate: true })}
                className="flex gap-4 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Male" id="gender-male" />
                  <Label htmlFor="gender-male" className="cursor-pointer">Male</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Female" id="gender-female" />
                  <Label htmlFor="gender-female" className="cursor-pointer">Female</Label>
                </div>
              </RadioGroup>
              {form.formState.errors.gender && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.gender.message}</p>
              )}
            </div>

            {/* Date of Birth */}
            <DateSelector
              label="Date of Birth"
              values={{
                day: form.watch("birth_day") || "",
                month: form.watch("birth_month") || "",
                year: form.watch("birth_year") || "",
              }}
              onValueChange={(type, value) => {
                const fieldName = `birth_${type}`;
                form.setValue(fieldName, value, { shouldValidate: true });
              }}
              testIdPrefix="select-birth"
            />
            {(form.formState.errors.birth_day || form.formState.errors.birth_month || form.formState.errors.birth_year) && (
              <p className="text-sm text-red-600 mt-1">Date of Birth is required</p>
            )}

            {/* Is your Spouse/Partner intending to migrate/travel to Australia? */}
            <div>
              <Label className="mb-2 block">Is your Spouse/Partner intending to migrate/travel to Australia as part of any application made by you?</Label>
              <RadioGroup
                value={form.watch("intending_to_migrate")}
                onValueChange={(value) => form.setValue("intending_to_migrate", value, { shouldValidate: true })}
                className="flex gap-4 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Yes" id="intending-yes" />
                  <Label htmlFor="intending-yes" className="cursor-pointer">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="No" id="intending-no" />
                  <Label htmlFor="intending-no" className="cursor-pointer">No</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Other - they are my Sponsor" id="intending-other" />
                  <Label htmlFor="intending-other" className="cursor-pointer">Other - they are my Sponsor</Label>
                </div>
              </RadioGroup>
              {form.formState.errors.intending_to_migrate && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.intending_to_migrate.message}</p>
              )}
            </div>

            {/* Country of Birth */}
            <div>
              <Label htmlFor="country_of_birth">Country of Birth</Label>
              <Controller
                control={form.control}
                name="country_of_birth"
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    defaultValue={field.value}
                  >
                    <SelectTrigger data-testid="select-country-of-birth">
                      <SelectValue placeholder="Choose Country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((country) => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.country_of_birth && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.country_of_birth.message}
                </p>
              )}
            </div>

            {/* Suburb of Birth */}
            <div>
              <Label htmlFor="suburb_of_birth">Suburb of Birth</Label>
              <Input
                id="suburb_of_birth"
                {...form.register("suburb_of_birth")}
                data-testid="input-suburb-of-birth"
              />
              {form.formState.errors.suburb_of_birth && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.suburb_of_birth.message}</p>
              )}
            </div>

            {/* City or Town of Birth */}
            <div>
              <Label htmlFor="city_of_birth">City or Town of Birth</Label>
              <Input
                id="city_of_birth"
                {...form.register("city_of_birth")}
                data-testid="input-city-of-birth"
              />
              {form.formState.errors.city_of_birth && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.city_of_birth.message}</p>
              )}
            </div>

            {/* State or Province of Birth */}
            <div>
              <Label htmlFor="state_of_birth">State or Province of Birth</Label>
              <Input
                id="state_of_birth"
                {...form.register("state_of_birth")}
                data-testid="input-state-of-birth"
              />
              {form.formState.errors.state_of_birth && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.state_of_birth.message}</p>
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
