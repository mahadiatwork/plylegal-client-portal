"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect, useMemo, useRef } from "react";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { useToast } from "@/hooks/use-toast";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { getApplicationIdFromSearchParams, getProfileIdFromSearchParams } from "@/lib/intakeQueryParams";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormNavigation } from "@/components/FormNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RepeaterTable } from "@/components/RepeaterTable";
import { CitizenshipDialog, citizenshipRowSchema } from "@/components/intake/temporary-work/CitizenshipDialog";
import { COUNTRIES } from "@/reuseable/countries";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";
import { showCompletionIssuesToast } from "@/lib/temporaryWorkCompletionUi";

const formSchema = z.object({
  prefix: z.string().optional(),
  family_name: z.string().optional(),
  given_names: z.string().optional(),
  preferred_names: z.string().optional(),
  gender: z.string().optional(),
  birth_day: z.string().optional(),
  birth_month: z.string().optional(),
  birth_year: z.string().optional(),
  country_of_birth: z.string().trim().min(1, "Country of birth is required"),
  city_of_birth: z.string().trim().min(1, "City or town of birth is required"),
  state_of_birth: z.string().trim().min(1, "State or province of birth is required"),
  marital_status: z.string().optional(),
  marital_status_date_day: z.string().optional(),
  marital_status_date_month: z.string().optional(),
  marital_status_date_year: z.string().optional(),
  citizenship_of_passport_country: z.union([z.enum(["yes", "no"]), z.literal("")]).optional(),
  citizenship_other_than_birth: z.union([z.enum(["yes", "no"]), z.literal("")]).optional(),
  citizenships: z.array(citizenshipRowSchema).optional(),
}).refine(
  (data) => {
    if (data.citizenship_other_than_birth === "yes") {
      return data.citizenships && data.citizenships.length > 0;
    }
    return true;
  },
  { message: "Please add at least one citizenship", path: ["citizenships"] }
);

const MONTHS_LIST = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const EMPTY_SPOUSE_DETAILS_FORM = {
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
  citizenship_of_passport_country: "",
  citizenship_other_than_birth: "",
  citizenships: [],
};

function normalizeNumber(val) {
  if (!val) return "";
  const num = Number(val);
  return Number.isNaN(num) ? String(val) : String(num);
}

function normalizeMonth(val) {
  if (val === null || val === undefined || val === "") return "";
  const s = String(val).trim();
  if (!s) return "";
  if (!Number.isNaN(Number(s))) return String(Number(s));
  const idx = MONTHS_LIST.findIndex((m) => m.toLowerCase() === s.toLowerCase());
  return idx !== -1 ? String(idx + 1) : "";
}

function safeStr(val) {
  return val === null || val === undefined ? "" : String(val);
}

/**
 * Application Profile (`draft.profiles`) is the roster source of truth for who each person is.
 * `profiles_data.*.details` holds questionnaire answers and can drift. Identity fields must match the roster.
 */
function overlayRosterIdentity(out, rosterProfile) {
  if (!rosterProfile) return out;
  return {
    ...out,
    family_name: safeStr(rosterProfile.family_name),
    given_names: safeStr(rosterProfile.given_names),
    gender: safeStr(rosterProfile.gender),
    birth_day: normalizeNumber(rosterProfile.birth_day) || out.birth_day,
    birth_month: normalizeMonth(rosterProfile.birth_month) || out.birth_month,
    birth_year: safeStr(rosterProfile.birth_year) || out.birth_year,
  };
}

