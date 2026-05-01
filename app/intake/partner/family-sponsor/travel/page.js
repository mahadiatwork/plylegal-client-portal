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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { COUNTRIES } from "@/reuseable/countries";
import { monthNames } from "@/reuseable/months";
import { DateSelector } from "@/components/DateSelecters";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";

const VISA_STATUS_OPTIONS = [
  "Australian Citizen By Birth",
  "Australian Citizen By Grant",
  "Permanent Resident of Australia",
  "Eligible New Zealand Citizen",
  "Temporary Resident",
  "No Visa"
];

const TRAVEL_REASON_OPTIONS = [
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

const VISA_SUBCLASS_OPTIONS = [
  "010 - Bridging (Class A)", "020 - Bridging (Class B)", "030 - Bridging (Class C)", "040 - Bridging (Class D)", "041 - Bridging (Class D)",
  "050 - Bridging (Class E)", "051 - Bridging (Class E)", "060 - Bridging (Class F)", "070 - Bridging (Class R)",
  "100", "101", "102", "103", "104", "105", "106", "108", "109", "110",
  "115", "116", "117", "118", "119", "120", "121", "124", "125", "126",
  "127", "128", "129", "130", "131", "132", "134", "135", "136", "137",
  "138", "139", "143", "144", "151", "152", "155", "156", "157", "158",
  "159", "160", "161", "162", "163", "164", "165", "173", "174", "175",
  "176", "177", "200", "201", "202", "203", "204", "300", "309", "310",
  "400", "401", "402", "403", "404", "405", "406", "407", "408", "410",
  "411", "415", "416", "417", "418", "419", "420", "421", "422", "423",
  "424", "425", "426", "427", "428", "442", "444", "445", "447", "449",
  "450", "451", "456", "457", "461", "462", "476", "482", "485", "489",
  "491", "494", "500", "570", "571", "572", "573", "574", "575", "576",
  "580", "590", "600", "601", "602", "651", "676", "679", "771", "773",
  "785", "790", "820", "825", "826", "827", "828", "829", "830", "831",
  "832", "833", "834", "835", "836", "837", "838", "839", "840", "841",
  "842", "843", "844", "845", "846", "847", "848", "849", "850", "851",
  "852", "853", "854", "855", "856", "857", "858", "859", "860", "861",
  "862", "863", "864", "865", "866", "867", "868", "869", "870", "884",
  "885", "886", "887", "888", "890", "891", "892", "893", "895", "896",
  "897", "898", "899"
];

const travelHistoryDialogSchema = z.object({
  country: z.string().min(1, "Country is required"),
  is_current_location: z.enum(["Yes", "No"], {
    required_error: "Please select Yes or No",
  }),
  reason_for_being: z.string().min(1, "Reason for being in this Country is required"),
  legal_status: z.string().min(1, "Legal Status in this Country is required"),
  arrival_date_day: z.string().optional(),
  arrival_date_month: z.string().optional(),
  arrival_date_year: z.string().optional(),
  departure_date_day: z.string().optional(),
  departure_date_month: z.string().optional(),
  departure_date_year: z.string().optional(),
}).superRefine((data, ctx) => {
  // All date parts must be completed or left empty
  const hasArrivalDay = data.arrival_date_day && data.arrival_date_day.trim() !== "";
  const hasArrivalMonth = data.arrival_date_month && data.arrival_date_month.trim() !== "";
  const hasArrivalYear = data.arrival_date_year && data.arrival_date_year.trim() !== "";

  if (hasArrivalDay || hasArrivalMonth || hasArrivalYear) {
    if (!hasArrivalDay || !hasArrivalMonth || !hasArrivalYear) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "All date parts must be completed or left empty",
        path: ["arrival_date_day"],
      });
    }
  }

  const hasDepartureDay = data.departure_date_day && data.departure_date_day.trim() !== "";
  const hasDepartureMonth = data.departure_date_month && data.departure_date_month.trim() !== "";
  const hasDepartureYear = data.departure_date_year && data.departure_date_year.trim() !== "";

  if (hasDepartureDay || hasDepartureMonth || hasDepartureYear) {
    if (!hasDepartureDay || !hasDepartureMonth || !hasDepartureYear) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "All date parts must be completed or left empty",
        path: ["departure_date_day"],
      });
    } else if (hasArrivalDay && hasArrivalMonth && hasArrivalYear) {
      // Validate that departure date is not earlier than arrival date
      const arrivalDate = new Date(
        parseInt(data.arrival_date_year),
        parseInt(data.arrival_date_month) - 1,
        parseInt(data.arrival_date_day)
      );
      const departureDate = new Date(
        parseInt(data.departure_date_year),
        parseInt(data.departure_date_month) - 1,
        parseInt(data.departure_date_day)
      );

      if (departureDate < arrivalDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Departure Date must not be earlier than Arrival Date",
          path: ["departure_date_day"],
        });
      }
    }
  }

  // If not current location, departure date is required
  if (data.is_current_location === "No") {
    if (!hasDepartureDay || !hasDepartureMonth || !hasDepartureYear) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Departure Date is required when this is not the current location",
        path: ["departure_date_day"],
      });
    }
  }
});

