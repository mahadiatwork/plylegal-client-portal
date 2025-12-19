"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { z } from "zod";

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 100 }, (_, i) => (currentYear - i).toString());
const futureYears = Array.from({ length: 20 }, (_, i) => (currentYear + i + 1).toString());

// Future Address Dialog Schema
const futureAddressDialogSchema = z.object({
  date_from_day: z.string().min(1, "Day is required"),
  date_from_month: z.string().min(1, "Month is required"),
  date_from_year: z.string().min(1, "Year is required"),
  date_to_day: z.string().optional(),
  date_to_month: z.string().optional(),
  date_to_year: z.string().optional(),
  selected_address: z.string().optional(),
  // New address fields
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postcode: z.string().optional(),
  // Phone numbers
  office_hours_phone_country_code: z.string().optional(),
  office_hours_phone_area_code: z.string().optional(),
  office_hours_phone_number: z.string().optional(),
  mobile_phone_country_code: z.string().optional(),
  mobile_phone_number: z.string().optional(),
}).superRefine((data, ctx) => {
  // If selected_address is not provided, new address fields are required
  if (!data.selected_address || data.selected_address === "none") {
    if (!data.address_line1 || data.address_line1.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Address is required when entering a new address",
        path: ["address_line1"],
      });
    }
    if (!data.city || data.city.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "City is required when entering a new address",
        path: ["city"],
      });
    }
    if (!data.postcode || data.postcode.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Postcode is required when entering a new address",
        path: ["postcode"],
      });
    }
  }
  
  // If any part of Date To is filled, all parts must be filled
  const hasDateToDay = data.date_to_day && data.date_to_day.trim() !== "";
  const hasDateToMonth = data.date_to_month && data.date_to_month.trim() !== "";
  const hasDateToYear = data.date_to_year && data.date_to_year.trim() !== "";
  
  if (hasDateToDay || hasDateToMonth || hasDateToYear) {
    if (!hasDateToDay || !hasDateToMonth || !hasDateToYear) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "All date fields (Day, Month, Year) must be filled for Date To",
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

function FutureAddressDialog({ editingRow, onSave, onCancel }) {
  const row = editingRow;
  const draftSnap = useSnapshot(draftStore);
  
  // Get existing addresses from addresses section
  const existingAddresses = draftSnap.draft?.partner_addresses?.address_history || [];
  
  // Format addresses for dropdown
  const addressOptions = existingAddresses.map((addr, idx) => {
    const addressStr = `${addr.address1 || ""}${addr.address2 ? `, ${addr.address2}` : ""}, ${addr.suburb || ""}, ${addr.state || ""} ${addr.postcode || ""}, ${addr.country || ""}`.trim();
    return { value: `address_${idx}`, label: addressStr || `Address ${idx + 1}`, address: addr };
  });
  
  const dialogForm = useForm({
    resolver: zodResolver(futureAddressDialogSchema),
    defaultValues: row || {
      date_from_day: "",
      date_from_month: "",
      date_from_year: "",
      date_to_day: "",
      date_to_month: "",
      date_to_year: "",
      selected_address: "none",
      address_line1: "",
      address_line2: "",
      city: "",
      state: "",
      postcode: "",
      office_hours_phone_country_code: "",
      office_hours_phone_area_code: "",
      office_hours_phone_number: "",
      mobile_phone_country_code: "",
      mobile_phone_number: "",
    },
  });

  const selectedAddress = dialogForm.watch("selected_address");
  const isNewAddress = !selectedAddress || selectedAddress === "none";

  // Clear new address fields when an existing address is selected
  useEffect(() => {
    if (selectedAddress && selectedAddress !== "none") {
      dialogForm.setValue("address_line1", "");
      dialogForm.setValue("address_line2", "");
      dialogForm.setValue("city", "");
      dialogForm.setValue("state", "");
      dialogForm.setValue("postcode", "");
    }
  }, [selectedAddress]);

  // Get main applicant name from draft store
  const mainApplicantDetails = draftStore.getSectionData('mainApplicant.details') || {};
  const mainApplicantName = mainApplicantDetails.family_name && mainApplicantDetails.given_names
    ? `${mainApplicantDetails.given_names} ${mainApplicantDetails.family_name}`
    : "the Main Applicant (name missing)";

  const handleFormSubmit = (data) => {
    // Format the address string for display
    let addressDisplay = "";
    if (data.selected_address && data.selected_address !== "none") {
      const addressIndex = parseInt(data.selected_address.replace("address_", ""));
      const selectedAddr = existingAddresses[addressIndex];
      if (selectedAddr) {
        addressDisplay = `${selectedAddr.address1 || ""}${selectedAddr.address2 ? `, ${selectedAddr.address2}` : ""}, ${selectedAddr.suburb || ""}, ${selectedAddr.state || ""} ${selectedAddr.postcode || ""}, ${selectedAddr.country || ""}`.trim();
      }
    } else if (data.address_line1) {
      addressDisplay = `${data.address_line1 || ""}${data.address_line2 ? `, ${data.address_line2}` : ""}, ${data.city || ""}, ${data.state || ""} ${data.postcode || ""}`.trim();
    }
    
    onSave({
      ...data,
      address_display: addressDisplay,
    });
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
      <p className="text-sm text-gray-600 mb-4">
        Enter details of all known addresses/places that {mainApplicantName} will stay during their time in Australia:
      </p>

      {/* Date From */}
      <div>
        <Label className="mb-2 block">
          Date From <span className="text-red-500">*</span>
        </Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("date_from_day")}
            onValueChange={(value) => dialogForm.setValue("date_from_day", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-from-day">
              <SelectValue placeholder="Choose Day" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              {DAYS.map((day) => (
                <SelectItem key={day} value={day}>{day}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_from_month")}
            onValueChange={(value) => dialogForm.setValue("date_from_month", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-from-month">
              <SelectValue placeholder="Choose Month" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              {MONTHS.map((month, idx) => (
                <SelectItem key={month} value={(idx + 1).toString()}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_from_year")}
            onValueChange={(value) => dialogForm.setValue("date_from_year", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-from-year">
              <SelectValue placeholder="Choose Year" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              {[...years, ...futureYears].map((year) => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {dialogForm.formState.errors.date_from_day && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.date_from_day.message}</p>
        )}
      </div>
      
      {/* Date To */}
      <div>
        <Label className="mb-2 block">
          Date To (leave blank if ongoing)
        </Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("date_to_day") || "none"}
            onValueChange={(value) => dialogForm.setValue("date_to_day", value === "none" ? "" : value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-to-day">
              <SelectValue placeholder="Choose Day" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              <SelectItem value="none">None</SelectItem>
              {DAYS.map((day) => (
                <SelectItem key={day} value={day}>{day}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_to_month") || "none"}
            onValueChange={(value) => dialogForm.setValue("date_to_month", value === "none" ? "" : value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-to-month">
              <SelectValue placeholder="Choose Month" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              <SelectItem value="none">None</SelectItem>
              {MONTHS.map((month, idx) => (
                <SelectItem key={month} value={(idx + 1).toString()}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_to_year") || "none"}
            onValueChange={(value) => dialogForm.setValue("date_to_year", value === "none" ? "" : value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-to-year">
              <SelectValue placeholder="Choose Year" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              <SelectItem value="none">None</SelectItem>
              {[...years, ...futureYears].map((year) => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {dialogForm.formState.errors.date_to_day && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.date_to_day.message}</p>
        )}
      </div>
      
      {/* Choose Address or Enter New */}
      <div className="space-y-4 pt-4 border-t">
        <Label className="mb-2 block">
          Choose an address already entered, or enter a new address
        </Label>
        <Select
          value={dialogForm.watch("selected_address")}
          onValueChange={(value) => dialogForm.setValue("selected_address", value, { shouldValidate: true })}
        >
          <SelectTrigger data-testid="select-address">
            <SelectValue placeholder="Choose Address" />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
            <SelectItem value="none">Enter New Address</SelectItem>
            {addressOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <div className="flex-1 border-t"></div>
          <span className="text-sm text-gray-500">Or</span>
          <div className="flex-1 border-t"></div>
        </div>

        {/* New Address Fields */}
        {isNewAddress && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="address_line1" className="mb-2 block">
                Address (including Street Number and Name)
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
              <Label htmlFor="address_line2" className="mb-2 block">
                Street Line 2
              </Label>
              <Input
                id="address_line2"
                {...dialogForm.register("address_line2")}
                data-testid="input-address-line2"
              />
            </div>

            <div>
              <Label htmlFor="city" className="mb-2 block">
                City
              </Label>
              <Input
                id="city"
                {...dialogForm.register("city")}
                data-testid="input-city"
              />
              {dialogForm.formState.errors.city && (
                <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.city.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="state" className="mb-2 block">
                State
              </Label>
              <Input
                id="state"
                {...dialogForm.register("state")}
                data-testid="input-state"
              />
            </div>

            <div>
              <Label htmlFor="postcode" className="mb-2 block">
                Postcode
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
          </div>
        )}
      </div>

      {/* Phone Numbers */}
      <div className="space-y-4 pt-4 border-t">
        <div>
          <Label className="mb-2 block">Office Hours Phone Number</Label>
          <div className="grid grid-cols-3 gap-2">
            <Input
              placeholder="Country Code"
              {...dialogForm.register("office_hours_phone_country_code")}
              data-testid="input-office-country-code"
            />
            <Input
              placeholder="Area Code"
              {...dialogForm.register("office_hours_phone_area_code")}
              data-testid="input-office-area-code"
            />
            <Input
              placeholder="Number"
              {...dialogForm.register("office_hours_phone_number")}
              data-testid="input-office-number"
            />
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Mobile/Cell Phone Number</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Country Code"
              {...dialogForm.register("mobile_phone_country_code")}
              data-testid="input-mobile-country-code"
            />
            <Input
              placeholder="Number"
              {...dialogForm.register("mobile_phone_number")}
              data-testid="input-mobile-number"
            />
          </div>
        </div>
      </div>
    
      <DialogFooter className="gap-2 sm:gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          data-testid="button-cancel"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="bg-[#285646] hover:bg-[#1e4336] text-white"
          data-testid="button-ok"
        >
          Ok
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function FutureAddressesPage() {
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
    const prev = getPreviousRoute(pathname, visaType, draftSnap.currentApplicationId);
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
    const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId);
    if (next) router.push(next);
  };

  const futureAddressColumns = [
    { key: "date_from_year", label: "From" },
    { key: "date_to_year", label: "To" },
    { key: "address_display", label: "Address" },
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
                    data={futureAddresses}
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
                    DialogComponent={FutureAddressDialog}
                    addButtonText="Add Future Address"
                    emptyMessage="No future addresses added"
                    dialogTitle="Future Address"
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
