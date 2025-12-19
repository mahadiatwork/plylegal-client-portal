"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/Field";
import { RepeaterTable } from "@/components/RepeaterTable";
import { futureTravelSchema } from "@/lib/validation";
import { draftStore } from "@/stores/draftStore";
import { useSnapshot } from "valtio";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";

function FutureTravelDialog({ row, onSubmit, onCancel }) {
  const { control, handleSubmit } = useForm({
    defaultValues: row || {
      from_to: "",
      start_date: "",
      reason: "",
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
      <Field type="text" name="from_to" control={control} label="From → To" />
      <Field type="date" name="start_date" control={control} label="Start Date" />
      <Field type="text" name="reason" control={control} label="Reason" />
      <DialogFooter className="gap-2 sm:gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{row ? "Update" : "Add"}</Button>
      </DialogFooter>
    </form>
  );
}

export default function FutureTravelPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const visaType = getVisaTypeFromPath(pathname);
  const draft = useSnapshot(draftStore.draft);
  const draftSnap = useSnapshot(draftStore);
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync applicationId in URL
  useEffect(() => {
    const appIdFromUrl = searchParams.get('applicationId');
    if (appIdFromUrl && appIdFromUrl !== draftSnap.currentApplicationId) {
      draftStore.setApplicationId(appIdFromUrl);
      draftStore.loadDraft(appIdFromUrl);
    } else if (!appIdFromUrl && draftSnap.currentApplicationId) {
      // If we have applicationId in store but not in URL, update URL to include it
      const newUrl = `${pathname}?applicationId=${draftSnap.currentApplicationId}`;
      router.replace(newUrl);
    }
  }, [searchParams, draftSnap.currentApplicationId, pathname, router]);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isValid },
  } = useForm({
    resolver: zodResolver(futureTravelSchema),
    defaultValues: {
      has_future_travel: draft.has_future_travel || undefined,
      future_travel: draft.future_travel || [],
    },
  });

  const hasFutureTravel = watch("has_future_travel");
  const futureTravel = watch("future_travel") || [];
  const watchedValues = watch();

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      draftStore.saveDraft(watchedValues);
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [watchedValues]);

  const updateFutureTravel = (newTravel) => {
    setValue("future_travel", newTravel, { shouldValidate: true });
    draftStore.saveDraft({ future_travel: newTravel });
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
      await draftStore.markPageComplete('partner/all-applicants/future-travel');
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
    draftStore.markPageComplete('partner/all-applicants/future-travel');
    const next = getNextRoute(pathname, visaType);
    if (next) router.push(next);
  };

  const futureTravelColumns = [
    { key: "from_to", label: "Route" },
    { key: "start_date", label: "Start Date" },
    { key: "reason", label: "Reason" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Card className="border border-gray-200 shadow-sm rounded-lg">
          <CardHeader className="px-6 py-8 border-b border-gray-200">
            <CardTitle className="text-2xl font-semibold text-gray-900">
              Future Travel Plans
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
                name="has_future_travel"
                control={control}
                label="Do you have any planned travel in the next 12 months?"
                options={[
                  { value: "Yes", label: "Yes" },
                  { value: "No", label: "No" },
                ]}
              />

              {mounted && hasFutureTravel === "Yes" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Planned Travel Details
                  </h3>
                  <p className="text-sm text-gray-600">
                    Please provide details of any planned international travel
                  </p>
                  <RepeaterTable
                    rows={futureTravel}
                    columns={futureTravelColumns}
                    onAdd={(row) => updateFutureTravel([...futureTravel, row])}
                    onEdit={(index, row) => {
                      const updated = [...futureTravel];
                      updated[index] = row;
                      updateFutureTravel(updated);
                    }}
                    onDelete={(index) => {
                      const updated = futureTravel.filter((_, i) => i !== index);
                      updateFutureTravel(updated);
                    }}
                    dialogForm={(row, onSubmit, onCancel) => (
                      <FutureTravelDialog
                        row={row}
                        onSubmit={onSubmit}
                        onCancel={onCancel}
                      />
                    )}
                    addButtonText="Add Future Travel"
                    emptyMessage="No future travel added"
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
