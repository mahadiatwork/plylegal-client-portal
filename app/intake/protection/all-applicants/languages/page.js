"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { useToast } from "@/hooks/use-toast";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DialogFooter } from "@/components/ui/dialog";
import { RepeaterTable } from "@/components/RepeaterTable";
import { FormNavigation } from "@/components/FormNavigation";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";

const LANGUAGES = [
  "Afrikaans", "Albanian", "Amharic", "Arabic", "Armenian", "Azerbaijani", "Basque", "Belarusian", "Bengali", "Bosnian",
  "Bulgarian", "Catalan", "Chinese (Cantonese)", "Chinese (Mandarin)", "Croatian", "Czech", "Danish", "Dutch", "English",
  "Estonian", "Filipino", "Finnish", "French", "Georgian", "German", "Greek", "Gujarati", "Haitian Creole", "Hausa",
  "Hebrew", "Hindi", "Hungarian", "Icelandic", "Igbo", "Indonesian", "Irish", "Italian", "Japanese", "Javanese", "Kannada",
  "Kazakh", "Khmer", "Korean", "Kurdish", "Kyrgyz", "Lao", "Latvian", "Lithuanian", "Macedonian", "Malagasy", "Malay",
  "Malayalam", "Maltese", "Maori", "Marathi", "Mongolian", "Nepali", "Norwegian", "Pashto", "Persian", "Polish", "Portuguese",
  "Punjabi", "Romanian", "Russian", "Serbian", "Sinhala", "Slovak", "Slovenian", "Somali", "Spanish", "Swahili", "Swedish",
  "Tamil", "Telugu", "Thai", "Turkish", "Ukrainian", "Urdu", "Uzbek", "Vietnamese", "Welsh", "Xhosa", "Yiddish", "Yoruba", "Zulu",
];

const languageRowSchema = z.object({
  language: z.string().min(1, "Language is required"),
  speak: z.boolean(),
  read: z.boolean(),
  write: z.boolean(),
  preference_order: z.number().optional(),
}).superRefine((row, ctx) => {
  if (!row.speak && !row.read && !row.write) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["speak"], message: "Select at least one ability" });
  }
});

function monthNumber(value) {
  if (!value) return null;
  const number = Number(value);
  if (Number.isFinite(number) && number >= 1 && number <= 12) return number;
  const month = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    .findIndex((name) => name.toLowerCase() === String(value).toLowerCase());
  return month === -1 ? null : month + 1;
}

function getApplicantAge(profile, details) {
  const day = Number(profile?.birth_day || details?.birth_day || details?.date_of_birth_day);
  const month = monthNumber(profile?.birth_month || details?.birth_month || details?.date_of_birth_month);
  const year = Number(profile?.birth_year || details?.birth_year || details?.date_of_birth_year);
  if (!day || !month || !year) return null;

  const birthDate = new Date(year, month - 1, day);
  if (birthDate.getFullYear() !== year || birthDate.getMonth() !== month - 1 || birthDate.getDate() !== day) return null;

  const today = new Date();
  let age = today.getFullYear() - year;
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) age -= 1;
  return age;
}

function normalizeRows(rows) {
  return (Array.isArray(rows) ? rows : []).map((row, index) => ({
    language: row.language || "",
    speak: Boolean(row.speak),
    read: Boolean(row.read),
    write: Boolean(row.write),
    preference_order: index + 1,
  }));
}

function LanguageDialog({ editingRow, onSave, onCancel }) {
  const dialogForm = useForm({
    resolver: zodResolver(languageRowSchema),
    defaultValues: editingRow || {
      language: "",
      speak: false,
      read: false,
      write: false,
    },
  });

  const abilityError = dialogForm.formState.errors.speak?.message || dialogForm.formState.errors.read?.message || dialogForm.formState.errors.write?.message;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        dialogForm.handleSubmit(onSave)(event);
      }}
      className="space-y-4"
    >
      <div>
        <Label className="mb-2 block">Language *</Label>
        <Select
          value={dialogForm.watch("language")}
          onValueChange={(value) => dialogForm.setValue("language", value, { shouldValidate: true })}
        >
          <SelectTrigger data-testid="select-language">
            <SelectValue placeholder="Choose Language" />
          </SelectTrigger>
          <SelectContent className="max-h-[240px]">
            {LANGUAGES.map((language) => (
              <SelectItem key={language} value={language}>{language}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.language && <p className="mt-1 text-sm text-red-600">{dialogForm.formState.errors.language.message}</p>}
      </div>

      <div>
        <Label className="mb-3 block">What can the applicant do in this language?</Label>
        <div className="flex flex-wrap gap-5">
          {["speak", "read", "write"].map((ability) => (
            <label key={ability} className="flex items-center gap-2 capitalize">
              <Checkbox
                checked={dialogForm.watch(ability)}
                onCheckedChange={(checked) => dialogForm.setValue(ability, checked === true, { shouldValidate: true })}
                data-testid={`checkbox-${ability}`}
              />
              {ability}
            </label>
          ))}
        </div>
        {abilityError && <p className="mt-1 text-sm text-red-600">{abilityError}</p>}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">Cancel</Button>
        <Button type="submit" className="bg-[#4F726B] text-white hover:bg-[#4F726B]" data-testid="button-ok">Save</Button>
      </DialogFooter>
    </form>
  );
}

