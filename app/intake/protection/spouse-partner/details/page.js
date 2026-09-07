"use client";
import { PersonalDetailsFields } from "@/components/intake/target-visas/PersonalDetailsFields";
import { targetPersonalDetailsSchema, normalizeTargetPersonalDetails } from "@/lib/targetVisaPersonalDetails";
import { COUNTRIES } from "@/reuseable/countries";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { useToast } from "@/hooks/use-toast";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { getProfileIdFromSearchParams } from "@/lib/intakeQueryParams";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormNavigation } from "@/components/FormNavigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";
const formSchema = targetPersonalDetailsSchema;
export default function Page() {
  const router = useRouter();
  const { startNavigation } = useNavigationLoading();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const profileId = getProfileIdFromSearchParams(searchParams);
  const visaType = getVisaTypeFromPath(pathname);
  const { toast } = useToast();
  const draftSnap = useSnapshot(draftStore);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Profile awareness
  const activeProfile = profileId ? draftSnap.draft?.profiles?.find((p) => p.id === profileId) : null;
  const isSpouseProfile = activeProfile?.relationship === "spouse";

  useEffect(() => {
    const appIdFromUrl = searchParams.get('applicationId');
    if (appIdFromUrl && appIdFromUrl !== draftSnap.currentApplicationId) {
      draftStore.setApplicationId(appIdFromUrl);
      draftStore.loadDraft(appIdFromUrl);
    }
  }, [searchParams, draftSnap.currentApplicationId]);

  const form = useForm({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: normalizeTargetPersonalDetails(),
  });

  // Load section data
  const sectionData = (profileId && isSpouseProfile)
    ? draftSnap.draft?.profiles_data?.[profileId]?.details
    : draftSnap.draft?.protection_spouse_details;

  useEffect(() => {
    if (draftSnap.isLoading) return;
    form.reset(normalizeTargetPersonalDetails(sectionData || {}, activeProfile || {}));
  }, [draftSnap.isLoading, sectionData, activeProfile, form]);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const existingData = (profileId && isSpouseProfile)
        ? draftSnap.draft?.profiles_data?.[profileId]?.details || {}
        : draftSnap.draft?.protection_spouse_details || {};
      const mergedData = { ...existingData, ...form.getValues() };

      const result = (profileId && isSpouseProfile)
        ? await draftStore.saveProfileSectionData(profileId, "details", mergedData)
        : await draftStore.saveSectionData("protection_spouse_details", mergedData);

      if (result.success) {
        if (profileId && isSpouseProfile) {
          await draftStore.markProfilePageComplete(profileId, `${visaType}/spouse-partner/details`);
        } else {
          if (profileId) { await draftStore.markProfilePageComplete(profileId, `${visaType}/spouse-partner/details`); } else { await draftStore.markPageComplete(`${visaType}/spouse-partner/details`); }
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
      }
    } catch (error) {
      console.error("Error submitting:", error);
      toast({ title: "Error", description: "Failed to submit", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrevious = () => {
    const prev = getPreviousRoute(pathname, visaType, draftSnap.currentApplicationId, draftSnap.visaContext);
    startNavigation(prev);
    if (prev) router.push(prev);
  };

  const handleSave = async () => {
    const isComplete = await form.trigger();
    setIsSaving(true);
    try {
      const existingData = (profileId && isSpouseProfile)
        ? draftSnap.draft?.profiles_data?.[profileId]?.details || {}
        : draftSnap.draft?.protection_spouse_details || {};
      const currentData = form.getValues();
      const mergedData = { ...existingData, ...currentData };

      const result = (profileId && isSpouseProfile)
        ? await draftStore.saveProfileSectionData(profileId, "details", mergedData)
        : await draftStore.saveSectionData("protection_spouse_details", mergedData);

      if (result.success) {
        const pageKey = `${visaType}/spouse-partner/details`;
        if (isComplete) {
          if (profileId) await draftStore.markProfilePageComplete(profileId, pageKey);
          else await draftStore.markPageComplete(pageKey);
        } else {
          await draftStore.markPageIncomplete(profileId ? `${pageKey}__${profileId}` : pageKey);
        }
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
    } catch (error) {
      console.error("Error in handleSave:", error);
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

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
          Provide details for the spouse or partner included in this application.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <PersonalDetailsFields form={form} />
          <div className="space-y-6">
            <h3 className="text-lg font-medium border-b pb-2">Migration and Additional Details</h3>
            <div>
              <Label className="mb-2 block">Is your Spouse/Partner intending to migrate/travel to Australia as part of this application?</Label>
              <RadioGroup value={form.watch("intending_to_migrate") || ""} onValueChange={(value) => form.setValue("intending_to_migrate", value, { shouldDirty: true })} className="flex gap-4 mt-2">
                {["Yes", "No"].map((option) => <div key={option} className="flex items-center space-x-2"><RadioGroupItem value={option} id={`migration-${option}`} /><Label htmlFor={`migration-${option}`} className="cursor-pointer font-normal">{option}</Label></div>)}
              </RadioGroup>
            </div>
            <div>
              <Label>Country of Current Residence</Label>
              <Select value={form.watch("country_of_residence") || ""} onValueChange={(value) => form.setValue("country_of_residence", value, { shouldDirty: true })}>
                <SelectTrigger data-testid="select-country-of-residence"><SelectValue placeholder="Choose Country" /></SelectTrigger>
                <SelectContent>{[...new Set([...COUNTRIES, ...(form.watch("country_of_residence") ? [form.watch("country_of_residence")] : [])])].map((country) => <SelectItem key={country} value={country}>{country}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <FormNavigation
            nextLabel="Continue"
            onPrev={handlePrevious}
            onNext={form.handleSubmit(onSubmit)}
            onSave={handleSave}
            loading={isSaving}
            submitting={isSubmitting}
            disabledNext={!form.formState.isValid}
          />
        </form>
      </CardContent>
      {/* Mobile Navigation */}
    </Card>
  );
}