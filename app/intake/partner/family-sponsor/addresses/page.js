"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormNavigation } from "@/components/FormNavigation";
import { RepeaterTable } from "@/components/RepeaterTable";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { COUNTRIES } from "@/reuseable/countries";
import { monthNames } from "@/reuseable/months";
import { DateSelector } from "@/components/DateSelecters";

const LEGAL_STATUS_OPTIONS = [
  "Citizen",
  "Permanent Resident",
  "Temporary Resident",
  "Student",
  "Visitor/Tourist",
  "Work Visa",
  "Refugee",
  "Illegal Resident",
  "Asylum Applicant",
  "No Legal Status",
  "Other"
];

const addressDialogSchema = z.object({
  address_line1: z.string().min(1, "Address is required"),
  address_line2: z.string().optional(),
  suburb: z.string().min(1, "Suburb/Town/City is required"),
  state: z.string().optional(),
  postcode: z.string().min(1, "Postcode is required"),
  country: z.string().min(1, "Country is required"),
  date_from_day: z.string().min(1, "Day is required"),
  date_from_month: z.string().min(1, "Month is required"),
  date_from_year: z.string().min(1, "Year is required"),
  date_to_day: z.string().optional(),
  date_to_month: z.string().optional(),
  date_to_year: z.string().optional(),
  legal_status: z.string().min(1, "Legal Status is required"),
}).superRefine((data, ctx) => {
  // If any part of Date To is filled, all parts must be filled
  const hasDateToDay = data.date_to_day && data.date_to_day.trim() !== "";
  const hasDateToMonth = data.date_to_month && data.date_to_month.trim() !== "";
  const hasDateToYear = data.date_to_year && data.date_to_year.trim() !== "";
  
  if (hasDateToDay || hasDateToMonth || hasDateToYear) {
    if (!hasDateToDay || !hasDateToMonth || !hasDateToYear) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "All date parts must be completed or left empty",
        path: ["date_to_day"],
      });
    } else {
      // Validate that Date To is not earlier than Date From
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
      
      if (toDate < fromDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Date To must not be earlier than Date From",
          path: ["date_to_day"],
        });
      }
    }
  }
});

