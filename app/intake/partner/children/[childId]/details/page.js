"use client";

import { useRouter, usePathname, useSearchParams, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect, useRef } from "react";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { useToast } from "@/hooks/use-toast";
import {
  getVisaTypeFromPath,
  getNextRoute,
  getPreviousRoute,
} from "@/lib/routes";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormNavigation } from "@/components/FormNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";
import { showCompletionIssuesToast } from "@/lib/temporaryWorkCompletionUi";

const childDetailsSchema = z.object({
  relationship_to_spouse: z.string().min(1, "Relationship to Spouse/Partner is required"),
});

const RELATIONSHIP_OPTIONS = [
  "Child",
  "Step Child",
  "Adopted Child"
];

export default function PartnerChildDetailsPage() {
  const router = useRouter();
  const { startNavigation } = useNavigationLoading();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams();
  const visaType = getVisaTypeFromPath(pathname);
  const { toast } = useToast();
  const draftSnap = useSnapshot(draftStore);

  const [isSaving, setIsSaving] = useState(false);

  const childId = typeof params?.childId === "string" ? params.childId : null;
  const profileId = childId;
  const appId = searchParams.get("applicationId");
  const profileReturnAppId = appId || draftSnap.currentApplicationId;
  const activeProfile =
    childId && draftSnap.draft?.profiles
      ? draftSnap.draft.profiles.find((p) => p.id === childId) ?? null
      : null;

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
          ? `/intake/partner/profile?applicationId=${encodeURIComponent(profileReturnAppId)}`
          : "/intake/partner/profile"
      );
    }
  }, [childId, activeProfile, router, profileReturnAppId]);

  const form = useForm({
    resolver: zodResolver(childDetailsSchema),
    defaultValues: {
      relationship_to_spouse: "",
    },
  });

  useEffect(() => {
    if (draftSnap.isLoading) return;
    if (!profileId) return;

    const savedData = draftSnap.draft?.profiles_data?.[profileId]?.details || {};
    if (savedData && Object.keys(savedData).length > 0) {
      form.reset({
        relationship_to_spouse: savedData.relationship_to_spouse || "",
      });
    }
  }, [draftSnap.isLoading, profileId, draftSnap.draft]);

  const onSubmit = async () => {
    const values = form.getValues();
    const result = await draftStore.saveProfileSectionData(profileId, "details", values);
    if (result.success) {
      const completionResult = await draftStore.markProfilePageComplete(profileId, `${visaType}/children/${childId}/details`);
      if (!completionResult.success) {
        showCompletionIssuesToast(toast, completionResult);
        return;
      }

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
    }
  };

  if (!activeProfile || activeProfile.relationship !== "child") {
    return null;
  }

  // Get spouse/partner name for label
  const spouseProfile = draftSnap.draft?.profiles?.find(p => p.relationship === "spouse");
  const spouseName = spouseProfile?.given_names 
    ? `${spouseProfile.given_names}${spouseProfile.family_name ? ` ${spouseProfile.family_name}` : ''}`
    : spouseProfile?.family_name || "Spouse/Partner";

  return (
    <Card className="rounded-2xl shadow-md bg-white">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">
          Details — {activeProfile.given_names} {activeProfile.family_name}
        </CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          Basic details for this dependent child are collected in the Included Applicants section. Please provide relationship details here.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          <div className="space-y-6">
            <h3 className="text-lg font-medium border-b pb-2">Relationship Details</h3>
            
            {spouseProfile && (
              <div>
                <Label className="mb-2 block font-medium">This person is {spouseName}'s:</Label>
                <Select
                  value={form.watch("relationship_to_spouse") || ""}
                  onValueChange={(value) => form.setValue("relationship_to_spouse", value, { shouldValidate: true })}
                >
                  <SelectTrigger data-testid="select-relationship-to-spouse">
                    <SelectValue placeholder="Choose Relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIP_OPTIONS.map((rel) => (
                      <SelectItem key={rel} value={rel}>{rel}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.relationship_to_spouse?.message && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.relationship_to_spouse.message}</p>
                )}
              </div>
            )}
            
            {!spouseProfile && (
              <div className="text-sm text-gray-500 italic">
                No spouse/partner added to this application.
              </div>
            )}
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
