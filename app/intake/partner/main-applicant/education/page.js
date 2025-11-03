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
import { educationSchema } from "@/lib/validation";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

function EducationDialog({ row, onSubmit, onCancel }) {
  const { control, handleSubmit } = useForm({
    defaultValues: row || {
      date_from: "",
      date_to: "",
      course_name: "",
      institution_name: "",
      country: "",
      status: "Completed",
    },
  });

  const handleFormSubmit = (event) => {
    event.preventDefault();
    event.stopPropagation();
    handleSubmit(onSubmit)(event);
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field type="date" name="date_from" control={control} label="From" />
        <Field type="date" name="date_to" control={control} label="To" />
      </div>
      <Field type="text" name="course_name" control={control} label="Course Name" required />
      <Field type="text" name="institution_name" control={control} label="Institution Name" required />
      <Field type="text" name="country" control={control} label="Country" />
      <Field
        type="select"
        name="status"
        control={control}
        label="Status"
        options={[
          { value: "Completed", label: "Completed" },
          { value: "Ongoing", label: "Ongoing" },
          { value: "Withdrawn", label: "Withdrawn" },
        ]}
      />
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

export default function MainApplicantEducationPage() {
  const router = useRouter();
  const pathname = usePathname();
  const visaType = getVisaTypeFromPath(pathname);
  const draftSnap = useSnapshot(draftStore);
  const saveTimeoutRef = useRef(null);
  const { toast } = useToast();

  const { control, handleSubmit, watch, setValue, getValues, formState: { errors, isValid } } = useForm({
    resolver: zodResolver(educationSchema),
    defaultValues: {
      has_education: draftSnap.draft.has_education,
      education_history: draftSnap.draft.education_history || [],
    },
  });

  const hasEducation = watch("has_education");
  const educationHistory = watch("education_history") || [];

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
      await draftStore.markPageComplete('partner/main-applicant/education');
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

  const updateEducationHistory = (newHistory) => {
    setValue("education_history", newHistory, { shouldDirty: true });
    draftStore.saveDraft({ education_history: newHistory });
  };

  const educationColumns = [
    { key: "course_name", label: "Course" },
    { key: "institution_name", label: "Institution" },
    { key: "country", label: "Country" },
    { key: "status", label: "Status" },
  ];

  return (
    <>
      <Card className="rounded-2xl shadow-md bg-white">
        <CardHeader>
          <CardTitle className="font-serif text-2xl">Education History</CardTitle>
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
              name="has_education"
              control={control}
              label="Do you have any tertiary or higher education qualifications?"
              options={[
                { value: "Yes", label: "Yes" },
                { value: "No", label: "No" },
              ]}
            />

            {hasEducation === "Yes" && (
              <RepeaterTable
                rows={educationHistory}
                columns={educationColumns}
                onAdd={(row) => updateEducationHistory([...educationHistory, row])}
                onEdit={(index, row) => {
                  const updated = [...educationHistory];
                  updated[index] = row;
                  updateEducationHistory(updated);
                }}
                onDelete={(index) => {
                  const updated = educationHistory.filter((_, i) => i !== index);
                  updateEducationHistory(updated);
                }}
                dialogForm={(row, onSubmit, onCancel) => (
                  <EducationDialog row={row} onSubmit={onSubmit} onCancel={onCancel} />
                )}
                addButtonText="Add Education Record"
                emptyMessage="No education records added"
              />
            )}

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
