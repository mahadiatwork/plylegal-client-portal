"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { applicationsStore } from "@/stores/applicationsStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/Field";
import { StickyNav } from "@/components/StickyNav";
import { RepeaterTable } from "@/components/RepeaterTable";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { languageSchema } from "@/lib/validation";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const PROFICIENCY_LEVELS = [
  "Superior",
  "Proficient",
  "Competent",
  "Vocational",
  "Functional",
  "Limited",
  "Not at All"
];

const languageDialogSchema = z.object({
  language: z.string().min(1, "Language is required"),
  proficiency: z.string().min(1, "Level of Proficiency is required"),
  is_main_language: z.string().optional(),
});

function LanguageDialog({ editingRow, onSave, onCancel }) {
  const dialogForm = useForm({
    resolver: zodResolver(languageDialogSchema),
    defaultValues: editingRow || {
      language: "",
      proficiency: "",
      is_main_language: "",
    },
  });

  const handleFormSubmit = (data) => {
    onSave(data);
  };

  return (
    <form 
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dialogForm.handleSubmit(handleFormSubmit)(e);
      }} 
      className="space-y-4"
    >
      <div>
        <Label htmlFor="language">Language <span className="text-red-500">*</span></Label>
        <Input
          id="language"
          {...dialogForm.register("language")}
          data-testid="input-language"
        />
        {dialogForm.formState.errors.language && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.language.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="proficiency">Level of Proficiency <span className="text-red-500">*</span></Label>
        <Select
          value={dialogForm.watch("proficiency")}
          onValueChange={(value) => dialogForm.setValue("proficiency", value, { shouldValidate: true })}
        >
          <SelectTrigger data-testid="select-proficiency">
            <SelectValue placeholder="Choose Proficiency" />
          </SelectTrigger>
          <SelectContent>
            {PROFICIENCY_LEVELS.map((level) => (
              <SelectItem key={level} value={level}>{level}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.proficiency && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.proficiency.message}</p>
        )}
      </div>

      <div>
        <Label>Is this your main Language?</Label>
        <RadioGroup
          value={dialogForm.watch("is_main_language")}
          onValueChange={(value) => dialogForm.setValue("is_main_language", value)}
          className="flex gap-4 mt-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="Yes" id="main-lang-yes" />
            <Label htmlFor="main-lang-yes" className="cursor-pointer">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="No" id="main-lang-no" />
            <Label htmlFor="main-lang-no" className="cursor-pointer">No</Label>
          </div>
        </RadioGroup>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
          Cancel
        </Button>
        <Button type="submit" className="bg-primary text-primary-foreground" data-testid="button-ok">
          Ok
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function MainApplicantLanguagePage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const draftSnap = useSnapshot(draftStore);
  const appsSnap = useSnapshot(applicationsStore);
  const saveTimeoutRef = useRef(null);
  const { toast } = useToast();
  
  // Get visa type from pathname
  const visaType = getVisaTypeFromPath(pathname);

  // Set application ID from URL params if available
  useEffect(() => {
    const appIdFromUrl = searchParams.get('applicationId');
    if (appIdFromUrl && appIdFromUrl !== draftSnap.currentApplicationId) {
      draftStore.setApplicationId(appIdFromUrl);
      draftStore.loadDraft(appIdFromUrl);
    } else if (!appIdFromUrl && draftSnap.currentApplicationId) {
      const newUrl = `${pathname}?applicationId=${draftSnap.currentApplicationId}`;
      router.replace(newUrl);
    }
  }, [searchParams, draftSnap.currentApplicationId, pathname, router]);

  // Load section data
  const sectionData = draftStore.getSectionData('mainApplicant.language');

  const { control, handleSubmit, watch, setValue, getValues, formState: { errors, isValid } } = useForm({
    resolver: zodResolver(languageSchema),
    mode: "onChange",
    defaultValues: {
      is_english_main: sectionData.is_english_main || "",
      languages: sectionData.languages || [],
    },
  });

  // Watch form values
  const languages = watch("languages") || [];

  // Watch all form values for auto-save
  const watchedValues = useWatch({ control });

  // Auto-save form data with debounce
  useEffect(() => {
    if (!draftSnap.currentApplicationId) return;
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      if (watchedValues && Object.keys(watchedValues).length > 0) {
        draftStore.saveSectionData('mainApplicant.language', watchedValues);
      }
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [watchedValues, draftSnap.currentApplicationId]);

  const onSubmit = (data) => {
    if (!draftSnap.currentApplicationId) {
      toast({
        title: "Error",
        description: "Application ID required. Please return to the applications page and try again.",
        variant: "destructive",
      });
      return;
    }

    draftStore.saveSectionData('mainApplicant.language', data);
    draftStore.markPageComplete('partner/main-applicant/language');
    const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId);
    if (next) router.push(next);
  };

  const handlePrevious = () => {
    const prev = getPreviousRoute(pathname, visaType, draftSnap.currentApplicationId);
    if (prev) router.push(prev);
  };

  const handleSave = async () => {
    if (!draftSnap.currentApplicationId) {
      toast({
        title: "Error",
        description: "Application ID required. Please return to the applications page and try again.",
        variant: "destructive",
      });
      return;
    }

    const currentData = getValues();
    const result = await draftStore.saveSectionData('mainApplicant.language', currentData);
    
    if (result.success) {
      await draftStore.markPageComplete('partner/main-applicant/language');
      toast({
        title: "Draft saved",
        description: "Your changes have been saved successfully.",
      });
    } else {
      toast({
        title: "Error saving draft",
        description: result.error || "Failed to save draft. Please try again.",
        variant: "destructive",
      });
    }
  };

  const updateLanguages = (newLanguages) => {
    setValue("languages", newLanguages, { shouldValidate: true });
    const currentData = getValues();
    draftStore.saveSectionData('mainApplicant.language', { ...currentData, languages: newLanguages });
  };

  const languageColumns = [
    { key: "language", label: "Language" },
    { key: "proficiency", label: "Level of Proficiency" },
    { 
      key: "is_main_language", 
      label: "Main Language", 
      format: (row) => row.is_main_language === "Yes" ? "Yes" : "No"
    },
  ];

  return (
    <>
      <Card className="rounded-2xl shadow-md bg-white">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Language</CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            In this section, provide details about the main applicant's language skills.
          </p>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
              }
            }}
            className="space-y-8"
          >
            {Object.keys(errors).length > 0 && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-red-800 mb-2">
                  Please correct the following errors:
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                  {Object.entries(errors).map(([field, error]) => (
                    <li key={field}>{error.message}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Question: Is the English language your main language? */}
            <div>
              <Field
                type="radio"
                name="is_english_main"
                control={control}
                label="Is the English language your main language?"
                options={[
                  { value: "Yes", label: "Yes" },
                  { value: "No", label: "No" },
                ]}
              />
            </div>

            {/* Languages Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Languages</h3>
              <p className="text-sm text-gray-600 mb-4">
                Enter details of all Languages you are able to communicate in (including English)
              </p>
              <RepeaterTable
                data={languages}
                columns={languageColumns}
                onAdd={(row) => updateLanguages([...languages, row])}
                onEdit={(index, row) => {
                  const updated = [...languages];
                  updated[index] = row;
                  updateLanguages(updated);
                }}
                onDelete={(index) => {
                  const updated = languages.filter((_, i) => i !== index);
                  updateLanguages(updated);
                }}
                DialogComponent={LanguageDialog}
                addButtonText="Add"
                testIdPrefix="language"
                dialogTitle="Languages"
                dialogSubtitle="Enter details of all Languages you are able to communicate in (including English)"
                dialogClassName="max-w-4xl w-[90vw] max-h-[98vh] bg-white overflow-y-auto"
              />
            </div>

            <div className="hidden lg:flex justify-between items-center pt-6 border-t border-border">
              <button
                type="button"
                onClick={handlePrevious}
                className="text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-previous"
              >
                ← Previous
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="button-save-draft"
                >
                  Save Draft
                </button>
                <button
                  type="submit"
                  disabled={!isValid}
                  className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  data-testid="button-continue"
                >
                  Continue →
                </button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <StickyNav
        onPrev={handlePrevious}
        onSave={handleSave}
        onNext={handleSubmit(onSubmit)}
        disabledNext={!isValid}
      />
    </>
  );
}
