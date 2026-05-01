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
// StickyNav import removed
import { RepeaterTable } from "@/components/RepeaterTable";
import { DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { CountryCodeSelect } from "@/components/CountryCodeSelect";
import { FormNavigation } from "@/components/FormNavigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";
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
const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
const months = [
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
  const existingAddresses = draftSnap.draft?.protection_addresses?.main_applicant_addresses || [];

  // Format addresses for dropdown
  const addressOptions = existingAddresses.map((addr, idx) => {
    const addressStr = `${addr.address_line1 || ""}${addr.address_line2 ? `, ${addr.address_line2}` : ""}, ${addr.suburb || ""}, ${addr.state || ""} ${addr.postcode || ""}, ${addr.country || ""}`.trim();
    return { value: `address_${idx}`, label: addressStr, address: addr };
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
  const mainApplicantDetails = draftSnap.draft?.protection_details || {};
  const mainApplicantName = mainApplicantDetails.family_name && mainApplicantDetails.given_names
    ? `${mainApplicantDetails.given_names} ${mainApplicantDetails.family_name}`
    : "the Main Applicant";
  const handleFormSubmit = (data) => {
    // Format the address string for display
    let addressDisplay = "";
    if (data.selected_address && data.selected_address !== "none") {
      const addressIndex = parseInt(data.selected_address.replace("address_", ""));
      const selectedAddr = existingAddresses[addressIndex];
      if (selectedAddr) {
        addressDisplay = `${selectedAddr.address_line1 || ""}${selectedAddr.address_line2 ? `, ${selectedAddr.address_line2}` : ""}, ${selectedAddr.suburb || ""}, ${selectedAddr.state || ""} ${selectedAddr.postcode || ""}, ${selectedAddr.country || ""}`.trim();
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
              {days.map((day) => (
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
              {months.map((month, idx) => (
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
              {days.map((day) => (
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
              {months.map((month, idx) => (
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
      <br />
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
            <CountryCodeSelect
              value={dialogForm.watch("office_hours_phone_country_code")}
              onChange={(val) => dialogForm.setValue("office_hours_phone_country_code", val)}
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
            <CountryCodeSelect
              value={dialogForm.watch("mobile_phone_country_code")}
              onChange={(val) => dialogForm.setValue("mobile_phone_country_code", val)}
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
// Form schema
const formSchema = z.object({
  knows_future_address: z.enum(["yes", "no"]).optional(),
  main_applicant_future_addresses: z.array(z.object({
    date_from_day: z.string(),
    date_from_month: z.string(),
    date_from_year: z.string(),
    date_to_day: z.string().optional(),
    date_to_month: z.string().optional(),
    date_to_year: z.string().optional(),
    address_display: z.string(),
    selected_address: z.string().optional(),
    address_line1: z.string().optional(),
    address_line2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postcode: z.string().optional(),
    office_hours_phone_country_code: z.string().optional(),
    office_hours_phone_area_code: z.string().optional(),
    office_hours_phone_number: z.string().optional(),
    mobile_phone_country_code: z.string().optional(),
    mobile_phone_number: z.string().optional(),
  })).optional(),
});
export default function Page() {
  const router = useRouter();
  const { startNavigation } = useNavigationLoading();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const visaType = getVisaTypeFromPath(pathname);
  const { toast } = useToast();
  const draftSnap = useSnapshot(draftStore);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      knows_future_address: "no",
      main_applicant_future_addresses: [],
    },
  });
  const knowsFutureAddress = form.watch("knows_future_address");
  const mainApplicantFutureAddresses = form.watch("main_applicant_future_addresses") || [];
  // Get main applicant name from draft store
  const mainApplicantDetails = draftSnap.draft?.protection_details || {};
  const mainApplicantName = mainApplicantDetails.family_name && mainApplicantDetails.given_names
    ? `${mainApplicantDetails.given_names} ${mainApplicantDetails.family_name}`
    : "the Main Applicant";
  useEffect(() => {
    const savedData = draftSnap.draft?.protection_future_addresses || {};
    if (Object.keys(savedData).length > 0) {
      form.reset({
        knows_future_address: savedData.knows_future_address || "",
        main_applicant_future_addresses: savedData.main_applicant_future_addresses || [],
      });
    }
  }, [draftSnap.draft?.protection_future_addresses]);
  // Clear future addresses data when "No" is selected
  useEffect(() => {
    if (knowsFutureAddress === "no") {
      form.setValue("main_applicant_future_addresses", []);
    }
  }, [knowsFutureAddress]);
  const updateMainApplicantFutureAddresses = (newAddresses) => {
    form.setValue("main_applicant_future_addresses", newAddresses);
  };
  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      await draftStore.saveSectionData("protection_future_addresses", data);
      await draftStore.markPageComplete(`${visaType}/all-applicants/future-addresses`, null, "protection_future_addresses");
      const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId);
      startNavigation(next);
      if (next) router.push(next);
    } catch (error) {
      console.error("Error submitting:", error);
      toast({ title: "Error", description: "Failed to submit", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  const handlePrevious = () => {
    const prev = getPreviousRoute(pathname, visaType, draftSnap.currentApplicationId);
    startNavigation(prev);
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
      console.log("Saving protection_future_addresses data:", formData);
      const result = await draftStore.saveSectionData("protection_future_addresses", formData);

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
  const futureAddressColumns = [
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
      label: "Date To (leave blank if ongoing)",
      format: (row) => {
        if (!row.date_to_day || !row.date_to_month || !row.date_to_year) return "Ongoing";
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${row.date_to_day} ${months[parseInt(row.date_to_month) - 1]} ${row.date_to_year}`;
      }
    },
    { key: "address_display", label: "Address" },
  ];
  return (
    <div className="min-h-screen bg-[#E0E7FF]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 md:p-8">
          <div className="mb-8">
            <CardTitle className="text-2xl font-semibold">Future Addresses</CardTitle>
            <p className="text-sm text-gray-600 mt-2">
              In this section you are to provide details of the addresses/places you intend to stay during your time in Australia:
            </p>
          </div>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-8">
              {/* Gate Question */}
              <div>
                <Label className="text-base font-medium mb-3 block">
                  Do you know any details of the places where {mainApplicantName} will stay during their time in Australia?
                </Label>
                <RadioGroup
                  value={knowsFutureAddress}
                  onValueChange={(value) => form.setValue("knows_future_address", value)}
                  className="flex gap-4"
                  data-testid="radio-knows-future-address"
                >
                  <div className="flex items-center">
                    <RadioGroupItem value="yes" id="knows-future-address-yes" />
                    <Label htmlFor="knows-future-address-yes" className="ml-2 cursor-pointer font-normal">
                      Yes
                    </Label>
                  </div>
                  <div className="flex items-center">
                    <RadioGroupItem value="no" id="knows-future-address-no" />
                    <Label htmlFor="knows-future-address-no" className="ml-2 cursor-pointer font-normal">
                      No
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              <br />
              {/* Future Addresses Table - Only show when Yes */}
              {knowsFutureAddress === "yes" && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Enter details of all known addresses/places that {mainApplicantName} will stay during their time in Australia:
                  </p>
                  <RepeaterTable
                    data={mainApplicantFutureAddresses}
                    columns={futureAddressColumns}
                    onAdd={(newRow) => updateMainApplicantFutureAddresses([...mainApplicantFutureAddresses, newRow])}
                    onEdit={(index, updatedRow) => {
                      const updated = [...mainApplicantFutureAddresses];
                      updated[index] = updatedRow;
                      updateMainApplicantFutureAddresses(updated);
                    }}
                    onDelete={(index) => {
                      const updated = mainApplicantFutureAddresses.filter((_, i) => i !== index);
                      updateMainApplicantFutureAddresses(updated);
                    }}
                    DialogComponent={FutureAddressDialog}
                    addButtonText="Add"
                    emptyMessage="No future addresses added"
                    dialogTitle="Future Address"
                    testIdPrefix="future-address"
                  />
                </div>
              )}
            </div>
            {/* Desktop Navigation */}
            <FormNavigation
              onPrev={handlePrevious}
              onNext={form.handleSubmit(onSubmit)}
              onSave={handleSave}
              loading={isSaving}
              submitting={isSubmitting}
              disabledNext={!form.formState.isValid}
            />
          </form>
        </div>
      </div>

    </div>
  );
}