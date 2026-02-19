"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect, useRef } from "react";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { useToast } from "@/hooks/use-toast";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormNavigation } from "@/components/FormNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp } from "lucide-react";

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
  prefix: z.string().optional(),
  family_name: z.string().optional(),
  given_names: z.string().optional(),
  preferred_names: z.string().optional(),
  gender: z.string().optional(),
  birth_day: z.string().optional(),
  birth_month: z.string().optional(),
  birth_year: z.string().optional(),
  country_of_birth: z.string().optional(),
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

  const [isSaving, setIsSaving] = useState(false);
  const [showJsonData, setShowJsonData] = useState(false);
  const isSavingRef = useRef(false);

  // Set application ID from URL params if available
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/519dbf1a-c78f-43ac-bfdc-ba79f1bb9226', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'details/page.js:64', message: 'Application ID useEffect triggered', data: { appIdFromUrl: searchParams.get('applicationId'), currentAppId: draftSnap.currentApplicationId, hasDraft: !!draftSnap.draft, hasTemporaryWorkDetails: !!draftSnap.draft?.temporary_work_details }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'B' }) }).catch(() => { });
    // #endregion
    const appIdFromUrl = searchParams.get('applicationId');
    if (appIdFromUrl && appIdFromUrl !== draftSnap.currentApplicationId) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/519dbf1a-c78f-43ac-bfdc-ba79f1bb9226', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'details/page.js:67', message: 'Loading draft - before loadDraft', data: { appId: appIdFromUrl, currentDraftKeys: Object.keys(draftSnap.draft || {}) }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'B' }) }).catch(() => { });
      // #endregion
      draftStore.setApplicationId(appIdFromUrl);
      draftStore.loadDraft(appIdFromUrl).then((loadedData) => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/519dbf1a-c78f-43ac-bfdc-ba79f1bb9226', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'details/page.js:70', message: 'Draft loaded - after loadDraft', data: { hasLoadedData: !!loadedData, loadedDataKeys: Object.keys(loadedData || {}), hasTemporaryWorkDetails: !!loadedData?.temporary_work_details, temporaryWorkDetailsKeys: Object.keys(loadedData?.temporary_work_details || {}), birth_day: loadedData?.temporary_work_details?.birth_day, marital_status: loadedData?.temporary_work_details?.marital_status }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'B' }) }).catch(() => { });
        // #endregion
        console.log('📦 Data loaded from database:', loadedData);
        console.log('📦 Temporary work details:', loadedData?.temporary_work_details);
      });
    }
  }, [searchParams, draftSnap.currentApplicationId]);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      is_main_applicant: "yes", // FIX: Add default value for validation
      completing_family_name: "",
      completing_given_names: "",
      completing_preferred_names: "",
      completing_gender: "",
      completing_birth_day: "",
      completing_birth_month: "",
      completing_birth_year: "",
      prefix: "",
      family_name: "",
      given_names: "",
      preferred_names: "",
      gender: "",
      birth_day: "",
      birth_month: "",
      birth_year: "",
      country_of_birth: "",
      city_of_birth: "",
      state_of_birth: "",
      marital_status: "",
      marital_status_date_day: "",
      marital_status_date_month: "",
      marital_status_date_year: "",
    },
  });

  // Watch this for UI conditionals (instead of using useState)
  const isMainApplicant = form.watch("is_main_applicant");

  // Populate Form
  useEffect(() => {
    // 1. Safety Check: If saving, do not touch the form
    if (isSavingRef.current) return;

    // 2. Wait for loading: If loading AND we have no data, wait.
    // NOTE: This will now properly re-run when loading finishes because we added it to dependencies.
    if (draftSnap.isLoading && !draftSnap.draft?.temporary_work_details) {
      return;
    }

    const savedData = draftSnap.draft?.temporary_work_details;

    // 3. Populate: Only if we have actual data
    if (savedData && Object.keys(savedData).length > 0) {

      // --- NORMALIZATION HELPERS (Fixes the "07" vs "7" bug) ---
      const monthsList = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];

      const normalizeNumber = (val) => {
        if (!val) return "";
        const num = Number(val);
        return isNaN(num) ? val : String(num);
      };

      const normalizeMonth = (val) => {
        if (!val) return "";
        if (!isNaN(Number(val))) return String(Number(val));
        const monthIndex = monthsList.findIndex(m => m.toLowerCase() === String(val).toLowerCase());
        return monthIndex !== -1 ? String(monthIndex + 1) : val;
      };

      const safeStr = (val) => (val === null || val === undefined) ? "" : String(val);

      // 4. Prepare the clean data object
      const formData = {
        is_main_applicant: safeStr(savedData.is_main_applicant) || "yes",

        completing_family_name: safeStr(savedData.completing_family_name),
        completing_given_names: safeStr(savedData.completing_given_names),
        completing_preferred_names: safeStr(savedData.completing_preferred_names),
        completing_gender: safeStr(savedData.completing_gender),
        completing_birth_day: normalizeNumber(savedData.completing_birth_day),
        completing_birth_month: normalizeMonth(savedData.completing_birth_month),
        completing_birth_year: safeStr(savedData.completing_birth_year),

        prefix: safeStr(savedData.prefix),
        family_name: safeStr(savedData.family_name),
        given_names: safeStr(savedData.given_names),
        preferred_names: safeStr(savedData.preferred_names),
        gender: safeStr(savedData.gender),

        // APPLICANT BIRTH DATES (Normalized)
        birth_day: normalizeNumber(savedData.birth_day),
        birth_month: normalizeMonth(savedData.birth_month),
        birth_year: safeStr(savedData.birth_year),

        country_of_birth: safeStr(savedData.country_of_birth),
        city_of_birth: safeStr(savedData.city_of_birth),
        state_of_birth: safeStr(savedData.state_of_birth),

        marital_status: safeStr(savedData.marital_status),
        marital_status_date_day: normalizeNumber(savedData.marital_status_date_day),
        marital_status_date_month: normalizeMonth(savedData.marital_status_date_month),
        marital_status_date_year: safeStr(savedData.marital_status_date_year),
      };

      // 5. Reset the form with the clean data
      form.reset(formData);

      // 6. FORCE UPDATE (Safety Net): Explicitly set these fields to ensure UI catches up
      // We wrap this in a tiny timeout to ensure the render cycle is complete
      setTimeout(() => {
        if (savedData.birth_day) form.setValue("birth_day", normalizeNumber(savedData.birth_day));
        if (savedData.birth_month) form.setValue("birth_month", normalizeMonth(savedData.birth_month));
        if (savedData.birth_year) form.setValue("birth_year", safeStr(savedData.birth_year));
        if (savedData.marital_status) form.setValue("marital_status", safeStr(savedData.marital_status));
      }, 0);
    }

    // DEPENDENCY ARRAY FIX:
    // 1. Added draftSnap.isLoading (Critical!)
    // 2. Added JSON.stringify to ensure it runs whenever the CONTENT changes, not just the reference.
  }, [
    draftSnap.isLoading,
    JSON.stringify(draftSnap.draft?.temporary_work_details)
  ]);

  const onSubmit = async (data) => {
    // NOTE: Saving is now handled by the "Save Draft" button only
    // Continue button just navigates without saving
    // await draftStore.saveSectionData("temporary_work_details", data);
    // console.log("📦 Data saved to database:", data);
    // await draftStore.markPageComplete(`${visaType}/main-applicant/details`, null, "temporary_work_details");

    const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId);
    if (next) router.push(next);
  };

  const handlePrevious = () => {
    const prev = getPreviousRoute(pathname, visaType, draftSnap.currentApplicationId);
    if (prev) router.push(prev);
  };

  const handleSave = async () => {
    setIsSaving(true);
    isSavingRef.current = true;
    try {
      const values = form.getValues();
      console.log("📦 Data saved to database:", values);
      const result = await draftStore.saveSectionData("temporary_work_details", values);
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
      isSavingRef.current = false;
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

  // Helper references for cleaner logic
  const savedDetails = draftSnap.draft?.temporary_work_details;
  const currentFormValues = form.getValues();

  // Prepare JSON data for display
  const jsonData = {
    fullDraft: draftSnap.draft,
    temporaryWorkDetails: savedDetails,
    completionStatus: draftSnap.completionStatus,
    currentApplicationId: draftSnap.currentApplicationId,
    formValues: currentFormValues,

    // USE || HERE so that "" falls back to the saved data
    birth_day: currentFormValues.birth_day || savedDetails?.birth_day,
    birth_month: currentFormValues.birth_month || savedDetails?.birth_month,
    birth_year: currentFormValues.birth_year || savedDetails?.birth_year,
    marital_status: currentFormValues.marital_status || savedDetails?.marital_status,
  };



  return (
    <Card className="rounded-2xl shadow-md bg-white">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Main Applicant's Details</CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          In the Main Applicant section, please provide details about the person who is intending to be the primary applicant.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Main Applicant's Personal Details Section */}
          <div className="space-y-6 border-gray-200">
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
                value={form.watch("gender") || ""}
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
                  value={form.watch("birth_day") || ""}
                  onValueChange={(value) => form.setValue("birth_day", value)}
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
                  value={form.watch("birth_month") || ""}
                  onValueChange={(value) => form.setValue("birth_month", value)}
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
                  value={form.watch("birth_year") || ""}
                  onValueChange={(value) => form.setValue("birth_year", value)}
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
                value={form.watch("marital_status") || ""}
                onValueChange={(value) => form.setValue("marital_status", value)}
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
                      value={form.watch("marital_status_date_day") || ""}
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
                      value={form.watch("marital_status_date_month") || ""}
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
                      value={form.watch("marital_status_date_year") || ""}
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

          {/* Form Navigation */}
          <FormNavigation
            onPrev={handlePrevious}
            onNext={form.handleSubmit(onSubmit)}
            onSave={handleSave}
            loading={isSaving}
            saveLabel="Save Draft"
            nextLabel="Continue"
          />
        </form>
      </CardContent>
    </Card>
  );
}
