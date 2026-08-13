"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { useToast } from "@/hooks/use-toast";
import { buildIntakeHref, buildNonMigratingHref, getInternalIntakeHref, getNonMigratingCompletionPrefix, getVisaTypeFromPath, NON_MIGRATING_MEMBER_SUBPAGES } from "@/lib/routes";
import { getApplicationIdFromSearchParams } from "@/lib/intakeQueryParams";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormNavigation } from "@/components/FormNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";

const OTHER_NAME_TYPES = [
  { value: "alias", label: "Alias" },
  { value: "maiden_name", label: "Maiden Name" },
  { value: "name_at_birth", label: "Name at Birth" },
  { value: "other_spelling", label: "Other Spelling" },
];

const formSchema = z.object({
  other_names: z.array(z.object({
    family_name: z.string().optional(),
    given_names: z.string().optional(),
    type: z.string().optional(),
  })).optional(),
});

export default function NonMigratingOtherNamesPage() {
  const router = useRouter();
  const { startNavigation } = useNavigationLoading();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const draftSnap = useSnapshot(draftStore);
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const visaType = getVisaTypeFromPath(pathname);

  const memberId = getInternalIntakeHref(pathname).match(/\/non-migrating\/([^/]+)\/other-names/)?.[1];
  const appId = getApplicationIdFromSearchParams(searchParams);
  const toIntakeHref = (href) => buildIntakeHref({
    appId,
    internalHref: href,
    visaType,
    visaContext: draftSnap.visaContext,
  });

  const { register, handleSubmit, control, reset, getValues } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { other_names: [] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "other_names" });

  useEffect(() => {
    if (draftSnap.isLoading || !memberId) return;
    const member = draftStore.getNonMigratingMember(memberId);
    if (member) {
      reset({ other_names: member.other_names || [] });
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
      other_names: values.other_names || [],
    });
  };

  const subpageIndex = NON_MIGRATING_MEMBER_SUBPAGES.findIndex(s => s.pathSuffix === "other-names");

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
    await draftStore.markPageComplete(`${getNonMigratingCompletionPrefix(visaType)}/${memberId}/other-names__${memberId}`, null, false);
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
        <CardTitle className="text-2xl font-semibold">Other Names —{displayName}</CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          List any other names or spellings used by this non-migrating family member.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onNext)} className="space-y-8">
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">Other Names / Spellings</h3>
            {fields.length === 0 && (
              <p className="text-sm text-gray-400 italic">No other names added. Click below to add one.</p>
            )}
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-3 gap-2 items-end border border-gray-100 rounded-lg p-3 bg-gray-50">
                <div>
                  <Label className="text-xs font-medium mb-1 block">Family Name</Label>
                  <Input {...register(`other_names.${index}.family_name`)} placeholder="Family name" />
                </div>
                <div>
                  <Label className="text-xs font-medium mb-1 block">Given Names</Label>
                  <Input {...register(`other_names.${index}.given_names`)} placeholder="Given names" />
                </div>
                <div className="flex gap-1 items-end">
                  <div className="flex-1">
                    <Label className="text-xs font-medium mb-1 block">Type</Label>
                    <Controller
                      control={control}
                      name={`other_names.${index}.type`}
                      render={({ field: f }) => (
                        <Select value={f.value || ""} onValueChange={f.onChange}>
                          <SelectTrigger className="text-sm"><SelectValue placeholder="Type" /></SelectTrigger>
                          <SelectContent>
                            {OTHER_NAME_TYPES.map(t => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <Button type="button" variant="ghost" size="icon"
                    className="h-9 w-9 text-red-400 hover:text-red-600"
                    onClick={() => remove(index)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ family_name: "", given_names: "", type: "" })}
              className="border-dashed"
            >
              <Plus className="w-3 h-3 mr-2" /> Add Other Name
            </Button>
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