export default function LanguagesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const visaType = getVisaTypeFromPath(pathname);
  const draftSnap = useSnapshot(draftStore);
  const { toast } = useToast();
  const { startNavigation } = useNavigationLoading();
  const [languagesByApplicant, setLanguagesByApplicant] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const appId = searchParams.get("applicationId");
    if (appId && appId !== draftStore.currentApplicationId) {
      draftStore.setApplicationId(appId);
      draftStore.loadDraft(appId);
    }
  }, [searchParams]);

  const applicants = useMemo(() => {
    const profiles = draftSnap.draft?.profiles || [];
    return [...profiles]
      .sort((a, b) => ({ main_applicant: 0, spouse: 1, child: 2 }[a.relationship] ?? 3) - ({ main_applicant: 0, spouse: 1, child: 2 }[b.relationship] ?? 3))
      .map((profile) => {
        const details = draftSnap.draft?.profiles_data?.[profile.id]?.details || {};
        return {
          ...profile,
          age: getApplicantAge(profile, details),
          displayName: `${profile.given_names || details.given_names || ""} ${profile.family_name || details.family_name || ""}`.trim() || "Unnamed applicant",
        };
      });
  }, [draftSnap.draft?.profiles, draftSnap.draft?.profiles_data]);

  const eligibleApplicants = applicants.filter((applicant) => applicant.age !== null && applicant.age >= 16);
  const unknownAgeApplicants = applicants.filter((applicant) => applicant.age === null);

  useEffect(() => {
    const saved = draftSnap.draft?.protection_languages;
    if (saved && typeof saved === "object") {
      setLanguagesByApplicant(Object.fromEntries(Object.entries(saved).map(([id, rows]) => [id, normalizeRows(rows)])));
    }
  }, [draftSnap.draft?.protection_languages]);

  const updateApplicantLanguages = (profileId, rows) => {
    setLanguagesByApplicant((current) => ({ ...current, [profileId]: normalizeRows(rows) }));
  };

  const isComplete = unknownAgeApplicants.length === 0 && eligibleApplicants.every((applicant) => (languagesByApplicant[applicant.id] || []).length > 0);

  const save = async (submit = false) => {
    if (submit && !isComplete) {
      toast({ title: "Complete language details", description: "Enter a date of birth for every applicant and add at least one language for each applicant aged 16 or older.", variant: "destructive" });
      return;
    }

    submit ? setIsSubmitting(true) : setIsSaving(true);
    try {
      const result = await draftStore.saveSectionData("protection_languages", languagesByApplicant);
      if (!result.success) throw new Error(result.error || "Failed to save language details");

      if (!submit) {
        toast({ title: "Draft saved", description: "Language details have been saved." });
        return;
      }

      await draftStore.markPageComplete(`${visaType}/all-applicants/languages`, null, "protection_languages");
      const next = getNextRoute(pathname, visaType, draftStore.currentApplicationId);
      if (next) {
        startNavigation(next);
        router.push(next);
      }
    } catch (error) {
      toast({ title: "Error", description: error.message || "Could not save language details.", variant: "destructive" });
    } finally {
      setIsSaving(false);
      setIsSubmitting(false);
    }
  };

  const handlePrevious = () => {
    const previous = getPreviousRoute(pathname, visaType, draftStore.currentApplicationId);
    if (previous) {
      startNavigation(previous);
      router.push(previous);
    }
  };

  return (
    <div className="min-h-screen bg-[#E4E9FF]">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">Languages</CardTitle>
            <p className="mt-2 text-sm text-gray-600">For each applicant aged 16 or older, add languages in order of preference and select whether they can speak, read, or write each language.</p>
          </CardHeader>
          <CardContent>
            {unknownAgeApplicants.length > 0 && (
              <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Enter a date of birth in Details before completing languages for: {unknownAgeApplicants.map((applicant) => applicant.displayName).join(", ")}.
              </div>
            )}

            {eligibleApplicants.length === 0 && unknownAgeApplicants.length === 0 && (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-600">No applicant is aged 16 or older, so no language details are required.</p>
            )}

            <div className="space-y-8">
              {eligibleApplicants.map((applicant) => {
                const rows = languagesByApplicant[applicant.id] || [];
                const testId = String(applicant.id).replace(/[^a-z0-9_-]/gi, "-");
                return (
                  <section key={applicant.id} className="border-b border-gray-200 pb-8 last:border-b-0 last:pb-0" data-testid={`language-applicant-${testId}`}>
                    <h2 className="text-lg font-semibold text-gray-900">{applicant.displayName}</h2>
                    <p className="mb-3 text-sm text-gray-600">Age {applicant.age}</p>
                    <RepeaterTable
                      data={rows}
                      columns={[
                        { key: "preference_order", label: "Preference" },
                        { key: "language", label: "Language" },
                        { key: "speak", label: "Speak", format: (row) => row.speak ? "Yes" : "No" },
                        { key: "read", label: "Read", format: (row) => row.read ? "Yes" : "No" },
                        { key: "write", label: "Write", format: (row) => row.write ? "Yes" : "No" },
                      ]}
                      onAdd={(row) => updateApplicantLanguages(applicant.id, [...rows, row])}
                      onEdit={(index, row) => updateApplicantLanguages(applicant.id, rows.map((current, rowIndex) => rowIndex === index ? row : current))}
                      onDelete={(index) => updateApplicantLanguages(applicant.id, rows.filter((_, rowIndex) => rowIndex !== index))}
                      DialogComponent={LanguageDialog}
                      addButtonText="Add language"
                      emptyMessage="No languages added"
                      dialogTitle="Language"
                      testIdPrefix={`language-${testId}`}
                    />
                  </section>
                );
              })}
            </div>

            <FormNavigation
              onPrev={handlePrevious}
              onNext={() => save(true)}
              onSave={() => save(false)}
              loading={isSaving}
              submitting={isSubmitting}
              disabledNext={!isComplete}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
