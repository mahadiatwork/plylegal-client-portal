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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StickyNav } from "@/components/StickyNav";
import { Loader2 } from "lucide-react";
import { FormNavigation } from "@/components/FormNavigation";

const formSchema = z.object({
  is_main_applicant: z.enum(["yes", "no"]),

  // Person completing questionnaire (shown only if is_main_applicant === "yes")
  completing_family_name: z.string().optional(),
  completing_given_names: z.string().optional(),
  completing_preferred_names: z.string().optional(),
  completing_gender: z.string().optional(),
  completing_birth_day: z.string().optional(),
  completing_birth_month: z.string().optional(),
  completing_birth_year: z.string().optional(),

  // Main applicant details
  family_name: z.string().optional(),
  given_names: z.string().optional(),
  preferred_names: z.string().optional(),
  gender: z.string().optional(),
  birth_day: z.string().optional(),
  birth_month: z.string().optional(),
  birth_year: z.string().optional(),
  country_of_birth: z.string().optional(),
  suburb_of_birth: z.string().optional(),
  city_of_birth: z.string().optional(),
  state_of_birth: z.string().optional(),
  marital_status: z.string().optional(),
  marital_status_date_day: z.string().optional(),
  marital_status_date_month: z.string().optional(),
  marital_status_date_year: z.string().optional(),
});

