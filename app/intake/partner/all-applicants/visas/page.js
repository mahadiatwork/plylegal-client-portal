"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/Field";
import { RepeaterTable } from "@/components/RepeaterTable";
import { visasSchema } from "@/lib/validation";
import { draftStore } from "@/stores/draftStore";
import { useSnapshot } from "valtio";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";

function VisaDialog({ row, onSubmit, onCancel }) {
  const { control, handleSubmit } = useForm({
    defaultValues: row || {
      country: "",
      type: "",
      linked_passport: "",
      decision_date: "",
      outcome: "Granted",
    },
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
      <Field type="text" name="country" control={control} label="Country" />
      <Field type="text" name="type" control={control} label="Visa Type" />
      <Field type="text" name="linked_passport" control={control} label="Linked Passport" />
      <Field type="date" name="decision_date" control={control} label="Decision Date" />
      <Field
        type="select"
        name="outcome"
        control={control}
        label="Outcome"
        options={[
          { value: "Granted", label: "Granted" },
          { value: "Refused", label: "Refused" },
          { value: "Cancelled", label: "Cancelled" },
          { value: "Pending", label: "Pending" },
        ]}
      />
      <DialogFooter className="gap-2 sm:gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{row ? "Update" : "Add"}</Button>
      </DialogFooter>
    </form>
  );
}

export default function VisasPage() {
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
    resolver: zodResolver(visasSchema),
    defaultValues: {
      has_previous_visa: draft.has_previous_visa || undefined,
      visa_history: draft.visa_history || [],
    },
  });

  const hasPreviousVisa = watch("has_previous_visa");
  const visaHistory = watch("visa_history") || [];
  const watchedValues = watch();

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      draftStore.saveDraft(watchedValues);
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [watchedValues]);

  const updateVisaHistory = (newHistory) => {
    setValue("visa_history", newHistory, { shouldValidate: true });
    draftStore.saveDraft({ visa_history: newHistory });
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
      await draftStore.markPageComplete('partner/all-applicants/visas');
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
    draftStore.markPageComplete('partner/all-applicants/visas');
    const next = getNextRoute(pathname, visaType);
    if (next) router.push(next);
  };

  const visaColumns = [
    { key: "country", label: "Country" },
    { key: "type", label: "Type" },
    { key: "decision_date", label: "Date" },
    { key: "outcome", label: "Outcome" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Card className="border border-gray-200 shadow-sm rounded-lg">
          <CardHeader className="px-6 py-8 border-b border-gray-200">
            <CardTitle className="text-2xl font-semibold text-gray-900">
              Visa History
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
                name="has_previous_visa"
                control={control}
                label="Have you previously applied for a visa to any country?"
                options={[
                  { value: "Yes", label: "Yes" },
                  { value: "No", label: "No" },
                ]}
              />

              {mounted && hasPreviousVisa === "Yes" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Visa History</h3>
                  <p className="text-sm text-gray-600">
                    Please provide details of all previous visa applications
                  </p>
                  <RepeaterTable
                    rows={visaHistory}
                    columns={visaColumns}
                    onAdd={(row) => updateVisaHistory([...visaHistory, row])}
                    onEdit={(index, row) => {
                      const updated = [...visaHistory];
                      updated[index] = row;
                      updateVisaHistory(updated);
                    }}
                    onDelete={(index) => {
                      const updated = visaHistory.filter((_, i) => i !== index);
                      updateVisaHistory(updated);
                    }}
                    dialogForm={(row, onSubmit, onCancel) => (
                      <VisaDialog row={row} onSubmit={onSubmit} onCancel={onCancel} />
                    )}
                    addButtonText="Add Visa"
                    emptyMessage="No visas added"
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