const australianVisaDialogSchema = z.object({
  visa_subclass: z.string().min(1, "Visa Subclass is required"),
  date_applied_day: z.string().min(1, "Day is required"),
  date_applied_month: z.string().min(1, "Month is required"),
  date_applied_year: z.string().min(1, "Year is required"),
  date_issued_day: z.string().min(1, "Day is required"),
  date_issued_month: z.string().min(1, "Month is required"),
  date_issued_year: z.string().min(1, "Year is required"),
  date_expired_day: z.string().optional(),
  date_expired_month: z.string().optional(),
  date_expired_year: z.string().optional(),
  visa_number: z.string().optional(),
}).superRefine((data, ctx) => {
  // Validate that Issue Date is not earlier than Applied Date
  if (data.date_applied_day && data.date_applied_month && data.date_applied_year &&
    data.date_issued_day && data.date_issued_month && data.date_issued_year) {
    const appliedDate = new Date(
      parseInt(data.date_applied_year),
      parseInt(data.date_applied_month) - 1,
      parseInt(data.date_applied_day)
    );
    const issuedDate = new Date(
      parseInt(data.date_issued_year),
      parseInt(data.date_issued_month) - 1,
      parseInt(data.date_issued_day)
    );

    if (issuedDate < appliedDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Date Issued must not be earlier than Date Applied",
        path: ["date_issued_day"],
      });
    }
  }
});

function AustralianVisaDialog({ editingRow, onSave, onCancel }) {
  const dialogForm = useForm({
    resolver: zodResolver(australianVisaDialogSchema),
    defaultValues: editingRow || {
      visa_subclass: "",
      date_applied_day: "",
      date_applied_month: "",
      date_applied_year: "",
      date_issued_day: "",
      date_issued_month: "",
      date_issued_year: "",
      date_expired_day: "",
      date_expired_month: "",
      date_expired_year: "",
      visa_number: "",
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
          Enter details of the Australian Visa held by your Sponsor
        </p>
      </div>

      <div>
        <Label htmlFor="visa_subclass">
          Visa Subclass held by this Sponsor <span className="text-red-500">*</span>
        </Label>
        <Select
          value={dialogForm.watch("visa_subclass")}
          onValueChange={(value) => dialogForm.setValue("visa_subclass", value, { shouldValidate: true })}
        >
          <SelectTrigger data-testid="select-visa-subclass">
            <SelectValue placeholder="Choose Subclass" />
          </SelectTrigger>
          <SelectContent>
            {VISA_SUBCLASS_OPTIONS.map((subclass) => (
              <SelectItem key={subclass} value={subclass}>{subclass}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.visa_subclass && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.visa_subclass.message}</p>
        )}
      </div>

      <DateSelector
        label="Date Applied"
        values={{
          day: dialogForm.watch("date_applied_day") || "",
          month: dialogForm.watch("date_applied_month") || "",
          year: dialogForm.watch("date_applied_year") || "",
        }}
        onValueChange={(type, value) => {
          const fieldName = `date_applied_${type}`;
          dialogForm.setValue(fieldName, value, { shouldValidate: true });
        }}
        testIdPrefix="select-date-applied"
      />
      {dialogForm.formState.errors.date_applied_day && (
        <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.date_applied_day.message}</p>
      )}

      <DateSelector
        label="Date Issued"
        values={{
          day: dialogForm.watch("date_issued_day") || "",
          month: dialogForm.watch("date_issued_month") || "",
          year: dialogForm.watch("date_issued_year") || "",
        }}
        onValueChange={(type, value) => {
          const fieldName = `date_issued_${type}`;
          dialogForm.setValue(fieldName, value, { shouldValidate: true });
        }}
        testIdPrefix="select-date-issued"
      />
      {dialogForm.formState.errors.date_issued_day && (
        <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.date_issued_day.message}</p>
      )}

      <DateSelector
        label="Date Expired"
        values={{
          day: dialogForm.watch("date_expired_day") || "",
          month: dialogForm.watch("date_expired_month") || "",
          year: dialogForm.watch("date_expired_year") || "",
        }}
        onValueChange={(type, value) => {
          const fieldName = `date_expired_${type}`;
          dialogForm.setValue(fieldName, value, { shouldValidate: true });
        }}
        testIdPrefix="select-date-expired"
      />

      <div>
        <Label htmlFor="visa_number">Visa Number</Label>
        <Input
          id="visa_number"
          {...dialogForm.register("visa_number")}
          data-testid="input-visa-number"
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel-visa">
          Cancel
        </Button>
        <Button
          type="submit"
          className="bg-primary text-primary-foreground"
          data-testid="button-ok-visa"
        >
          Ok
        </Button>
      </DialogFooter>
    </form>
  );
}

