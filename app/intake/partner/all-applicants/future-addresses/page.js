"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/Field";
import { RepeaterTable } from "@/components/RepeaterTable";
import { futureAddressesSchema } from "@/lib/validation";
import { draftStore } from "@/stores/draftStore";
import { useSnapshot } from "valtio";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";

function FutureAddressDialog({ row, onSubmit, onCancel }) {
  const { control, handleSubmit } = useForm({
    defaultValues: row || {
      date_from: "",
      date_to: "",
      address: "",
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field type="date" name="date_from" control={control} label="From" />
        <Field type="date" name="date_to" control={control} label="To" />
      </div>
      <Field type="textarea" name="address" control={control} label="Address" rows={3} />
      <DialogFooter className="gap-2 sm:gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{row ? "Update" : "Add"}</Button>
      </DialogFooter>
    </form>
  );
}

export default function FutureAddressesPage() {
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
    resolver: zodResolver(futureAddressesSchema),
    defaultValues: {
      knows_future_address: draft.knows_future_address || undefined,
      future_addresses: draft.future_addresses || [],
    },
  });

  const knowsFutureAddress = watch("knows_future_address");
  const futureAddresses = watch("future_addresses") || [];
  const watchedValues = watch();

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      draftStore.saveDraft(watchedValues);
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [watchedValues]);

  const updateFutureAddresses = (newAddresses) => {
    setValue("future_addresses", newAddresses, { shouldValidate: true });
    draftStore.saveDraft({ future_addresses: newAddresses });
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
      await draftStore.markPageComplete('partner/all-applicants/future-addresses');
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
    draftStore.markPageComplete('partner/all-applicants/future-addresses');
    const next = getNextRoute(pathname, visaType);
    if (next) router.push(next);
  };

  const futureAddressColumns = [
    { key: "date_from", label: "From" },
    { key: "date_to", label: "To" },
    { key: "address", label: "Address" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Card className="border border-gray-200 shadow-sm rounded-lg">
          <CardHeader className="px-6 py-8 border-b border-gray-200">
            <CardTitle className="text-2xl font-semibold text-gray-900">
              Future Addresses
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
                name="knows_future_address"
                control={control}
                label="Do you know your intended address after arrival?"
                options={[
                  { value: "Yes", label: "Yes" },
                  { value: "No", label: "No" },
                ]}
              />

              {mounted && knowsFutureAddress === "Yes" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Future Addresses</h3>
                  <p className="text-sm text-gray-600">
                    Please provide your intended addresses after arrival
                  </p>
                  <RepeaterTable
                    rows={futureAddresses}
                    columns={futureAddressColumns}
                    onAdd={(row) => updateFutureAddresses([...futureAddresses, row])}
                    onEdit={(index, row) => {
                      const updated = [...futureAddresses];
                      updated[index] = row;
                      updateFutureAddresses(updated);
                    }}
                    onDelete={(index) => {
                      const updated = futureAddresses.filter((_, i) => i !== index);
                      updateFutureAddresses(updated);
                    }}
                    dialogForm={(row, onSubmit, onCancel) => (
                      <FutureAddressDialog
                        row={row}
                        onSubmit={onSubmit}
                        onCancel={onCancel}
                      />
                    )}
                    addButtonText="Add Future Address"
                    emptyMessage="No future addresses added"
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