/** Build RHF values from draft store (profile or legacy). Returns null if nothing to apply. */
function buildSpouseDetailsFormValues(draftSnap, profileId, isSpouseProfile, spouseForDob, rosterProfile) {
  const savedData =
    isSpouseProfile && profileId
      ? draftSnap.draft?.profiles_data?.[profileId]?.details || {}
      : draftSnap.draft?.temporary_work_spouse_details || {};
  const identityData =
    isSpouseProfile && profileId
      ? draftSnap.draft?.profiles_data?.[profileId]?.identity || {}
      : draftSnap.draft?.temporary_work_spouse_identity || {};

  const profileDob = spouseForDob
    ? {
        birth_day: normalizeNumber(spouseForDob.birth_day),
        birth_month: normalizeMonth(spouseForDob.birth_month),
        birth_year: safeStr(spouseForDob.birth_year),
      }
    : { birth_day: "", birth_month: "", birth_year: "" };

  if (savedData && Object.keys(savedData).length > 0) {
    let migratedCitizenships = Array.isArray(savedData?.citizenships) ? savedData.citizenships : [];
    let migratedCotb = savedData?.citizenship_other_than_birth;
    if ((!migratedCitizenships || migratedCitizenships.length === 0) && identityData?.citizenships?.length > 0) {
      migratedCitizenships = identityData.citizenships;
      migratedCotb = migratedCotb || "yes";
    }

    const mergedBirthDay = normalizeNumber(savedData.birth_day) || profileDob.birth_day;
    const mergedBirthMonth = normalizeMonth(savedData.birth_month) || profileDob.birth_month;
    const mergedBirthYear = safeStr(savedData.birth_year) || profileDob.birth_year;
    const fromDetails = {
      prefix: safeStr(savedData.prefix),
      family_name: safeStr(savedData.family_name),
      given_names: safeStr(savedData.given_names),
      preferred_names: safeStr(savedData.preferred_names),
      gender: safeStr(savedData.gender),
      birth_day: mergedBirthDay,
      birth_month: mergedBirthMonth,
      birth_year: mergedBirthYear,
      country_of_birth: safeStr(savedData.country_of_birth),
      city_of_birth: safeStr(savedData.city_of_birth),
      state_of_birth: safeStr(savedData.state_of_birth),
      marital_status: safeStr(savedData.marital_status),
      marital_status_date_day: normalizeNumber(savedData.marital_status_date_day),
      marital_status_date_month: normalizeMonth(savedData.marital_status_date_month),
      marital_status_date_year: safeStr(savedData.marital_status_date_year),
      citizenship_of_passport_country: safeStr(savedData.citizenship_of_passport_country) || "",
      citizenship_other_than_birth: safeStr(migratedCotb) || "",
      citizenships: migratedCitizenships,
    };
    return overlayRosterIdentity(fromDetails, rosterProfile);
  }

  if (spouseForDob) {
    const migratedCitizenships = identityData?.citizenships?.length ? identityData.citizenships : [];
    const seeded = {
      ...EMPTY_SPOUSE_DETAILS_FORM,
      family_name: spouseForDob.family_name || "",
      given_names: spouseForDob.given_names || "",
      gender: spouseForDob.gender || "",
      birth_day: profileDob.birth_day,
      birth_month: profileDob.birth_month,
      birth_year: profileDob.birth_year,
      citizenship_of_passport_country: "",
      citizenship_other_than_birth: migratedCitizenships.length ? "yes" : "",
      citizenships: migratedCitizenships,
    };
    return overlayRosterIdentity(seeded, rosterProfile);
  }

  return null;
}

