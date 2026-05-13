"use client";

import { useRouter, usePathname, useSearchParams, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect, useRef, useMemo } from "react";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { useToast } from "@/hooks/use-toast";
import {
  getVisaTypeFromPath,
  getNextRoute,
  getPreviousRoute,
} from "@/lib/routes";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormNavigation } from "@/components/FormNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";
const childDetailsSchema = z.object({
  prefix: z.string().optional(),
  family_name: z.string().optional(),
  given_names: z.string().optional(),
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

export default function ChildDetailsPage() {
  const router = useRouter();
  const { startNavigation } = useNavigationLoading();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams();
  const visaType = getVisaTypeFromPath(pathname);
  const { toast } = useToast();
  const draftSnap = useSnapshot(draftStore);

  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);

  const childId = typeof params?.childId === "string" ? params.childId : null;
  const profileId = childId;
  const appId = searchParams.get("applicationId");
  const profileReturnAppId = appId || draftSnap.currentApplicationId;
  const activeProfile =
    childId && draftSnap.draft?.profiles
      ? draftSnap.draft.profiles.find((p) => p.id === childId) ?? null
      : null;

  const childForDob =
    childId && draftSnap.draft?.profiles
      ? draftSnap.draft.profiles.find((p) => p.id === childId && p.relationship === "child")
      : null;
  const childProfileDobSig = childForDob
    ? `${childForDob.birth_day ?? ""}|${childForDob.birth_month ?? ""}|${childForDob.birth_year ?? ""}`
    : "";

  const populateFormKey = useMemo(() => {
    const details =
      profileId != null ? draftSnap.draft?.profiles_data?.[profileId]?.details ?? null : null;
    return `${String(draftSnap.isLoading)}|${profileId ?? ""}|${JSON.stringify(details)}|${childProfileDobSig}`;
  }, [draftSnap.isLoading, profileId, draftSnap.draft, childProfileDobSig]);

  useEffect(() => {
    const appIdFromUrl = searchParams.get("applicationId");
    if (appIdFromUrl && appIdFromUrl !== draftSnap.currentApplicationId) {
      draftStore.setApplicationId(appIdFromUrl);
      draftStore.loadDraft(appIdFromUrl);
    }
  }, [searchParams, draftSnap.currentApplicationId]);

  useEffect(() => {
    if (!childId) return;
    if (!activeProfile || activeProfile.relationship !== "child") {
      router.replace(
        profileReturnAppId
          ? `/intake/temporary-work/profile?applicationId=${encodeURIComponent(profileReturnAppId)}`
          : "/intake/temporary-work/profile"
      );
    }
  }, [childId, activeProfile, router, profileReturnAppId]);

  const form = useForm({
    resolver: zodResolver(childDetailsSchema),
    defaultValues: {
      prefix: "",
      family_name: "",
      given_names: "",
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
    if (!profileId) return;

    const savedData = draftSnap.draft?.profiles_data?.[profileId]?.details || {};

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

    const profileDob = childForDob
      ? {
          birth_day: normalizeNumber(childForDob.birth_day),
          birth_month: normalizeMonth(childForDob.birth_month),
          birth_year: safeStr(childForDob.birth_year),
        }
      : { birth_day: "", birth_month: "", birth_year: "" };

    if (savedData && Object.keys(savedData).length > 0) {
      const formData = {
        prefix: safeStr(savedData.prefix),
        family_name: safeStr(savedData.family_name),
        given_names: safeStr(savedData.given_names),
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
    } else if (childForDob) {
      form.reset({
        family_name: childForDob.family_name || "",
        given_names: childForDob.given_names || "",
        gender: childForDob.gender || "",
        birth_day: profileDob.birth_day,
        birth_month: profileDob.birth_month,
        birth_year: profileDob.birth_year,
        prefix: "",
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
    const result = await draftStore.saveProfileSectionData(profileId, "details", values);
    if (result.success) {
      await draftStore.markProfilePageComplete(profileId, `${visaType}/children/${childId}/details`);
      const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId, draftSnap.visaContext);
      startNavigation(next);
      if (next) router.push(next);
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
    isSavingRef.current = true;
    try {
      const values = form.getValues();
      const result = await draftStore.saveProfileSectionData(profileId, "details", values);
      if (result.success) {
        await draftStore.markProfilePageComplete(profileId, `${visaType}/children/${childId}/details`);
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

  if (!activeProfile || activeProfile.relationship !== "child") {
    return null;
  }

  return (
    <Card className="rounded-2xl shadow-md bg-white">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">
          Details — {activeProfile.given_names} {activeProfile.family_name}
        </CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          Provide personal and birthplace details for this dependent child included in the application.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          {/* Personal Information */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium border-b pb-2">Personal Information</h3>
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

          {/* Birthplace Information */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium border-b pb-2">Birthplace Information</h3>
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
