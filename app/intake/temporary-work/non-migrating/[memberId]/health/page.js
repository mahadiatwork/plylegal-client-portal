"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { useToast } from "@/hooks/use-toast";
import { buildIntakeHref, buildNonMigratingHref, getInternalIntakeHref, getNonMigratingCompletionPrefix, getNextRoute, getPreviousRoute, getVisaTypeFromPath, NON_MIGRATING_MEMBER_SUBPAGES } from "@/lib/routes";
import { getApplicationIdFromSearchParams } from "@/lib/intakeQueryParams";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FormNavigation } from "@/components/FormNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";

const formSchema = z.object({
  requires_health_examination: z.enum(["yes", "no"]).default("no"),
});

const EMPTY = { requires_health_examination: "no" };

export default function NonMigratingHealthPage() {
  const router = useRouter();
  const { startNavigation } = useNavigationLoading();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const draftSnap = useSnapshot(draftStore);
  const { toast } = useToast();
  const visaType = getVisaTypeFromPath(pathname);
  const [isSaving, setIsSaving] = useState(false);

  const memberId = getInternalIntakeHref(pathname).match(/\/non-migrating\/([^/]+)\/health/)?.[1];
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
      reset({ requires_health_examination: member.requires_health_examination || "no" });
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
      requires_health_examination: values.requires_health_examination,
    });
  };

  const subpageIndex = NON_MIGRATING_MEMBER_SUBPAGES.findIndex(s => s.pathSuffix === "health");

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
    await draftStore.markPageComplete(`${getNonMigratingCompletionPrefix(visaType)}/${memberId}/health__${memberId}`, null, false);
    // Health is the last subpage â€?use global route to go to next in overall flow
    const next = getNextRoute(pathname, visaType, appId, draftSnap.visaContext);
    startNavigation(next);
    if (next) router.push(next);
  };

  const onPrev = () => {
    // Go to previous subpage within this member
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
        <CardTitle className="text-2xl font-semibold">Health â€?{displayName}</CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          Provide health examination information for this non-migrating family member.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onNext)} className="space-y-8">
          <div className="space-y-6">
            <h3 className="text-lg font-medium border-b pb-2">Health Examination</h3>

            <div>
              <Label className="mb-2 block font-medium">Does this person require a health examination?</Label>
              <Controller
                control={control}
                name="requires_health_examination"
                render={({ field }) => (
                  <RadioGroup value={field.value || "no"} onValueChange={field.onChange} className="flex gap-4">
                    {["yes", "no"].map(v => (
                      <div key={v} className="flex items-center gap-2">
                        <RadioGroupItem value={v} id={`nmf-health-${v}`} />
                        <Label htmlFor={`nmf-health-${v}`} className="font-normal cursor-pointer">{v === "yes" ? "Yes" : "No"}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              />
              <p className="text-xs text-gray-400 mt-2">
                A health examination may be required depending on the applicant's country of residence and visa type.
              </p>
            </div>
          </div>

          <FormNavigation
            onPrev={onPrev}
            onNext={handleSubmit(onNext)}
            onSave={onSave}
            loading={isSaving}
            saveLabel="Save Draft"
            nextLabel="Done"
          />
        </form>
      </CardContent>
    </Card>
  );
}
