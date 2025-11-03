"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/Field";
import { RepeaterTable } from "@/components/RepeaterTable";
import { healthSchema } from "@/lib/validation";
import { draftStore } from "@/stores/draftStore";
import { useSnapshot } from "valtio";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";

function GenericHealthDialog({ row, onSubmit, onCancel, additionalFields }) {
  const { control, handleSubmit } = useForm({
    defaultValues: row || { name: "", dob: "" },
  });

  const handleFormSubmit = (data) => {
    onSubmit(data);
  };

  return (
    <form
      onSubmit={(e) => {
        e.stopPropagation();
        handleSubmit(handleFormSubmit)(e);
      }}
      className="space-y-4"
    >
      <Field type="text" name="name" control={control} label="Name" />
      <Field type="date" name="dob" control={control} label="Date of Birth" />
      {additionalFields && additionalFields(control)}
      <DialogFooter className="gap-2 sm:gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{row ? "Update" : "Add"}</Button>
      </DialogFooter>
    </form>
  );
}

export default function HealthPage() {
  const router = useRouter();
  const pathname = usePathname();
  const visaType = getVisaTypeFromPath(pathname);
  const draft = useSnapshot(draftStore.draft);
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isValid },
  } = useForm({
    resolver: zodResolver(healthSchema),
    defaultValues: {
      health_exam_12m: draft.health_exam_12m || undefined,
      health_exams: draft.health_exams || [],
      intends_healthcare_work: draft.intends_healthcare_work || undefined,
      health_work: draft.health_work || [],
      tb_history: draft.tb_history || undefined,
      tb_history_details: draft.tb_history_details || [],
      tb_close_contact: draft.tb_close_contact || undefined,
      tb_close_contact_details: draft.tb_close_contact_details || [],
      listed_health_conditions: draft.listed_health_conditions || undefined,
      health_conditions: draft.health_conditions || [],
      needs_medical_care: draft.needs_medical_care || undefined,
      medical_care_details: draft.medical_care_details || [],
    },
  });

  const healthExam12m = watch("health_exam_12m");
  const intendsHealthcareWork = watch("intends_healthcare_work");
  const tbHistory = watch("tb_history");
  const tbCloseContact = watch("tb_close_contact");
  const listedHealthConditions = watch("listed_health_conditions");
  const needsMedicalCare = watch("needs_medical_care");
  const watchedValues = watch();

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      draftStore.saveDraft(watchedValues);
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [watchedValues]);

  const handlePrevious = () => {
    const prev = getPreviousRoute(pathname, visaType);
    if (prev) router.push(prev);
  };

  const handleSave = async () => {
    const currentData = getValues();
    const result = await draftStore.saveDraft(currentData);
    
    if (result.success) {
      // Mark this page as complete
      await draftStore.markPageComplete('partner/all-applicants/health');
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

  const onSubmit = (data) => {
    draftStore.saveDraft(data);
    draftStore.markPageComplete('partner/all-applicants/health');
    const next = getNextRoute(pathname, visaType);
    if (next) router.push(next);
  };

  const baseColumns = [
    { key: "name", label: "Name" },
    { key: "dob", label: "DOB" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Card className="border border-gray-200 shadow-sm rounded-lg">
          <CardHeader className="px-6 py-8 border-b border-gray-200">
            <CardTitle className="text-2xl font-semibold text-gray-900">
              Health Information
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 py-8">
            <form
              onSubmit={handleSubmit(onSubmit)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
                  e.preventDefault();
                }
              }}
              className="space-y-8"
            >
              {Object.keys(errors).length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-red-800 mb-2">
                    Please fix the following errors:
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
                name="health_exam_12m"
                control={control}
                label="Have you undertaken a health examination in the last 12 months?"
                options={[
                  { value: "Yes", label: "Yes" },
                  { value: "No", label: "No" },
                ]}
              />

              {mounted && healthExam12m === "Yes" && (
                <div className="space-y-4">
                  <RepeaterTable
                    rows={watch("health_exams") || []}
                    columns={[...baseColumns, { key: "country", label: "Country" }, { key: "date_completed", label: "Date" }]}
                    onAdd={(row) => {
                      const current = watch("health_exams") || [];
                      setValue("health_exams", [...current, row], { shouldValidate: true });
                      draftStore.saveDraft({ health_exams: [...current, row] });
                    }}
                    onEdit={(index, row) => {
                      const current = watch("health_exams") || [];
                      const updated = [...current];
                      updated[index] = row;
                      setValue("health_exams", updated, { shouldValidate: true });
                      draftStore.saveDraft({ health_exams: updated });
                    }}
                    onDelete={(index) => {
                      const current = watch("health_exams") || [];
                      const updated = current.filter((_, i) => i !== index);
                      setValue("health_exams", updated, { shouldValidate: true });
                      draftStore.saveDraft({ health_exams: updated });
                    }}
                    dialogForm={(row, onSubmit, onCancel) => (
                      <GenericHealthDialog
                        row={row}
                        onSubmit={onSubmit}
                        onCancel={onCancel}
                        additionalFields={(control) => (
                          <>
                            <Field type="text" name="country" control={control} label="Country" />
                            <Field type="date" name="date_completed" control={control} label="Date Completed" />
                          </>
                        )}
                      />
                    )}
                    addButtonText="Add Exam"
                    emptyMessage="No health exams added"
                  />
                </div>
              )}

              <Field
                type="radio"
                name="intends_healthcare_work"
                control={control}
                label="Do you intend to work in healthcare, childcare, or schools?"
                options={[
                  { value: "Yes", label: "Yes" },
                  { value: "No", label: "No" },
                ]}
              />

              {mounted && intendsHealthcareWork === "Yes" && (
                <div className="space-y-4">
                  <RepeaterTable
                    rows={watch("health_work") || []}
                    columns={[...baseColumns, { key: "role", label: "Role" }]}
                    onAdd={(row) => {
                      const current = watch("health_work") || [];
                      setValue("health_work", [...current, row], { shouldValidate: true });
                      draftStore.saveDraft({ health_work: [...current, row] });
                    }}
                    onEdit={(index, row) => {
                      const current = watch("health_work") || [];
                      const updated = [...current];
                      updated[index] = row;
                      setValue("health_work", updated, { shouldValidate: true });
                      draftStore.saveDraft({ health_work: updated });
                    }}
                    onDelete={(index) => {
                      const current = watch("health_work") || [];
                      const updated = current.filter((_, i) => i !== index);
                      setValue("health_work", updated, { shouldValidate: true });
                      draftStore.saveDraft({ health_work: updated });
                    }}
                    dialogForm={(row, onSubmit, onCancel) => (
                      <GenericHealthDialog
                        row={row}
                        onSubmit={onSubmit}
                        onCancel={onCancel}
                        additionalFields={(control) => (
                          <Field type="text" name="role" control={control} label="Intended Role" />
                        )}
                      />
                    )}
                    addButtonText="Add Work Details"
                    emptyMessage="No work details added"
                  />
                </div>
              )}

              <Field
                type="radio"
                name="tb_history"
                control={control}
                label="Have you or any family member had tuberculosis?"
                options={[
                  { value: "Yes", label: "Yes" },
                  { value: "No", label: "No" },
                ]}
              />

              {mounted && tbHistory === "Yes" && (
                <div className="space-y-4">
                  <RepeaterTable
                    rows={watch("tb_history_details") || []}
                    columns={[...baseColumns, { key: "country", label: "Country" }]}
                    onAdd={(row) => {
                      const current = watch("tb_history_details") || [];
                      setValue("tb_history_details", [...current, row], { shouldValidate: true });
                      draftStore.saveDraft({ tb_history_details: [...current, row] });
                    }}
                    onEdit={(index, row) => {
                      const current = watch("tb_history_details") || [];
                      const updated = [...current];
                      updated[index] = row;
                      setValue("tb_history_details", updated, { shouldValidate: true });
                      draftStore.saveDraft({ tb_history_details: updated });
                    }}
                    onDelete={(index) => {
                      const current = watch("tb_history_details") || [];
                      const updated = current.filter((_, i) => i !== index);
                      setValue("tb_history_details", updated, { shouldValidate: true });
                      draftStore.saveDraft({ tb_history_details: updated });
                    }}
                    dialogForm={(row, onSubmit, onCancel) => (
                      <GenericHealthDialog
                        row={row}
                        onSubmit={onSubmit}
                        onCancel={onCancel}
                        additionalFields={(control) => (
                          <Field type="text" name="country" control={control} label="Country" />
                        )}
                      />
                    )}
                    addButtonText="Add TB History"
                    emptyMessage="No TB history added"
                  />
                </div>
              )}

              <Field
                type="radio"
                name="tb_close_contact"
                control={control}
                label="Have you had close contact with anyone with tuberculosis?"
                options={[
                  { value: "Yes", label: "Yes" },
                  { value: "No", label: "No" },
                ]}
              />

              {mounted && tbCloseContact === "Yes" && (
                <div className="space-y-4">
                  <RepeaterTable
                    rows={watch("tb_close_contact_details") || []}
                    columns={[...baseColumns, { key: "country", label: "Country" }]}
                    onAdd={(row) => {
                      const current = watch("tb_close_contact_details") || [];
                      setValue("tb_close_contact_details", [...current, row], { shouldValidate: true });
                      draftStore.saveDraft({ tb_close_contact_details: [...current, row] });
                    }}
                    onEdit={(index, row) => {
                      const current = watch("tb_close_contact_details") || [];
                      const updated = [...current];
                      updated[index] = row;
                      setValue("tb_close_contact_details", updated, { shouldValidate: true });
                      draftStore.saveDraft({ tb_close_contact_details: updated });
                    }}
                    onDelete={(index) => {
                      const current = watch("tb_close_contact_details") || [];
                      const updated = current.filter((_, i) => i !== index);
                      setValue("tb_close_contact_details", updated, { shouldValidate: true });
                      draftStore.saveDraft({ tb_close_contact_details: updated });
                    }}
                    dialogForm={(row, onSubmit, onCancel) => (
                      <GenericHealthDialog
                        row={row}
                        onSubmit={onSubmit}
                        onCancel={onCancel}
                        additionalFields={(control) => (
                          <Field type="text" name="country" control={control} label="Country" />
                        )}
                      />
                    )}
                    addButtonText="Add Contact Details"
                    emptyMessage="No contact details added"
                  />
                </div>
              )}

              <Field
                type="radio"
                name="listed_health_conditions"
                control={control}
                label="Do you have any significant health conditions?"
                options={[
                  { value: "Yes", label: "Yes" },
                  { value: "No", label: "No" },
                ]}
              />

              {mounted && listedHealthConditions === "Yes" && (
                <div className="space-y-4">
                  <RepeaterTable
                    rows={watch("health_conditions") || []}
                    columns={[...baseColumns, { key: "condition", label: "Condition" }]}
                    onAdd={(row) => {
                      const current = watch("health_conditions") || [];
                      setValue("health_conditions", [...current, row], { shouldValidate: true });
                      draftStore.saveDraft({ health_conditions: [...current, row] });
                    }}
                    onEdit={(index, row) => {
                      const current = watch("health_conditions") || [];
                      const updated = [...current];
                      updated[index] = row;
                      setValue("health_conditions", updated, { shouldValidate: true });
                      draftStore.saveDraft({ health_conditions: updated });
                    }}
                    onDelete={(index) => {
                      const current = watch("health_conditions") || [];
                      const updated = current.filter((_, i) => i !== index);
                      setValue("health_conditions", updated, { shouldValidate: true });
                      draftStore.saveDraft({ health_conditions: updated });
                    }}
                    dialogForm={(row, onSubmit, onCancel) => (
                      <GenericHealthDialog
                        row={row}
                        onSubmit={onSubmit}
                        onCancel={onCancel}
                        additionalFields={(control) => (
                          <Field type="textarea" name="condition" control={control} label="Condition Details" rows={3} />
                        )}
                      />
                    )}
                    addButtonText="Add Condition"
                    emptyMessage="No conditions added"
                  />
                </div>
              )}

              <Field
                type="radio"
                name="needs_medical_care"
                control={control}
                label="Will you require ongoing medical care or assistance?"
                options={[
                  { value: "Yes", label: "Yes" },
                  { value: "No", label: "No" },
                ]}
              />

              {mounted && needsMedicalCare === "Yes" && (
                <div className="space-y-4">
                  <RepeaterTable
                    rows={watch("medical_care_details") || []}
                    columns={baseColumns}
                    onAdd={(row) => {
                      const current = watch("medical_care_details") || [];
                      setValue("medical_care_details", [...current, row], { shouldValidate: true });
                      draftStore.saveDraft({ medical_care_details: [...current, row] });
                    }}
                    onEdit={(index, row) => {
                      const current = watch("medical_care_details") || [];
                      const updated = [...current];
                      updated[index] = row;
                      setValue("medical_care_details", updated, { shouldValidate: true });
                      draftStore.saveDraft({ medical_care_details: updated });
                    }}
                    onDelete={(index) => {
                      const current = watch("medical_care_details") || [];
                      const updated = current.filter((_, i) => i !== index);
                      setValue("medical_care_details", updated, { shouldValidate: true });
                      draftStore.saveDraft({ medical_care_details: updated });
                    }}
                    dialogForm={(row, onSubmit, onCancel) => (
                      <GenericHealthDialog
                        row={row}
                        onSubmit={onSubmit}
                        onCancel={onCancel}
                      />
                    )}
                    addButtonText="Add Medical Care Details"
                    emptyMessage="No medical care details added"
                  />
                </div>
              )}

              <div className="hidden lg:flex justify-between items-center pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handlePrevious}
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                  data-testid="button-previous"
                >
                  ← Previous
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleSave}
                    className="text-gray-600 hover:text-gray-900 transition-colors"
                    data-testid="button-save-draft"
                  >
                    Save Draft
                  </button>
                  <button
                    type="submit"
                    disabled={!isValid}
                    className="bg-[#285646] text-white px-6 py-2 rounded-lg hover:bg-[#1f4236] disabled:opacity-50 transition-colors"
                    data-testid="button-continue"
                  >
                    Continue →
                  </button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
