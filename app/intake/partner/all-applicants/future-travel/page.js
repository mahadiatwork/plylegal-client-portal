"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { FormNavigation } from "@/components/FormNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/Field";
import { RepeaterTable } from "@/components/RepeaterTable";
import { futureTravelSchema } from "@/lib/validation";
import { draftStore } from "@/stores/draftStore";
import { useSnapshot } from "valtio";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { DateSelector } from "@/components/DateSelecters";
import { COUNTRIES } from "@/reuseable/countries";

const countryOptions = COUNTRIES.map((c) => ({ value: c, label: c }));
const reasonOptions = [
  { value: "Holiday", label: "Holiday" },
  { value: "Business", label: "Business" },
  { value: "Visit Family", label: "Visit Family" },
  { value: "Work", label: "Work" },
  { value: "Study", label: "Study" },
  { value: "Other", label: "Other" },
];

function FutureTravelDialog({ editingRow, onSave, onCancel, applicantName }) {
  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: editingRow || {
      departure_date_day: "",
      departure_date_month: "",
      departure_date_year: "",
      departure_country: "",
      departure_city: "",
      flight_number: "",
      arrival_date_day: "",
      arrival_date_month: "",
      arrival_date_year: "",
      arrival_country: "",
      arrival_city: "",
      reason: "",
    },
  });

  const handleFormSubmit = (data) => {
    onSave(data);
  };

  const departureDateValues = {
    day: watch("departure_date_day"),
    month: watch("departure_date_month"),
    year: watch("departure_date_year"),
  };

  const arrivalDateValues = {
    day: watch("arrival_date_day"),
    month: watch("arrival_date_month"),
    year: watch("arrival_date_year"),
  };

  return (
    <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-2">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Departure Details</h3>

        <DateSelector
          label="Travel Start Date"
          values={departureDateValues}
          onValueChange={(part, value) => setValue(`departure_date_${part}`, value, { shouldValidate: true })}
          errors={{
            day: errors.departure_date_day,
            month: errors.departure_date_month,
            year: errors.departure_date_year,
          }}
          testIdPrefix="departure-date"
          required
          future
        />

        <Field
          type="select"
          name="departure_country"
          control={control}
          label={`Country the Main Applicant ${applicantName ? `(${applicantName})` : ""} will Depart From`}
          placeholder="Choose Country"
          options={countryOptions}
          required
        />

        <Field
          type="text"
          name="departure_city"
          control={control}
          label="Departure City"
          required
        />

        <Field
          type="text"
          name="flight_number"
          control={control}
          label="Flight Number/Vessel Number (if known)"
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Arrival Details</h3>

        <DateSelector
          label="Intended Arrival Date"
          values={arrivalDateValues}
          onValueChange={(part, value) => setValue(`arrival_date_${part}`, value, { shouldValidate: true })}
          errors={{
            day: errors.arrival_date_day,
            month: errors.arrival_date_month,
            year: errors.arrival_date_year,
          }}
          testIdPrefix="arrival-date"
          required
          future
        />

        <Field
          type="select"
          name="arrival_country"
          control={control}
          label={`Country the Main Applicant ${applicantName ? `(${applicantName})` : ""} will Arrive In`}
          placeholder="Choose Country"
          options={countryOptions}
          required
        />

        <Field
          type="text"
          name="arrival_city"
          control={control}
          label="Arrival City"
          required
        />

        <Field
          type="select"
          name="reason"
          control={control}
          label="Reason for Travel"
          placeholder="Choose Reason"
          options={reasonOptions}
          required
        />
      </div>

      <DialogFooter className="gap-2 sm:gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSubmit(handleFormSubmit)}>Ok</Button>
      </DialogFooter>
    </div>
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

  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);

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
    reset,
    formState: { errors, isValid, isDirty },
  } = useForm({
    resolver: zodResolver(futureTravelSchema),
    defaultValues: {
      has_future_travel: "",
      future_travel: [],
    },
  });

  const hasFutureTravel = watch("has_future_travel");
  const futureTravel = watch("future_travel") || [];

  // Load data from section when draft loads
  useEffect(() => {
    const savedData = draftSnap.draft?.partner_future_travel || {};
    if (Object.keys(savedData).length > 0 && !isDirty) {
      const formData = {
        has_future_travel: savedData.has_future_travel || "",
        future_travel: savedData.future_travel || [],
      };

      reset(formData);

      // Ensure radio value is set after reset
      setTimeout(() => {
        setValue("has_future_travel", savedData.has_future_travel || "");
      }, 0);
    }
  }, [draftSnap.draft?.partner_future_travel, isDirty, reset, setValue]);

  const updateFutureTravel = (newTravel) => {
    setValue("future_travel", newTravel, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
  };

  const handlePrevious = () => {
    const prev = getPreviousRoute(pathname, visaType);
    if (prev) router.push(prev);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const values = getValues();
      const result = await draftStore.saveSectionData("partner_future_travel", values);
      if (result.success) {
        toast({
          title: "Draft saved",
          description: "Your changes have been saved successfully",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to save draft",
          variant: "destructive",
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const onSubmit = async (data) => {
    setIsSaving(true);
    try {
      await draftStore.saveSectionData("partner_future_travel", data);
      await draftStore.markPageComplete(`${visaType}/all-applicants/future-travel`, null, "partner_future_travel");
      const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId);
      if (next) router.push(next);
    } finally {
      setIsSaving(false);
    }
  };

  const futureTravelColumns = [

    {
      key: "route",
      label: "Route",
      format: (row) => {
        const from = [row.departure_city, row.departure_country].filter(Boolean).join(", ");
        const to = [row.arrival_city, row.arrival_country].filter(Boolean).join(", ");
        return from && to ? `${from} → ${to}` : (from || to || "-");
      }
    },
    {
      key: "departure_date",
      label: "Departure Date",
      format: (row) => {
        if (!row.departure_date_day && !row.departure_date_month && !row.departure_date_year) return "-";
        return `${row.departure_date_day || '?'}/${row.departure_date_month || '?'}/${row.departure_date_year || '?'}`;
      }
    },
    { key: "reason", label: "Reason" },
  ];

  const applicantName = (draft.details?.given_names || "") + " " + (draft.details?.family_name || "");

  return (
    <Card className="rounded-2xl shadow-md bg-white">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">
          Future Travel Plans
        </CardTitle>
      </CardHeader>
      <CardContent>
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
            label="Do you have any proposed or booked travel to any Country?"
            options={[
              { value: "Yes", label: "Yes" },
              { value: "No", label: "No" },
            ]}
          />

          {mounted && hasFutureTravel === "Yes" && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">
                Proposed or Booked Travel
              </h3>
              <p className="text-sm text-gray-600">
                Enter details of any proposed or booked travel to any Country
              </p>
              <RepeaterTable
                data={futureTravel}
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
                DialogComponent={FutureTravelDialog}
                dialogProps={{ applicantName }}
                addButtonText="Add Travel"
                emptyMessage="No future travel added"
                dialogTitle="Future Travel"
                dialogSubtitle="Enter details of any proposed or booked travel to any Country"
              />
            </div>
          )}

          <FormNavigation
            onPrev={handlePrevious}
            onNext={handleSubmit(onSubmit)}
            onSave={handleSave}
            loading={isSaving}
            saveLabel="Save Draft"
            nextLabel="Continue"
          />
        </form>
      </CardContent>
    </Card>
  );
}
