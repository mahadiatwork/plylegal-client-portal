"use client";
import { PersonalDetailsFields } from "@/components/intake/target-visas/PersonalDetailsFields";
import { targetPersonalDetailsSchema, normalizeTargetPersonalDetails } from "@/lib/targetVisaPersonalDetails";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { authStore } from "@/stores/authStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormNavigation } from "@/components/FormNavigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { getProfileIdFromSearchParams } from "@/lib/intakeQueryParams";
import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { COUNTRIES } from "@/reuseable/countries";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";
import { Download } from "lucide-react";

const spousePartnerDetailsSchema = targetPersonalDetailsSchema;

const firstText = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
};

const normalizeNumberString = (value) => {
  const text = firstText(value);
  if (!text) return "";
  const number = Number(text);
  return Number.isFinite(number) ? String(number) : text;
};

const normalizeGender = (value) => {
  const text = firstText(value);
  if (!text) return "";
  const lower = text.toLowerCase();
  if (lower === "m" || lower === "male") return "Male";
  if (lower === "f" || lower === "female") return "Female";
  if (lower === "other") return "Other";
  return "";
};

const isSpouseDependent = (dependent) => {
  const relationship = firstText(dependent?.relationship, dependent?.Relationship_to_Applicant).toLowerCase();
  return relationship.includes("spouse") || relationship.includes("partner") || relationship.includes("de facto");
};

function buildSpouseImportValues(dependent) {
  return {
    family_name: firstText(dependent?.family_name, dependent?.lastName, dependent?.Last_Name),
    given_names: firstText(dependent?.given_names, dependent?.firstName, dependent?.First_Name),
    preferred_names: firstText(dependent?.preferred_names, dependent?.preferredName),
    gender: normalizeGender(firstText(dependent?.gender, dependent?.Gender)),
    birth_day: normalizeNumberString(dependent?.birth_day),
    birth_month: normalizeNumberString(dependent?.birth_month),
    birth_year: firstText(dependent?.birth_year),
    country_of_birth: firstText(dependent?.country_of_birth, dependent?.countryOfBirth),
    suburb_of_birth: firstText(dependent?.suburb_of_birth, dependent?.suburbOfBirth),
    city_of_birth: firstText(dependent?.city_of_birth, dependent?.cityOfBirth),
    state_of_birth: firstText(dependent?.state_of_birth, dependent?.stateOfBirth),
  };
}

