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
  getPreviousRoute,
  getNextRoute,
} from "@/lib/routes";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { FormNavigation } from "@/components/FormNavigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";
import { showCompletionIssuesToast } from "@/lib/temporaryWorkCompletionUi";

const custodySchema = z
  .object({
    under_18: z.enum(["yes", "no"]),
    primary_custody_has: z.union([z.enum(["yes", "no"]), z.literal("")]).optional(),
    primary_custody_details: z.string().optional(),
    other_person_rights_has: z.union([z.enum(["yes", "no"]), z.literal("")]).optional(),
    other_person_rights_details: z.string().optional(),
    travel_impediments_has: z.union([z.enum(["yes", "no"]), z.literal("")]).optional(),
    travel_impediments_details: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.under_18 !== "yes") return;
    if (!data.primary_custody_has || data.primary_custody_has === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ["primary_custody_has"] });
    }
    if (data.primary_custody_has === "no" && !(data.primary_custody_details || "").trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Required",
        path: ["primary_custody_details"],
      });
    }
    if (!data.other_person_rights_has || data.other_person_rights_has === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ["other_person_rights_has"] });
    }
    if (data.other_person_rights_has === "yes" && !(data.other_person_rights_details || "").trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Required",
        path: ["other_person_rights_details"],
      });
    }
    if (!data.travel_impediments_has || data.travel_impediments_has === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ["travel_impediments_has"] });
    }
    if (data.travel_impediments_has === "yes" && !(data.travel_impediments_details || "").trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Required",
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
  const { startNavigation } = useNavigationLoading();
  const pathname = usePathname();
  const params = useParams();
  const searchParams = useSearchParams();
  const childId = params?.childId;
  const { toast } = useToast();
  const draftSnap = useSnapshot(draftStore);
  const visaType = getVisaTypeFromPath(pathname);
  const [isSaving, setIsSaving] = useState(false);

  const appIdParam = searchParams.get("applicationId");
  const profileReturnAppId = appIdParam || draftSnap.currentApplicationId;

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
        profileReturnAppId
          ? `/intake/temporary-work/profile?applicationId=${encodeURIComponent(profileReturnAppId)}`
          : "/intake/temporary-work/profile"
      );
    }
  }, [childId, profile, router, profileReturnAppId]);

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
    console.log("[CUSTODY] Continue clicked, data:", data);
    const payload = formToCustodyPayload(data);
    console.log("[CUSTODY] payload:", payload);
    setIsSaving(true);
    try {
      const result = await draftStore.saveProfileSectionData(childId, "custody", payload);
      console.log("[CUSTODY] save result:", result);
      if (!result.success) {
        toast({ title: "Error", description: "Failed to save", variant: "destructive" });
        return;
      }
      const completionResult = await draftStore.markProfilePageComplete(childId, `${visaType}/children/${childId}/custody`);
      if (!completionResult.success) {
        showCompletionIssuesToast(toast, completionResult);
        return;
      }

      const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId, draftSnap.visaContext);
      console.log("[CUSTODY] next route:", next);
      if (next) {
        startNavigation(next);
        router.push(next);
      } else {
        toast({ title: "Saved", description: "Your changes have been saved." });
      }
    } catch (err) {
      console.error("[CUSTODY] onSubmit error:", err);
      toast({ title: "Error", description: err?.message || "Unknown error", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleContinueClick = () => {
    console.log("[CUSTODY] Continue button clicked");
    console.log("[CUSTODY] Form values:", form.getValues());
    console.log("[CUSTODY] Form errors:", form.formState.errors);
    console.log("[CUSTODY] Form isValid:", form.formState.isValid);
    form.handleSubmit(onSubmit)();
  };

  const handlePrevious = () => {
    const prev = getPreviousRoute(pathname, visaType, draftSnap.currentApplicationId, draftSnap.visaContext);
    startNavigation(prev);
    if (prev) router.push(prev);
  };

  const handleSave = async () => {
    console.log("[CUSTODY] Save clicked");
    const ok = await form.trigger();
    console.log("[CUSTODY] trigger result:", ok, "errors:", form.formState.errors);
    if (!ok) return;
    const payload = formToCustodyPayload(form.getValues());
    console.log("[CUSTODY] save payload:", payload);
    setIsSaving(true);
    try {
      const result = await draftStore.saveProfileSectionData(childId, "custody", payload);
      console.log("[CUSTODY] save result:", result);
      if (result.success) {
        await draftStore.markProfilePageComplete(childId, `${visaType}/children/${childId}/custody`);
        toast({ title: "Draft saved", description: "Your changes have been saved successfully" });
      } else {
        toast({ title: "Error", description: result.error || "Failed to save draft", variant: "destructive" });
      }
    } catch (err) {
      console.error("[CUSTODY] handleSave error:", err);
      toast({ title: "Error", description: err?.message || "Unknown error", variant: "destructive" });
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
                  form.setValue("under_18", v, { shouldValidate: true });
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
              {form.formState.errors.under_18?.message && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.under_18.message}</p>
              )}
            </div>

            {under18 === "yes" && (
              <>
                <div className="space-y-2">
                  <Label>Is this child in the primary applicant&apos;s care and legal custody?</Label>
                  <RadioGroup
                    value={form.watch("primary_custody_has") || ""}
                    onValueChange={(v) => form.setValue("primary_custody_has", v, { shouldValidate: true })}
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
                  {form.formState.errors.primary_custody_has?.message && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.primary_custody_has.message}</p>
                  )}
                  {form.watch("primary_custody_has") === "no" && (
                    <div className="mt-2">
                      <Label>Give details</Label>
                      <Textarea
                        className="mt-1"
                        rows={4}
                        {...form.register("primary_custody_details")}
                      />
                      {form.formState.errors.primary_custody_details?.message && (
                        <p className="text-sm text-red-600 mt-1">{form.formState.errors.primary_custody_details.message}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>
                    Does any other person have custodial, access or guardianship rights to this child?
                  </Label>
                  <RadioGroup
                    value={form.watch("other_person_rights_has") || ""}
                    onValueChange={(v) => form.setValue("other_person_rights_has", v, { shouldValidate: true })}
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
                  {form.formState.errors.other_person_rights_has?.message && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.other_person_rights_has.message}</p>
                  )}
                  {form.watch("other_person_rights_has") === "yes" && (
                    <div className="mt-2">
                      <Label>Give details</Label>
                      <Textarea
                        className="mt-1"
                        rows={4}
                        {...form.register("other_person_rights_details")}
                      />
                      {form.formState.errors.other_person_rights_details?.message && (
                        <p className="text-sm text-red-600 mt-1">{form.formState.errors.other_person_rights_details.message}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Are there any legal impediments to this child&apos;s travel?</Label>
                  <RadioGroup
                    value={form.watch("travel_impediments_has") || ""}
                    onValueChange={(v) => form.setValue("travel_impediments_has", v, { shouldValidate: true })}
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
                  {form.formState.errors.travel_impediments_has?.message && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.travel_impediments_has.message}</p>
                  )}
                  {form.watch("travel_impediments_has") === "yes" && (
                    <div className="mt-2">
                      <Label>Give details</Label>
                      <Textarea
                        className="mt-1"
                        rows={4}
                        {...form.register("travel_impediments_details")}
                      />
                      {form.formState.errors.travel_impediments_details?.message && (
                        <p className="text-sm text-red-600 mt-1">{form.formState.errors.travel_impediments_details.message}</p>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            <FormNavigation
              onPrev={handlePrevious}
              onNext={handleContinueClick}
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