export default function Page() {
  const router = useRouter();
  const { startNavigation } = useNavigationLoading();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const visaType = getVisaTypeFromPath(pathname);
  const { toast } = useToast();
  const draftSnap = useSnapshot(draftStore);

  const [isSaving, setIsSaving] = useState(false);
  // Monotonically increasing counter to force Radix Select remounts after reset
  const [hydrationEpoch, setHydrationEpoch] = useState(0);

  const profileId = getProfileIdFromSearchParams(searchParams);
  const activeProfile = profileId ? draftSnap.draft?.profiles?.find((p) => p.id === profileId) : null;
  const isSpouseProfile = activeProfile?.relationship === "spouse";

  const spouseForDob =
    profileId && draftSnap.draft?.profiles
      ? draftSnap.draft.profiles.find((p) => p.id === profileId && p.relationship === "spouse")
      : null;
  const spouseProfileDobSig = spouseForDob
    ? `${spouseForDob.birth_day ?? ""}|${spouseForDob.birth_month ?? ""}|${spouseForDob.birth_year ?? ""}`
    : "";

  const rosterIdentitySig = activeProfile
    ? `${activeProfile.family_name ?? ""}|${activeProfile.given_names ?? ""}|${activeProfile.gender ?? ""}|${activeProfile.birth_day ?? ""}|${activeProfile.birth_month ?? ""}|${activeProfile.birth_year ?? ""}`
    : "";

  /**
   * Stable hydration key: serializes the persisted data slice so the effect re-runs on
   * genuine data changes (save, client nav back) but not on unrelated valtio updates.
   */
  const detailsHydrationKey = useMemo(() => {
    const slice =
      isSpouseProfile && profileId
        ? draftSnap.draft?.profiles_data?.[profileId]?.details ?? {}
        : draftSnap.draft?.temporary_work_spouse_details ?? {};
    const identitySlice =
      isSpouseProfile && profileId
        ? draftSnap.draft?.profiles_data?.[profileId]?.identity ?? {}
        : draftSnap.draft?.temporary_work_spouse_identity ?? {};
    return `${profileId ?? ""}|${String(isSpouseProfile)}|${JSON.stringify(slice)}|${JSON.stringify(identitySlice)}|${spouseProfileDobSig}|${rosterIdentitySig}`;
  }, [profileId, isSpouseProfile, draftSnap.draft, spouseProfileDobSig, rosterIdentitySig]);

  // Keep draft/application context in sync with URL param
  useEffect(() => {
    const appIdFromUrl = getApplicationIdFromSearchParams(searchParams);
    if (appIdFromUrl && appIdFromUrl !== draftSnap.currentApplicationId) {
      draftStore.setApplicationId(appIdFromUrl);
      draftStore.loadDraft(appIdFromUrl);
    }
  }, [searchParams, draftSnap.currentApplicationId]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    getValues,
    formState,
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: EMPTY_SPOUSE_DETAILS_FORM,
  });

  /**
   * HYDRATION EFFECT — the heart of the fix.
   *
   * Rules enforced:
   *  1. Wait for `isLoading` to be false (loading gate).
   *  2. Build values deterministically from the persisted slice + roster.
   *  3. Call `reset()` with `keepDefaultValues: false, keepDirtyValues: false` so ALL
   *     fields (including Radix Select-backed ones) receive the new values.
   *  4. Bump `hydrationEpoch` so Radix Select components remount with the correct value
   *     (Radix Select caches its initial value internally and doesn't respond to external
   *     value prop changes after mount — the `key` prop forces a fresh mount).
   *
   * Deps: `detailsHydrationKey` encodes the full data slice + profile DOB + roster identity
   * as a serialized string. This avoids referencing `draftSnap.draft` directly (which would
   * cause infinite re-triggers via Valtio proxy tracking).
   */
  useEffect(() => {
    if (draftSnap.isLoading) return;
    const values = buildSpouseDetailsFormValues(draftSnap, profileId, isSpouseProfile, spouseForDob, activeProfile);
    if (values) {
      reset(values, { keepDefaultValues: false, keepDirtyValues: false });
      setHydrationEpoch((e) => e + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- draft slice + profileId in detailsHydrationKey
  }, [detailsHydrationKey, draftSnap.isLoading, reset]);

  const onSubmit = async () => {
    const values = getValues();
    const result = (profileId && isSpouseProfile)
      ? await draftStore.saveProfileSectionData(profileId, "details", values)
      : await draftStore.saveSectionData("temporary_work_spouse_details", values);

    if (result.success) {
      const completionResult = (profileId && isSpouseProfile)
        ? await draftStore.markProfilePageComplete(profileId, `${visaType}/spouse-partner/details`)
        : await draftStore.markPageComplete(`${visaType}/spouse-partner/details`, null, "temporary_work_spouse_details");

      if (!completionResult.success) {
        showCompletionIssuesToast(toast, completionResult);
        return;
      }

      const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId, draftSnap.visaContext);
      if (next) {
        startNavigation(next);
        router.push(next);
      }
    } else {
      toast({ title: "Error", description: result.error || "Failed to save", variant: "destructive" });
    }
  };

  const handlePrevious = () => {
    const prev = getPreviousRoute(pathname, visaType, draftSnap.currentApplicationId, draftSnap.visaContext);
    if (prev) {
      startNavigation(prev);
      router.push(prev);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const values = getValues();
      let result;
      if (profileId && isSpouseProfile) {
        result = await draftStore.saveProfileSectionData(profileId, "details", values);
        if (result.success) {
          await draftStore.markProfilePageComplete(profileId, `${visaType}/spouse-partner/details`);
        }
      } else {
        result = await draftStore.saveSectionData("temporary_work_spouse_details", values);
        if (result.success) {
          await draftStore.markPageComplete(
            `${visaType}/spouse-partner/details`,
            null,
            "temporary_work_spouse_details"
          );
        }
      }
      if (result.success) {
        toast({ title: "Draft saved", description: "Your changes have been saved successfully" });
      } else {
        toast({ title: "Error", description: result.error || "Failed to save draft", variant: "destructive" });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => (currentYear - i).toString());

  const maritalStatuses = [
    "Never Married",
    "Married",
    "De Facto Relationship",
    "Divorced",
    "Widowed",
    "Separated",
  ];

  const titleName = activeProfile
    ? `${activeProfile.given_names || ""} ${activeProfile.family_name || ""}`.trim()
    : "";

  // Watched value for conditional rendering of marital status date
  const maritalStatusValue = watch("marital_status");
  const citizenshipOfPassportCountry = watch("citizenship_of_passport_country");
  const citizenshipOther = watch("citizenship_other_than_birth");
  const citizenshipsList = watch("citizenships") || [];

  return (
    <Card className="rounded-2xl shadow-md bg-white">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">
          {titleName ? `Details — ${titleName}` : "Spouse/Partner's Details"}
        </CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          Provide details for the spouse or partner included in this application.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div className="space-y-6">
            <h3 className="text-lg font-medium border-b pb-2">Personal Information</h3>
            <div>
              <Label>Family Name</Label>
              <Input {...register("family_name")} data-testid="input-family-name" />
            </div>

            <div>
              <Label>Given Names</Label>
              <Input {...register("given_names")} data-testid="input-given-names" />
            </div>

            <div>
              <Label>Gender</Label>
              <Controller
                control={control}
                name="gender"
                render={({ field }) => (
                  <RadioGroup
                    value={field.value || ""}
                    onValueChange={field.onChange}
                    className="flex gap-4 mt-2"
                    data-testid="radio-gender"
                  >
                    {["Male", "Female", "Other"].map((gender) => (
                      <div key={gender} className="flex items-center">
                        <RadioGroupItem value={gender} id={`spouse-gender-${gender.toLowerCase()}`} />
                        <Label htmlFor={`spouse-gender-${gender.toLowerCase()}`} className="ml-2 cursor-pointer font-normal">
                          {gender}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              />
            </div>

            {/* DOB — wrapped in Controller + remount key so Radix Select re-syncs after reset */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Date of Birth - Day</Label>
                <Controller
                  control={control}
                  name="birth_day"
                  render={({ field }) => (
                    <Select
                      key={`bd-${hydrationEpoch}-${field.value}`}
                      value={field.value || ""}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger data-testid="select-birth-day">
                        <SelectValue placeholder="Choose Day" />
                      </SelectTrigger>
                      <SelectContent>
                        {days.map((day) => (
                          <SelectItem key={day} value={day}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div>
                <Label>Month</Label>
                <Controller
                  control={control}
                  name="birth_month"
                  render={({ field }) => (
                    <Select
                      key={`bm-${hydrationEpoch}-${field.value}`}
                      value={field.value || ""}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger data-testid="select-birth-month">
                        <SelectValue placeholder="Choose Month" />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((month, idx) => (
                          <SelectItem key={month} value={(idx + 1).toString()}>
                            {month}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div>
                <Label>Year</Label>
                <Controller
                  control={control}
                  name="birth_year"
                  render={({ field }) => (
                    <Select
                      key={`by-${hydrationEpoch}-${field.value}`}
                      value={field.value || ""}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger data-testid="select-birth-year">
                        <SelectValue placeholder="Choose Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((year) => (
                          <SelectItem key={year} value={year}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            {/* Marital Status — Controller + remount key */}
            <div>
              <Label>What is your marital status?</Label>
              <Controller
                control={control}
                name="marital_status"
                render={({ field }) => (
                  <Select
                    key={`ms-${hydrationEpoch}-${field.value}`}
                    value={field.value || ""}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger data-testid="select-marital-status">
                      <SelectValue placeholder="Choose Marital Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {maritalStatuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {maritalStatusValue && maritalStatusValue !== "Never Married" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {maritalStatusValue === "Married" && "Date of Marriage"}
                  {maritalStatusValue === "De Facto Relationship" && "Date De Facto Relationship Began"}
                  {maritalStatusValue === "Divorced" && "Date of Divorce"}
                  {maritalStatusValue === "Widowed" && "Date of Death of Spouse"}
                  {maritalStatusValue === "Separated" && "Date of Separation"}{" "}
                  <span className="text-red-600">*</span>
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="marital_status_date_day" className="text-xs text-gray-600">
                      Day
                    </Label>
                    <Controller
                      control={control}
                      name="marital_status_date_day"
                      render={({ field }) => (
                        <Select
                          key={`msd-${hydrationEpoch}-${field.value}`}
                          value={field.value || ""}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger id="marital_status_date_day">
                            <SelectValue placeholder="Day" />
                          </SelectTrigger>
                          <SelectContent>
                            {days.map((day) => (
                              <SelectItem key={day} value={day}>
                                {day}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div>
                    <Label htmlFor="marital_status_date_month" className="text-xs text-gray-600">
                      Month
                    </Label>
                    <Controller
                      control={control}
                      name="marital_status_date_month"
                      render={({ field }) => (
                        <Select
                          key={`msm-${hydrationEpoch}-${field.value}`}
                          value={field.value || ""}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger id="marital_status_date_month">
                            <SelectValue placeholder="Month" />
                          </SelectTrigger>
                          <SelectContent>
                            {months.map((month, idx) => (
                              <SelectItem key={month} value={(idx + 1).toString()}>
                                {month}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div>
                    <Label htmlFor="marital_status_date_year" className="text-xs text-gray-600">
                      Year
                    </Label>
                    <Controller
                      control={control}
                      name="marital_status_date_year"
                      render={({ field }) => (
                        <Select
                          key={`msy-${hydrationEpoch}-${field.value}`}
                          value={field.value || ""}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger id="marital_status_date_year">
                            <SelectValue placeholder="Year" />
                          </SelectTrigger>
                          <SelectContent>
                            {years.map((year) => (
                              <SelectItem key={year} value={year}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <h3 className="text-lg font-medium border-b pb-2">Birthplace Information</h3>
            <div>
              <Label htmlFor="country_of_birth">Country of Birth</Label>
              <Controller
                control={control}
                name="country_of_birth"
                render={({ field }) => (
                  <Select
                    key={`cob-${profileId ?? "na"}-${hydrationEpoch}-${field.value || ""}`}
                    value={field.value || ""}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger id="country_of_birth" data-testid="select-country-of-birth">
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
              {formState.errors.country_of_birth?.message && (
                <p className="text-sm text-red-600 mt-1">{formState.errors.country_of_birth.message}</p>
              )}
            </div>

            <div>
              <Label>City or Town of Birth</Label>
              <Input {...register("city_of_birth")} data-testid="input-city-of-birth" />
              {formState.errors.city_of_birth?.message && (
                <p className="text-sm text-red-600 mt-1">{formState.errors.city_of_birth.message}</p>
              )}
            </div>

            <div>
              <Label>State or Province of Birth</Label>
              <Input {...register("state_of_birth")} data-testid="input-state-of-birth" />
              {formState.errors.state_of_birth?.message && (
                <p className="text-sm text-red-600 mt-1">{formState.errors.state_of_birth.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-lg font-medium border-b pb-2">Citizenships</h3>
            <div>
              <Label className="text-base font-medium mb-3 block">
                Is this applicant a citizen of their country of passport?
              </Label>
              <RadioGroup
                value={citizenshipOfPassportCountry || ""}
                onValueChange={(value) => setValue("citizenship_of_passport_country", value, { shouldValidate: true, shouldDirty: true })}
                className="flex gap-4"
              >
                <div className="flex items-center">
                  <RadioGroupItem value="yes" id="spouse-passport-citizen-yes" />
                  <Label htmlFor="spouse-passport-citizen-yes" className="ml-2 cursor-pointer font-normal">Yes</Label>
                </div>
                <div className="flex items-center">
                  <RadioGroupItem value="no" id="spouse-passport-citizen-no" />
                  <Label htmlFor="spouse-passport-citizen-no" className="ml-2 cursor-pointer font-normal">No</Label>
                </div>
              </RadioGroup>
              {formState.errors.citizenship_of_passport_country?.message && (
                <p className="text-sm text-red-600 mt-1">{formState.errors.citizenship_of_passport_country.message}</p>
              )}
            </div>
            <div>
              <Label className="text-base font-medium mb-3 block">
                Is this applicant a citizen of any other country?
              </Label>
              <RadioGroup
                value={citizenshipOther || ""}
                onValueChange={(value) => {
                  setValue("citizenship_other_than_birth", value, { shouldValidate: true, shouldDirty: true });
                  if (value === "no") {
                    setValue("citizenships", [], { shouldValidate: true, shouldDirty: true });
                  }
                }}
                className="flex gap-4"
              >
                <div className="flex items-center">
                  <RadioGroupItem value="yes" id="spouse-cotb-yes" />
                  <Label htmlFor="spouse-cotb-yes" className="ml-2 cursor-pointer font-normal">Yes</Label>
                </div>
                <div className="flex items-center">
                  <RadioGroupItem value="no" id="spouse-cotb-no" />
                  <Label htmlFor="spouse-cotb-no" className="ml-2 cursor-pointer font-normal">No</Label>
                </div>
              </RadioGroup>
              {formState.errors.citizenship_other_than_birth?.message && (
                <p className="text-sm text-red-600 mt-1">{formState.errors.citizenship_other_than_birth.message}</p>
              )}
            </div>
            {citizenshipOther === "yes" && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-4">
                  Enter details of each other citizenship held by this applicant.
                </p>
                <RepeaterTable
                  data={citizenshipsList}
                  columns={[
                    { key: "country", label: "Country" },
                    { key: "how_obtained", label: "How was this Citizenship obtained?" },
                    {
                      key: "date_obtained_day",
                      label: "Date Obtained",
                      format: (row) =>
                        `${row.date_obtained_day || ""} ${row.date_obtained_month || ""} ${row.date_obtained_year || ""}`,
                    },
                  ]}
                  onAdd={(newRow) => {
                    const updated = [...citizenshipsList, newRow];
                    setValue("citizenships", updated, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                  }}
                  onEdit={(index, updatedRow) => {
                    const updated = [...citizenshipsList];
                    updated[index] = updatedRow;
                    setValue("citizenships", updated, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                  }}
                  onDelete={(index) => {
                    const updated = citizenshipsList.filter((_, i) => i !== index);
                    setValue("citizenships", updated, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                  }}
                  DialogComponent={CitizenshipDialog}
                  addButtonText="Add"
                  testIdPrefix="spouse-details-citizenship"
                />
                {formState.errors.citizenships && (
                  <p className="text-sm text-red-600 mt-2">{formState.errors.citizenships.message}</p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <h3 className="text-lg font-medium border-b pb-2">Other names/spellings</h3>
            <div>
              <Label>Preferred Names</Label>
              <Input {...register("preferred_names")} data-testid="input-preferred-names" />
            </div>
          </div>

          <FormNavigation
            onPrev={handlePrevious}
            onNext={handleSubmit(onSubmit)}
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