export default function Page() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const visaType = getVisaTypeFromPath(pathname);
  const { toast } = useToast();
  const draftSnap = useSnapshot(draftStore);

  const [isMainApplicant, setIsMainApplicant] = useState("yes");
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set application ID from URL params if available
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
      is_main_applicant: "yes",
      completing_family_name: "",
      completing_given_names: "",
      completing_preferred_names: "",
      completing_gender: "",
      completing_birth_day: "",
      completing_birth_month: "",
      completing_birth_year: "",
      family_name: "",
      given_names: "",
      preferred_names: "",
      gender: "",
      birth_day: "",
      birth_month: "",
      birth_year: "",
      country_of_birth: "",
      suburb_of_birth: "",
      city_of_birth: "",
      state_of_birth: "",
      marital_status: "",
      marital_status_date_day: "",
      marital_status_date_month: "",
      marital_status_date_year: "",
    },
  });

  useEffect(() => {
    const savedData = draftSnap.draft?.protection_details || {};
    if (Object.keys(savedData).length > 0) {
      // Merge saved data with default values to ensure all fields are set
      const formData = {
        is_main_applicant: savedData.is_main_applicant || "yes",
        completing_family_name: savedData.completing_family_name || "",
        completing_given_names: savedData.completing_given_names || "",
        completing_preferred_names: savedData.completing_preferred_names || "",
        completing_gender: savedData.completing_gender || "",
        completing_birth_day: savedData.completing_birth_day || "",
        completing_birth_month: savedData.completing_birth_month || "",
        completing_birth_year: savedData.completing_birth_year || "",
        family_name: savedData.family_name || "",
        given_names: savedData.given_names || "",
        preferred_names: savedData.preferred_names || "",
        gender: savedData.gender || "",
        birth_day: savedData.birth_day || "",
        birth_month: savedData.birth_month || "",
        birth_year: savedData.birth_year || "",
        country_of_birth: savedData.country_of_birth || "",
        suburb_of_birth: savedData.suburb_of_birth || "",
        city_of_birth: savedData.city_of_birth || "",
        state_of_birth: savedData.state_of_birth || "",
        marital_status: savedData.marital_status || "",
        marital_status_date_day: savedData.marital_status_date_day || "",
        marital_status_date_month: savedData.marital_status_date_month || "",
        marital_status_date_year: savedData.marital_status_date_year || "",
      };

      // Use reset to properly update all form fields including Select components
      form.reset(formData);

      if (savedData.is_main_applicant) {
        setIsMainApplicant(savedData.is_main_applicant);
      }
    }
  }, [draftSnap.draft?.protection_details]);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      await draftStore.saveSectionData("protection_details", data);
      await draftStore.markPageComplete(`${visaType}/main-applicant/details`);
      const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId);
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
    if (prev) router.push(prev);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const values = form.getValues();
      const result = await draftStore.saveSectionData("protection_details", values);
      if (result.success) {
        toast({
          title: "Draft saved",
          description: "Your changes have been saved successfully",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save draft",
          variant: "destructive",
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => (currentYear - i).toString());

  const maritalStatuses = [
    "Never Married",
    "Married",
    "De Facto Relationship",
    "Divorced",
    "Widowed",
    "Separated"
  ];

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-6 border-b border-gray-200">
            <h1 className="text-2xl font-semibold text-gray-900">Main Applicant's Details</h1>
            <p className="text-sm text-gray-600 mt-2">
              In the Main Applicant section, please provide details about the person who is intending to be the primary applicant.
            </p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="px-6 py-8 space-y-8">
            {/* Main Applicant Question */}
            <div>
              <Label className="text-base font-medium text-gray-900">
                Are you or will you be the Main Applicant in any application?
              </Label>
              <RadioGroup
                value={form.watch("is_main_applicant")}
                onValueChange={(value) => {
                  form.setValue("is_main_applicant", value);
                  setIsMainApplicant(value);
                }}
                className="flex gap-4 mt-2"
                data-testid="radio-is-main-applicant"
              >
                <div className="flex items-center">
                  <RadioGroupItem value="yes" id="yes" data-testid="radio-yes" />
                  <Label htmlFor="yes" className="ml-2 cursor-pointer font-normal">
                    Yes
                  </Label>
                </div>
                <div className="flex items-center">
                  <RadioGroupItem value="no" id="no" data-testid="radio-no" />
                  <Label htmlFor="no" className="ml-2 cursor-pointer font-normal">
                    No
                  </Label>
                </div>
              </RadioGroup>
              {form.formState.errors.is_main_applicant?.message && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.is_main_applicant.message}</p>
              )}
            </div>

            {/* Completing Person Details (only if not main applicant) */}
            {form.watch("is_main_applicant") === "no" && (
              <div className="space-y-6 border-b border-gray-200 pb-8">
                <div className="space-y-1">
                  <p className="font-bold text-lg text-gray-900">Insert the details of the person who is completing this Questionnaire</p>
                </div>

                <div>
                  <Label>Family Name</Label>
                  <Input {...form.register("completing_family_name")} data-testid="input-completing-family-name" />
                  {form.formState.errors.completing_family_name?.message && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.completing_family_name.message}</p>
                  )}
                </div>

                <div>
                  <Label>Given Names</Label>
                  <Input {...form.register("completing_given_names")} data-testid="input-completing-given-names" />
                  {form.formState.errors.completing_given_names?.message && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.completing_given_names.message}</p>
                  )}
                </div>

                <div>
                  <Label>Preferred Names</Label>
                  <Input {...form.register("completing_preferred_names")} data-testid="input-completing-preferred-names" />
                  {form.formState.errors.completing_preferred_names?.message && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.completing_preferred_names.message}</p>
                  )}
                </div>

                <div>
                  <Label>Gender</Label>
                  <RadioGroup
                    value={form.watch("completing_gender")}
                    onValueChange={(value) => form.setValue("completing_gender", value)}
                    className="flex gap-4 mt-2"
                    data-testid="radio-completing-gender"
                  >
                    {["Male", "Female", "Other"].map((gender) => (
                      <div key={gender} className="flex items-center">
                        <RadioGroupItem value={gender} id={`completing-gender-${gender.toLowerCase()}`} />
                        <Label htmlFor={`completing-gender-${gender.toLowerCase()}`} className="ml-2 cursor-pointer font-normal">
                          {gender}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  {form.formState.errors.completing_gender?.message && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.completing_gender.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Date of Birth - Day</Label>
                    <Select
                      onValueChange={(value) => form.setValue("completing_birth_day", value)}
                      value={form.watch("completing_birth_day")}
                    >
                      <SelectTrigger data-testid="select-completing-birth-day">
                        <SelectValue placeholder="Choose Day" />
                      </SelectTrigger>
                      <SelectContent>
                        {days.map((day) => (
                          <SelectItem key={day} value={day}>{day}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.completing_birth_day?.message && (
                      <p className="text-sm text-red-600 mt-1">{form.formState.errors.completing_birth_day.message}</p>
                    )}
                  </div>

                  <div>
                    <Label>Month</Label>
                    <Select
                      onValueChange={(value) => form.setValue("completing_birth_month", value)}
                      value={form.watch("completing_birth_month")}
                    >
                      <SelectTrigger data-testid="select-completing-birth-month">
                        <SelectValue placeholder="Choose Month" />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((month, idx) => (
                          <SelectItem key={month} value={(idx + 1).toString()}>{month}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.completing_birth_month?.message && (
                      <p className="text-sm text-red-600 mt-1">{form.formState.errors.completing_birth_month.message}</p>
                    )}
                  </div>

                  <div>
                    <Label>Year</Label>
                    <Select
                      onValueChange={(value) => form.setValue("completing_birth_year", value)}
                      value={form.watch("completing_birth_year")}
                    >
                      <SelectTrigger data-testid="select-completing-birth-year">
                        <SelectValue placeholder="Choose Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((year) => (
                          <SelectItem key={year} value={year}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.completing_birth_year?.message && (
                      <p className="text-sm text-red-600 mt-1">{form.formState.errors.completing_birth_year.message}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Main Applicant's Personal Details Section */}
            <div className="space-y-6 border-gray-200">
              <div className="space-y-1">
                <p className="font-bold text-lg text-gray-900">Main Applicant's Personal Details</p>
              </div>

              <div>
                <Label>Family Name</Label>
                <Input {...form.register("family_name")} data-testid="input-family-name" />
                {form.formState.errors.family_name?.message && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.family_name.message}</p>
                )}
              </div>

              <div>
                <Label>Given Names</Label>
                <Input {...form.register("given_names")} data-testid="input-given-names" />
                {form.formState.errors.given_names?.message && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.given_names.message}</p>
                )}
              </div>

              <div>
                <Label>Preferred Names</Label>
                <Input {...form.register("preferred_names")} data-testid="input-preferred-names" />
                {form.formState.errors.preferred_names?.message && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.preferred_names.message}</p>
                )}
              </div>

              <div>
                <Label>Gender</Label>
                <RadioGroup
                  value={form.watch("gender")}
                  onValueChange={(value) => form.setValue("gender", value)}
                  className="flex gap-4 mt-2"
                  data-testid="radio-gender"
                >
                  {["Male", "Female", "Other"].map((gender) => (
                    <div key={gender} className="flex items-center">
                      <RadioGroupItem value={gender} id={`main-gender-${gender.toLowerCase()}`} />
                      <Label htmlFor={`main-gender-${gender.toLowerCase()}`} className="ml-2 cursor-pointer font-normal">
                        {gender}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                {form.formState.errors.gender?.message && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.gender.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Date of Birth - Day</Label>
                  <Select
                    onValueChange={(value) => form.setValue("birth_day", value)}
                    value={form.watch("birth_day")}
                  >
                    <SelectTrigger data-testid="select-birth-day">
                      <SelectValue placeholder="Choose Day" />
                    </SelectTrigger>
                    <SelectContent>
                      {days.map((day) => (
                        <SelectItem key={day} value={day}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.birth_day?.message && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.birth_day.message}</p>
                  )}
                </div>

                <div>
                  <Label>Month</Label>
                  <Select
                    onValueChange={(value) => form.setValue("birth_month", value)}
                    value={form.watch("birth_month")}
                  >
                    <SelectTrigger data-testid="select-birth-month">
                      <SelectValue placeholder="Choose Month" />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month, idx) => (
                        <SelectItem key={month} value={(idx + 1).toString()}>{month}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.birth_month?.message && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.birth_month.message}</p>
                  )}
                </div>

                <div>
                  <Label>Year</Label>
                  <Select
                    onValueChange={(value) => form.setValue("birth_year", value)}
                    value={form.watch("birth_year")}
                  >
                    <SelectTrigger data-testid="select-birth-year">
                      <SelectValue placeholder="Choose Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.birth_year?.message && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.birth_year.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label>Country of Birth</Label>
                <Input {...form.register("country_of_birth")} placeholder="Choose Country" data-testid="input-country-of-birth" />
                {form.formState.errors.country_of_birth?.message && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.country_of_birth.message}</p>
                )}
              </div>

              <div>
                <Label>Suburb of Birth</Label>
                <Input {...form.register("suburb_of_birth")} data-testid="input-suburb-of-birth" />
                {form.formState.errors.suburb_of_birth?.message && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.suburb_of_birth.message}</p>
                )}
              </div>

              <div>
                <Label>City or Town of Birth</Label>
                <Input {...form.register("city_of_birth")} data-testid="input-city-of-birth" />
                {form.formState.errors.city_of_birth?.message && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.city_of_birth.message}</p>
                )}
              </div>

              <div>
                <Label>State or Province of Birth</Label>
                <Input {...form.register("state_of_birth")} data-testid="input-state-of-birth" />
                {form.formState.errors.state_of_birth?.message && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.state_of_birth.message}</p>
                )}
              </div>

              <div>
                <Label>What is your marital status?</Label>
                <Select
                  onValueChange={(value) => form.setValue("marital_status", value)}
                  value={form.watch("marital_status")}
                >
                  <SelectTrigger data-testid="select-marital-status">
                    <SelectValue placeholder="Choose Marital Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {maritalStatuses.map((status) => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.marital_status?.message && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.marital_status.message}</p>
                )}
              </div>

              {form.watch("marital_status") && form.watch("marital_status") !== "Never Married" && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {form.watch("marital_status") === "Married" && "Date of Marriage"}
                    {form.watch("marital_status") === "De Facto Relationship" && "Date De Facto Relationship Began"}
                    {form.watch("marital_status") === "Divorced" && "Date of Divorce"}
                    {form.watch("marital_status") === "Widowed" && "Date of Death of Spouse"}
                    {form.watch("marital_status") === "Separated" && "Date of Separation"} <span className="text-red-600">*</span>
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="marital_status_date_day" className="text-xs text-gray-600">Day</Label>
                      <Select
                        value={form.watch("marital_status_date_day")}
                        onValueChange={(value) => form.setValue("marital_status_date_day", value)}
                      >
                        <SelectTrigger id="marital_status_date_day">
                          <SelectValue placeholder="Day" />
                        </SelectTrigger>
                        <SelectContent>
                          {days.map((day) => (
                            <SelectItem key={day} value={day}>{day}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="marital_status_date_month" className="text-xs text-gray-600">Month</Label>
                      <Select
                        value={form.watch("marital_status_date_month")}
                        onValueChange={(value) => form.setValue("marital_status_date_month", value)}
                      >
                        <SelectTrigger id="marital_status_date_month">
                          <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                          {months.map((month, idx) => (
                            <SelectItem key={month} value={(idx + 1).toString()}>{month}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="marital_status_date_year" className="text-xs text-gray-600">Year</Label>
                      <Select
                        value={form.watch("marital_status_date_year")}
                        onValueChange={(value) => form.setValue("marital_status_date_year", value)}
                      >
                        <SelectTrigger id="marital_status_date_year">
                          <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map((year) => (
                            <SelectItem key={year} value={year}>{year}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
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
      </div>


    </div>
  );
}