export default function SpousePartnerDetailsPage({ sectionName = "details" } = {}) {
  const legacyDetailsKey = sectionName === "personal-details" ? "spousePartner.personalDetails" : "spousePartner.details";
  const pageKey = `partner/spouse-partner/${sectionName}`;
  const router = useRouter();
  const { startNavigation } = useNavigationLoading();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const profileId = getProfileIdFromSearchParams(searchParams);
  const draftSnap = useSnapshot(draftStore);
  const authSnap = useSnapshot(authStore);
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [crmDependents, setCrmDependents] = useState([]);
  const [isImportingDetails, setIsImportingDetails] = useState(false);

  // Get visa type from pathname
  const visaType = getVisaTypeFromPath(pathname);

  // Profile awareness
  const activeProfile = profileId ? draftSnap.draft?.profiles?.find((p) => p.id === profileId) : null;
  const isSpouseProfile = activeProfile?.relationship === "spouse";

  // Set application ID from URL params if available
  useEffect(() => {
    const appIdFromUrl = searchParams.get('applicationId');
    if (appIdFromUrl && appIdFromUrl !== draftSnap.currentApplicationId) {
      draftStore.setApplicationId(appIdFromUrl);
      draftStore.loadDraft(appIdFromUrl);
    }
  }, [searchParams, draftSnap.currentApplicationId, pathname, router]);

  // Load section data
  const sectionData = (profileId && isSpouseProfile)
    ? draftSnap.draft?.profiles_data?.[profileId]?.[sectionName]
    : (profileId ? draftSnap.draft?.profiles_data?.[profileId]?.[sectionName] : draftStore.getSectionData(legacyDetailsKey));

  const basicDetails = sectionName === "personal-details"
    ? (profileId ? draftSnap.draft?.profiles_data?.[profileId]?.details : draftSnap.draft?.spousePartner?.details)
    : null;

  const fetchCrmDependents = useCallback(async () => {
    const userId = authSnap.user?.id;
    if (!userId) return [];

    try {
      const params = new URLSearchParams({ userId });
      if (authSnap.userProfile?.zohoContactId) {
        params.set("zohoContactId", authSnap.userProfile.zohoContactId);
      }
      const res = await fetch(`/api/intake/dependents?${params.toString()}`);
      const data = await res.json();
      if (data?.success && Array.isArray(data.dependents)) {
        setCrmDependents(data.dependents);
        return data.dependents;
      }
    } catch (error) {
      console.warn("Could not load CRM dependents for spouse import:", error);
    }
    return [];
  }, [authSnap.user?.id, authSnap.userProfile?.zohoContactId]);

  useEffect(() => {
    fetchCrmDependents();
  }, [fetchCrmDependents]);

  const form = useForm({
    resolver: zodResolver(spousePartnerDetailsSchema),
    mode: "onChange",
    defaultValues: normalizeTargetPersonalDetails({}, {}),
  });
  const { reset } = form;

  useEffect(() => {
    if (draftSnap.isLoading) return;
    form.reset(normalizeTargetPersonalDetails({ ...basicDetails, ...sectionData }, activeProfile || {}));
  }, [draftSnap.isLoading, sectionData, basicDetails, activeProfile, form]);

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
      const existingData = (profileId && isSpouseProfile)
        ? draftSnap.draft?.profiles_data?.[profileId]?.[sectionName] || {}
        : (profileId ? draftSnap.draft?.profiles_data?.[profileId]?.[sectionName] : draftStore.getSectionData(legacyDetailsKey)) || {};
      const mergedData = { ...existingData, ...form.getValues() };

      const result = (profileId && isSpouseProfile)
        ? await draftStore.saveProfileSectionData(profileId, sectionName, mergedData)
        : profileId ? await draftStore.saveProfileSectionData(profileId, sectionName, mergedData) : await draftStore.saveSectionData(legacyDetailsKey, mergedData);

      if (result.success) {
        if (profileId && isSpouseProfile) {
          await draftStore.markProfilePageComplete(profileId, pageKey);
        } else {
          if (profileId) { await draftStore.markProfilePageComplete(profileId, pageKey); } else { await draftStore.markPageComplete(pageKey); }
        }
        const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId, draftSnap.visaContext);
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
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrevious = () => {
    const prev = getPreviousRoute(pathname, visaType, draftSnap.currentApplicationId, draftSnap.visaContext);
    startNavigation(prev);
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

    const isComplete = await form.trigger();
    setIsSaving(true);
    try {
      // Merge with existing section data to preserve other fields
      const existingData = (profileId && isSpouseProfile)
        ? draftSnap.draft?.profiles_data?.[profileId]?.[sectionName] || {}
        : (profileId ? draftSnap.draft?.profiles_data?.[profileId]?.[sectionName] : draftStore.getSectionData(legacyDetailsKey)) || {};
      const currentData = form.getValues();
      const mergedData = { ...existingData, ...currentData };

      const result = (profileId && isSpouseProfile)
        ? await draftStore.saveProfileSectionData(profileId, sectionName, mergedData)
        : profileId ? await draftStore.saveProfileSectionData(profileId, sectionName, mergedData) : await draftStore.saveSectionData(legacyDetailsKey, mergedData);

      if (result.success) {
        if (isComplete) {
          if (profileId) await draftStore.markProfilePageComplete(profileId, pageKey);
          else await draftStore.markPageComplete(pageKey);
        } else {
          await draftStore.markPageIncomplete(profileId ? `${pageKey}__${profileId}` : pageKey);
        }
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

  const handleImportDetails = async () => {
    setIsImportingDetails(true);
    try {
      const dependents = crmDependents.length > 0 ? crmDependents : await fetchCrmDependents();
      const spouse = dependents.find(isSpouseDependent);

      if (!spouse) {
        toast({
          title: "No spouse details found",
          description: "We could not find a spouse/partner record to import.",
          variant: "destructive",
        });
        return;
      }

      const importValues = buildSpouseImportValues(spouse);
      const entries = Object.entries(importValues).filter(([, value]) => Boolean(firstText(value)));
      const nextValues = { ...form.getValues() };
      entries.forEach(([key, value]) => {
        nextValues[key] = value;
      });
      reset(nextValues, { keepDefaultValues: true });
      toast({
        title: "Details imported",
        description: "Please review the imported spouse/partner information before continuing.",
      });
    } finally {
      setIsImportingDetails(false);
    }
  };

  return (
    <>
      <Card className="rounded-2xl shadow-md bg-white">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">{activeProfile ? `Details — ${activeProfile.given_names} ${activeProfile.family_name}` : "Spouse/Partner's Details"}</CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Provide details for the spouse or partner. Include their details even if they are not included in this application.
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

            <div className="flex flex-col gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-primary">Import existing details</p>
                <p className="text-sm text-gray-600">Prefill this page from the connected spouse/partner record.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleImportDetails}
                disabled={isImportingDetails}
                className="w-full sm:w-auto"
              >
                <Download className="mr-2 h-4 w-4" />
                {isImportingDetails ? "Importing..." : "Import details"}
              </Button>
            </div>

            <PersonalDetailsFields form={form} />
            <div className="space-y-6">
              <h3 className="text-lg font-medium border-b pb-2">Migration and Additional Details</h3>
              <div>
                <Label className="mb-2 block">Is your Spouse/Partner intending to migrate/travel to Australia as part of any application made by you?</Label>
                <RadioGroup value={form.watch("intending_to_migrate") || ""} onValueChange={(value) => form.setValue("intending_to_migrate", value, { shouldDirty: true })} className="flex flex-wrap gap-4 mt-2">
                  {["Yes", "No", "Other - they are my Sponsor"].map((option, index) => <div key={option} className="flex items-center space-x-2"><RadioGroupItem value={option} id={`migration-${index}`} /><Label htmlFor={`migration-${index}`} className="cursor-pointer font-normal">{option}</Label></div>)}
                </RadioGroup>
              </div>
              <div><Label>Suburb of Birth</Label><Input {...form.register("suburb_of_birth")} data-testid="input-suburb-of-birth" /></div>
              {(sectionName === "personal-details" || form.watch("country_of_residence")) && <div>
                <Label>Country of Current Residence</Label>
                <Select value={form.watch("country_of_residence") || ""} onValueChange={(value) => form.setValue("country_of_residence", value, { shouldDirty: true })}>
                  <SelectTrigger><SelectValue placeholder="Choose Country" /></SelectTrigger>
                  <SelectContent>{[...new Set([...COUNTRIES, ...(form.watch("country_of_residence") ? [form.watch("country_of_residence")] : [])])].map((country) => <SelectItem key={country} value={country}>{country}</SelectItem>)}</SelectContent>
                </Select>
              </div>}
            </div>

            <FormNavigation
            nextLabel="Continue"
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
