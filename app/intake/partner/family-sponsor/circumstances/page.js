"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/Field";
import { FormNavigation } from "@/components/FormNavigation";
import { RepeaterTable } from "@/components/RepeaterTable";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { COUNTRIES } from "@/reuseable/countries";
import { monthNames } from "@/reuseable/months";
import { DateSelector } from "@/components/DateSelecters";

const EMPLOYMENT_STATUS_OPTIONS = [
  "Employed",
  "Student",
  "Retired",
  "Self-Employed",
  "Unpaid Employment/Volunteer",
  "Work Experience/Internships"
];

const employmentHistoryDialogSchema = z.object({
  date_from_day: z.string().min(1, "Day is required"),
  date_from_month: z.string().min(1, "Month is required"),
  date_from_year: z.string().min(1, "Year is required"),
  date_to_day: z.string().optional(),
  date_to_month: z.string().optional(),
  date_to_year: z.string().optional(),
  status: z.string().min(1, "Status is required"),
  position: z.string().optional(),
  business_name: z.string().optional(),
  business_address_street: z.string().optional(),
  business_address_street_line2: z.string().optional(),
  business_address_suburb: z.string().optional(),
  business_address_state: z.string().optional(),
  business_address_postcode: z.string().optional(),
  country: z.string().min(1, "Country is required"),
  financial_support: z.string().optional(),
}).superRefine((data, ctx) => {
  // If status is employment-related, position is required
  const employmentStatuses = ["Employed", "Self-Employed", "Work Experience/Internships", "Unpaid Employment/Volunteer"];
  if (employmentStatuses.includes(data.status) && (!data.position || data.position.trim().length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Position is required for this status",
      path: ["position"],
    });
  }
  
  // Validate date ranges: Date From must be before or equal to Date To
  if (data.date_to_day && data.date_to_month && data.date_to_year && 
      data.date_from_day && data.date_from_month && data.date_from_year) {
    const fromDate = new Date(
      parseInt(data.date_from_year),
      parseInt(data.date_from_month) - 1,
      parseInt(data.date_from_day)
    );
    const toDate = new Date(
      parseInt(data.date_to_year),
      parseInt(data.date_to_month) - 1,
      parseInt(data.date_to_day)
    );
    if (fromDate > toDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Date From must be before or equal to Date To",
        path: ["date_to_day"],
      });
    }
  }
  
  // Validate that all date parts are completed or all are empty for Date To
  const dateToParts = [data.date_to_day, data.date_to_month, data.date_to_year];
  const hasSomeDateTo = dateToParts.some(part => part && part.trim() !== "");
  const hasAllDateTo = dateToParts.every(part => part && part.trim() !== "");
  if (hasSomeDateTo && !hasAllDateTo) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "All date parts must be completed or left empty",
      path: ["date_to_day"],
    });
  }
});

