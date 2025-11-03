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
import { otherSchema } from "@/lib/validation";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

function OtherNameDialog({ row, onSubmit, onCancel }) {
  const { control, handleSubmit } = useForm({
    defaultValues: row || {
      family_name: "",
      given_names: "",
      reason_for_change: "",
    },
  });

  return (
    <form 
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleSubmit(onSubmit)(e);
      }} 
      className="space-y-4"
    >
      <Field type="text" name="family_name" control={control} label="Family Name" required />
      <Field type="text" name="given_names" control={control} label="Given Names" required />
      <Field
        type="text"
        name="reason_for_change"
        control={control}
        label="Reason for Change"
        required
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

function PrevDobDialog({ row, onSubmit, onCancel }) {
  const { control, handleSubmit } = useForm({
    defaultValues: { date: row || "" },
  });

  return (
    <form 
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleSubmit((data) => onSubmit(data.date))(e);
      }} 
      className="space-y-4"
    >
      <Field type="date" name="date" control={control} label="Previous Date of Birth" required />
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

export default function MainApplicantOtherPage() {
  const router = useRouter();
  const pathname = usePathname();
  const draftSnap = useSnapshot(draftStore);
  const saveTimeoutRef = useRef(null);
  const { toast } = useToast();
  
  // Get visa type from pathname
  const visaType = getVisaTypeFromPath(pathname);

  // Load section data
  const sectionData = draftStore.getSectionData('mainApplicant.otherNames');

  const { control, handleSubmit, watch, setValue, getValues, formState: { errors, isValid } } = useForm({
    resolver: zodResolver(otherSchema),
    mode: "onChange",
    defaultValues: {
      has_other_names: sectionData.has_other_names,
      other_names: sectionData.other_names || [],
      use_chinese_code: sectionData.use_chinese_code,
      chinese_code: sectionData.chinese_code || "",
      russian_descent: sectionData.russian_descent,
      patronymic_name: sectionData.patronymic_name || { family_name: "", given_names: "" },
      has_prev_dob: sectionData.has_prev_dob,
      prev_dobs: sectionData.prev_dobs || [],
    },
  });

  // Watch form values for conditional rendering
  const hasOtherNames = watch("has_other_names");
  const useChineseCode = watch("use_chinese_code");
  const russianDescent = watch("russian_descent");
  const hasPrevDob = watch("has_prev_dob");
  const otherNames = watch("other_names") || [];
  const prevDobs = watch("prev_dobs") || [];

  // Watch all form values for auto-save
  const watchedValues = useWatch({ control });

  // Auto-save form data with debounce
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      if (watchedValues && Object.keys(watchedValues).length > 0) {
        draftStore.saveSectionData('mainApplicant.otherNames', watchedValues);
      }
    }, 2000); // Save 2 seconds after user stops typing

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [watchedValues]);

  const onSubmit = (data) => {
    draftStore.saveSectionData('mainApplicant.otherNames', data);
    draftStore.markPageComplete('partner/main-applicant/other');
    const next = getNextRoute(pathname, visaType);
    if (next) router.push(next);
  };

  const handlePrevious = () => {
    const prev = getPreviousRoute(pathname, visaType);
    if (prev) router.push(prev);
  };

  const handleSave = async () => {
    const currentData = getValues();
    const result = await draftStore.saveSectionData('mainApplicant.otherNames', currentData);
    
    if (result.success) {
      // Mark this page as complete
      await draftStore.markPageComplete('partner/main-applicant/other');
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

  const updateOtherNames = (newNames) => {
    setValue("other_names", newNames, { shouldValidate: true });
    const currentData = getValues();
    draftStore.saveSectionData('mainApplicant.otherNames', { ...currentData, other_names: newNames });
  };

  const updatePrevDobs = (newDobs) => {
    setValue("prev_dobs", newDobs, { shouldValidate: true });
    const currentData = getValues();
    draftStore.saveSectionData('mainApplicant.otherNames', { ...currentData, prev_dobs: newDobs });
  };

  const otherNameColumns = [
    { key: "family_name", label: "Family Name" },
    { key: "given_names", label: "Given Names" },
    { key: "reason_for_change", label: "Reason" },
  ];

  const prevDobColumns = [
    { key: "date", label: "Date of Birth" },
  ];

  return (
    <>
      <Card className="rounded-2xl shadow-md bg-white">
        <CardHeader>
          <CardTitle className="font-serif text-2xl">Other Names & Details</CardTitle>
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
              name="has_other_names"
              control={control}
              label="Have you been known by any other names?"
              options={[
                { value: "Yes", label: "Yes" },
                { value: "No", label: "No" },
              ]}
            />

            {hasOtherNames === "Yes" && (
              <RepeaterTable
                rows={otherNames}
                columns={otherNameColumns}
                onAdd={(row) => updateOtherNames([...otherNames, row])}
                onEdit={(index, row) => {
                  const updated = [...otherNames];
                  updated[index] = row;
                  updateOtherNames(updated);
                }}
                onDelete={(index) => {
                  const updated = otherNames.filter((_, i) => i !== index);
                  updateOtherNames(updated);
                }}
                dialogForm={(row, onSubmit, onCancel) => (
                  <OtherNameDialog row={row} onSubmit={onSubmit} onCancel={onCancel} />
                )}
                addButtonText="Add Other Name"
                emptyMessage="No other names added"
              />
            )}

            <Field
              type="radio"
              name="use_chinese_code"
              control={control}
              label="Do you use a Chinese commercial code?"
              options={[
                { value: "Yes", label: "Yes" },
                { value: "No", label: "No" },
              ]}
            />

            {useChineseCode === "Yes" && (
              <Field
                type="text"
                name="chinese_code"
                control={control}
                label="Chinese Commercial Code"
                required
              />
            )}

            <Field
              type="radio"
              name="russian_descent"
              control={control}
              label="Are you of Russian descent?"
              options={[
                { value: "Yes", label: "Yes" },
                { value: "No", label: "No" },
              ]}
            />

            {russianDescent === "Yes" && (
              <div className="space-y-4 p-6 bg-muted/50 rounded-xl">
                <h3 className="font-serif text-lg font-medium">Patronymic Name</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Field
                    type="text"
                    name="patronymic_name.family_name"
                    control={control}
                    label="Family Name"
                    required
                  />
                  <Field
                    type="text"
                    name="patronymic_name.given_names"
                    control={control}
                    label="Given Names"
                    required
                  />
                </div>
              </div>
            )}

            <Field
              type="radio"
              name="has_prev_dob"
              control={control}
              label="Have you used any other dates of birth?"
              options={[
                { value: "Yes", label: "Yes" },
                { value: "No", label: "No" },
              ]}
            />

            {hasPrevDob === "Yes" && (
              <RepeaterTable
                rows={prevDobs.map((date) => ({ date }))}
                columns={prevDobColumns}
                onAdd={(row) => updatePrevDobs([...prevDobs, row.date])}
                onEdit={(index, row) => {
                  const updated = [...prevDobs];
                  updated[index] = row.date;
                  updatePrevDobs(updated);
                }}
                onDelete={(index) => {
                  const updated = prevDobs.filter((_, i) => i !== index);
                  updatePrevDobs(updated);
                }}
                dialogForm={(row, onSubmit, onCancel) => (
                  <PrevDobDialog
                    row={row?.date || null}
                    onSubmit={(date) => onSubmit({ date })}
                    onCancel={onCancel}
                  />
                )}
                addButtonText="Add Previous DOB"
                emptyMessage="No previous dates of birth added"
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
