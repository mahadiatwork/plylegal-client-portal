"use client";

import { useRouter, usePathname, useParams, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { useToast } from "@/hooks/use-toast";
import {
  getVisaTypeFromPath,
  getPreviousTemporaryWorkChildRoute,
  getAfterTemporaryWorkChildCustodyNext,
} from "@/lib/routes";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { FormNavigation } from "@/components/FormNavigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const custodySchema = z
  .object({
    under_18: z.enum(["yes", "no"]),
    primary_custody_has: z.enum(["yes", "no"]).optional(),
    primary_custody_details: z.string().optional(),
    other_person_rights_has: z.enum(["yes", "no"]).optional(),
    other_person_rights_details: z.string().optional(),
    travel_impediments_has: z.enum(["yes", "no"]).optional(),
    travel_impediments_details: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.under_18 !== "yes") return;
    if (!data.primary_custody_has) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ["primary_custody_has"] });
    }
    if (data.primary_custody_has === "no" && !(data.primary_custody_details || "").trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please give details",
        path: ["primary_custody_details"],
      });
    }
    if (!data.other_person_rights_has) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ["other_person_rights_has"] });
    }
    if (data.other_person_rights_has === "yes" && !(data.other_person_rights_details || "").trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please give details",
        path: ["other_person_rights_details"],
      });
    }
    if (!data.travel_impediments_has) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ["travel_impediments_has"] });
    }
    if (data.travel_impediments_has === "yes" && !(data.travel_impediments_details || "").trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please give details",
        path: ["travel_impediments_details"],
      });
    }
  });

function mapSavedToForm(saved) {
  if (!saved || typeof saved !== "object") {
    return {
      under_18: "",
      primary_custody_has: "",
      primary_custody_details: "",
      other_person_rights_has: "",
      other_person_rights_details: "",
      travel_impediments_has: "",
      travel_impediments_details: "",
    };
  }
  const yn = (b) => (b === true ? "yes" : b === false ? "no" : "");
  const pc = saved.primary_custody;
  const op = saved.other_person_rights;
  const tr = saved.travel_impediments;
  return {
    under_18: saved.under_18 === true ? "yes" : saved.under_18 === false ? "no" : "",
    primary_custody_has: pc ? yn(pc.has) : "",
    primary_custody_details: pc?.details ?? "",
    other_person_rights_has: op ? yn(op.has) : "",
    other_person_rights_details: op?.details ?? "",
    travel_impediments_has: tr ? yn(tr.has) : "",
    travel_impediments_details: tr?.details ?? "",
  };
}

function formToCustodyPayload(data) {
  if (data.under_18 !== "yes") {
    return { under_18: false };
  }
  return {
    under_18: true,
    primary_custody: {
      has: data.primary_custody_has === "yes",
      details: (data.primary_custody_details || "").trim(),
    },
    other_person_rights: {
      has: data.other_person_rights_has === "yes",
      details: (data.other_person_rights_details || "").trim(),
    },
    travel_impediments: {
      has: data.travel_impediments_has === "yes",
      details: (data.travel_impediments_details || "").trim(),
    },
  };
}

