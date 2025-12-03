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

const TRAVEL_REASON_OPTIONS = [
  "Work",
  "Study",
  "Holiday",
  "Leisure",
  "Business",
  "Military deployment",
  "Visiting family",
  "Returning home",
  "Other"
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
const futureYears = Array.from({ length: 20 }, (_, i) => (currentYear + i).toString());

// Travel History Dialog Schema
const travelDialogSchema = z.object({
  country: z.string().min(1, "Country is required"),
  is_current_location: z.enum(["yes", "no"], {
    required_error: "Please select yes or no",
  }),
  reason_for_being: z.string().min(1, "Reason for being in this Country is required"),
  legal_status: z.string().min(1, "Legal Status in this Country is required"),
  arrival_date_day: z.string().min(1, "Day is required"),
  arrival_date_month: z.string().min(1, "Month is required"),
  arrival_date_year: z.string().min(1, "Year is required"),
  arrival_city: z.string().optional(),
  intended_departure_date_day: z.string().optional(),
  intended_departure_date_month: z.string().optional(),
  intended_departure_date_year: z.string().optional(),
}).superRefine((data, ctx) => {
  // If not current location, departure date is required
  if (data.is_current_location === "no") {
    if (!data.intended_departure_date_day || !data.intended_departure_date_month || !data.intended_departure_date_year) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Departure Date is required when this is not the current location",
        path: ["intended_departure_date_day"],
      });
    } else {
      // Validate that departure date is not earlier than arrival date
      const arrivalDate = new Date(
        parseInt(data.arrival_date_year),
        parseInt(data.arrival_date_month) - 1,
        parseInt(data.arrival_date_day)
      );
      const departureDate = new Date(
        parseInt(data.intended_departure_date_year),
        parseInt(data.intended_departure_date_month) - 1,
        parseInt(data.intended_departure_date_day)
      );
      
      if (departureDate < arrivalDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Departure Date must not be earlier than Arrival Date",
          path: ["intended_departure_date_day"],
        });
      }
    }
  } else {
    // If current location and departure date is provided, validate it's not earlier than arrival
    if (data.intended_departure_date_day && data.intended_departure_date_month && data.intended_departure_date_year) {
      const arrivalDate = new Date(
        parseInt(data.arrival_date_year),
        parseInt(data.arrival_date_month) - 1,
        parseInt(data.arrival_date_day)
      );
      const departureDate = new Date(
        parseInt(data.intended_departure_date_year),
        parseInt(data.intended_departure_date_month) - 1,
        parseInt(data.intended_departure_date_day)
      );
      
      if (departureDate < arrivalDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Intended Departure Date must not be earlier than Arrival Date",
          path: ["intended_departure_date_day"],
        });
      }
    }
  }
});

