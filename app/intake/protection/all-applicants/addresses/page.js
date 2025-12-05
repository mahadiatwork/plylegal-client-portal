"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { useToast } from "@/hooks/use-toast";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StickyNav } from "@/components/StickyNav";
import { RepeaterTable } from "@/components/RepeaterTable";
import { DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

// Country list for dropdowns
const COUNTRY_OPTIONS = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia",
  "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium",
  "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei",
  "Bulgaria", "Burkina Faso", "Burundi", "Cambodia", "Cameroon", "Canada", "Cape Verde",
  "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo",
  "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica",
  "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea",
  "Estonia", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany",
  "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti",
  "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel",
  "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan",
  "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania",
  "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands",
  "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro",
  "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand",
  "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan",
  "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland",
  "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia",
  "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Saudi Arabia", "Senegal", "Serbia",
  "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia",
  "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname",
  "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste",
  "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda",
  "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan",
  "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

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

const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 100 }, (_, i) => (currentYear - i).toString());

// Address Dialog Schema
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

function AddressDialog({ editingRow, onSave, onCancel }) {
  const row = editingRow;
  
  const dialogForm = useForm({
    resolver: zodResolver(addressDialogSchema),
    defaultValues: row || {
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
      className="space-y-4"
    >
      <p className="text-sm text-gray-600 mb-4">
        Choose an address already entered, or enter a new address
      </p>

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
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              {COUNTRY_OPTIONS.map((country) => (
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
        <p className="text-sm text-gray-600">Enter when you lived at this address</p>
        
        <div>
          <Label className="mb-2 block">
            Date From <span className="text-red-500">*</span>
          </Label>
          <div className="grid grid-cols-3 gap-2">
            <Select
              value={dialogForm.watch("date_from_day")}
              onValueChange={(value) => dialogForm.setValue("date_from_day", value, { shouldValidate: true })}
            >
              <SelectTrigger data-testid="select-date-from-day">
                <SelectValue placeholder="Day" />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                {days.map((day) => (
                  <SelectItem key={day} value={day}>{day}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={dialogForm.watch("date_from_month")}
              onValueChange={(value) => dialogForm.setValue("date_from_month", value, { shouldValidate: true })}
            >
              <SelectTrigger data-testid="select-date-from-month">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                {months.map((month, idx) => (
                  <SelectItem key={month} value={(idx + 1).toString()}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={dialogForm.watch("date_from_year")}
              onValueChange={(value) => dialogForm.setValue("date_from_year", value, { shouldValidate: true })}
            >
              <SelectTrigger data-testid="select-date-from-year">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                {years.map((year) => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {dialogForm.formState.errors.date_from_day && (
            <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.date_from_day.message}</p>
          )}
        </div>

        <div>
          <Label className="mb-2 block">Date To (leave blank if ongoing)</Label>
          <div className="grid grid-cols-3 gap-2">
            <Select
              value={dialogForm.watch("date_to_day")}
              onValueChange={(value) => dialogForm.setValue("date_to_day", value, { shouldValidate: true })}
            >
              <SelectTrigger data-testid="select-date-to-day">
                <SelectValue placeholder="Day" />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                {days.map((day) => (
                  <SelectItem key={day} value={day}>{day}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={dialogForm.watch("date_to_month")}
              onValueChange={(value) => dialogForm.setValue("date_to_month", value, { shouldValidate: true })}
            >
              <SelectTrigger data-testid="select-date-to-month">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                {months.map((month, idx) => (
                  <SelectItem key={month} value={(idx + 1).toString()}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={dialogForm.watch("date_to_year")}
              onValueChange={(value) => dialogForm.setValue("date_to_year", value, { shouldValidate: true })}
            >
              <SelectTrigger data-testid="select-date-to-year">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                {years.map((year) => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {dialogForm.formState.errors.date_to_day && (
            <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.date_to_day.message}</p>
          )}
        </div>
      </div>

      {/* Legal Status */}
      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-base font-semibold text-gray-900">Legal Status</h3>
        <p className="text-sm text-gray-600">Enter your current legal status in this country</p>
        
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
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
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

// Form schema
const formSchema = z.object({
  all_same_address: z.enum(["yes", "no"]).optional(),
  main_applicant_addresses: z.array(z.object({
    address_line1: z.string(),
    address_line2: z.string().optional(),
    suburb: z.string(),
    state: z.string().optional(),
    postcode: z.string(),
    country: z.string(),
    date_from_day: z.string(),
    date_from_month: z.string(),
    date_from_year: z.string(),
    date_to_day: z.string().optional(),
    date_to_month: z.string().optional(),
    date_to_year: z.string().optional(),
    legal_status: z.string(),
  })).optional(),
});

export default function Page() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const visaType = getVisaTypeFromPath(pathname);
  const { toast } = useToast();
  const draftSnap = useSnapshot(draftStore);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const appIdFromUrl = searchParams.get('applicationId');
    if (appIdFromUrl && appIdFromUrl !== draftSnap.currentApplicationId) {
      draftStore.setApplicationId(appIdFromUrl);
      draftStore.loadDraft(appIdFromUrl);
    }
  }, [searchParams, draftSnap.currentApplicationId]);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      all_same_address: "",
      main_applicant_addresses: [],
    },
  });

  const allSameAddress = form.watch("all_same_address");
  const mainApplicantAddresses = form.watch("main_applicant_addresses") || [];

  // Get main applicant name from draft store
  const mainApplicantDetails = draftSnap.draft?.protection_details || {};
  const mainApplicantName = mainApplicantDetails.family_name && mainApplicantDetails.given_names
    ? `${mainApplicantDetails.given_names} ${mainApplicantDetails.family_name}`
    : "the Main Applicant";

  useEffect(() => {
    const savedData = draftSnap.draft?.protection_addresses || {};
    if (Object.keys(savedData).length > 0) {
      form.reset({
        all_same_address: savedData.all_same_address || "",
        main_applicant_addresses: savedData.main_applicant_addresses || [],
      });
    }
  }, [draftSnap.draft?.protection_addresses]);

  const updateMainApplicantAddresses = (newAddresses) => {
    form.setValue("main_applicant_addresses", newAddresses);
  };

  const onSubmit = async (data) => {
    await draftStore.saveSectionData("protection_addresses", data);
    await draftStore.markPageComplete(`${visaType}/all-applicants/addresses`);
    const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId);
    if (next) router.push(next);
  };

  const handlePrevious = () => {
    const prev = getPreviousRoute(pathname, visaType, draftSnap.currentApplicationId);
    if (prev) router.push(prev);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const isValid = await form.trigger();
      if (!isValid) {
        toast({
          title: "Validation Error",
          description: "Please fix the errors in the form before saving",
          variant: "destructive",
        });
        return;
      }
      const formData = form.getValues();
      console.log("Saving protection_addresses data:", formData);
      const result = await draftStore.saveSectionData("protection_addresses", formData);
      
      if (result.success) {
        toast({
          title: "Draft saved",
          description: "Your changes have been saved successfully",
        });
      } else {
        console.error("Save failed:", result.error);
        toast({
          title: "Error",
          description: result.error || "Failed to save changes",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error in handleSave:", error);
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Table column definitions
  const addressColumns = [
    {
      key: "date_from",
      label: "Date From",
      format: (row) => {
        if (!row.date_from_day || !row.date_from_month || !row.date_from_year) return "-";
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${row.date_from_day} ${months[parseInt(row.date_from_month) - 1]} ${row.date_from_year}`;
      }
    },
    {
      key: "date_to",
      label: "Date To",
      format: (row) => {
        if (!row.date_to_day || !row.date_to_month || !row.date_to_year) return "Ongoing";
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${row.date_to_day} ${months[parseInt(row.date_to_month) - 1]} ${row.date_to_year}`;
      }
    },
    {
      key: "address",
      label: "Address",
      format: (row) => {
        const parts = [
          row.address_line1,
          row.address_line2,
          row.suburb,
          row.state,
          row.postcode,
          row.country
        ].filter(Boolean);
        return parts.join(", ");
      }
    },
    { key: "legal_status", label: "Legal Status in this Country" },
  ];

  return (
    <div className="min-h-screen bg-[#E0E7FF]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 md:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Addresses</h1>
            <p className="text-muted-foreground mt-2">
              In this section you are to provide the residential history of the following included Applicants:
            </p>
          </div>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-8 mb-4">
              {/* Top Yes/No Question */}
              <div>
                <Label className="text-base font-medium mb-3 block">
                  Does every applicant who is to be included in this application currently live at the same residential address?
                </Label>
                <RadioGroup
                  value={allSameAddress}
                  onValueChange={(value) => form.setValue("all_same_address", value)}
                  className="flex gap-4"
                  data-testid="radio-same-address"
                >
                  <div className="flex items-center">
                    <RadioGroupItem value="yes" id="same-address-yes" />
                    <Label htmlFor="same-address-yes" className="ml-2 cursor-pointer font-normal">
                      Yes
                    </Label>
                  </div>
                  <div className="flex items-center">
                    <RadioGroupItem value="no" id="same-address-no" />
                    <Label htmlFor="same-address-no" className="ml-2 cursor-pointer font-normal">
                      No
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Address History Table - Only show when Yes */}
              {allSameAddress === "yes" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Addresses for {mainApplicantName}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Enter details of every address this person has lived at during the previous 10 years (include current address)
                  </p>
                  <RepeaterTable
                    data={mainApplicantAddresses}
                    columns={addressColumns}
                    onAdd={(newRow) => updateMainApplicantAddresses([...mainApplicantAddresses, newRow])}
                    onEdit={(index, updatedRow) => {
                      const updated = [...mainApplicantAddresses];
                      updated[index] = updatedRow;
                      updateMainApplicantAddresses(updated);
                    }}
                    onDelete={(index) => {
                      const updated = mainApplicantAddresses.filter((_, i) => i !== index);
                      updateMainApplicantAddresses(updated);
                    }}
                    DialogComponent={AddressDialog}
                    addButtonText="Add"
                    emptyMessage="No addresses added"
                    dialogTitle="Address"
                    testIdPrefix="address"
                  />
                </div>
              )}
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center justify-between pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                className="min-h-9"
                data-testid="button-previous"
              >
                ← Previous
              </Button>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="min-h-9"
                  data-testid="button-save"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Draft"
                  )}
                </Button>
                <Button
                  type="submit"
                  className="min-h-9 bg-[#285646] hover:bg-[#1e4336] text-white"
                  data-testid="button-next"
                >
                  Next →
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Mobile Navigation */}
      <StickyNav
        onPrev={handlePrevious}
        onNext={form.handleSubmit(onSubmit)}
        onSave={handleSave}
        loading={isSaving}
        previousTestId="button-previous-mobile"
        nextTestId="button-next-mobile"
        saveTestId="button-save-mobile"
      />
    </div>
  );
}
