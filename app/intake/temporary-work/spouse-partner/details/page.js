"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect, useRef, useMemo } from "react";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { useToast } from "@/hooks/use-toast";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormNavigation } from "@/components/FormNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const formSchema = z.object({
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
  const isSavingRef = useRef(false);

  const profileId = searchParams.get("profileId");
  const appId = searchParams.get("applicationId");
  const activeProfile = profileId ? draftSnap.draft?.profiles?.find((p) => p.id === profileId) : null;
  const isSpouseProfile = activeProfile?.relationship === "spouse";

  const spouseForDob =
    profileId && draftSnap.draft?.profiles
      ? draftSnap.draft.profiles.find((p) => p.id === profileId && p.relationship === "spouse")
      : null;
  const spouseProfileDobSig = spouseForDob
    ? `${spouseForDob.birth_day ?? ""}|${spouseForDob.birth_month ?? ""}|${spouseForDob.birth_year ?? ""}`
    : "";

  const populateFormKey = useMemo(() => {
    const savedSlice =
      isSpouseProfile && profileId
        ? draftSnap.draft?.profiles_data?.[profileId]?.details ?? null
        : draftSnap.draft?.temporary_work_spouse_details ?? null;
    return `${String(draftSnap.isLoading)}|${profileId ?? ""}|${String(isSpouseProfile)}|${JSON.stringify(savedSlice)}|${spouseProfileDobSig}`;
  }, [draftSnap.isLoading, profileId, isSpouseProfile, draftSnap.draft, spouseProfileDobSig]);

  // Keep draft/application context in sync with URL param
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

  useEffect(() => {
    if (isSavingRef.current) return;
    if (draftSnap.isLoading) return;

    const savedData = isSpouseProfile && profileId
      ? draftSnap.draft?.profiles_data?.[profileId]?.details || {}
      : draftSnap.draft?.temporary_work_spouse_details || {};

    const monthsList = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];
    const normalizeNumber = (val) => {
      if (!val) return "";
      const num = Number(val);
      return isNaN(num) ? val : String(num);
    };
    const normalizeMonth = (val) => {
      if (val === null || val === undefined || val === "") return "";
      const s = String(val).trim();
      if (!s) return "";
      if (!isNaN(Number(s))) return String(Number(s));
      const idx = monthsList.findIndex((m) => m.toLowerCase() === s.toLowerCase());
      return idx !== -1 ? String(idx + 1) : "";
    };
    const safeStr = (val) => (val === null || val === undefined ? "" : String(val));

    const profileDob = spouseForDob
      ? {
          birth_day: normalizeNumber(spouseForDob.birth_day),
          birth_month: normalizeMonth(spouseForDob.birth_month),
          birth_year: safeStr(spouseForDob.birth_year),
        }
      : { birth_day: "", birth_month: "", birth_year: "" };

    if (savedData && Object.keys(savedData).length > 0) {
      const formData = {
        prefix: safeStr(savedData.prefix),
        family_name: safeStr(savedData.family_name),
        given_names: safeStr(savedData.given_names),
        preferred_names: safeStr(savedData.preferred_names),
        gender: safeStr(savedData.gender),
        birth_day: normalizeNumber(savedData.birth_day) || profileDob.birth_day,
        birth_month: normalizeMonth(savedData.birth_month) || profileDob.birth_month,
        birth_year: safeStr(savedData.birth_year) || profileDob.birth_year,
        country_of_birth: safeStr(savedData.country_of_birth),
        city_of_birth: safeStr(savedData.city_of_birth),
        state_of_birth: safeStr(savedData.state_of_birth),
        marital_status: safeStr(savedData.marital_status),
        marital_status_date_day: normalizeNumber(savedData.marital_status_date_day),
        marital_status_date_month: normalizeMonth(savedData.marital_status_date_month),
        marital_status_date_year: safeStr(savedData.marital_status_date_year),
      };
      const mergedBirthDay = normalizeNumber(savedData.birth_day) || profileDob.birth_day;
      const mergedBirthMonth = normalizeMonth(savedData.birth_month) || profileDob.birth_month;
      const mergedBirthYear = safeStr(savedData.birth_year) || profileDob.birth_year;
      form.reset({ ...formData, birth_day: mergedBirthDay, birth_month: mergedBirthMonth, birth_year: mergedBirthYear });
      setTimeout(() => {
        form.setValue("birth_day", mergedBirthDay);
        form.setValue("birth_month", mergedBirthMonth);
        form.setValue("birth_year", mergedBirthYear);
        if (savedData.marital_status) form.setValue("marital_status", safeStr(savedData.marital_status));
      }, 0);
    } else if (spouseForDob) {
      form.reset({
        prefix: "",
        family_name: spouseForDob.family_name || "",
        given_names: spouseForDob.given_names || "",
        preferred_names: "",
        gender: spouseForDob.gender || "",
        birth_day: profileDob.birth_day,
        birth_month: profileDob.birth_month,
        birth_year: profileDob.birth_year,
        country_of_birth: "",
        city_of_birth: "",
        state_of_birth: "",
        marital_status: "",
        marital_status_date_day: "",
        marital_status_date_month: "",
        marital_status_date_year: "",
      });
      setTimeout(() => {
        form.setValue("birth_day", profileDob.birth_day);
        form.setValue("birth_month", profileDob.birth_month);
        form.setValue("birth_year", profileDob.birth_year);
      }, 0);
    }
  }, [populateFormKey]);

  const onSubmit = async () => {
    const values = form.getValues();
    const result = (profileId && isSpouseProfile)
      ? await draftStore.saveProfileSectionData(profileId, "details", values)
      : await draftStore.saveSectionData("temporary_work_spouse_details", values);

    if (result.success) {
      if (profileId && isSpouseProfile) {
        await draftStore.markProfilePageComplete(profileId, `${visaType}/spouse-partner/details`);
      } else {
        await draftStore.markPageComplete(`${visaType}/spouse-partner/details`, null, "temporary_work_spouse_details");
      }

      const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId, draftSnap.visaContext);
      if (next) {
        router.push(next);
      }
    } else {
      toast({ title: "Error", description: result.error || "Failed to save", variant: "destructive" });
    }
  };

  const handlePrevious = () => {
    const prev = getPreviousRoute(pathname, visaType, draftSnap.currentApplicationId, draftSnap.visaContext);
    if (prev) {
      router.push(prev);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    isSavingRef.current = true;
    try {
      const values = form.getValues();
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
      isSavingRef.current = false;
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

  return (
    <Card className="rounded-2xl shadow-md bg-white">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">
          {titleName ? `Details — ${titleName}` : "Spouse/Partner's Details"}
        </CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          Provide details for the spouse or partner included in this application (citizenship is captured on Identity).
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="space-y-6">
            <h3 className="text-lg font-medium border-b pb-2">Personal Information</h3>
            <div>
              <Label>Family Name</Label>
              <Input {...form.register("family_name")} data-testid="input-family-name" />
            </div>

            <div>
              <Label>Given Names</Label>
              <Input {...form.register("given_names")} data-testid="input-given-names" />
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
                    <RadioGroupItem value={gender} id={`spouse-gender-${gender.toLowerCase()}`} />
                    <Label htmlFor={`spouse-gender-${gender.toLowerCase()}`} className="ml-2 cursor-pointer font-normal">
                      {gender}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
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
                      <SelectItem key={day} value={day}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                      <SelectItem key={month} value={(idx + 1).toString()}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.watch("marital_status") && form.watch("marital_status") !== "Never Married" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {form.watch("marital_status") === "Married" && "Date of Marriage"}
                  {form.watch("marital_status") === "De Facto Relationship" && "Date De Facto Relationship Began"}
                  {form.watch("marital_status") === "Divorced" && "Date of Divorce"}
                  {form.watch("marital_status") === "Widowed" && "Date of Death of Spouse"}
                  {form.watch("marital_status") === "Separated" && "Date of Separation"}{" "}
                  <span className="text-red-600">*</span>
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="marital_status_date_day" className="text-xs text-gray-600">
                      Day
                    </Label>
                    <Select
                      value={form.watch("marital_status_date_day") || ""}
                      onValueChange={(value) => form.setValue("marital_status_date_day", value)}
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
                  </div>

                  <div>
                    <Label htmlFor="marital_status_date_month" className="text-xs text-gray-600">
                      Month
                    </Label>
                    <Select
                      value={form.watch("marital_status_date_month") || ""}
                      onValueChange={(value) => form.setValue("marital_status_date_month", value)}
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
                  </div>

                  <div>
                    <Label htmlFor="marital_status_date_year" className="text-xs text-gray-600">
                      Year
                    </Label>
                    <Select
                      value={form.watch("marital_status_date_year") || ""}
                      onValueChange={(value) => form.setValue("marital_status_date_year", value)}
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
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <h3 className="text-lg font-medium border-b pb-2">Birthplace Information</h3>
            <div>
              <Label>Country of Birth</Label>
              <Input
                {...form.register("country_of_birth")}
                placeholder="Choose Country"
                data-testid="input-country-of-birth"
              />
            </div>

            <div>
              <Label>City or Town of Birth</Label>
              <Input {...form.register("city_of_birth")} data-testid="input-city-of-birth" />
            </div>

            <div>
              <Label>State or Province of Birth</Label>
              <Input {...form.register("state_of_birth")} data-testid="input-state-of-birth" />
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-lg font-medium border-b pb-2">Other names/spellings</h3>
            <div>
              <Label>Preferred Names</Label>
              <Input {...form.register("preferred_names")} data-testid="input-preferred-names" />
            </div>
          </div>

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
