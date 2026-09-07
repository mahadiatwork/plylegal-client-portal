"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { useToast } from "@/hooks/use-toast";
import { getNextRoute, getPreviousRoute } from "@/lib/routes";
import { getApplicationIdFromSearchParams, getProfileIdFromSearchParams } from "@/lib/intakeQueryParams";
import { normalizeTargetIdentityDocuments } from "@/lib/targetVisaIdentity";
import { validateIdentityForVisa } from "@/lib/mainApplicantIdentity";
import { IdentityDocumentFields } from "./IdentityDocumentFields";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormNavigation } from "@/components/FormNavigation";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";
import { showCompletionIssuesToast } from "@/lib/temporaryWorkCompletionUi";

export default function PartnerSpouseIdentityPage() {
  const visaType = "partner";
  const legacyKey = "partner_spouse_identity";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const profileId = getProfileIdFromSearchParams(searchParams);
  const snap = useSnapshot(draftStore);
  const { toast } = useToast();
  const { startNavigation } = useNavigationLoading();
  const [isSaving, setIsSaving] = useState(false);
  const profile = snap.draft?.profiles?.find((person) => person.id === profileId);
  const saved = profileId ? snap.draft?.profiles_data?.[profileId]?.identity : snap.draft?.[legacyKey];
  const form = useForm({ defaultValues: normalizeTargetIdentityDocuments() });

  useEffect(() => {
    const applicationId = getApplicationIdFromSearchParams(searchParams);
    if (applicationId && applicationId !== snap.currentApplicationId) {
      draftStore.setApplicationId(applicationId);
      draftStore.loadDraft(applicationId);
    }
  }, [searchParams, snap.currentApplicationId]);

  useEffect(() => {
    if (snap.isLoading) return;
    form.reset(normalizeTargetIdentityDocuments(saved || {}, profile));
  }, [saved, profile, snap.isLoading, form]);

  const save = async (complete = false) => {
    const existing = profileId ? draftStore.draft?.profiles_data?.[profileId]?.identity : draftStore.draft?.[legacyKey];
    const data = { ...existing, ...form.getValues() };
    if (complete) {
      const issues = validateIdentityForVisa(data, "temporary-work");
      if (issues.length) {
        toast({ title: "Complete identity details", description: issues.join("; "), variant: "destructive" });
        return;
      }
    }
    setIsSaving(true);
    try {
      const result = profileId
        ? await draftStore.saveProfileSectionData(profileId, "identity", data)
        : await draftStore.saveSectionData(legacyKey, data);
      if (!result.success) throw new Error(result.error || "Failed to save identity details");
      if (!complete) {
        toast({ title: "Draft saved", description: "Your changes have been saved successfully" });
        return;
      }
      const completion = profileId
        ? await draftStore.markProfilePageComplete(profileId, `${visaType}/spouse-partner/identity`)
        : await draftStore.markPageComplete(`${visaType}/spouse-partner/identity`, null, legacyKey);
      if (!completion.success) {
        showCompletionIssuesToast(toast, completion);
        return;
      }
      const next = getNextRoute(pathname, visaType, snap.currentApplicationId, snap.visaContext);
      if (next) { startNavigation(next); router.push(next); }
    } catch (error) {
      toast({ title: "Error", description: error.message || "Failed to save identity details", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const previous = () => {
    const route = getPreviousRoute(pathname, visaType, snap.currentApplicationId, snap.visaContext);
    if (route) { startNavigation(route); router.push(route); }
  };

  return <Card className="rounded-2xl shadow-md bg-white">
    <CardHeader><CardTitle className="text-2xl font-semibold">Spouse / Partner — Identity</CardTitle><p className="text-sm text-gray-600 mt-2">Provide identity documents for the spouse or partner.</p></CardHeader>
    <CardContent><form onSubmit={(event) => { event.preventDefault(); save(true); }} className="space-y-8">
      <IdentityDocumentFields form={form} />
      <FormNavigation onPrev={previous} onNext={() => save(true)} onSave={() => save(false)} loading={isSaving} nextLabel="Continue" saveLabel="Save Draft" />
    </form></CardContent>
  </Card>;
}
