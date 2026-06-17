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
const FUTURE_TRAVEL_REASON_OPTIONS = [
  "Visit Family",
  "Visit Friends",
  "Business",
  "Holiday",
  "Study",
  "Work",
  "Medical",
  "Temporary Residence",
  "Permanent Residence",
  "Residence",
  "Live There",
  "Transit",
  "Travel",
  "Working Holiday",
  "Military Deployment",
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
// Future Travel Dialog Schema
const futureTravelDialogSchema = z.object({
  travel_start_date_day: z.string().min(1, "Day is required"),
  travel_start_date_month: z.string().min(1, "Month is required"),
  travel_start_date_year: z.string().min(1, "Year is required"),
  departure_country: z.string().min(1, "Departure Country is required"),
  departure_city: z.string().min(1, "Departure City is required"),
  flight_vessel_number: z.string().optional(),
  intended_arrival_date_day: z.string().min(1, "Day is required"),
  intended_arrival_date_month: z.string().min(1, "Month is required"),
  intended_arrival_date_year: z.string().min(1, "Year is required"),
  arrival_country: z.string().min(1, "Arrival Country is required"),
  arrival_city: z.string().min(1, "Arrival City is required"),
  reason_for_travel: z.string().min(1, "Reason for Travel is required"),
}).superRefine((data, ctx) => {
  // Validate that Intended Arrival Date is on or after Travel Start Date
  const startDate = new Date(
    parseInt(data.travel_start_date_year),
    parseInt(data.travel_start_date_month) - 1,
    parseInt(data.travel_start_date_day)
  );
  const arrivalDate = new Date(
    parseInt(data.intended_arrival_date_year),
    parseInt(data.intended_arrival_date_month) - 1,
    parseInt(data.intended_arrival_date_day)
  );

  if (arrivalDate < startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Intended Arrival Date must be on or after Travel Start Date",
      path: ["intended_arrival_date_day"],
    });
  }
});
function FutureTravelDialog({ editingRow, onSave, onCancel }) {
  const row = editingRow;

  const dialogForm = useForm({
    resolver: zodResolver(futureTravelDialogSchema),
    defaultValues: row || {
      travel_start_date_day: "",
      travel_start_date_month: "",
      travel_start_date_year: "",
      departure_country: "",
      departure_city: "",
      flight_vessel_number: "",
      intended_arrival_date_day: "",
      intended_arrival_date_month: "",
      intended_arrival_date_year: "",
      arrival_country: "",
      arrival_city: "",
      reason_for_travel: "",
    },
  });
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
        Enter details of any proposed or booked travel to any Country
      </p>
      {/* Departure Details */}
      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-base font-semibold text-gray-900">Departure Details</h3>

        <div>
          <Label className="mb-2 block">
            Travel Start Date <span className="text-red-500">*</span>
          </Label>
          <div className="grid grid-cols-3 gap-2">
            <Select
              value={dialogForm.watch("travel_start_date_day")}
              onValueChange={(value) => dialogForm.setValue("travel_start_date_day", value, { shouldValidate: true })}
            >
              <SelectTrigger data-testid="select-start-day">
                <SelectValue placeholder="Day" />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                {days.map((day) => (
                  <SelectItem key={day} value={day}>{day}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={dialogForm.watch("travel_start_date_month")}
              onValueChange={(value) => dialogForm.setValue("travel_start_date_month", value, { shouldValidate: true })}
            >
              <SelectTrigger data-testid="select-start-month">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                {months.map((month, idx) => (
                  <SelectItem key={month} value={(idx + 1).toString()}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={dialogForm.watch("travel_start_date_year")}
              onValueChange={(value) => dialogForm.setValue("travel_start_date_year", value, { shouldValidate: true })}
            >
              <SelectTrigger data-testid="select-start-year">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                {[...years, ...futureYears].map((year) => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {dialogForm.formState.errors.travel_start_date_day && (
            <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.travel_start_date_day.message}</p>
          )}
        </div>
        <div>
          <Label className="mb-2 block">
            Country {mainApplicantName} will Depart From <span className="text-red-500">*</span>
          </Label>
          <Select
            value={dialogForm.watch("departure_country")}
            onValueChange={(value) => dialogForm.setValue("departure_country", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-departure-country">
              <SelectValue placeholder="Choose Country" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              {COUNTRY_OPTIONS.map((country) => (
                <SelectItem key={country} value={country}>{country}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {dialogForm.formState.errors.departure_country && (
            <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.departure_country.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="departure_city" className="mb-2 block">
            Departure City <span className="text-red-500">*</span>
          </Label>
          <Input
            id="departure_city"
            {...dialogForm.register("departure_city")}
            data-testid="input-departure-city"
          />
          {dialogForm.formState.errors.departure_city && (
            <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.departure_city.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="flight_vessel_number" className="mb-2 block">
            Flight Number/Vessel Number (if known)
          </Label>
          <Input
            id="flight_vessel_number"
            {...dialogForm.register("flight_vessel_number")}
            data-testid="input-flight-vessel"
          />
        </div>
      </div>
      {/* Arrival Details */}
      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-base font-semibold text-gray-900">Arrival Details</h3>

        <div>
          <Label className="mb-2 block">
            Intended Arrival Date <span className="text-red-500">*</span>
          </Label>
          <div className="grid grid-cols-3 gap-2">
            <Select
              value={dialogForm.watch("intended_arrival_date_day")}
              onValueChange={(value) => dialogForm.setValue("intended_arrival_date_day", value, { shouldValidate: true })}
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
              value={dialogForm.watch("intended_arrival_date_month")}
              onValueChange={(value) => dialogForm.setValue("intended_arrival_date_month", value, { shouldValidate: true })}
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
              value={dialogForm.watch("intended_arrival_date_year")}
              onValueChange={(value) => dialogForm.setValue("intended_arrival_date_year", value, { shouldValidate: true })}
            >
              <SelectTrigger data-testid="select-arrival-year">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                {[...years, ...futureYears].map((year) => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {dialogForm.formState.errors.intended_arrival_date_day && (
            <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.intended_arrival_date_day.message}</p>
          )}
        </div>
        <div>
          <Label className="mb-2 block">
            Country {mainApplicantName} will Arrive In <span className="text-red-500">*</span>
          </Label>
          <Select
            value={dialogForm.watch("arrival_country")}
            onValueChange={(value) => dialogForm.setValue("arrival_country", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-arrival-country">
              <SelectValue placeholder="Choose Country" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              {COUNTRY_OPTIONS.map((country) => (
                <SelectItem key={country} value={country}>{country}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {dialogForm.formState.errors.arrival_country && (
            <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.arrival_country.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="arrival_city" className="mb-2 block">
            Arrival City <span className="text-red-500">*</span>
          </Label>
          <Input
            id="arrival_city"
            {...dialogForm.register("arrival_city")}
            data-testid="input-arrival-city"
          />
          {dialogForm.formState.errors.arrival_city && (
            <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.arrival_city.message}</p>
          )}
        </div>
        <div>
          <Label className="mb-2 block">
            Reason for Travel <span className="text-red-500">*</span>
          </Label>
          <Select
            value={dialogForm.watch("reason_for_travel")}
            onValueChange={(value) => dialogForm.setValue("reason_for_travel", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-reason">
              <SelectValue placeholder="Choose Reason" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              {FUTURE_TRAVEL_REASON_OPTIONS.map((reason) => (
                <SelectItem key={reason} value={reason}>{reason}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {dialogForm.formState.errors.reason_for_travel && (
            <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.reason_for_travel.message}</p>
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
          className="bg-[#4F726B] hover:bg-[#4F726B] text-white"
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
  has_future_travel: z.enum(["yes", "no"]).optional(),
  main_applicant_future_travel: z.array(z.object({
    travel_start_date_day: z.string(),
    travel_start_date_month: z.string(),
    travel_start_date_year: z.string(),
    departure_country: z.string(),
    departure_city: z.string(),
    flight_vessel_number: z.string().optional(),
    intended_arrival_date_day: z.string(),
    intended_arrival_date_month: z.string(),
    intended_arrival_date_year: z.string(),
    arrival_country: z.string(),
    arrival_city: z.string(),
    reason_for_travel: z.string(),
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
      has_future_travel: "no",
      main_applicant_future_travel: [],
    },
  });
  const hasFutureTravel = form.watch("has_future_travel");
  const mainApplicantFutureTravel = form.watch("main_applicant_future_travel") || [];
  // Get main applicant name from draft store
  const mainApplicantDetails = draftSnap.draft?.protection_details || {};
  const mainApplicantName = mainApplicantDetails.family_name && mainApplicantDetails.given_names
    ? `${mainApplicantDetails.given_names} ${mainApplicantDetails.family_name}`
    : "the Main Applicant";
  useEffect(() => {
    const savedData = draftSnap.draft?.protection_future_travel || {};
    if (Object.keys(savedData).length > 0) {
      form.reset({
        has_future_travel: savedData.has_future_travel || "",
        main_applicant_future_travel: savedData.main_applicant_future_travel || [],
      });
    }
  }, [draftSnap.draft?.protection_future_travel]);
  // Clear future travel data when "No" is selected
  useEffect(() => {
    if (hasFutureTravel === "no") {
      form.setValue("main_applicant_future_travel", []);
    }
  }, [hasFutureTravel]);
  const updateMainApplicantFutureTravel = (newTravel) => {
    form.setValue("main_applicant_future_travel", newTravel);
  };
  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      await draftStore.saveSectionData("protection_future_travel", data);
      await draftStore.markPageComplete(`${visaType}/all-applicants/future-travel`, null, "protection_future_travel");
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
      console.log("Saving protection_future_travel data:", formData);
      const result = await draftStore.saveSectionData("protection_future_travel", formData);

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
  const futureTravelColumns = [
    {
      key: "from_to",
      label: "From/To",
      format: (row) => {
        if (!row.departure_country || !row.arrival_country) return "-";
        return `${row.departure_country} → ${row.arrival_country}`;
      }
    },
    {
      key: "travel_start_date",
      label: "Travel Start Date",
      format: (row) => {
        if (!row.travel_start_date_day || !row.travel_start_date_month || !row.travel_start_date_year) return "-";
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${row.travel_start_date_day} ${months[parseInt(row.travel_start_date_month) - 1]} ${row.travel_start_date_year}`;
      }
    },
    { key: "reason_for_travel", label: "Reason for Travel" },
  ];
  return (
    <div className="min-h-screen bg-[#E4E9FF]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 md:p-8">
          <div className="mb-8">
            <CardTitle className="text-2xl font-semibold">Future Travel</CardTitle>
            <p className="text-sm text-gray-600 mt-2">
              For everyone who is to be included in this application, provide the following details about their future travel plans:
            </p>
          </div>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-8">
              {/* Gate Question */}
              <div>
                <Label className="text-base font-medium mb-3 block">
                  Does {mainApplicantName} have any proposed or booked travel to any Country?
                </Label>
                <RadioGroup
                  value={hasFutureTravel}
                  onValueChange={(value) => form.setValue("has_future_travel", value)}
                  className="flex gap-4"
                  data-testid="radio-has-future-travel"
                >
                  <div className="flex items-center">
                    <RadioGroupItem value="yes" id="has-future-travel-yes" />
                    <Label htmlFor="has-future-travel-yes" className="ml-2 cursor-pointer font-normal">
                      Yes
                    </Label>
                  </div>
                  <div className="flex items-center">
                    <RadioGroupItem value="no" id="has-future-travel-no" />
                    <Label htmlFor="has-future-travel-no" className="ml-2 cursor-pointer font-normal">
                      No
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              <br />
              {/* Future Travel Table - Only show when Yes */}
              {hasFutureTravel === "yes" && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Enter details of any proposed or booked travel to any Country
                  </p>
                  <RepeaterTable
                    data={mainApplicantFutureTravel}
                    columns={futureTravelColumns}
                    onAdd={(newRow) => updateMainApplicantFutureTravel([...mainApplicantFutureTravel, newRow])}
                    onEdit={(index, updatedRow) => {
                      const updated = [...mainApplicantFutureTravel];
                      updated[index] = updatedRow;
                      updateMainApplicantFutureTravel(updated);
                    }}
                    onDelete={(index) => {
                      const updated = mainApplicantFutureTravel.filter((_, i) => i !== index);
                      updateMainApplicantFutureTravel(updated);
                    }}
                    DialogComponent={FutureTravelDialog}
                    addButtonText="Add"
                    emptyMessage="No future travel added"
                    dialogTitle="Future Travel"
                    testIdPrefix="future-travel"
                  />
                </div>
              )}
            </div>
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