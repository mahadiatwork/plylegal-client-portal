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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormNavigation } from "@/components/FormNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const formSchema = z.object({
  has_current_passport: z.enum(["yes", "no"]),
  family_name: z.string().optional(),
  given_names: z.string().optional(),
  sex: z.string().optional(),
  dob_day: z.string().optional(),
  dob_month: z.string().optional(),
  dob_year: z.string().optional(),
});

const EMPTY = {
  has_current_passport: "no",
  family_name: "",
  given_names: "",
  sex: "",
  dob_day: "",
  dob_month: "",
  dob_year: "",
};

export default function NonMigratingPassportPage() {
  const router = useRouter();
  const { startNavigation } = useNavigationLoading();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const draftSnap = useSnapshot(draftStore);
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const memberId = getInternalIntakeHref(pathname).match(/\/non-migrating\/([^/]+)\/passport/)?.[1];
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
        has_current_passport: member.has_current_passport || "no",
        family_name: member.passport?.family_name || "",
        given_names: member.passport?.given_names || "",
        sex: member.passport?.sex || "",
        dob_day: member.passport?.dob_day || "",
        dob_month: member.passport?.dob_month || "",
        dob_year: member.passport?.dob_year || "",
      });
    }
  }, [draftSnap.isLoading, memberId, reset]);

  useEffect(() => {
    if (appId && appId !== draftSnap.currentApplicationId) {
      draftStore.setApplicationId(appId);
      draftStore.loadDraft(appId);
    }
  }, [searchParams, draftSnap.currentApplicationId]);

  const hasPassport = watch("has_current_passport") === "yes";

  const save = async () => {
    const values = getValues();
    const existingMember = draftStore.getNonMigratingMember(memberId);
    return draftStore.updateNonMigratingMember(memberId, {
      has_current_passport: values.has_current_passport,
      passport: values.has_current_passport === "yes" ? {
        ...(existingMember?.passport || {}),
        family_name: values.family_name,
        given_names: values.given_names,
        sex: values.sex,
        dob_day: values.dob_day,
        dob_month: values.dob_month,
        dob_year: values.dob_year,
      } : null,
    });
  };

  const subpageIndex = NON_MIGRATING_MEMBER_SUBPAGES.findIndex(s => s.pathSuffix === "passport");

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
    const next = buildNonMigratingHref(memberId, NON_MIGRATING_MEMBER_SUBPAGES[subpageIndex + 1]?.pathSuffix);
    startNavigation(toIntakeHref());
    if (next) router.push(toIntakeHref(next));
  };

  const onPrev = () => {
    const prev = buildNonMigratingHref(memberId, NON_MIGRATING_MEMBER_SUBPAGES[subpageIndex - 1]?.pathSuffix);
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

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => String(currentYear - i));
  const days = Array.from({ length: 31 }, (_, i) => String(i + 1));

  const member = draftSnap.draft?.non_migrating_members?.find(m => m.id === memberId);
  const displayName = [member?.passport?.given_names, member?.passport?.family_name].filter(Boolean).join(" ") || "Non-Migrating Member";

  return (
    <Card className="rounded-2xl shadow-md bg-white">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Passport — {displayName}</CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          Provide passport details for this non-migrating family member.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onNext)} className="space-y-8">
          <div className="space-y-6">
            <h3 className="text-lg font-medium border-b pb-2">Passport Details</h3>

            <div>
              <Label className="mb-2 block font-medium">Does this person have a current passport?</Label>
              <Controller
                control={control}
                name="has_current_passport"
                render={({ field }) => (
                  <RadioGroup value={field.value || "no"} onValueChange={field.onChange} className="flex gap-4">
                    {["yes", "no"].map(v => (
                      <div key={v} className="flex items-center gap-2">
                        <RadioGroupItem value={v} id={`nmf-passport-${v}`} />
                        <Label htmlFor={`nmf-passport-${v}`} className="font-normal cursor-pointer capitalize">{v === "yes" ? "Yes" : "No"}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              />
            </div>

            {hasPassport && (
              <div className="space-y-4 pl-4 border-l-2 border-gray-100">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Family Name (as on passport)</Label>
                    <Input {...register("family_name")} placeholder="Family name" />
                  </div>
                  <div>
                    <Label>Given Names (as on passport)</Label>
                    <Input {...register("given_names")} placeholder="Given names" />
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block">Sex</Label>
                  <Controller
                    control={control}
                    name="sex"
                    render={({ field }) => (
                      <RadioGroup value={field.value || ""} onValueChange={field.onChange} className="flex gap-4">
                        {["Male", "Female", "Other"].map(g => (
                          <div key={g} className="flex items-center gap-2">
                            <RadioGroupItem value={g} id={`nmf-pp-sex-${g}`} />
                            <Label htmlFor={`nmf-pp-sex-${g}`} className="font-normal cursor-pointer">{g}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}
                  />
                </div>

                <div>
                  <Label className="mb-2 block">Date of Birth</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs text-gray-500">Day</Label>
                      <Controller control={control} name="dob_day" render={({ field }) => (
                        <Select value={field.value || ""} onValueChange={field.onChange}>
                          <SelectTrigger><SelectValue placeholder="Day" /></SelectTrigger>
                          <SelectContent>{days.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                        </Select>
                      )} />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Month</Label>
                      <Controller control={control} name="dob_month" render={({ field }) => (
                        <Select value={field.value || ""} onValueChange={field.onChange}>
                          <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
                          <SelectContent>{MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                        </Select>
                      )} />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Year</Label>
                      <Controller control={control} name="dob_year" render={({ field }) => (
                        <Select value={field.value || ""} onValueChange={field.onChange}>
                          <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                          <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                        </Select>
                      )} />
                    </div>
                  </div>
                </div>
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
