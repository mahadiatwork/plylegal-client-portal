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
import { Textarea } from "@/components/ui/textarea";
import { FormNavigation } from "@/components/FormNavigation";
import { RepeaterTable } from "@/components/RepeaterTable";
import { DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  is_current_citizen: z.enum(["yes", "no"]),
  stateless_explanation: z.string().optional(),
  has_been_citizen: z.enum(["yes", "no"]),
  citizenships: z.array(z.object({
    country: z.string(),
    how_obtained: z.string(),
    date_obtained_day: z.string().optional(),
    date_obtained_month: z.string().optional(),
    date_obtained_year: z.string().optional(),
    still_citizen: z.enum(["yes", "no"]).optional(),
    date_ceased_day: z.string().optional(),
    date_ceased_month: z.string().optional(),
    date_ceased_year: z.string().optional(),
    reason_ceased: z.string().optional(),
  })).optional(),
  has_passport: z.enum(["yes", "no"]),
  passports: z.array(z.object({
    document_type: z.string(),
    document_number: z.string(),
    passport_country: z.string(),
    place_of_issue: z.string(),
    nationality: z.string(),
    gender: z.string(),
    name: z.string(),
    date_issued_day: z.string(),
    date_issued_month: z.string(),
    date_issued_year: z.string(),
    is_original_date: z.string(),
    original_date_day: z.string().optional(),
    original_date_month: z.string().optional(),
    original_date_year: z.string().optional(),
    date_expiry_day: z.string().optional(),
    date_expiry_month: z.string().optional(),
    date_expiry_year: z.string().optional(),
    document_status: z.string(),
  })).optional(),
  has_identity_document: z.enum(["yes", "no"]),
  identity_documents: z.array(z.object({
    document_type: z.string(),
    identification_number: z.string(),
    name: z.string(),
    country_of_issue: z.string(),
    state_province_of_issue: z.string().optional(),
    place_of_issue: z.string().optional(),
    date_issued_day: z.string().optional(),
    date_issued_month: z.string().optional(),
    date_issued_year: z.string().optional(),
    date_expiry_day: z.string().optional(),
    date_expiry_month: z.string().optional(),
    date_expiry_year: z.string().optional(),
  })).optional(),
}).refine(
  (data) => {
    // If not a citizen, stateless explanation is required
    if (data.is_current_citizen === "no" && !data.stateless_explanation?.trim()) {
      return false;
    }
    return true;
  },
  {
    message: "Stateless explanation is required when you are not a citizen of any country",
    path: ["stateless_explanation"],
  }
).refine(
  (data) => {
    // If has been citizen, must have at least one citizenship entry
    if (data.has_been_citizen === "yes" && (!data.citizenships || data.citizenships.length === 0)) {
      return false;
    }
    return true;
  },
  {
    message: "Please add at least one citizenship",
    path: ["citizenships"],
  }
).refine(
  (data) => {
    // If has passport, must have at least one passport entry
    if (data.has_passport === "yes" && (!data.passports || data.passports.length === 0)) {
      return false;
    }
    return true;
  },
  {
    message: "Please add at least one passport/travel document",
    path: ["passports"],
  }
).refine(
  (data) => {
    // If has identity document, must have at least one identity document entry
    if (data.has_identity_document === "yes" && (!data.identity_documents || data.identity_documents.length === 0)) {
      return false;
    }
    return true;
  },
  {
    message: "Please add at least one identity document",
    path: ["identity_documents"],
  }
);

const CITIZENSHIP_REASON_OPTIONS = [
  "Birth",
  "Descent",
  "Naturalisation"
];

const PASSPORT_TYPE_OPTIONS = [
  "Passport",
  "Emergency Passport",
  "Travel Document"
];

const APPLICANT_NAME_OPTIONS = [
  "Main Applicant"
];

const DOCUMENT_TYPE_OPTIONS = [
  "Aircrew Identity Document",
  "Alien Registration Number",
  "Bank Statement - Personal",
  "Birth Certificate",
  "Change of Name Certificate",
  "Deed Poll",
  "Driver's Licence",
  "DFTTA",
  "Family Register",
  "Marriage Certificate",
  "Military Identity Document",
  "National Identity Document",
  "Proof of Age Card",
  "Rates Notice",
  "Rental Contract",
  "Seafarer Identity Document",
  "Social Security Card",
  "Student Card",
  "United Nations High Commissioner for Refugees (UNHCR) Document",
  "Other"
];

const GENDER_OPTIONS = ["Male", "Female", "X/Unspecified"];

const DOCUMENT_STATUS_OPTIONS = [
  "Current",
  "Expired",
  "Lost",
  "Stolen",
  "Cancelled",
  "Damaged"
];