function TravelHistoryDialog({ editingRow, onSave, onCancel }) {
  const [isCurrentLocation, setIsCurrentLocation] = useState(editingRow?.is_current_location || "No");

  const dialogForm = useForm({
    resolver: zodResolver(travelHistoryDialogSchema),
    defaultValues: editingRow || {
      country: "",
      is_current_location: "No",
      reason_for_being: "",
      legal_status: "",
      arrival_date_day: "",
      arrival_date_month: "",
      arrival_date_year: "",
      departure_date_day: "",
      departure_date_month: "",
      departure_date_year: "",
    },
  });

  useEffect(() => {
    if (editingRow?.is_current_location) {
      setIsCurrentLocation(editingRow.is_current_location);
    }
  }, [editingRow]);

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
          Enter details of your Sponsor's travel
        </p>
      </div>

      <div>
        <Label htmlFor="country">
          Country <span className="text-red-500">*</span>
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

      <div>
        <Label>Is this your Sponsor's current location? <span className="text-red-500">*</span></Label>
        <RadioGroup
          value={isCurrentLocation}
          onValueChange={(value) => {
            setIsCurrentLocation(value);
            dialogForm.setValue("is_current_location", value, { shouldValidate: true });
            // Clear departure date if Yes is selected
            if (value === "Yes") {
              dialogForm.setValue("departure_date_day", "");
              dialogForm.setValue("departure_date_month", "");
              dialogForm.setValue("departure_date_year", "");
            }
          }}
          className="flex gap-4 mt-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="Yes" id="current-location-yes" />
            <Label htmlFor="current-location-yes" className="cursor-pointer">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="No" id="current-location-no" />
            <Label htmlFor="current-location-no" className="cursor-pointer">No</Label>
          </div>
        </RadioGroup>
        {dialogForm.formState.errors.is_current_location && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.is_current_location.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="reason_for_being">
          Reason for being in this Country <span className="text-red-500">*</span>
        </Label>
        <Select
          value={dialogForm.watch("reason_for_being")}
          onValueChange={(value) => dialogForm.setValue("reason_for_being", value, { shouldValidate: true })}
        >
          <SelectTrigger data-testid="select-reason">
            <SelectValue placeholder="Choose Reason" />
          </SelectTrigger>
          <SelectContent>
            {TRAVEL_REASON_OPTIONS.map((reason) => (
              <SelectItem key={reason} value={reason}>{reason}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.reason_for_being && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.reason_for_being.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="legal_status">
          Legal Status in this Country <span className="text-red-500">*</span>
        </Label>
        <Select
          value={dialogForm.watch("legal_status")}
          onValueChange={(value) => dialogForm.setValue("legal_status", value, { shouldValidate: true })}
        >
          <SelectTrigger data-testid="select-legal-status">
            <SelectValue placeholder="Choose Status" />
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

      <DateSelector
        label="Date Arrived"
        values={{
          day: dialogForm.watch("arrival_date_day") || "",
          month: dialogForm.watch("arrival_date_month") || "",
          year: dialogForm.watch("arrival_date_year") || "",
        }}
        onValueChange={(type, value) => {
          const fieldName = `arrival_date_${type}`;
          dialogForm.setValue(fieldName, value, { shouldValidate: true });
        }}
        testIdPrefix="select-arrival-date"
      />
      {dialogForm.formState.errors.arrival_date_day && (
        <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.arrival_date_day.message}</p>
      )}

      {isCurrentLocation === "No" && (
        <DateSelector
          label="Departure Date"
          values={{
            day: dialogForm.watch("departure_date_day") || "",
            month: dialogForm.watch("departure_date_month") || "",
            year: dialogForm.watch("departure_date_year") || "",
          }}
          onValueChange={(type, value) => {
            const fieldName = `departure_date_${type}`;
            dialogForm.setValue(fieldName, value, { shouldValidate: true });
          }}
          testIdPrefix="select-departure-date"
        />
      )}

      {isCurrentLocation === "Yes" && (
        <DateSelector
          label="Intended Departure Date"
          values={{
            day: dialogForm.watch("departure_date_day") || "",
            month: dialogForm.watch("departure_date_month") || "",
            year: dialogForm.watch("departure_date_year") || "",
          }}
          onValueChange={(type, value) => {
            const fieldName = `departure_date_${type}`;
            dialogForm.setValue(fieldName, value, { shouldValidate: true });
          }}
          testIdPrefix="select-intended-departure-date"
        />
      )}

      {dialogForm.formState.errors.departure_date_day && (
        <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.departure_date_day.message}</p>
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

const familySponsorTravelSchema = z.object({
  current_visa_status: z.string().optional(),
  // New fields for Australian Citizen By Grant
  arrival_date_day: z.string().optional(),
  arrival_date_month: z.string().optional(),
  arrival_date_year: z.string().optional(),
  australian_visas: z.array(z.object({
    visa_subclass: z.string(),
    date_applied_day: z.string(),
    date_applied_month: z.string(),
    date_applied_year: z.string(),
    date_issued_day: z.string(),
    date_issued_month: z.string(),
    date_issued_year: z.string(),
    date_expired_day: z.string().optional(),
    date_expired_month: z.string().optional(),
    date_expired_year: z.string().optional(),
    visa_number: z.string().optional(),
  })).optional(),

  has_travel_history: z.enum(["Yes", "No"]).optional(),
  travel_history: z.array(z.object({
    country: z.string(),
    is_current_location: z.string(),
    reason_for_being: z.string(),
    legal_status: z.string(),
    arrival_date_day: z.string().optional(),
    arrival_date_month: z.string().optional(),
    arrival_date_year: z.string().optional(),
    departure_date_day: z.string().optional(),
    departure_date_month: z.string().optional(),
    departure_date_year: z.string().optional(),
  })).optional(),
}).superRefine((data, ctx) => {
  // If Australian Citizen By Grant, Permanent Resident of Australia, Eligible New Zealand Citizen, Temporary Resident, or No Visa, require arrival date
  if (data.current_visa_status === "Australian Citizen By Grant" ||
    data.current_visa_status === "Permanent Resident of Australia" ||
    data.current_visa_status === "Eligible New Zealand Citizen" ||
    data.current_visa_status === "Temporary Resident" ||
    data.current_visa_status === "No Visa") {
    if (!data.arrival_date_day || !data.arrival_date_month || !data.arrival_date_year) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Date of Arrival is required",
        path: ["arrival_date_day"],
      });
    }
  }

  // If has travel history, require at least one entry
  if (data.has_travel_history === "Yes" && (!data.travel_history || data.travel_history.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one travel history entry is required",
      path: ["travel_history"],
    });
  }
});

export default function FamilySponsorTravelPage() {
  const router = useRouter();
  const { startNavigation } = useNavigationLoading();
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
  const rawSectionData = draftStore.getSectionData('familySponsor.details');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const sectionData = isMounted ? rawSectionData : {};

  // Get sponsor name for display
  const sponsorName = sectionData?.given_names && sectionData?.family_name
    ? `${sectionData.given_names} ${sectionData.family_name}`
    : sectionData?.given_names || sectionData?.family_name || "the sponsor";

  const form = useForm({
    resolver: zodResolver(familySponsorTravelSchema),
    mode: "onChange",
    defaultValues: {
      current_visa_status: sectionData?.current_visa_status || "",
      arrival_date_day: sectionData?.arrival_date_day || "",
      arrival_date_month: sectionData?.arrival_date_month || "",
      arrival_date_year: sectionData?.arrival_date_year || "",
      australian_visas: sectionData?.australian_visas || [],
      has_travel_history: sectionData?.has_travel_history || "No",
      travel_history: sectionData?.travel_history || [],
    },
  });
  const { reset, getValues } = form;
  const isDirty = form.formState.isDirty;

  // Watch form values for conditional rendering
  const currentVisaStatus = form.watch("current_visa_status");
  const australianVisas = form.watch("australian_visas") || [];
  const hasTravelHistory = form.watch("has_travel_history");
  const travelHistory = form.watch("travel_history") || [];

  // Watch all form values for auto-save
  const watchedValues = useWatch({ control: form.control });

  // Sync form with store data once it's loaded from the database
  useEffect(() => {
    if (!draftSnap.isLoading && sectionData && Object.keys(sectionData).length > 0 && !isDirty) {
      reset({
        current_visa_status: sectionData.current_visa_status || "",
        arrival_date_day: sectionData.arrival_date_day || "",
        arrival_date_month: sectionData.arrival_date_month || "",
        arrival_date_year: sectionData.arrival_date_year || "",
        australian_visas: sectionData.australian_visas || [],
        has_travel_history: sectionData.has_travel_history || "No",
        travel_history: sectionData.travel_history || [],
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
        await draftStore.markPageComplete('partner/family-sponsor/travel', null, 'familySponsor.details');
        const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId);
        startNavigation(next);
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
    startNavigation(prev);
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
        await draftStore.markPageComplete('partner/family-sponsor/travel', null, 'familySponsor.details');
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

  const updateTravelHistory = (newHistory) => {
    // Clear auto-save timeout to prevent race condition
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    form.setValue("travel_history", newHistory, { shouldValidate: true, shouldDirty: true, shouldTouch: true });

    const existingData = draftStore.getSectionData('familySponsor.details') || {};
    const currentData = getValues();
    draftStore.saveSectionData('familySponsor.details', {
      ...existingData,
      ...currentData,
      travel_history: newHistory
    });
  };

  const updateAustralianVisas = (newVisas) => {
    // Clear auto-save timeout to prevent race condition
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    form.setValue("australian_visas", newVisas, { shouldValidate: true, shouldDirty: true, shouldTouch: true });

    const existingData = draftStore.getSectionData('familySponsor.details') || {};
    const currentData = getValues();
    draftStore.saveSectionData('familySponsor.details', {
      ...existingData,
      ...currentData,
      australian_visas: newVisas
    });
  };

  const australianVisaColumns = [
    { key: "visa_number", label: "Visa Grant Number" },
    {
      key: "date_issued", label: "Date of Issue", format: (row) => {
        if (row.date_issued_day && row.date_issued_month && row.date_issued_year) {
          const monthIdx = parseInt(row.date_issued_month) - 1;
          return `${monthNames[monthIdx]} ${row.date_issued_day}, ${row.date_issued_year}`;
        }
        return "";
      }
    },
    {
      key: "date_expired", label: "Date of Expiry", format: (row) => {
        if (row.date_expired_day && row.date_expired_month && row.date_expired_year) {
          const monthIdx = parseInt(row.date_expired_month) - 1;
          return `${monthNames[monthIdx]} ${row.date_expired_day}, ${row.date_expired_year}`;
        }
        return "";
      }
    },
  ];

  const travelColumns = [
    { key: "country", label: "Country" },
    {
      key: "arrival_date", label: "Arrival Date", format: (row) => {
        if (row.arrival_date_day && row.arrival_date_month && row.arrival_date_year) {
          const monthIdx = parseInt(row.arrival_date_month) - 1;
          return `${monthNames[monthIdx]} ${row.arrival_date_day}, ${row.arrival_date_year}`;
        }
        return "";
      }
    },
    {
      key: "departure_date", label: "Departure Date", format: (row) => {
        if (row.is_current_location === "Yes") {
          if (row.departure_date_day && row.departure_date_month && row.departure_date_year) {
            const monthIdx = parseInt(row.departure_date_month) - 1;
            return `${monthNames[monthIdx]} ${row.departure_date_day}, ${row.departure_date_year}`;
          }
          return "Current";
        } else {
          if (row.departure_date_day && row.departure_date_month && row.departure_date_year) {
            const monthIdx = parseInt(row.departure_date_month) - 1;
            return `${monthNames[monthIdx]} ${row.departure_date_day}, ${row.departure_date_year}`;
          }
          return "";
        }
      }
    },
    { key: "reason_for_being", label: "Reason for Travel" },
  ];

  return (
    <>
      <Card className="rounded-2xl shadow-md bg-white">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Travel</CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            In this section, provide details about your Sponsor's travel history.
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
            {/* Question 1: Current Citizenship/Visa Status */}
            <div>
              <Label className="mb-2 block">
                What is your Sponsor's current Citizenship/Visa Status in Australia?
              </Label>
              <Select
                value={form.watch("current_visa_status") || ""}
                onValueChange={(value) => form.setValue("current_visa_status", value)}
              >
                <SelectTrigger data-testid="select-visa-status">
                  <SelectValue placeholder="Choose Visa Status" />
                </SelectTrigger>
                <SelectContent>
                  {VISA_STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Conditional fields for Australian Citizen By Grant, Permanent Resident of Australia, Eligible New Zealand Citizen, Temporary Resident or No Visa */}
            {(currentVisaStatus === "Australian Citizen By Grant" ||
              currentVisaStatus === "Permanent Resident of Australia" ||
              currentVisaStatus === "Eligible New Zealand Citizen" ||
              currentVisaStatus === "Temporary Resident" ||
              currentVisaStatus === "No Visa") && (
                <div className="space-y-6 border-b pb-6 mb-6">
                  <div>
                    <DateSelector
                      label="Date of Arrival in Australia"
                      values={{
                        day: form.watch("arrival_date_day") || "",
                        month: form.watch("arrival_date_month") || "",
                        year: form.watch("arrival_date_year") || "",
                      }}
                      onValueChange={(type, value) => {
                        const fieldName = `arrival_date_${type}`;
                        form.setValue(fieldName, value, { shouldValidate: true });
                      }}
                      testIdPrefix="select-arrival-date-australia"
                    />
                    {form.formState.errors.arrival_date_day && (
                      <p className="text-sm text-red-600 mt-1">{form.formState.errors.arrival_date_day.message}</p>
                    )}
                  </div>

                  {/* Visa details for Grant, Permanent Resident, and Temporary Resident */}
                  {(currentVisaStatus === "Australian Citizen By Grant" ||
                    currentVisaStatus === "Permanent Resident of Australia" ||
                    currentVisaStatus === "Temporary Resident") && (
                      <div className="mt-4">
                        <h3 className="text-base font-medium text-gray-900 mb-2">
                          Visas for {sponsorName}
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Enter details of ALL Australian Visas held by {sponsorName} (including all Temporary and Permanent Visas)
                        </p>
                        <RepeaterTable
                          data={australianVisas}
                          columns={australianVisaColumns}
                          onAdd={(row) => updateAustralianVisas([...australianVisas, row])}
                          onEdit={(index, row) => {
                            const updated = [...australianVisas];
                            updated[index] = row;
                            updateAustralianVisas(updated);
                          }}
                          onDelete={(index) => {
                            const updated = australianVisas.filter((_, i) => i !== index);
                            updateAustralianVisas(updated);
                          }}
                          DialogComponent={AustralianVisaDialog}
                          addButtonText="Add"
                          testIdPrefix="australian-visas"
                          dialogTitle="Australian Visa"
                        />
                        {form.formState.errors.australian_visas && (
                          <p className="text-sm text-red-600 mt-1">{form.formState.errors.australian_visas.message}</p>
                        )}
                      </div>
                    )}
                </div>
              )}

            {/* Question 2: Has visited any countries in the past 10 years */}
            <div>
              <Field
                control={form.control}
                name="has_travel_history"
                type="radio"
                label={`Has ${sponsorName} visited any countries in the past 10 years?`}
                options={[
                  { value: "Yes", label: "Yes" },
                  { value: "No", label: "No" },
                ]}
              />

              {hasTravelHistory === "Yes" && (
                <div className="mt-4">
                  <h3 className="text-base font-medium text-gray-900 mb-2">
                    Travel History for {sponsorName}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Enter details of your Sponsor's travel during the last 10 years
                  </p>
                  <RepeaterTable
                    data={travelHistory}
                    columns={travelColumns}
                    onAdd={(row) => updateTravelHistory([...travelHistory, row])}
                    onEdit={(index, row) => {
                      const updated = [...travelHistory];
                      updated[index] = row;
                      updateTravelHistory(updated);
                    }}
                    onDelete={(index) => {
                      const updated = travelHistory.filter((_, i) => i !== index);
                      updateTravelHistory(updated);
                    }}
                    DialogComponent={TravelHistoryDialog}
                    addButtonText="Add"
                    testIdPrefix="travel-history"
                    dialogTitle="Travel History"
                  />
                  {form.formState.errors.travel_history && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.travel_history.message}</p>
                  )}
                </div>
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