function TravelHistoryDialog({ editingRow, onSave, onCancel }) {
  const row = editingRow;
  const [isCurrentLocation, setIsCurrentLocation] = useState(row?.is_current_location || "no");
  
  const dialogForm = useForm({
    resolver: zodResolver(travelDialogSchema),
    defaultValues: row || {
      country: "",
      is_current_location: "no",
      reason_for_being: "",
      legal_status: "",
      arrival_date_day: "",
      arrival_date_month: "",
      arrival_date_year: "",
      arrival_city: "",
      intended_departure_date_day: "",
      intended_departure_date_month: "",
      intended_departure_date_year: "",
    },
  });

  useEffect(() => {
    if (row?.is_current_location) {
      setIsCurrentLocation(row.is_current_location);
    }
  }, [row]);

  // Get main applicant name from draft store
  const draftSnap = useSnapshot(draftStore);
  const mainApplicantDetails = draftSnap.draft?.protection_details || {};
  const mainApplicantName = mainApplicantDetails.family_name && mainApplicantDetails.given_names
    ? `${mainApplicantDetails.given_names} ${mainApplicantDetails.family_name}`
    : "the Main Applicant";

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
        Enter details of their current location and of previous travel including travel for work, study, holiday, leisure, business, military deployments and visits back to their own country:
      </p>

      {/* Country */}
      <div>
        <Label className="mb-2 block">
          Country <span className="text-red-500">*</span>
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

      {/* Is this the Main Applicant's current location? */}
      <div>
        <Label className="text-base font-medium mb-3 block">
          Is this {mainApplicantName}'s current location? <span className="text-red-500">*</span>
        </Label>
        <RadioGroup
          value={isCurrentLocation}
          onValueChange={(value) => {
            setIsCurrentLocation(value);
            dialogForm.setValue("is_current_location", value, { shouldValidate: true });
          }}
          className="flex gap-4"
        >
          <div className="flex items-center">
            <RadioGroupItem value="yes" id="current-location-yes" />
            <Label htmlFor="current-location-yes" className="ml-2 cursor-pointer font-normal">
              Yes
            </Label>
          </div>
          <div className="flex items-center">
            <RadioGroupItem value="no" id="current-location-no" />
            <Label htmlFor="current-location-no" className="ml-2 cursor-pointer font-normal">
              No
            </Label>
          </div>
        </RadioGroup>
        {dialogForm.formState.errors.is_current_location && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.is_current_location.message}</p>
        )}
      </div>

      {/* Reason for being in this Country */}
      <div>
        <Label className="mb-2 block">
          Reason for being in this Country <span className="text-red-500">*</span>
        </Label>
        <Select
          value={dialogForm.watch("reason_for_being")}
          onValueChange={(value) => dialogForm.setValue("reason_for_being", value, { shouldValidate: true })}
        >
          <SelectTrigger data-testid="select-reason">
            <SelectValue placeholder="Choose Reason" />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
            {TRAVEL_REASON_OPTIONS.map((reason) => (
              <SelectItem key={reason} value={reason}>{reason}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.reason_for_being && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.reason_for_being.message}</p>
        )}
      </div>

      {/* Legal Status in this Country */}
      <div>
        <Label className="mb-2 block">
          Legal Status in this Country <span className="text-red-500">*</span>
        </Label>
        <Select
          value={dialogForm.watch("legal_status")}
          onValueChange={(value) => dialogForm.setValue("legal_status", value, { shouldValidate: true })}
        >
          <SelectTrigger data-testid="select-legal-status">
            <SelectValue placeholder="Choose Status" />
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

      {/* Date Arrived */}
      <div>
        <Label className="mb-2 block">
          Date Arrived <span className="text-red-500">*</span>
        </Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("arrival_date_day")}
            onValueChange={(value) => dialogForm.setValue("arrival_date_day", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-arrival-day">
              <SelectValue placeholder="Day" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              {days.map((day) => (
                <SelectItem key={day} value={day}>{day}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("arrival_date_month")}
            onValueChange={(value) => dialogForm.setValue("arrival_date_month", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-arrival-month">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              {months.map((month, idx) => (
                <SelectItem key={month} value={(idx + 1).toString()}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("arrival_date_year")}
            onValueChange={(value) => dialogForm.setValue("arrival_date_year", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-arrival-year">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              {years.map((year) => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {dialogForm.formState.errors.arrival_date_day && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.arrival_date_day.message}</p>
        )}
      </div>

      {/* Arrival City */}
      <div>
        <Label htmlFor="arrival_city" className="mb-2 block">Arrival City</Label>
        <Input
          id="arrival_city"
          {...dialogForm.register("arrival_city")}
          data-testid="input-arrival-city"
        />
      </div>

      {/* Intended Departure Date */}
      <div>
        <Label className="mb-2 block">
          {isCurrentLocation === "yes" ? "Intended Departure Date" : "Departure Date"} 
          {isCurrentLocation === "no" && <span className="text-red-500"> *</span>}
        </Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("intended_departure_date_day")}
            onValueChange={(value) => dialogForm.setValue("intended_departure_date_day", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-departure-day">
              <SelectValue placeholder="Day" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              {days.map((day) => (
                <SelectItem key={day} value={day}>{day}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("intended_departure_date_month")}
            onValueChange={(value) => dialogForm.setValue("intended_departure_date_month", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-departure-month">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              {months.map((month, idx) => (
                <SelectItem key={month} value={(idx + 1).toString()}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("intended_departure_date_year")}
            onValueChange={(value) => dialogForm.setValue("intended_departure_date_year", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-departure-year">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              {(isCurrentLocation === "yes" ? [...years, ...futureYears] : years).map((year) => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {dialogForm.formState.errors.intended_departure_date_day && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.intended_departure_date_day.message}</p>
        )}
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
  has_travel_history: z.enum(["yes", "no"]).optional(),
  main_applicant_travel_history: z.array(z.object({
    country: z.string(),
    is_current_location: z.string(),
    reason_for_being: z.string(),
    legal_status: z.string(),
    arrival_date_day: z.string(),
    arrival_date_month: z.string(),
    arrival_date_year: z.string(),
    arrival_city: z.string().optional(),
    intended_departure_date_day: z.string().optional(),
    intended_departure_date_month: z.string().optional(),
    intended_departure_date_year: z.string().optional(),
  })).optional(),
});

export default function Page() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const visaType = getVisaTypeFromPath(pathname);
  const { toast } = useToast();
  const draftSnap = useSnapshot(draftStore);

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
      has_travel_history: "",
      main_applicant_travel_history: [],
    },
  });

  const hasTravelHistory = form.watch("has_travel_history");
  const mainApplicantTravelHistory = form.watch("main_applicant_travel_history") || [];

  // Get main applicant name from draft store
  const mainApplicantDetails = draftSnap.draft?.protection_details || {};
  const mainApplicantName = mainApplicantDetails.family_name && mainApplicantDetails.given_names
    ? `${mainApplicantDetails.given_names} ${mainApplicantDetails.family_name}`
    : "the Main Applicant";

  useEffect(() => {
    const savedData = draftSnap.draft?.protection_travel || {};
    if (Object.keys(savedData).length > 0) {
      Object.keys(savedData).forEach((key) => {
        if (savedData[key] !== undefined && savedData[key] !== null) {
          form.setValue(key, savedData[key]);
        }
      });
    }
  }, []);

  // Clear travel history data when "No" is selected
  useEffect(() => {
    if (hasTravelHistory === "no") {
      form.setValue("main_applicant_travel_history", []);
    }
  }, [hasTravelHistory]);

  const updateMainApplicantTravelHistory = (newHistory) => {
    form.setValue("main_applicant_travel_history", newHistory);
  };

  const onSubmit = async (data) => {
    await draftStore.saveSectionData("protection_travel", data);
    await draftStore.markPageComplete(`${visaType}/all-applicants/travel-history`);
    const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId);
    if (next) router.push(next);
  };

  const handlePrevious = () => {
    const prev = getPreviousRoute(pathname, visaType, draftSnap.currentApplicationId);
    if (prev) router.push(prev);
  };

  const handleSave = async () => {
    const values = form.getValues();
    const result = await draftStore.saveSectionData("protection_travel", values);
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
  };

  // Table column definitions
  const travelColumns = [
    { key: "country", label: "Country" },
    {
      key: "arrival_date",
      label: "Arrival Date",
      format: (row) => {
        if (!row.arrival_date_day || !row.arrival_date_month || !row.arrival_date_year) return "-";
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${row.arrival_date_day} ${months[parseInt(row.arrival_date_month) - 1]} ${row.arrival_date_year}`;
      }
    },
    {
      key: "departure_date",
      label: "Departure Date",
      format: (row) => {
        if (row.is_current_location === "yes") {
          if (row.intended_departure_date_day && row.intended_departure_date_month && row.intended_departure_date_year) {
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            return `${row.intended_departure_date_day} ${months[parseInt(row.intended_departure_date_month) - 1]} ${row.intended_departure_date_year}`;
          }
          return "Current";
        } else {
          if (row.intended_departure_date_day && row.intended_departure_date_month && row.intended_departure_date_year) {
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            return `${row.intended_departure_date_day} ${months[parseInt(row.intended_departure_date_month) - 1]} ${row.intended_departure_date_year}`;
          }
          return "-";
        }
      }
    },
    { key: "reason_for_being", label: "Reason for Travel" },
  ];

  return (
    <div className="min-h-screen bg-[#E0E7FF]">
      <StickyNav 
        title="Travel History"
        description="In this section you are to provide the travel history of the following included Applicants:"
      />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 md:p-8">
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-8">
              {/* Gate Question */}
              <div>
                <Label className="text-base font-medium mb-3 block">
                  Has {mainApplicantName}:
                </Label>
                <ul className="list-disc list-inside mb-4 ml-4 space-y-1 text-gray-700">
                  <li>travelled to any country in the last 10 years (since turning 16), OR</li>
                  <li>ever previously travelled to Australia, OR</li>
                  <li>spent more than 3 consecutive months outside of their usual country of passport in the last 5 years?</li>
                </ul>
                <RadioGroup
                  value={hasTravelHistory}
                  onValueChange={(value) => form.setValue("has_travel_history", value)}
                  className="flex gap-4"
                  data-testid="radio-has-travel-history"
                >
                  <div className="flex items-center">
                    <RadioGroupItem value="yes" id="has-travel-yes" />
                    <Label htmlFor="has-travel-yes" className="ml-2 cursor-pointer font-normal">
                      Yes
                    </Label>
                  </div>
                  <div className="flex items-center">
                    <RadioGroupItem value="no" id="has-travel-no" />
                    <Label htmlFor="has-travel-no" className="ml-2 cursor-pointer font-normal">
                      No
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Travel History Table - Only show when Yes */}
              {hasTravelHistory === "yes" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Travel History for {mainApplicantName}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Enter details of their current location and of previous travel including travel for work, study, holiday, leisure, business, military deployments and visits back to their own country:
                  </p>
                  <RepeaterTable
                    data={mainApplicantTravelHistory}
                    columns={travelColumns}
                    onAdd={(newRow) => updateMainApplicantTravelHistory([...mainApplicantTravelHistory, newRow])}
                    onEdit={(index, updatedRow) => {
                      const updated = [...mainApplicantTravelHistory];
                      updated[index] = updatedRow;
                      updateMainApplicantTravelHistory(updated);
                    }}
                    onDelete={(index) => {
                      const updated = mainApplicantTravelHistory.filter((_, i) => i !== index);
                      updateMainApplicantTravelHistory(updated);
                    }}
                    DialogComponent={TravelHistoryDialog}
                    addButtonText="Add"
                    emptyMessage="No travel history added"
                    dialogTitle="Travel History"
                    testIdPrefix="travel"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-between mt-8 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                data-testid="button-previous"
              >
                Previous
              </Button>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSave}
                  data-testid="button-save"
                >
                  Save
                </Button>
                <Button
                  type="submit"
                  className="bg-[#285646] hover:bg-[#1e4136] text-white"
                  data-testid="button-continue"
                >
                  Continue
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