const citizenshipDialogSchema = z.object({
  country: z.string().min(1, "Country is required"),
  how_obtained: z.string().min(1, "How obtained is required"),
  date_obtained_day: z.string().optional(),
  date_obtained_month: z.string().optional(),
  date_obtained_year: z.string().optional(),
  still_citizen: z.enum(["yes", "no"]).optional(),
  date_ceased_day: z.string().optional(),
  date_ceased_month: z.string().optional(),
  date_ceased_year: z.string().optional(),
  reason_ceased: z.string().optional(),
}).refine(
  (data) => {
    if (data.still_citizen === "no") {
      return !!(data.date_ceased_year && data.date_ceased_month && data.date_ceased_day && data.reason_ceased?.trim());
    }
    return true;
  },
  {
    message: "Provide ceased date and reason if you are no longer a citizen",
    path: ["reason_ceased"],
  }
);

function CitizenshipDialog({ editingRow: row, onSave: onSubmit, onCancel }) {
  const dialogForm = useForm({
    resolver: zodResolver(citizenshipDialogSchema),
    defaultValues: row || {
      country: "",
      how_obtained: "",
      date_obtained_day: "",
      date_obtained_month: "",
      date_obtained_year: "",
      still_citizen: "yes",
      date_ceased_day: "",
      date_ceased_month: "",
      date_ceased_year: "",
      reason_ceased: "",
    },
  });

  const handleFormSubmit = (data) => {
    onSave(data);
  };

  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => (currentYear - i).toString());

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dialogForm.handleSubmit(handleFormSubmit)(e);
      }}
      className="space-y-4"
    >
      <div>
        <Label htmlFor="country">Country of Citizenship</Label>
        <Input
          id="country"
          {...dialogForm.register("country")}
          placeholder="Choose Country"
          data-testid="input-citizenship-country"
        />
        {dialogForm.formState.errors.country && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.country.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="how_obtained">How was this Citizenship obtained?</Label>
        <Select
          value={dialogForm.watch("how_obtained")}
          onValueChange={(value) => dialogForm.setValue("how_obtained", value, { shouldValidate: true })}
        >
          <SelectTrigger data-testid="select-how-obtained">
            <SelectValue placeholder="Choose Reason" />
          </SelectTrigger>
          <SelectContent>
            {CITIZENSHIP_REASON_OPTIONS.map((reason) => (
              <SelectItem key={reason} value={reason}>{reason}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.how_obtained && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.how_obtained.message}</p>
        )}
      </div>

      <div>
        <Label>Date Obtained <span className="text-gray-500 font-normal">(optional but recommended)</span></Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("date_obtained_day")}
            onValueChange={(value) => dialogForm.setValue("date_obtained_day", value)}
          >
            <SelectTrigger data-testid="select-obtained-day">
              <SelectValue placeholder="Choose Day" />
            </SelectTrigger>
            <SelectContent>
              {days.map((day) => (
                <SelectItem key={day} value={day}>{day}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_obtained_month")}
            onValueChange={(value) => dialogForm.setValue("date_obtained_month", value)}
          >
            <SelectTrigger data-testid="select-obtained-month">
              <SelectValue placeholder="Choose Month" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month} value={month}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_obtained_year")}
            onValueChange={(value) => dialogForm.setValue("date_obtained_year", value)}
          >
            <SelectTrigger data-testid="select-obtained-year">
              <SelectValue placeholder="Choose Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Are you still a citizen of this country?</Label>
        <RadioGroup
          value={dialogForm.watch("still_citizen")}
          onValueChange={(value) => dialogForm.setValue("still_citizen", value)}
          className="flex gap-4 mt-2"
        >
          <div className="flex items-center">
            <RadioGroupItem value="yes" id="still-citizen-yes" />
            <Label htmlFor="still-citizen-yes" className="ml-2 cursor-pointer font-normal">Yes</Label>
          </div>
          <div className="flex items-center">
            <RadioGroupItem value="no" id="still-citizen-no" />
            <Label htmlFor="still-citizen-no" className="ml-2 cursor-pointer font-normal">No</Label>
          </div>
        </RadioGroup>
      </div>

      {dialogForm.watch("still_citizen") === "no" && (
        <div className="space-y-4">
          <div>
            <Label>Date ceased</Label>
            <div className="grid grid-cols-3 gap-2">
              <Select
                value={dialogForm.watch("date_ceased_day")}
                onValueChange={(value) => dialogForm.setValue("date_ceased_day", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose Day" />
                </SelectTrigger>
                <SelectContent>
                  {days.map((day) => (
                    <SelectItem key={day} value={day}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={dialogForm.watch("date_ceased_month")}
                onValueChange={(value) => dialogForm.setValue("date_ceased_month", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose Month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month} value={month}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={dialogForm.watch("date_ceased_year")}
                onValueChange={(value) => dialogForm.setValue("date_ceased_year", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose Year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Reason</Label>
            <Input
              {...dialogForm.register("reason_ceased")}
              placeholder="Enter reason citizenship ceased"
            />
          </div>
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
          Cancel
        </Button>
        <Button type="submit" data-testid="button-ok">
          OK
        </Button>
      </DialogFooter>
    </form>
  );
}

const passportDialogSchema = z.object({
  document_type: z.string().min(1, "Document type is required"),
  document_number: z.string().min(1, "Document number is required"),
  passport_country: z.string().min(1, "Passport country is required"),
  place_of_issue: z.string().min(1, "Place of issue is required"),
  nationality: z.string().min(1, "Nationality is required"),
  gender: z.string().min(1, "Gender is required"),
  name: z.string().min(1, "Name is required"),
  date_issued_day: z.string().min(1, "Day is required"),
  date_issued_month: z.string().min(1, "Month is required"),
  date_issued_year: z.string().min(1, "Year is required"),
  is_original_date: z.string(),
  original_date_day: z.string().optional(),
  original_date_month: z.string().optional(),
  original_date_year: z.string().optional(),
  date_expiry_day: z.string().optional(),
  date_expiry_month: z.string().optional(),
  date_expiry_year: z.string().optional(),
  document_status: z.string().min(1, "Document status is required"),
}).refine(
  (data) => {
    // If document status is Current, expiry date is required
    if (data.document_status === "Current") {
      return data.date_expiry_day && data.date_expiry_month && data.date_expiry_year;
    }
    return true;
  },
  {
    message: "Expiry date is required for current documents",
    path: ["date_expiry_day"],
  }
);

function PassportDialog({ editingRow: row, onSave: onSubmit, onCancel }) {
  const initialIsOriginal = row?.is_original_date !== undefined ? row.is_original_date : "yes";
  const [isOriginalDate, setIsOriginalDate] = useState(initialIsOriginal);

  const dialogForm = useForm({
    resolver: zodResolver(passportDialogSchema),
    defaultValues: row || {
      document_type: "",
      document_number: "",
      passport_country: "",
      place_of_issue: "",
      nationality: "",
      gender: "",
      name: "",
      date_issued_day: "",
      date_issued_month: "",
      date_issued_year: "",
      is_original_date: "yes",
      original_date_day: "",
      original_date_month: "",
      original_date_year: "",
      date_expiry_day: "",
      date_expiry_month: "",
      date_expiry_year: "",
      document_status: "",
    },
  });

  useEffect(() => {
    if (row?.is_original_date !== undefined) {
      setIsOriginalDate(row.is_original_date);
      dialogForm.setValue("is_original_date", row.is_original_date);
    }
  }, [row]);

  const handleFormSubmit = (data) => {
    onSave(data);
  };

  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => (currentYear - i).toString());

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dialogForm.handleSubmit(handleFormSubmit)(e);
      }}
      className="space-y-4 max-h-[600px] overflow-y-auto pr-2"
    >
      <div>
        <Label htmlFor="document_type">Type of Document</Label>
        <Select
          value={dialogForm.watch("document_type")}
          onValueChange={(value) => dialogForm.setValue("document_type", value, { shouldValidate: true })}
        >
          <SelectTrigger data-testid="select-passport-type">
            <SelectValue placeholder="Choose Type" />
          </SelectTrigger>
          <SelectContent>
            {PASSPORT_TYPE_OPTIONS.map((type) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.document_type && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.document_type.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="document_number">Passport/Document Number</Label>
        <Input
          id="document_number"
          {...dialogForm.register("document_number")}
          data-testid="input-passport-number"
        />
        {dialogForm.formState.errors.document_number && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.document_number.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="passport_country">Passport Country</Label>
        <Input
          id="passport_country"
          {...dialogForm.register("passport_country")}
          placeholder="Choose Country"
          data-testid="input-passport-country"
        />
        {dialogForm.formState.errors.passport_country && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.passport_country.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="place_of_issue">Place of Issue / Issuing Authority</Label>
        <Input
          id="place_of_issue"
          {...dialogForm.register("place_of_issue")}
          data-testid="input-place-of-issue"
        />
        {dialogForm.formState.errors.place_of_issue && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.place_of_issue.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="nationality">Nationality</Label>
        <Input
          id="nationality"
          {...dialogForm.register("nationality")}
          placeholder="Choose Nationality"
          data-testid="input-passport-nationality"
        />
        {dialogForm.formState.errors.nationality && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.nationality.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="gender">Gender as shown on this document</Label>
        <Select
          value={dialogForm.watch("gender")}
          onValueChange={(value) => dialogForm.setValue("gender", value, { shouldValidate: true })}
        >
          <SelectTrigger data-testid="select-passport-gender">
            <SelectValue placeholder="Choose Gender" />
          </SelectTrigger>
          <SelectContent>
            {GENDER_OPTIONS.map((gender) => (
              <SelectItem key={gender} value={gender}>{gender}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.gender && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.gender.message}</p>
        )}
      </div>

      <div>
        <Label className="block mb-2">Name</Label>
        <p className="text-sm text-gray-600 mb-2">
          Enter the name that is shown on the document. The name entered <strong>must</strong> be the same as it appears on the document. If the correct name is not shown as an option it will need to be added in the Other Names question located on this person's Other tab.
        </p>
        <Select
          value={dialogForm.watch("name")}
          onValueChange={(value) => dialogForm.setValue("name", value, { shouldValidate: true })}
        >
          <SelectTrigger data-testid="select-passport-name">
            <SelectValue placeholder="Choose Applicant" />
          </SelectTrigger>
          <SelectContent>
            {APPLICANT_NAME_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.name && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.name.message}</p>
        )}
      </div>

      <div className="pt-4 border-t border-gray-200">
        <h3 className="text-base font-medium text-gray-900 mb-3">Dates and Status</h3>
        <p className="text-sm text-gray-600 mb-4">
          Enter the issue date, expiry date and status of the Document
        </p>

        <div>
          <Label>Date of Issue</Label>
          <div className="grid grid-cols-3 gap-2">
            <Select
              value={dialogForm.watch("date_issued_day")}
              onValueChange={(value) => dialogForm.setValue("date_issued_day", value, { shouldValidate: true })}
            >
              <SelectTrigger data-testid="select-passport-issue-day">
                <SelectValue placeholder="Choose Day" />
              </SelectTrigger>
              <SelectContent>
                {days.map((day) => (
                  <SelectItem key={day} value={day}>{day}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={dialogForm.watch("date_issued_month")}
              onValueChange={(value) => dialogForm.setValue("date_issued_month", value, { shouldValidate: true })}
            >
              <SelectTrigger data-testid="select-passport-issue-month">
                <SelectValue placeholder="Choose Month" />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month} value={month}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={dialogForm.watch("date_issued_year")}
              onValueChange={(value) => dialogForm.setValue("date_issued_year", value, { shouldValidate: true })}
            >
              <SelectTrigger data-testid="select-passport-issue-year">
                <SelectValue placeholder="Choose Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4">
          <Label className="text-sm font-normal mb-2 block">
            Is this the Original Date of Issue?
          </Label>
          <RadioGroup
            value={isOriginalDate}
            onValueChange={(value) => {
              setIsOriginalDate(value);
              dialogForm.setValue("is_original_date", value);
            }}
            className="flex gap-4"
            data-testid="radio-original-date"
          >
            <div className="flex items-center" data-testid="radio-original-date-yes">
              <RadioGroupItem value="yes" id="original-date-yes" />
              <Label htmlFor="original-date-yes" className="ml-2 cursor-pointer font-normal">
                Yes
              </Label>
            </div>
            <div className="flex items-center" data-testid="radio-original-date-no">
              <RadioGroupItem value="no" id="original-date-no" />
              <Label htmlFor="original-date-no" className="ml-2 cursor-pointer font-normal">
                No
              </Label>
            </div>
          </RadioGroup>
        </div>

        {isOriginalDate === "no" && (
          <div className="mt-4">
            <Label>Original Date of Issue</Label>
            <div className="grid grid-cols-3 gap-2">
              <Select
                value={dialogForm.watch("original_date_day")}
                onValueChange={(value) => dialogForm.setValue("original_date_day", value)}
              >
                <SelectTrigger data-testid="select-original-day">
                  <SelectValue placeholder="Choose Day" />
                </SelectTrigger>
                <SelectContent>
                  {days.map((day) => (
                    <SelectItem key={day} value={day}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={dialogForm.watch("original_date_month")}
                onValueChange={(value) => dialogForm.setValue("original_date_month", value)}
              >
                <SelectTrigger data-testid="select-original-month">
                  <SelectValue placeholder="Choose Month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month} value={month}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={dialogForm.watch("original_date_year")}
                onValueChange={(value) => dialogForm.setValue("original_date_year", value)}
              >
                <SelectTrigger data-testid="select-original-year">
                  <SelectValue placeholder="Choose Year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="mt-4">
          <Label>Date of Expiry</Label>
          <div className="grid grid-cols-3 gap-2">
            <Select
              value={dialogForm.watch("date_expiry_day")}
              onValueChange={(value) => dialogForm.setValue("date_expiry_day", value, { shouldValidate: true })}
            >
              <SelectTrigger data-testid="select-passport-expiry-day">
                <SelectValue placeholder="Choose Day" />
              </SelectTrigger>
              <SelectContent>
                {days.map((day) => (
                  <SelectItem key={day} value={day}>{day}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={dialogForm.watch("date_expiry_month")}
              onValueChange={(value) => dialogForm.setValue("date_expiry_month", value, { shouldValidate: true })}
            >
              <SelectTrigger data-testid="select-passport-expiry-month">
                <SelectValue placeholder="Choose Month" />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month} value={month}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={dialogForm.watch("date_expiry_year")}
              onValueChange={(value) => dialogForm.setValue("date_expiry_year", value, { shouldValidate: true })}
            >
              <SelectTrigger data-testid="select-passport-expiry-year">
                <SelectValue placeholder="Choose Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4">
          <Label htmlFor="document_status">Document Status</Label>
          <Select
            value={dialogForm.watch("document_status")}
            onValueChange={(value) => dialogForm.setValue("document_status", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-passport-status">
              <SelectValue placeholder="Choose Status" />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_STATUS_OPTIONS.map((status) => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {dialogForm.formState.errors.document_status && (
            <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.document_status.message}</p>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
          Cancel
        </Button>
        <Button type="submit" data-testid="button-ok">
          OK
        </Button>
      </DialogFooter>
    </form>
  );
}

const identityDocDialogSchema = z.object({
  document_type: z.string().min(1, "Document type is required"),
  identification_number: z.string().min(1, "Identification number is required"),
  country_of_issue: z.string().min(1, "Country is required"),
  state_province_of_issue: z.string().optional(),
  place_of_issue: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  date_issued_day: z.string().optional(),
  date_issued_month: z.string().optional(),
  date_issued_year: z.string().optional(),
  date_expiry_day: z.string().optional(),
  date_expiry_month: z.string().optional(),
  date_expiry_year: z.string().optional(),
});

function IdentityDocumentDialog({ editingRow: row, onSave: onSubmit, onCancel }) {
  const dialogForm = useForm({
    resolver: zodResolver(identityDocDialogSchema),
    defaultValues: row || {
      document_type: "",
      identification_number: "",
      country_of_issue: "",
      state_province_of_issue: "",
      place_of_issue: "",
      name: "",
      date_issued_day: "",
      date_issued_month: "",
      date_issued_year: "",
      date_expiry_day: "",
      date_expiry_month: "",
      date_expiry_year: "",
    },
  });

  const handleFormSubmit = (data) => {
    onSave(data);
  };

  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => (currentYear - i).toString());

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dialogForm.handleSubmit(handleFormSubmit)(e);
      }}
      className="space-y-4 max-h-[600px] overflow-y-auto pr-2"
    >
      <div>
        <Label htmlFor="document_type">Document Type</Label>
        <Select
          value={dialogForm.watch("document_type")}
          onValueChange={(value) => dialogForm.setValue("document_type", value, { shouldValidate: true })}
        >
          <SelectTrigger data-testid="select-identity-doc-type">
            <SelectValue placeholder="Choose Type" />
          </SelectTrigger>
          <SelectContent>
            {DOCUMENT_TYPE_OPTIONS.map((type) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.document_type && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.document_type.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="identification_number">Identification Number</Label>
        <Input
          id="identification_number"
          {...dialogForm.register("identification_number")}
          data-testid="input-identification-number"
        />
        {dialogForm.formState.errors.identification_number && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.identification_number.message}</p>
        )}
      </div>

      <div>
        <Label className="block mb-2">Name</Label>
        <p className="text-sm text-gray-600 mb-2">
          Enter the name that is shown on the document. The name entered <strong>must</strong> be the same as it appears on the document. If the correct name is not shown as an option it will need to be added in the Other Names question located on this person's Other tab.
        </p>
        <Select
          value={dialogForm.watch("name")}
          onValueChange={(value) => dialogForm.setValue("name", value, { shouldValidate: true })}
        >
          <SelectTrigger data-testid="select-identity-doc-name">
            <SelectValue placeholder="Choose Applicant" />
          </SelectTrigger>
          <SelectContent>
            {APPLICANT_NAME_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.name && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.name.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="country_of_issue">Country of Issue</Label>
        <Input
          id="country_of_issue"
          {...dialogForm.register("country_of_issue")}
          placeholder="Choose Country"
          data-testid="input-country-of-issue"
        />
        {dialogForm.formState.errors.country_of_issue && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.country_of_issue.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="state_province_of_issue">State/Province of Issue <span className="text-gray-500 font-normal">(optional)</span></Label>
        <Input
          id="state_province_of_issue"
          {...dialogForm.register("state_province_of_issue")}
          data-testid="input-state-province"
        />
      </div>

      <div>
        <Label htmlFor="place_of_issue">Place of Issue / Issuing Authority <span className="text-gray-500 font-normal">(optional)</span></Label>
        <Input
          id="place_of_issue"
          {...dialogForm.register("place_of_issue")}
          data-testid="input-place-of-issue"
        />
      </div>

      <div>
        <Label>Date Issued <span className="text-gray-500 font-normal">(optional)</span></Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("date_issued_day")}
            onValueChange={(value) => dialogForm.setValue("date_issued_day", value)}
          >
            <SelectTrigger data-testid="select-identity-doc-issue-day">
              <SelectValue placeholder="Choose Day" />
            </SelectTrigger>
            <SelectContent>
              {days.map((day) => (
                <SelectItem key={day} value={day}>{day}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_issued_month")}
            onValueChange={(value) => dialogForm.setValue("date_issued_month", value)}
          >
            <SelectTrigger data-testid="select-identity-doc-issue-month">
              <SelectValue placeholder="Choose Month" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month} value={month}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_issued_year")}
            onValueChange={(value) => dialogForm.setValue("date_issued_year", value)}
          >
            <SelectTrigger data-testid="select-identity-doc-issue-year">
              <SelectValue placeholder="Choose Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Date of Expiry <span className="text-gray-500 font-normal">(optional)</span></Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("date_expiry_day")}
            onValueChange={(value) => dialogForm.setValue("date_expiry_day", value)}
          >
            <SelectTrigger data-testid="select-identity-doc-expiry-day">
              <SelectValue placeholder="Choose Day" />
            </SelectTrigger>
            <SelectContent>
              {days.map((day) => (
                <SelectItem key={day} value={day}>{day}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_expiry_month")}
            onValueChange={(value) => dialogForm.setValue("date_expiry_month", value)}
          >
            <SelectTrigger data-testid="select-identity-doc-expiry-month">
              <SelectValue placeholder="Choose Month" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month} value={month}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_expiry_year")}
            onValueChange={(value) => dialogForm.setValue("date_expiry_year", value)}
          >
            <SelectTrigger data-testid="select-identity-doc-expiry-year">
              <SelectValue placeholder="Choose Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
          Cancel
        </Button>
        <Button type="submit" data-testid="button-ok">
          OK
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function IdentityPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const draftSnap = useSnapshot(draftStore);

  const visaType = getVisaTypeFromPath(pathname);
  const [isSaving, setIsSaving] = useState(false);

  // Set application ID from URL params if available
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
      is_current_citizen: "yes",
      stateless_explanation: "",
      has_been_citizen: "no",
      citizenships: [],
      has_passport: "no",
      passports: [],
      has_identity_document: "no",
      identity_documents: [],
    },
  });

  // 2. Load Saved Data (Fixed Logic)
  useEffect(() => {
    // ✅ FIX: Use draftSnap, not snapshot
    const savedData = draftSnap.draft?.temporary_work_identity;

    if (savedData && Object.keys(savedData).length > 0) {
      
      // ✅ FIX: Helper to prevent "Empty Select" bugs
      const safeStr = (val) => (val === null || val === undefined) ? "" : String(val);

      const formData = {
        is_current_citizen: safeStr(savedData.is_current_citizen) || "yes",
        stateless_explanation: safeStr(savedData.stateless_explanation),
        has_been_citizen: safeStr(savedData.has_been_citizen) || "no",
        citizenships: savedData.citizenships || [],
        has_passport: safeStr(savedData.has_passport) || "no",
        passports: savedData.passports || [],
        has_identity_document: safeStr(savedData.has_identity_document) || "no",
        identity_documents: savedData.identity_documents || [],
      };
      
      form.reset(formData);
    }
  }, [draftSnap.draft?.temporary_work_identity, form]);

  // ✅ NOTE: Removed the duplicate useEffect that referenced 'snapshot'. 
  // You only need the one above.

  const isCurrentCitizen = form.watch("is_current_citizen");
  const hasBeenCitizen = form.watch("has_been_citizen");
  const hasPassport = form.watch("has_passport");
  const hasIdentityDocument = form.watch("has_identity_document");

  const citizenships = form.watch("citizenships") || [];
  const passports = form.watch("passports") || [];
  const identityDocuments = form.watch("identity_documents") || [];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const data = form.getValues();
      const result = await draftStore.saveSectionData("temporary_work_identity", data);

      if (result.success) {
        // Optional: You can remove markPageComplete here if you only want it on "Continue"
        // draftStore.markPageComplete("temporary-work/main-applicant/identity"); 
        toast({
          title: "Draft saved",
          description: "Your changes have been saved successfully",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save changes",
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
      const result = await draftStore.saveSectionData("temporary_work_identity", data);

      if (result.success) {
        // Mark complete on navigation
        await draftStore.markPageComplete(`${visaType}/main-applicant/identity`, null, "temporary_work_identity");
        
        const nextRoute = getNextRoute(pathname, visaType, draftSnap.currentApplicationId);
        if (nextRoute) {
          router.push(nextRoute);
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save changes",
          variant: "destructive",
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrevious = () => {
    const previousRoute = getPreviousRoute(pathname, visaType, draftSnap.currentApplicationId);
    if (previousRoute) {
      router.push(previousRoute);
    }
  };

  return (
    <div className="min-h-screen bg-[#E0E7FF]">
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Identity</h1>
              <p className="text-gray-600">
                In this section, provide details about the main applicant's identity.
              </p>
            </div>

            <div className="space-y-8">
              {/* Question 1: Are you currently a Citizen of any Country? */}
              <div>
                <Label className="text-base font-medium mb-3 block">
                  Are you currently a Citizen of any Country?
                </Label>
                <RadioGroup
                  value={isCurrentCitizen}
                  onValueChange={(value) => form.setValue("is_current_citizen", value)}
                  className="flex gap-4"
                  data-testid="radio-current-citizen"
                >
                  <div className="flex items-center">
                    <RadioGroupItem value="yes" id="current-citizen-yes" data-testid="radio-current-citizen-yes" />
                    <Label htmlFor="current-citizen-yes" className="ml-2 cursor-pointer font-normal">
                      Yes
                    </Label>
                  </div>
                  <div className="flex items-center">
                    <RadioGroupItem value="no" id="current-citizen-no" data-testid="radio-current-citizen-no" />
                    <Label htmlFor="current-citizen-no" className="ml-2 cursor-pointer font-normal">
                      No
                    </Label>
                  </div>
                </RadioGroup>

                {isCurrentCitizen === "no" && (
                  <div className="mt-4">
                    <Label htmlFor="stateless_explanation" className="text-sm font-normal mb-2 block">
                      You have answered that you are not a Citizen of any country. You must provide details of how, when and why you are stateless
                    </Label>
                    <Textarea
                      id="stateless_explanation"
                      {...form.register("stateless_explanation")}
                      rows={4}
                      data-testid="textarea-stateless-explanation"
                    />
                    {form.formState.errors.stateless_explanation && (
                      <p className="text-sm text-red-600 mt-1">{form.formState.errors.stateless_explanation.message}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Question 2: Have you ever been a Citizen of any Country? (shown only when not a current citizen) */}
              {isCurrentCitizen === "no" && (
                <div>
                  <Label className="text-base font-medium mb-3 block">
                    Have you ever been a Citizen of any Country?
                  </Label>
                  <RadioGroup
                    value={hasBeenCitizen}
                    onValueChange={(value) => form.setValue("has_been_citizen", value)}
                    className="flex gap-4"
                    data-testid="radio-been-citizen"
                  >
                    <div className="flex items-center">
                      <RadioGroupItem value="yes" id="been-citizen-yes" data-testid="radio-been-citizen-yes" />
                      <Label htmlFor="been-citizen-yes" className="ml-2 cursor-pointer font-normal">
                        Yes
                      </Label>
                    </div>
                    <div className="flex items-center">
                      <RadioGroupItem value="no" id="been-citizen-no" data-testid="radio-been-citizen-no" />
                      <Label htmlFor="been-citizen-no" className="ml-2 cursor-pointer font-normal">
                        No
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

                {hasBeenCitizen === "yes" && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Citizenships</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Enter details of all Citizenships that you hold or have previously held
                    </p>
                    <RepeaterTable
                      data={citizenships}
                      columns={[
                        { key: "country", label: "Country" },
                        { key: "how_obtained", label: "How was this Citizenship obtained?" },
                        { key: "date_obtained_day", label: "Date Obtained", format: (row) => `${row.date_obtained_day} ${row.date_obtained_month} ${row.date_obtained_year}` },
                      ]}
                      onAdd={(newRow) => {
                        const updated = [...citizenships, newRow];
                        form.setValue("citizenships", updated, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                      }}
                      onEdit={(index, updatedRow) => {
                        const updated = [...citizenships];
                        updated[index] = updatedRow;
                        form.setValue("citizenships", updated, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                      }}
                      onDelete={(index) => {
                        const updated = citizenships.filter((_, i) => i !== index);
                        form.setValue("citizenships", updated, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                      }}
                      DialogComponent={CitizenshipDialog}
                      addButtonText="Add"
                      testIdPrefix="citizenship"
                    />
                    {form.formState.errors.citizenships && (
                      <p className="text-sm text-red-600 mt-2">{form.formState.errors.citizenships.message}</p>
                    )}
                  </div>
                )}

              {/* Question 3: Do you currently hold or have you ever held a Passport or Travel Document? */}
              <div>
                <Label className="text-base font-medium mb-3 block">
                  Do you currently hold or have you ever held a Passport or Travel Document?
                </Label>
                <RadioGroup
                  value={hasPassport}
                  onValueChange={(value) => form.setValue("has_passport", value)}
                  className="flex gap-4"
                  data-testid="radio-passport"
                >
                  <div className="flex items-center">
                    <RadioGroupItem value="yes" id="passport-yes" data-testid="radio-passport-yes" />
                    <Label htmlFor="passport-yes" className="ml-2 cursor-pointer font-normal">
                      Yes
                    </Label>
                  </div>
                  <div className="flex items-center">
                    <RadioGroupItem value="no" id="passport-no" data-testid="radio-passport-no" />
                    <Label htmlFor="passport-no" className="ml-2 cursor-pointer font-normal">
                      No
                    </Label>
                  </div>
                </RadioGroup>

                {hasPassport === "yes" && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Passports/Travel Documents</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Enter details of all of your current passports and any passport that you have previously used to enter Australia
                    </p>
                    <RepeaterTable
                      data={passports}
                      columns={[
                        { key: "document_number", label: "Passport/Document Number" },
                        { key: "name", label: "Name" },
                        { key: "nationality", label: "Nationality" },
                        { key: "date_issued_day", label: "Date of Issue", format: (row) => `${row.date_issued_day} ${row.date_issued_month} ${row.date_issued_year}` },
                        { key: "document_status", label: "Status" },
                      ]}
                      onAdd={(newRow) => {
                        const updated = [...passports, newRow];
                        form.setValue("passports", updated, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                      }}
                      onEdit={(index, updatedRow) => {
                        const updated = [...passports];
                        updated[index] = updatedRow;
                        form.setValue("passports", updated, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                      }}
                      onDelete={(index) => {
                        const updated = passports.filter((_, i) => i !== index);
                        form.setValue("passports", updated, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                      }}
                      DialogComponent={PassportDialog}
                      addButtonText="Add"
                      testIdPrefix="passport"
                    />
                    {form.formState.errors.passports && (
                      <p className="text-sm text-red-600 mt-2">{form.formState.errors.passports.message}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Question 4: Do you hold a government issued Identity Document or Identity Number? */}
              <div>
                <Label className="text-base font-medium mb-3 block">
                  Do you hold a government issued Identity Document or Identity Number?
                </Label>
                <RadioGroup
                  value={hasIdentityDocument}
                  onValueChange={(value) => form.setValue("has_identity_document", value)}
                  className="flex gap-4"
                  data-testid="radio-identity-doc"
                >
                  <div className="flex items-center">
                    <RadioGroupItem value="yes" id="identity-doc-yes" data-testid="radio-identity-doc-yes" />
                    <Label htmlFor="identity-doc-yes" className="ml-2 cursor-pointer font-normal">
                      Yes
                    </Label>
                  </div>
                  <div className="flex items-center">
                    <RadioGroupItem value="no" id="identity-doc-no" data-testid="radio-identity-doc-no" />
                    <Label htmlFor="identity-doc-no" className="ml-2 cursor-pointer font-normal">
                      No
                    </Label>
                  </div>
                </RadioGroup>

                {hasIdentityDocument === "yes" && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Other Identity Documents</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Enter details of all government issued Identity Documents or Identity Numbers currently held by you
                    </p>
                    <RepeaterTable
                      data={identityDocuments}
                      columns={[
                        { key: "document_type", label: "Document Type" },
                        { key: "identification_number", label: "Identification Number" },
                        { key: "name", label: "Name" },
                        { key: "country_of_issue", label: "Country of Issue" },
                        { key: "date_issued_day", label: "Date of Issue", format: (row) => `${row.date_issued_day} ${row.date_issued_month} ${row.date_issued_year}` },
                        { key: "date_expiry_day", label: "Date of Expiry", format: (row) => `${row.date_expiry_day || ""} ${row.date_expiry_month || ""} ${row.date_expiry_year || ""}` },
                      ]}
                      onAdd={(newRow) => {
                        const updated = [...identityDocuments, newRow];
                        form.setValue("identity_documents", updated, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                      }}
                      onEdit={(index, updatedRow) => {
                        const updated = [...identityDocuments];
                        updated[index] = updatedRow;
                        form.setValue("identity_documents", updated, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                      }}
                      onDelete={(index) => {
                        const updated = identityDocuments.filter((_, i) => i !== index);
                        form.setValue("identity_documents", updated, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                      }}
                      DialogComponent={IdentityDocumentDialog}
                      addButtonText="Add"
                      testIdPrefix="identity-doc"
                    />
                    {form.formState.errors.identity_documents && (
                      <p className="text-sm text-red-600 mt-2">{form.formState.errors.identity_documents.message}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Desktop Navigation */}
            <FormNavigation
              loading={isSaving}
              onPrev={handlePrevious}
              onNext={form.handleSubmit(onSubmit)}
              onSave={handleSave}
              saveLabel="Save Draft"
              nextLabel="Continue"
            />
          </div>
        </div>
      </form>
    </div>
  );
}