export default function ChildCustodyPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const searchParams = useSearchParams();
  const childId = params?.childId;
  const { toast } = useToast();
  const draftSnap = useSnapshot(draftStore);
  const visaType = getVisaTypeFromPath(pathname);
  const [isSaving, setIsSaving] = useState(false);

  const appIdParam = searchParams.get("applicationId");

  const profile = typeof childId === "string" ? draftStore.getProfile(childId) : null;

  useEffect(() => {
    const appIdFromUrl = searchParams.get("applicationId");
    if (appIdFromUrl && appIdFromUrl !== draftSnap.currentApplicationId) {
      draftStore.setApplicationId(appIdFromUrl);
      draftStore.loadDraft(appIdFromUrl);
    }
  }, [searchParams, draftSnap.currentApplicationId]);

  useEffect(() => {
    if (!childId || typeof childId !== "string") return;
    if (!profile || profile.relationship !== "child") {
      router.replace(
        appIdParam
          ? `/intake/temporary-work/profile?applicationId=${encodeURIComponent(appIdParam)}`
          : "/intake/temporary-work/profile"
      );
    }
  }, [childId, profile, router, appIdParam]);

  const form = useForm({
    resolver: zodResolver(custodySchema),
    defaultValues: {
      under_18: "",
      primary_custody_has: "",
      primary_custody_details: "",
      other_person_rights_has: "",
      other_person_rights_details: "",
      travel_impediments_has: "",
      travel_impediments_details: "",
    },
  });

  const under18 = form.watch("under_18");

  useEffect(() => {
    if (!childId || typeof childId !== "string") return;
    const saved = draftSnap.draft?.profiles_data?.[childId]?.custody;
    form.reset(mapSavedToForm(saved));
  }, [childId, draftSnap.draft?.profiles_data, form]);

  const onSubmit = async (data) => {
    const payload = formToCustodyPayload(data);
    setIsSaving(true);
    try {
      const result = await draftStore.saveProfileSectionData(childId, "custody", payload);
      if (!result.success) {
        toast({ title: "Error", description: "Failed to save", variant: "destructive" });
        return;
      }
      await draftStore.markProfilePageComplete(childId, `${visaType}/children/${childId}/custody`);
      const next = getAfterTemporaryWorkChildCustodyNext(draftSnap.currentApplicationId);
      if (next) router.push(next);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrevious = () => {
    const prev = getPreviousTemporaryWorkChildRoute(pathname, draftSnap.currentApplicationId, childId);
    if (prev) router.push(prev);
  };

  const handleSave = async () => {
    const ok = await form.trigger();
    if (!ok) return;
    const payload = formToCustodyPayload(form.getValues());
    setIsSaving(true);
    try {
      const result = await draftStore.saveProfileSectionData(childId, "custody", payload);
      if (result.success) {
        await draftStore.markProfilePageComplete(childId, `${visaType}/children/${childId}/custody`);
        toast({ title: "Draft saved", description: "Your changes have been saved successfully" });
      } else {
        toast({ title: "Error", description: result.error || "Failed to save draft", variant: "destructive" });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const childLabel =
    profile && `${profile.given_names || ""} ${profile.family_name || ""}`.trim()
      ? `${profile.given_names || ""} ${profile.family_name || ""}`.trim()
      : "Child";

  return (
    <Card className="rounded-2xl shadow-md bg-white">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Custody — {childLabel}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="bg-card border border-border rounded-lg p-6 space-y-6">
            <div className="space-y-2">
              <Label>Is this family member a child under 18 years of age?</Label>
              <RadioGroup
                value={under18}
                onValueChange={(v) => {
                  form.setValue("under_18", v);
                  if (v === "no") {
                    form.setValue("primary_custody_has", "");
                    form.setValue("primary_custody_details", "");
                    form.setValue("other_person_rights_has", "");
                    form.setValue("other_person_rights_details", "");
                    form.setValue("travel_impediments_has", "");
                    form.setValue("travel_impediments_details", "");
                  }
                }}
              >
                <div className="flex gap-4">
                  {["yes", "no"].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`under18-${option}`} />
                      <Label htmlFor={`under18-${option}`}>{option === "yes" ? "Yes" : "No"}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            {under18 === "yes" && (
              <>
                <div className="space-y-2">
                  <Label>Is this child in the primary applicant&apos;s care and legal custody?</Label>
                  <RadioGroup
                    value={form.watch("primary_custody_has") || ""}
                    onValueChange={(v) => form.setValue("primary_custody_has", v)}
                  >
                    <div className="flex gap-4">
                      {["yes", "no"].map((option) => (
                        <div key={option} className="flex items-center space-x-2">
                          <RadioGroupItem value={option} id={`pc-${option}`} />
                          <Label htmlFor={`pc-${option}`}>{option === "yes" ? "Yes" : "No"}</Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                  {form.watch("primary_custody_has") === "no" && (
                    <div className="mt-2">
                      <Label>Give details</Label>
                      <Textarea
                        className="mt-1"
                        rows={4}
                        {...form.register("primary_custody_details")}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>
                    Does any other person have custodial, access or guardianship rights to this child?
                  </Label>
                  <RadioGroup
                    value={form.watch("other_person_rights_has") || ""}
                    onValueChange={(v) => form.setValue("other_person_rights_has", v)}
                  >
                    <div className="flex gap-4">
                      {["yes", "no"].map((option) => (
                        <div key={option} className="flex items-center space-x-2">
                          <RadioGroupItem value={option} id={`opr-${option}`} />
                          <Label htmlFor={`opr-${option}`}>{option === "yes" ? "Yes" : "No"}</Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                  {form.watch("other_person_rights_has") === "yes" && (
                    <div className="mt-2">
                      <Label>Give details</Label>
                      <Textarea
                        className="mt-1"
                        rows={4}
                        {...form.register("other_person_rights_details")}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Are there any legal impediments to this child&apos;s travel?</Label>
                  <RadioGroup
                    value={form.watch("travel_impediments_has") || ""}
                    onValueChange={(v) => form.setValue("travel_impediments_has", v)}
                  >
                    <div className="flex gap-4">
                      {["yes", "no"].map((option) => (
                        <div key={option} className="flex items-center space-x-2">
                          <RadioGroupItem value={option} id={`ti-${option}`} />
                          <Label htmlFor={`ti-${option}`}>{option === "yes" ? "Yes" : "No"}</Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                  {form.watch("travel_impediments_has") === "yes" && (
                    <div className="mt-2">
                      <Label>Give details</Label>
                      <Textarea
                        className="mt-1"
                        rows={4}
                        {...form.register("travel_impediments_details")}
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            <FormNavigation
              onPrev={handlePrevious}
              onNext={form.handleSubmit(onSubmit)}
              onSave={handleSave}
              nextLabel="Continue"
              loading={isSaving}
            />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
