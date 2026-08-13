"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { useToast } from "@/hooks/use-toast";
import { buildIntakeHref, buildNonMigratingHref, getInternalIntakeHref, getNonMigratingCompletionPrefix, getVisaTypeFromPath, NON_MIGRATING_MEMBER_SUBPAGES } from "@/lib/routes";
import { getApplicationIdFromSearchParams } from "@/lib/intakeQueryParams";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FormNavigation } from "@/components/FormNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";

const formSchema = z.object({
  has_national_identity_card: z.enum(["yes", "no"]).default("no"),
  has_other_identity_documents: z.enum(["yes", "no"]).default("no"),
});

const EMPTY = {
  has_national_identity_card: "no",
  has_other_identity_documents: "no",
};

function YesNoField({ control, name, label }) {
  return (
    <div>
      <Label className="mb-2 block font-medium">{label}</Label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <RadioGroup value={field.value || "no"} onValueChange={field.onChange} className="flex gap-4">
            {["yes", "no"].map(v => (
              <div key={v} className="flex items-center gap-2">
                <RadioGroupItem value={v} id={`${name}-${v}`} />
                <Label htmlFor={`${name}-${v}`} className="font-normal cursor-pointer">{v === "yes" ? "Yes" : "No"}</Label>
              </div>
            ))}
          </RadioGroup>
        )}
      />
    </div>
  );
}

export default function NonMigratingIdentityPage() {
  const router = useRouter();
  const { startNavigation } = useNavigationLoading();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const draftSnap = useSnapshot(draftStore);
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const visaType = getVisaTypeFromPath(pathname);

  const memberId = getInternalIntakeHref(pathname).match(/\/non-migrating\/([^/]+)\/identity/)?.[1];
  const appId = getApplicationIdFromSearchParams(searchParams);
  const toIntakeHref = (href) => buildIntakeHref({
    appId,
    internalHref: href,
    visaType,
    visaContext: draftSnap.visaContext,
  });

  const { handleSubmit, control, reset, getValues } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (draftSnap.isLoading || !memberId) return;
    const member = draftStore.getNonMigratingMember(memberId);
    if (member) {
      reset({
        has_national_identity_card: member.has_national_identity_card || "no",
        has_other_identity_documents: member.has_other_identity_documents || "no",
      });
    }
  }, [draftSnap.isLoading, memberId, reset]);

  useEffect(() => {
    if (appId && appId !== draftSnap.currentApplicationId) {
      draftStore.setApplicationId(appId);
      draftStore.loadDraft(appId);
    }
  }, [searchParams, draftSnap.currentApplicationId]);

  const save = async () => {
    const values = getValues();
    return draftStore.updateNonMigratingMember(memberId, {
      has_national_identity_card: values.has_national_identity_card,
      has_other_identity_documents: values.has_other_identity_documents,
    });
  };

  const subpageIndex = NON_MIGRATING_MEMBER_SUBPAGES.findIndex(s => s.pathSuffix === "identity");

  const onNext = async () => {
    const ok = await save();
    if (!ok) {
      toast({
        variant: "destructive",
        title: "Could not save",
        description: "Could not sync to your draft. Check that you are still signed in, then try again.",
      });
      return;
    }
    await draftStore.markPageComplete(`${getNonMigratingCompletionPrefix(visaType)}/${memberId}/identity__${memberId}`, null, false);
    const next = buildNonMigratingHref(memberId, NON_MIGRATING_MEMBER_SUBPAGES[subpageIndex + 1]?.pathSuffix, visaType);
    startNavigation(toIntakeHref());
    if (next) router.push(toIntakeHref(next));
  };

  const onPrev = () => {
    const prev = buildNonMigratingHref(memberId, NON_MIGRATING_MEMBER_SUBPAGES[subpageIndex - 1]?.pathSuffix, visaType);
    startNavigation(toIntakeHref());
    if (prev) router.push(toIntakeHref(prev));
  };

  const onSave = async () => {
    setIsSaving(true);
    try {
      const ok = await save();
      if (!ok) {
        toast({
          variant: "destructive",
          title: "Could not save",
          description: "Could not sync to your draft. Check that you are still signed in, then try again.",
        });
        return;
      }
      toast({ title: "Draft saved", description: "Your changes have been saved." });
    } finally {
      setIsSaving(false);
    }
  };

  const member = draftSnap.draft?.non_migrating_members?.find(m => m.id === memberId);
  const displayName = [member?.passport?.given_names, member?.passport?.family_name].filter(Boolean).join(" ") || "Non-Migrating Member";

  return (
    <Card className="rounded-2xl shadow-md bg-white">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Identity Documents —{displayName}</CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          Provide information about identity documents held by this non-migrating family member.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onNext)} className="space-y-8">
          <div className="space-y-6">
            <h3 className="text-lg font-medium border-b pb-2">Identity Documents</h3>
            <YesNoField control={control} name="has_national_identity_card" label="Does this person have a national identity card?" />
            <YesNoField control={control} name="has_other_identity_documents" label="Does this person have any other identity documents?" />
          </div>

          <FormNavigation
            onPrev={onPrev}
            onNext={handleSubmit(onNext)}
            onSave={onSave}
            loading={isSaving}
            saveLabel="Save Draft"
            nextLabel="Continue"
          />
        </form>
      </CardContent>
    </Card>
  );
}