function EmploymentHistoryDialog({ editingRow, onSave, onCancel }) {
  const dialogForm = useForm({
    resolver: zodResolver(employmentHistoryDialogSchema),
    defaultValues: editingRow || {
      date_from_day: "",
      date_from_month: "",
      date_from_year: "",
      date_to_day: "",
      date_to_month: "",
      date_to_year: "",
      status: "",
      position: "",
      business_name: "",
      business_address_street: "",
      business_address_street_line2: "",
      business_address_suburb: "",
      business_address_state: "",
      business_address_postcode: "",
      country: "",
      financial_support: "",
    },
  });

  const status = dialogForm.watch("status");
  const isEmploymentStatus = status === "Employed" || status === "Self-Employed" ||
    status === "Work Experience/Internships" || status === "Unpaid Employment/Volunteer";
  const isNonEmploymentStatus = status === "Student" || status === "Retired";

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
      className="space-y-4 pr-2"
    >
      <div className="mb-2">
        <p className="text-sm text-gray-600">
          Enter details of your Family Sponsor's current employment status
        </p>
      </div>

      <DateSelector
        label="Date From"
        values={{
          day: dialogForm.watch("date_from_day") || "",
          month: dialogForm.watch("date_from_month") || "",
          year: dialogForm.watch("date_from_year") || "",
        }}
        onValueChange={(type, value) => {
          const fieldName = `date_from_${type}`;
          dialogForm.setValue(fieldName, value, { shouldValidate: true });
        }}
        testIdPrefix="select-date-from"
      />
      {(dialogForm.formState.errors.date_from_day || dialogForm.formState.errors.date_from_month || dialogForm.formState.errors.date_from_year) && (
        <p className="text-sm text-red-600 mt-1">Date From is required</p>
      )}

      <DateSelector
        label="Date To (leave blank if ongoing)"
        values={{
          day: dialogForm.watch("date_to_day") || "",
          month: dialogForm.watch("date_to_month") || "",
          year: dialogForm.watch("date_to_year") || "",
        }}
        onValueChange={(type, value) => {
          const fieldName = `date_to_${type}`;
          dialogForm.setValue(fieldName, value, { shouldValidate: true });
        }}
        testIdPrefix="select-date-to"
      />
      {(dialogForm.formState.errors.date_to_day || dialogForm.formState.errors.date_to_month || dialogForm.formState.errors.date_to_year) && (
        <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.date_to_day?.message || dialogForm.formState.errors.date_to_month?.message || dialogForm.formState.errors.date_to_year?.message}</p>
      )}

      <div>
        <Label htmlFor="status">Status <span className="text-red-500">*</span></Label>
        <Select
          value={dialogForm.watch("status")}
          onValueChange={(value) => dialogForm.setValue("status", value, { shouldValidate: true })}
        >
          <SelectTrigger data-testid="select-status">
            <SelectValue placeholder="Choose Status" />
          </SelectTrigger>
          <SelectContent>
            {EMPLOYMENT_STATUS_OPTIONS.map((statusOption) => (
              <SelectItem key={statusOption} value={statusOption}>{statusOption}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.status && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.status.message}</p>
        )}
      </div>

      {/* Fields for Employed, Self-Employed, Work Experience/Internships, Unpaid Employment/Volunteer */}
      {isEmploymentStatus && (
        <>
          <div>
            <Label htmlFor="position">Position <span className="text-red-500">*</span></Label>
            <Input
              id="position"
              {...dialogForm.register("position")}
              data-testid="input-position"
            />
            {dialogForm.formState.errors.position && (
              <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.position.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="business_name">Business Name</Label>
            <Input
              id="business_name"
              {...dialogForm.register("business_name")}
              data-testid="input-business-name"
            />
          </div>

          <div>
            <Label className="mb-2 block">Business Address</Label>
            <div className="space-y-2">
              <Input
                id="business_address_street"
                {...dialogForm.register("business_address_street")}
                placeholder="Address (including Street Number and Name)"
                data-testid="input-business-address-street"
              />
              <Input
                id="business_address_street_line2"
                {...dialogForm.register("business_address_street_line2")}
                placeholder="Street Line 2"
                data-testid="input-business-address-street-line2"
              />
              <Input
                id="business_address_suburb"
                {...dialogForm.register("business_address_suburb")}
                placeholder="Suburb/Town/City"
                data-testid="input-business-address-suburb"
              />
              <Input
                id="business_address_state"
                {...dialogForm.register("business_address_state")}
                placeholder="State"
                data-testid="input-business-address-state"
              />
              <Input
                id="business_address_postcode"
                {...dialogForm.register("business_address_postcode")}
                placeholder="Postcode"
                data-testid="input-business-address-postcode"
              />
            </div>
          </div>
        </>
      )}

      <div>
        <Label htmlFor="country">Country <span className="text-red-500">*</span></Label>
        <Select
          value={dialogForm.watch("country")}
          onValueChange={(value) => dialogForm.setValue("country", value, { shouldValidate: true })}
        >
          <SelectTrigger data-testid="select-country">
            <SelectValue placeholder="Choose Country" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((country) => (
              <SelectItem key={country} value={country}>{country}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.country && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.country.message}</p>
        )}
      </div>

      {/* Fields for Student, Retired */}
      {isNonEmploymentStatus && (
        <div>
          <Label htmlFor="financial_support">Enter details of how they financially supported themselves</Label>
          <Textarea
            id="financial_support"
            {...dialogForm.register("financial_support")}
            rows={4}
            data-testid="textarea-financial-support"
          />
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
          Cancel
        </Button>
        <Button
          type="submit"
          className="bg-primary text-primary-foreground"
          data-testid="button-ok"
        >
          Ok
        </Button>
      </DialogFooter>
    </form>
  );
}

const familySponsorCircumstancesSchema = z.object({
  is_in_paid_employment: z.enum(["Yes", "No"]).optional(),
  is_financially_dependent: z.enum(["Yes", "No"]).optional(),
  employment_history: z.array(z.object({
    date_from_day: z.string().optional(),
    date_from_month: z.string().optional(),
    date_from_year: z.string().optional(),
    date_to_day: z.string().optional(),
    date_to_month: z.string().optional(),
    date_to_year: z.string().optional(),
    status: z.string().optional(),
    position: z.string().optional(),
    business_name: z.string().optional(),
    business_address_street: z.string().optional(),
    business_address_street_line2: z.string().optional(),
    business_address_suburb: z.string().optional(),
    business_address_state: z.string().optional(),
    business_address_postcode: z.string().optional(),
    country: z.string().optional(),
    financial_support: z.string().optional(),
  })).optional(),
}).superRefine((data, ctx) => {
  // If in paid employment, require at least one employment history entry
  if (data.is_in_paid_employment === "Yes" && (!data.employment_history || data.employment_history.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one employment history entry is required when sponsor is in paid employment",
      path: ["employment_history"],
    });
  }
});

export default function FamilySponsorCircumstancesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const draftSnap = useSnapshot(draftStore);
  const saveTimeoutRef = useRef(null);

  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

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

  // Load section data from familySponsor.details
  const sectionData = draftStore.getSectionData('familySponsor.details');
  
  // Get sponsor name for display
  const sponsorName = sectionData?.given_names && sectionData?.family_name
    ? `${sectionData.given_names} ${sectionData.family_name}`
    : sectionData?.given_names || sectionData?.family_name || "the sponsor";

  const form = useForm({
    resolver: zodResolver(familySponsorCircumstancesSchema),
    mode: "onChange",
    defaultValues: {
      is_in_paid_employment: sectionData?.is_in_paid_employment || "No",
      is_financially_dependent: sectionData?.is_financially_dependent || "No",
      employment_history: sectionData?.employment_history || [],
    },
  });
  const { reset, getValues } = form;
  const isDirty = form.formState.isDirty;

  // Watch form values for conditional rendering
  const isInPaidEmployment = form.watch("is_in_paid_employment");
  const employmentHistory = form.watch("employment_history") || [];

  // Watch all form values for auto-save
  const watchedValues = useWatch({ control: form.control });

  // Sync form with store data once it's loaded from the database
  useEffect(() => {
    if (!draftSnap.isLoading && sectionData && Object.keys(sectionData).length > 0 && !isDirty) {
      reset({
        is_in_paid_employment: sectionData.is_in_paid_employment || "No",
        is_financially_dependent: sectionData.is_financially_dependent || "No",
        employment_history: sectionData.employment_history || [],
      }, { keepDefaultValues: true });
    }
  }, [draftSnap.isLoading, sectionData, reset, isDirty]);

  // Auto-save form data with debounce
  useEffect(() => {
    if (!draftSnap.currentApplicationId) {
      console.warn('No application ID set for auto-save');
      return;
    }
    if (!watchedValues || Object.keys(watchedValues).length === 0) return;
    if (draftSnap.isLoading) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      const currentFormValues = getValues();
      const existingData = draftStore.getSectionData('familySponsor.details') || {};
      const mergedData = { ...existingData, ...currentFormValues };
      
      draftStore.saveSectionData('familySponsor.details', mergedData);
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [watchedValues, draftSnap.currentApplicationId, draftSnap.isLoading, getValues]);

  const onSubmit = async (data) => {
    if (!draftSnap.currentApplicationId) {
      toast({
        title: "Error",
        description: "Application ID required. Please return to the applications page and try again.",
        variant: "destructive",
      });
      return;
    }

    // Clear auto-save timeout to prevent race condition
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    setIsSaving(true);
    try {
      const existingData = draftStore.getSectionData('familySponsor.details') || {};
      const finalData = {
        ...existingData,
        ...data,
      };
      
      const result = await draftStore.saveSectionData('familySponsor.details', finalData);

      if (result.success) {
        await draftStore.markPageComplete('partner/family-sponsor/circumstances', null, 'familySponsor.details');
        const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId);
        if (next) router.push(next);
      } else {
        toast({
          title: "Error saving draft",
          description: result.error || "Failed to save draft. Please try again.",
          variant: "destructive",
        });
        setIsSaving(false);
      }
    } catch (error) {
      toast({
        title: "Error saving draft",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      setIsSaving(false);
    }
  };

  const handlePrevious = () => {
    const prev = getPreviousRoute(pathname, visaType, draftSnap.currentApplicationId);
    if (prev) router.push(prev);
  };

  const handleSave = async () => {
    // Clear auto-save timeout to prevent race condition
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    if (!draftSnap.currentApplicationId) {
      toast({
        title: "Error",
        description: "Application ID required. Please return to the applications page and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const isValid = await form.trigger();
      
      if (!isValid) {
        console.log("Validation Errors:", form.formState.errors);
        toast({
          title: "Validation error",
          description: "Please check the console for specific field errors.",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

      const existingData = draftStore.getSectionData('familySponsor.details') || {};
      const currentData = getValues();
      const mergedData = { ...existingData, ...currentData };
      
      const result = await draftStore.saveSectionData('familySponsor.details', mergedData);

      if (result.success) {
        await draftStore.markPageComplete('partner/family-sponsor/circumstances', null, 'familySponsor.details');
        toast({
          title: "Draft saved",
          description: "Progress saved successfully.",
        });
      } else {
        toast({
          title: "Error saving draft",
          description: result.error || "Failed to save draft. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Save Error:", error);
      toast({
        title: "Error saving draft",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateEmploymentHistory = (newHistory) => {
    // Clear auto-save timeout to prevent race condition
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    form.setValue("employment_history", newHistory, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    
    const existingData = draftStore.getSectionData('familySponsor.details') || {};
    const currentData = getValues();
    draftStore.saveSectionData('familySponsor.details', { 
      ...existingData,
      ...currentData,
      employment_history: newHistory 
    });
  };

  const employmentColumns = [
    {
      key: "date_from", label: "Date From", format: (row) => {
        if (row.date_from_day && row.date_from_month && row.date_from_year) {
          const monthIdx = parseInt(row.date_from_month) - 1;
          return `${monthNames[monthIdx]} ${row.date_from_day}, ${row.date_from_year}`;
        }
        return "";
      }
    },
    {
      key: "date_to", label: "Date To", format: (row) => {
        if (row.date_to_day && row.date_to_month && row.date_to_year) {
          const monthIdx = parseInt(row.date_to_month) - 1;
          return `${monthNames[monthIdx]} ${row.date_to_day}, ${row.date_to_year}`;
        }
        return "Ongoing";
      }
    },
    { key: "status", label: "Status" },
    { key: "position", label: "Position" },
    { key: "country", label: "Country" },
  ];

  return (
    <>
      <Card className="rounded-2xl shadow-md bg-white">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Circumstances</CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            In this section, provide details about your sponsor's circumstances.
          </p>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
              }
            }}
            className="space-y-8"
          >
            <div>
              <h3 className="text-base font-medium text-gray-900 mb-4">
                Financial Details for {sponsorName}
              </h3>

              {/* Question 1: Is your Sponsor currently in paid employment? */}
              <div className="mb-6">
                <Field
                  type="radio"
                  name="is_in_paid_employment"
                  control={form.control}
                  label="Is your Sponsor currently in paid employment?"
                  options={[
                    { value: "Yes", label: "Yes" },
                    { value: "No", label: "No" },
                  ]}
                />

                {isInPaidEmployment === "Yes" && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 mb-4">
                      Enter details of your Family Sponsor's current employment status
                    </p>
                    <RepeaterTable
                      data={employmentHistory}
                      columns={employmentColumns}
                      onAdd={(row) => updateEmploymentHistory([...employmentHistory, row])}
                      onEdit={(index, row) => {
                        const updated = [...employmentHistory];
                        updated[index] = row;
                        updateEmploymentHistory(updated);
                      }}
                      onDelete={(index) => {
                        const updated = employmentHistory.filter((_, i) => i !== index);
                        updateEmploymentHistory(updated);
                      }}
                      DialogComponent={EmploymentHistoryDialog}
                      addButtonText="Add"
                      testIdPrefix="employment-history"
                      dialogTitle="Employment History"
                    />
                    {form.formState.errors.employment_history && (
                      <p className="text-sm text-red-600 mt-1">{form.formState.errors.employment_history.message}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Question 2: Is your Sponsor normally financially dependent on their partner's income? */}
              <div>
                <Field
                  type="radio"
                  name="is_financially_dependent"
                  control={form.control}
                  label="Is your Sponsor normally financially dependent on their partner's income?"
                  options={[
                    { value: "Yes", label: "Yes" },
                    { value: "No", label: "No" },
                  ]}
                />
              </div>
            </div>

            <FormNavigation
              onPrev={handlePrevious}
              onSave={handleSave}
              onNext={form.handleSubmit(onSubmit)}
              disabledNext={!form.formState.isValid}
              loading={isSaving}
            />
          </form>
        </CardContent>
      </Card>
    </>
  );
}