function AddressDialog({ editingRow, onSave, onCancel }) {
  const dialogForm = useForm({
    resolver: zodResolver(addressDialogSchema),
    defaultValues: editingRow || {
      address_line1: "",
      address_line2: "",
      suburb: "",
      state: "",
      postcode: "",
      country: "",
      date_from_day: "",
      date_from_month: "",
      date_from_year: "",
      date_to_day: "",
      date_to_month: "",
      date_to_year: "",
      legal_status: "",
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
      className="space-y-4 pr-2"
    >
      <div className="mb-2">
        <p className="text-sm text-gray-600">
          Enter details of your Family Sponsor's current Residential Address and every Residential Address that they have resided in for the previous 10 years. Do NOT list a PO Box.
        </p>
      </div>

      {/* Address Block */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="address_line1">
            Address (including Street Number and Name) <span className="text-red-500">*</span>
          </Label>
          <Input
            id="address_line1"
            {...dialogForm.register("address_line1")}
            data-testid="input-address-line1"
          />
          {dialogForm.formState.errors.address_line1 && (
            <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.address_line1.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="address_line2">Address Line 2</Label>
          <Input
            id="address_line2"
            {...dialogForm.register("address_line2")}
            data-testid="input-address-line2"
          />
        </div>

        <div>
          <Label htmlFor="suburb">
            Suburb/Town/City <span className="text-red-500">*</span>
          </Label>
          <Input
            id="suburb"
            {...dialogForm.register("suburb")}
            data-testid="input-suburb"
          />
          {dialogForm.formState.errors.suburb && (
            <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.suburb.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="state">State</Label>
          <Input
            id="state"
            {...dialogForm.register("state")}
            data-testid="input-state"
          />
        </div>

        <div>
          <Label htmlFor="postcode">
            Postcode <span className="text-red-500">*</span>
          </Label>
          <Input
            id="postcode"
            {...dialogForm.register("postcode")}
            data-testid="input-postcode"
          />
          {dialogForm.formState.errors.postcode && (
            <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.postcode.message}</p>
          )}
        </div>

        <div>
          <Label className="mb-2 block">
            Choose Country <span className="text-red-500">*</span>
          </Label>
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
      </div>

      {/* When (Date Range) */}
      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-base font-semibold text-gray-900">When</h3>
        <p className="text-sm text-gray-600">Enter when the Sponsor lived at this address</p>
        
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
          required
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
        {dialogForm.formState.errors.date_to_day && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.date_to_day.message}</p>
        )}
      </div>

      {/* Legal Status */}
      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-base font-semibold text-gray-900">Legal Status</h3>
        <p className="text-sm text-gray-600">Enter the Sponsor's legal status in this country</p>
        
        <div>
          <Label className="mb-2 block">
            Legal Status <span className="text-red-500">*</span>
          </Label>
          <Select
            value={dialogForm.watch("legal_status")}
            onValueChange={(value) => dialogForm.setValue("legal_status", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-legal-status">
              <SelectValue placeholder="Choose Legal Status" />
            </SelectTrigger>
            <SelectContent>
              {LEGAL_STATUS_OPTIONS.map((status) => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {dialogForm.formState.errors.legal_status && (
            <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.legal_status.message}</p>
          )}
        </div>
      </div>

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

const familySponsorAddressesSchema = z.object({
  addresses: z.array(z.object({
    address_line1: z.string(),
    address_line2: z.string().optional(),
    suburb: z.string(),
    state: z.string().optional(),
    postcode: z.string(),
    country: z.string(),
    date_from_day: z.string().optional(),
    date_from_month: z.string().optional(),
    date_from_year: z.string().optional(),
    date_to_day: z.string().optional(),
    date_to_month: z.string().optional(),
    date_to_year: z.string().optional(),
    legal_status: z.string(),
  })).optional(),
});

export default function FamilySponsorAddressesPage() {
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
    resolver: zodResolver(familySponsorAddressesSchema),
    mode: "onChange",
    defaultValues: {
      addresses: sectionData?.addresses || [],
    },
  });
  const { reset, getValues } = form;
  const isDirty = form.formState.isDirty;

  // Watch form values
  const addresses = form.watch("addresses") || [];

  // Watch all form values for auto-save
  const watchedValues = useWatch({ control: form.control });

  // Sync form with store data once it's loaded from the database
  useEffect(() => {
    if (!draftSnap.isLoading && sectionData && Object.keys(sectionData).length > 0 && !isDirty) {
      reset({
        addresses: sectionData.addresses || [],
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
        await draftStore.markPageComplete('partner/family-sponsor/addresses', null, 'familySponsor.details');
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
        await draftStore.markPageComplete('partner/family-sponsor/addresses', null, 'familySponsor.details');
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

  const updateAddresses = (newAddresses) => {
    // Clear auto-save timeout to prevent race condition
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    form.setValue("addresses", newAddresses, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    
    const existingData = draftStore.getSectionData('familySponsor.details') || {};
    const currentData = getValues();
    draftStore.saveSectionData('familySponsor.details', { 
      ...existingData,
      ...currentData,
      addresses: newAddresses 
    });
  };

  const addressColumns = [
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
    {
      key: "address", label: "Address", format: (row) => {
        const parts = [];
        if (row.address_line1) parts.push(row.address_line1);
        if (row.address_line2) parts.push(row.address_line2);
        if (row.suburb) parts.push(row.suburb);
        if (row.state) parts.push(row.state);
        if (row.postcode) parts.push(row.postcode);
        if (row.country) parts.push(row.country);
        return parts.join(", ");
      }
    },
    { key: "legal_status", label: "Legal Status in this Country" },
  ];

  return (
    <>
      <Card className="rounded-2xl shadow-md bg-white">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Addresses</CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            In this section, provide details about your sponsor's residential address history.
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
              <h3 className="text-base font-medium text-gray-900 mb-2">
                Addresses for {sponsorName}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Enter details of your Family Sponsor's current Residential Address and every Residential Address that they have resided in for the previous 10 years. Do NOT list a PO Box.
              </p>
              <RepeaterTable
                data={addresses}
                columns={addressColumns}
                onAdd={(row) => updateAddresses([...addresses, row])}
                onEdit={(index, row) => {
                  const updated = [...addresses];
                  updated[index] = row;
                  updateAddresses(updated);
                }}
                onDelete={(index) => {
                  const updated = addresses.filter((_, i) => i !== index);
                  updateAddresses(updated);
                }}
                DialogComponent={AddressDialog}
                addButtonText="Add"
                testIdPrefix="address"
                dialogTitle="Residential Address"
              />
              {form.formState.errors.addresses && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.addresses.message}</p>
              )}
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

