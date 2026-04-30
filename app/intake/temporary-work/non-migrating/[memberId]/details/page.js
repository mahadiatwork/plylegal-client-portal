"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { useToast } from "@/hooks/use-toast";
import { buildIntakeHref, buildNonMigratingHref, getInternalIntakeHref, getNextRoute, getPreviousRoute, getVisaTypeFromPath, NON_MIGRATING_MEMBER_SUBPAGES } from "@/lib/routes";
import { getApplicationIdFromSearchParams } from "@/lib/intakeQueryParams";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormNavigation } from "@/components/FormNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const RELATIONSHIP_OPTIONS = [
  { value: "parent", label: "Parent" },
  { value: "sibling", label: "Sibling" },
  { value: "child", label: "Child (not migrating)" },
  { value: "grandparent", label: "Grandparent" },
  { value: "other_relative", label: "Other Relative" },
];

const RELATIONSHIP_STATUS_OPTIONS = [
  "Never Married", "Married", "De Facto", "Separated", "Divorced", "Widowed",
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const formSchema = z.object({
  relationship: z.string().optional(),
  relationship_status: z.string().optional(),
  sex: z.string().optional(),
  dob_day: z.string().optional(),
  dob_month: z.string().optional(),
  dob_year: z.string().optional(),
  place_of_birth_town: z.string().optional(),
  place_of_birth_state: z.string().optional(),
  place_of_birth_country: z.string().optional(),
});

const EMPTY = {
  relationship: "",
  relationship_status: "",
  sex: "",
  dob_day: "",
  dob_month: "",
  dob_year: "",
  place_of_birth_town: "",
  place_of_birth_state: "",
  place_of_birth_country: "",
};

export default function NonMigratingDetailsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const draftSnap = useSnapshot(draftStore);
  const { toast } = useToast();
  const visaType = getVisaTypeFromPath(pathname);
  const [isSaving, setIsSaving] = useState(false);

  const memberId = getInternalIntakeHref(pathname).match(/\/non-migrating\/([^/]+)\/details/)?.[1];
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
        relationship: member.relationship || "",
        relationship_status: member.relationship_status || "",
        sex: member.passport?.sex || "",
        dob_day: member.passport?.dob_day || "",
        dob_month: member.passport?.dob_month || "",
        dob_year: member.passport?.dob_year || "",
        place_of_birth_town: member.place_of_birth?.town_city || "",
        place_of_birth_state: member.place_of_birth?.state_province || "",
        place_of_birth_country: member.place_of_birth?.country || "",
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
    const existingMember = draftStore.getNonMigratingMember(memberId);
    await draftStore.updateNonMigratingMember(memberId, {
      relationship: values.relationship,
      relationship_status: values.relationship_status,
      passport: {
        ...(existingMember?.passport || {}),
        sex: values.sex,
        dob_day: values.dob_day,
        dob_month: values.dob_month,
        dob_year: values.dob_year,
      },
      place_of_birth: {
        town_city: values.place_of_birth_town,
        state_province: values.place_of_birth_state,
        country: values.place_of_birth_country,
      },
    });
  };

  const onNext = async () => {
    await save();
    // Use global route to navigate to next page in linear flow
    const next = getNextRoute(pathname, visaType, appId, draftSnap.visaContext);
    if (next) {
      router.push(next);
    }
  };

  const onPrev = () => {
    // Use global route — goes to previous migrating applicant page (or profile)
    const prev = getPreviousRoute(pathname, visaType, appId, draftSnap.visaContext);
    if (prev) router.push(prev);
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

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => String(currentYear - i));
  const days = Array.from({ length: 31 }, (_, i) => String(i + 1));

  const member = draftSnap.draft?.non_migrating_members?.find(m => m.id === memberId);
  const displayName = [member?.passport?.given_names, member?.passport?.family_name].filter(Boolean).join(" ") || "Non-Migrating Member";

  return (
    <Card className="rounded-2xl shadow-md bg-white">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Details — {displayName}</CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          Provide personal details for this non-migrating family member.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onNext)} className="space-y-8">
          <div className="space-y-6">
            <h3 className="text-lg font-medium border-b pb-2">Relationship</h3>
            <div>
              <Label>Relationship to Main Applicant</Label>
              <Controller
                control={control}
                name="relationship"
                render={({ field }) => (
                  <Select value={field.value || ""} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Select relationship..." /></SelectTrigger>
                    <SelectContent>
                      {RELATIONSHIP_OPTIONS.map(r => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label>Relationship Status</Label>
              <Controller
                control={control}
                name="relationship_status"
                render={({ field }) => (
                  <Select value={field.value || ""} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Select status..." /></SelectTrigger>
                    <SelectContent>
                      {RELATIONSHIP_STATUS_OPTIONS.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-lg font-medium border-b pb-2">Sex &amp; Date of Birth</h3>
            <div>
              <Label>Sex</Label>
              <Controller
                control={control}
                name="sex"
                render={({ field }) => (
                  <RadioGroup value={field.value || ""} onValueChange={field.onChange} className="flex gap-4 mt-2">
                    {["Male", "Female", "Other"].map(g => (
                      <div key={g} className="flex items-center gap-2">
                        <RadioGroupItem value={g} id={`nmf-sex-${g}`} />
                        <Label htmlFor={`nmf-sex-${g}`} className="font-normal cursor-pointer">{g}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Day</Label>
                <Controller control={control} name="dob_day" render={({ field }) => (
                  <Select value={field.value || ""} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Day" /></SelectTrigger>
                    <SelectContent>{days.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
              </div>
              <div>
                <Label>Month</Label>
                <Controller control={control} name="dob_month" render={({ field }) => (
                  <Select value={field.value || ""} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
                    <SelectContent>{MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
              </div>
              <div>
                <Label>Year</Label>
                <Controller control={control} name="dob_year" render={({ field }) => (
                  <Select value={field.value || ""} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                    <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-lg font-medium border-b pb-2">Place of Birth</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Town or City</Label>
                <Input {...register("place_of_birth_town")} placeholder="Town or city" />
              </div>
              <div>
                <Label>State or Province</Label>
                <Input {...register("place_of_birth_state")} placeholder="State or province" />
              </div>
            </div>
            <div>
              <Label>Country</Label>
              <Input {...register("place_of_birth_country")} placeholder="Country of birth" />
            </div>
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
