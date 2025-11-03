"use client";

import { useRouter, usePathname } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/Field";
import { StickyNav } from "@/components/StickyNav";
import { RepeaterTable } from "@/components/RepeaterTable";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { languageSchema } from "@/lib/validation";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

function LanguageDialog({ row, onSubmit, onCancel }) {
  const { control, handleSubmit, watch, setValue } = useForm({
    defaultValues: row || {
      language: "",
      proficiency: "Basic",
      main_language: false,
    },
  });

  const mainLanguage = watch("main_language");

  const handleFormSubmit = (event) => {
    event.preventDefault();
    event.stopPropagation();
    handleSubmit(onSubmit)(event);
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4">
      <Field type="text" name="language" control={control} label="Language" required />
      <Field
        type="select"
        name="proficiency"
        control={control}
        label="Proficiency"
        options={[
          { value: "Basic", label: "Basic" },
          { value: "Intermediate", label: "Intermediate" },
          { value: "Proficient", label: "Proficient" },
          { value: "Native", label: "Native" },
        ]}
      />
      <div className="flex items-center space-x-2">
        <Checkbox
          id="main_language"
          checked={mainLanguage}
          onCheckedChange={(checked) => setValue("main_language", !!checked)}
          data-testid="checkbox-main-language"
        />
        <Label htmlFor="main_language" className="cursor-pointer">
          This is my main language
        </Label>
      </div>
      <DialogFooter className="gap-2 sm:gap-2">
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
          Cancel
        </Button>
        <Button type="submit" data-testid="button-submit">
          {row ? "Update" : "Add"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function MainApplicantLanguagePage() {
  const router = useRouter();
  const pathname = usePathname();
  const visaType = getVisaTypeFromPath(pathname);
  const draftSnap = useSnapshot(draftStore);
  const saveTimeoutRef = useRef(null);
  const { toast } = useToast();

  const { control, handleSubmit, watch, setValue, getValues, formState: { errors, isValid } } = useForm({
    resolver: zodResolver(languageSchema),
    defaultValues: {
      is_english_main: draftSnap.draft.is_english_main,
      languages: draftSnap.draft.languages || [],
    },
  });

  const languages = watch("languages") || [];

  // Watch all form values for auto-save
  const watchedValues = useWatch({ control });

  // Auto-save form data with debounce
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      if (watchedValues && Object.keys(watchedValues).length > 0) {
        draftStore.saveDraft(watchedValues);
      }
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [watchedValues]);

  const onSubmit = (data) => {
    draftStore.saveDraft(data);
    const next = getNextRoute(pathname, visaType);
    if (next) router.push(next);
  };

  const handlePrevious = () => {
    const prev = getPreviousRoute(pathname, visaType);
    if (prev) router.push(prev);
  };

  const handleSave = async () => {
    const currentData = getValues();
    const result = await draftStore.saveDraft(currentData);
    
    if (result.success) {
      // Mark this page as complete
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
    setValue("languages", newLanguages, { shouldDirty: true });
    draftStore.saveDraft({ languages: newLanguages });
  };

  const languageColumns = [
    { key: "language", label: "Language" },
    { key: "proficiency", label: "Proficiency" },
    { 
      key: "main_language", 
      label: "Main", 
      render: (value) => value ? "Yes" : "No" 
    },
  ];

  return (
    <>
      <Card className="rounded-2xl shadow-md bg-white">
        <CardHeader>
          <CardTitle className="font-serif text-2xl">Language Skills</CardTitle>
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

            <Field
              type="radio"
              name="is_english_main"
              control={control}
              label="Is English your main language?"
              options={[
                { value: "Yes", label: "Yes" },
                { value: "No", label: "No" },
              ]}
            />

            <div className="space-y-4">
              <h3 className="font-serif text-lg font-medium">Languages</h3>
              <p className="text-sm text-muted-foreground">
                Please list all languages you speak, including English
              </p>
              <RepeaterTable
                rows={languages}
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
                dialogForm={(row, onSubmit, onCancel) => (
                  <LanguageDialog row={row} onSubmit={onSubmit} onCancel={onCancel} />
                )}
                addButtonText="Add Language"
                emptyMessage="No languages added"
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
