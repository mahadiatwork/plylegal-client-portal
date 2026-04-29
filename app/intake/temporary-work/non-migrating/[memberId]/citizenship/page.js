"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { useToast } from "@/hooks/use-toast";
import { buildIntakeHref, buildNonMigratingHref, getInternalIntakeHref, NON_MIGRATING_MEMBER_SUBPAGES } from "@/lib/routes";
import { getApplicationIdFromSearchParams } from "@/lib/intakeQueryParams";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FormNavigation } from "@/components/FormNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const formSchema = z.object({
  citizenship_has_other: z.enum(["yes", "no"]).default("no"),
  citizenship_countries: z.string().optional(),
});

const EMPTY = {
  citizenship_has_other: "no",
  citizenship_countries: "",
};

export default function NonMigratingCitizenshipPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const draftSnap = useSnapshot(draftStore);
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const memberId = getInternalIntakeHref(pathname).match(/\/non-migrating\/([^/]+)\/citizenship/)?.[1];
  const appId = getApplicationIdFromSearchParams(searchParams);
  const toIntakeHref = (href) => buildIntakeHref({
    appId,
    internalHref: href,
    visaType: "temporary-work",
    visaContext: draftSnap.visaContext,
  });

  const { register, handleSubmit, control, reset, getValues, watch } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (draftSnap.isLoading || !memberId) return;
    const member = draftStore.getNonMigratingMember(memberId);
    if (member) {
      reset({
        citizenship_has_other: member.citizenship?.has_other || "no",
        citizenship_countries: member.citizenship?.countries?.join(", ") || "",
      });
    }
  }, [draftSnap.isLoading, memberId, reset]);

  useEffect(() => {
    if (appId && appId !== draftSnap.currentApplicationId) {
      draftStore.setApplicationId(appId);
      draftStore.loadDraft(appId);
    }
  }, [searchParams, draftSnap.currentApplicationId]);

  const hasOther = watch("citizenship_has_other") === "yes";

  const save = async () => {
    const values = getValues();
    await draftStore.updateNonMigratingMember(memberId, {
      citizenship: {
        has_other: values.citizenship_has_other,
        countries: values.citizenship_has_other === "yes"
          ? (values.citizenship_countries || "").split(",").map(c => c.trim()).filter(Boolean)
          : [],
      },
    });
  };

  const subpageIndex = NON_MIGRATING_MEMBER_SUBPAGES.findIndex(s => s.pathSuffix === "citizenship");

  const onNext = async () => {
    await save();
    const next = buildNonMigratingHref(memberId, NON_MIGRATING_MEMBER_SUBPAGES[subpageIndex + 1]?.pathSuffix);
    if (next) router.push(toIntakeHref(next));
  };

  const onPrev = () => {
    const prev = buildNonMigratingHref(memberId, NON_MIGRATING_MEMBER_SUBPAGES[subpageIndex - 1]?.pathSuffix);
    if (prev) router.push(toIntakeHref(prev));
  };

  const onSave = async () => {
    setIsSaving(true);
    try {
      await save();
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
        <CardTitle className="text-2xl font-semibold">Citizenship — {displayName}</CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          Provide citizenship information for this non-migrating family member.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onNext)} className="space-y-8">
          <div className="space-y-6">
            <h3 className="text-lg font-medium border-b pb-2">Citizenship</h3>

            <div>
              <Label className="mb-2 block font-medium">Does this person hold citizenship of any other country?</Label>
              <Controller
                control={control}
                name="citizenship_has_other"
                render={({ field }) => (
                  <RadioGroup value={field.value || "no"} onValueChange={field.onChange} className="flex gap-4">
                    {["yes", "no"].map(v => (
                      <div key={v} className="flex items-center gap-2">
                        <RadioGroupItem value={v} id={`nmf-citz-${v}`} />
                        <Label htmlFor={`nmf-citz-${v}`} className="font-normal cursor-pointer">{v === "yes" ? "Yes" : "No"}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              />
            </div>

            {hasOther && (
              <div>
                <Label>Countries (comma-separated)</Label>
                <Input
                  {...register("citizenship_countries")}
                  placeholder="e.g. India, United Kingdom"
                  className="mt-1"
                />
                <p className="text-xs text-gray-400 mt-1">List all countries of citizenship, separated by commas.</p>
              </div>
            )}
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
