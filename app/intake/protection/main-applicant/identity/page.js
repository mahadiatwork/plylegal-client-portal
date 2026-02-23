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
import { StickyNav } from "@/components/StickyNav";
import { RepeaterTable } from "@/components/RepeaterTable";
import { DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { FormNavigation } from "@/components/FormNavigation";

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

const CITIZENSHIP_OBTAINED_OPTIONS = [
  "Birth",
  "Descent",
  "Naturalisation",
  "Marriage",
  "Registration",
  "Grant",
  "Other"
];

const CITIZENSHIP_CEASED_REASONS = [
  "Renunciation",
  "Deprivation",
  "Automatic loss",
  "Other"
];

const PASSPORT_TYPE_OPTIONS = [
  "Passport",
  "Emergency Passport",
  "Travel Document",
  "Refugee Travel Document",
  "Certificate of Identity",
  "Laissez-Passer",
  "Other"
];

const DOCUMENT_STATUS_OPTIONS = [
  "Current",
  "Expired",
  "Lost",
  "Stolen",
  "Cancelled",
  "Damaged"
];

const IDENTITY_DOCUMENT_TYPE_OPTIONS = [
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

// Form schema
const formSchema = z.object({
  // Question 1: Current Citizenship
  is_current_citizen: z.enum(["yes", "no"]),
  stateless_explanation: z.string().optional(),

  // Question 2: Ever been a Citizen
  has_been_citizen: z.enum(["yes", "no"]),
  citizenships: z.array(z.object({
    country: z.string(),
    how_obtained: z.string(),
    date_obtained_day: z.string().optional(),
    date_obtained_month: z.string().optional(),
    date_obtained_year: z.string().optional(),
    still_citizen: z.string(),
    date_ceased_day: z.string().optional(),
    date_ceased_month: z.string().optional(),
    date_ceased_year: z.string().optional(),
    ceased_reason: z.string().optional(),
  })).optional(),

  // Question 3: Passport/Travel Document
  has_passport: z.enum(["yes", "no"]),
  passports: z.array(z.object({
    document_type: z.string(),
    document_number: z.string(),
    passport_country: z.string(),
    place_of_issue: z.string().optional(),
    nationality: z.string(),
    gender: z.string().optional(),
    name: z.string(),
    date_issued_day: z.string(),
    date_issued_month: z.string(),
    date_issued_year: z.string(),
    date_expiry_day: z.string().optional(),
    date_expiry_month: z.string().optional(),
    date_expiry_year: z.string().optional(),
    document_status: z.string(),
  })).optional(),

  // Question 4: Identity Document
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

  // Question 5: Temporary or Permanent Residency
  has_permanent_residency: z.enum(["yes", "no"]),
  pr_countries: z.array(z.object({
    country: z.string(),
    residency_status: z.string(),
    expiry_day: z.string().optional(),
    expiry_month: z.string().optional(),
    expiry_year: z.string().optional(),
  })).optional(),
});

// ========== Dialog Components ==========

// Citizenship Dialog Schema
const citizenshipDialogSchema = z.object({
  country: z.string().min(1, "Country is required"),
  how_obtained: z.string().min(1, "How obtained is required"),
  date_obtained_day: z.string().min(1, "Day is required"),
  date_obtained_month: z.string().min(1, "Month is required"),
  date_obtained_year: z.string().min(1, "Year is required"),
  still_citizen: z.string().min(1, "Please select yes or no"),
  date_ceased_day: z.string().optional(),
  date_ceased_month: z.string().optional(),
  date_ceased_year: z.string().optional(),
  ceased_reason: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.still_citizen === "no") {
    if (!data.date_ceased_day || !data.date_ceased_month || !data.date_ceased_year) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Date ceased is required when you are no longer a citizen",
        path: ["date_ceased_day"],
      });
    }
    if (!data.ceased_reason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Reason is required when you are no longer a citizen",
        path: ["ceased_reason"],
      });
    }
  }
});

function CitizenshipDialog({ editingRow, onSave, onCancel }) {
  const row = editingRow;
  const [stillCitizen, setStillCitizen] = useState(row?.still_citizen || "yes");

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
      ceased_reason: "",
    },
  });

  useEffect(() => {
    if (row?.still_citizen) {
      setStillCitizen(row.still_citizen);
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
      className="space-y-4 max-h-[70vh] overflow-y-auto pr-2"
    >
      <p className="text-sm text-gray-600 mb-4">
        Enter details of Citizenship that you hold or have previously held
      </p>

      <div>
        <Label htmlFor="country">Country of Citizenship <span className="text-red-500">*</span></Label>
        <Select
          value={dialogForm.watch("country")}
          onValueChange={(value) => dialogForm.setValue("country", value, { shouldValidate: true })}
        >
          <SelectTrigger data-testid="select-citizenship-country">
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

      <div>
        <Label htmlFor="how_obtained">How was this Citizenship obtained? <span className="text-red-500">*</span></Label>
        <Select
          value={dialogForm.watch("how_obtained")}
          onValueChange={(value) => dialogForm.setValue("how_obtained", value, { shouldValidate: true })}
        >
          <SelectTrigger data-testid="select-how-obtained">
            <SelectValue placeholder="Choose Reason" />
          </SelectTrigger>
          <SelectContent position="popper">
            {CITIZENSHIP_OBTAINED_OPTIONS.map((reason) => (
              <SelectItem key={reason} value={reason}>{reason}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.how_obtained && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.how_obtained.message}</p>
        )}
      </div>

      <div>
        <Label>Date Obtained <span className="text-red-500">*</span></Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("date_obtained_day")}
            onValueChange={(value) => dialogForm.setValue("date_obtained_day", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-obtained-day">
              <SelectValue placeholder="Day" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              {days.map((day) => (
                <SelectItem key={day} value={day}>{day}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_obtained_month")}
            onValueChange={(value) => dialogForm.setValue("date_obtained_month", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-obtained-month">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              {months.map((month, idx) => (
                <SelectItem key={month} value={(idx + 1).toString()}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_obtained_year")}
            onValueChange={(value) => dialogForm.setValue("date_obtained_year", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-obtained-year">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              {years.map((year) => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {dialogForm.formState.errors.date_obtained_day && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.date_obtained_day.message}</p>
        )}
      </div>

      <div className="pt-4 border-t border-gray-200">
        <Label className="text-sm font-medium mb-2 block">
          Are you still a Citizen of this country? <span className="text-red-500">*</span>
        </Label>
        <RadioGroup
          value={stillCitizen}
          onValueChange={(value) => {
            setStillCitizen(value);
            dialogForm.setValue("still_citizen", value, { shouldValidate: true });
          }}
          className="flex gap-4"
          data-testid="radio-still-citizen"
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
        {dialogForm.formState.errors.still_citizen && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.still_citizen.message}</p>
        )}
      </div>

      {stillCitizen === "no" && (
        <div className="space-y-4 pl-4 border-l-2 border-gray-200">
          <div>
            <Label>Date ceased <span className="text-red-500">*</span></Label>
            <div className="grid grid-cols-3 gap-2">
              <Select
                value={dialogForm.watch("date_ceased_day")}
                onValueChange={(value) => dialogForm.setValue("date_ceased_day", value, { shouldValidate: true })}
              >
                <SelectTrigger data-testid="select-ceased-day">
                  <SelectValue placeholder="Day" />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                  {days.map((day) => (
                    <SelectItem key={day} value={day}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={dialogForm.watch("date_ceased_month")}
                onValueChange={(value) => dialogForm.setValue("date_ceased_month", value, { shouldValidate: true })}
              >
                <SelectTrigger data-testid="select-ceased-month">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                  {months.map((month, idx) => (
                    <SelectItem key={month} value={(idx + 1).toString()}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={dialogForm.watch("date_ceased_year")}
                onValueChange={(value) => dialogForm.setValue("date_ceased_year", value, { shouldValidate: true })}
              >
                <SelectTrigger data-testid="select-ceased-year">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                  {years.map((year) => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {dialogForm.formState.errors.date_ceased_day && (
              <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.date_ceased_day.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="ceased_reason">Reason <span className="text-red-500">*</span></Label>
            <Select
              value={dialogForm.watch("ceased_reason")}
              onValueChange={(value) => dialogForm.setValue("ceased_reason", value, { shouldValidate: true })}
            >
              <SelectTrigger data-testid="select-ceased-reason">
                <SelectValue placeholder="Choose Reason" />
              </SelectTrigger>
              <SelectContent position="popper">
                {CITIZENSHIP_CEASED_REASONS.map((reason) => (
                  <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {dialogForm.formState.errors.ceased_reason && (
              <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.ceased_reason.message}</p>
            )}
          </div>
        </div>
      )}

      <DialogFooter className="gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
          Cancel
        </Button>
        <Button type="submit" className="bg-[#285646] hover:bg-[#1e4336] text-white" data-testid="button-ok">
          Ok
        </Button>
      </DialogFooter>
    </form>
  );
}

// Passport/Travel Document Dialog Schema
const passportDialogSchema = z.object({
  document_number: z.string().min(1, "Document number is required"),
  name: z.string().min(1, "Name is required"),
  nationality: z.string().min(1, "Nationality is required"),
  date_issued_day: z.string().min(1, "Day is required"),
  date_issued_month: z.string().min(1, "Month is required"),
  date_issued_year: z.string().min(1, "Year is required"),
  document_status: z.string().min(1, "Status is required"),
  document_type: z.string().optional(),
  passport_country: z.string().optional(),
  place_of_issue: z.string().optional(),
  gender: z.string().optional(),
  date_expiry_day: z.string().optional(),
  date_expiry_month: z.string().optional(),
  date_expiry_year: z.string().optional(),
});

function PassportDialog({ editingRow, onSave, onCancel }) {
  const row = editingRow;

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
      date_expiry_day: "",
      date_expiry_month: "",
      date_expiry_year: "",
      document_status: "",
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
  const futureYears = Array.from({ length: 20 }, (_, i) => (currentYear + i).toString());

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dialogForm.handleSubmit(handleFormSubmit)(e);
      }}
      className="space-y-4 max-h-[70vh] overflow-y-auto pr-2"
    >
      <div>
        <Label htmlFor="document_number">Passport/Document Number <span className="text-red-500">*</span></Label>
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
        <Label htmlFor="name">Name (as shown on document) <span className="text-red-500">*</span></Label>
        <Input
          id="name"
          {...dialogForm.register("name")}
          placeholder="Enter name as it appears on document"
          data-testid="input-passport-name"
        />
        {dialogForm.formState.errors.name && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.name.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="nationality">Nationality <span className="text-red-500">*</span></Label>
        <Select
          value={dialogForm.watch("nationality")}
          onValueChange={(value) => dialogForm.setValue("nationality", value, { shouldValidate: true })}
        >
          <SelectTrigger data-testid="select-passport-nationality">
            <SelectValue placeholder="Choose Nationality" />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
            {COUNTRY_OPTIONS.map((country) => (
              <SelectItem key={country} value={country}>{country}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.nationality && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.nationality.message}</p>
        )}
      </div>

      <div>
        <Label>Date of Issue <span className="text-red-500">*</span></Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("date_issued_day")}
            onValueChange={(value) => dialogForm.setValue("date_issued_day", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-passport-issue-day">
              <SelectValue placeholder="Day" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
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
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              {months.map((month, idx) => (
                <SelectItem key={month} value={(idx + 1).toString()}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_issued_year")}
            onValueChange={(value) => dialogForm.setValue("date_issued_year", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-passport-issue-year">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              {years.map((year) => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {dialogForm.formState.errors.date_issued_day && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.date_issued_day.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="document_status">Status <span className="text-red-500">*</span></Label>
        <Select
          value={dialogForm.watch("document_status")}
          onValueChange={(value) => dialogForm.setValue("document_status", value, { shouldValidate: true })}
        >
          <SelectTrigger data-testid="select-passport-status">
            <SelectValue placeholder="Choose Status" />
          </SelectTrigger>
          <SelectContent position="popper">
            {DOCUMENT_STATUS_OPTIONS.map((status) => (
              <SelectItem key={status} value={status}>{status}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.document_status && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.document_status.message}</p>
        )}
      </div>

      <div className="pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Additional Details (Optional)</h4>

        <div className="space-y-4">
          <div>
            <Label htmlFor="document_type">Type of Document</Label>
            <Select
              value={dialogForm.watch("document_type")}
              onValueChange={(value) => dialogForm.setValue("document_type", value)}
            >
              <SelectTrigger data-testid="select-passport-type">
                <SelectValue placeholder="Choose Type" />
              </SelectTrigger>
              <SelectContent position="popper">
                {PASSPORT_TYPE_OPTIONS.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="passport_country">Country of Issue</Label>
            <Select
              value={dialogForm.watch("passport_country")}
              onValueChange={(value) => dialogForm.setValue("passport_country", value)}
            >
              <SelectTrigger data-testid="select-passport-country">
                <SelectValue placeholder="Choose Country" />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                {COUNTRY_OPTIONS.map((country) => (
                  <SelectItem key={country} value={country}>{country}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="place_of_issue">Place of Issue</Label>
            <Input
              id="place_of_issue"
              {...dialogForm.register("place_of_issue")}
              data-testid="input-place-of-issue"
            />
          </div>

          <div>
            <Label>Date of Expiry</Label>
            <div className="grid grid-cols-3 gap-2">
              <Select
                value={dialogForm.watch("date_expiry_day")}
                onValueChange={(value) => dialogForm.setValue("date_expiry_day", value)}
              >
                <SelectTrigger data-testid="select-passport-expiry-day">
                  <SelectValue placeholder="Day" />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                  {days.map((day) => (
                    <SelectItem key={day} value={day}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={dialogForm.watch("date_expiry_month")}
                onValueChange={(value) => dialogForm.setValue("date_expiry_month", value)}
              >
                <SelectTrigger data-testid="select-passport-expiry-month">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                  {months.map((month, idx) => (
                    <SelectItem key={month} value={(idx + 1).toString()}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={dialogForm.watch("date_expiry_year")}
                onValueChange={(value) => dialogForm.setValue("date_expiry_year", value)}
              >
                <SelectTrigger data-testid="select-passport-expiry-year">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                  {futureYears.map((year) => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter className="gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
          Cancel
        </Button>
        <Button type="submit" className="bg-[#285646] hover:bg-[#1e4336] text-white" data-testid="button-ok">
          Ok
        </Button>
      </DialogFooter>
    </form>
  );
}

// Identity Document Dialog Schema
const identityDocDialogSchema = z.object({
  document_type: z.string().min(1, "Document type is required"),
  identification_number: z.string().min(1, "Identification number is required"),
  country_of_issue: z.string().min(1, "Country is required"),
  name: z.string().min(1, "Name is required"),
  state_province_of_issue: z.string().optional(),
  place_of_issue: z.string().optional(),
  date_issued_day: z.string().optional(),
  date_issued_month: z.string().optional(),
  date_issued_year: z.string().optional(),
  date_expiry_day: z.string().optional(),
  date_expiry_month: z.string().optional(),
  date_expiry_year: z.string().optional(),
});

function IdentityDocumentDialog({ editingRow, onSave, onCancel }) {
  const row = editingRow;

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
  const futureYears = Array.from({ length: 20 }, (_, i) => (currentYear + i).toString());

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dialogForm.handleSubmit(handleFormSubmit)(e);
      }}
      className="space-y-4 max-h-[70vh] overflow-y-auto pr-2"
    >
      <p className="text-sm text-gray-600 mb-4">
        Enter the type, identification number, and issuing country of the Document
      </p>

      <div>
        <Label htmlFor="document_type">Document Type <span className="text-red-500">*</span></Label>
        <Select
          value={dialogForm.watch("document_type")}
          onValueChange={(value) => dialogForm.setValue("document_type", value, { shouldValidate: true })}
        >
          <SelectTrigger data-testid="select-identity-doc-type">
            <SelectValue placeholder="Choose Type" />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
            {IDENTITY_DOCUMENT_TYPE_OPTIONS.map((type) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.document_type && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.document_type.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="identification_number">Identification Number <span className="text-red-500">*</span></Label>
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
        <Label htmlFor="country_of_issue">Country of Issue <span className="text-red-500">*</span></Label>
        <Select
          value={dialogForm.watch("country_of_issue")}
          onValueChange={(value) => dialogForm.setValue("country_of_issue", value, { shouldValidate: true })}
        >
          <SelectTrigger data-testid="select-country-of-issue">
            <SelectValue placeholder="Choose Country" />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
            {COUNTRY_OPTIONS.map((country) => (
              <SelectItem key={country} value={country}>{country}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.country_of_issue && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.country_of_issue.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="state_province_of_issue">State/Province of Issue</Label>
        <Input
          id="state_province_of_issue"
          {...dialogForm.register("state_province_of_issue")}
          data-testid="input-state-province"
        />
      </div>

      <div>
        <Label htmlFor="place_of_issue">Place of Issue / Issuing Authority</Label>
        <Input
          id="place_of_issue"
          {...dialogForm.register("place_of_issue")}
          data-testid="input-place-of-issue"
        />
      </div>

      <div className="pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Name</h4>
        <p className="text-sm text-gray-600 mb-3">
          Specify the name that is shown on this Identity Document by selecting one of the names for this person
          previously entered in this questionnaire. If the correct name is not shown as an option it will need to
          be added in the Other Names question located on this person's Other tab.
        </p>
        <div>
          <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
          <Input
            id="name"
            {...dialogForm.register("name")}
            placeholder="Enter name as shown on document"
            data-testid="input-identity-doc-name"
          />
          {dialogForm.formState.errors.name && (
            <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.name.message}</p>
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Dates</h4>
        <p className="text-sm text-gray-600 mb-3">
          Enter the issue and expiry dates of the Document (Leave blank if not applicable)
        </p>

        <div className="space-y-4">
          <div>
            <Label>Date Issued</Label>
            <div className="grid grid-cols-3 gap-2">
              <Select
                value={dialogForm.watch("date_issued_day")}
                onValueChange={(value) => dialogForm.setValue("date_issued_day", value)}
              >
                <SelectTrigger data-testid="select-identity-doc-issue-day">
                  <SelectValue placeholder="Day" />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
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
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                  {months.map((month, idx) => (
                    <SelectItem key={month} value={(idx + 1).toString()}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={dialogForm.watch("date_issued_year")}
                onValueChange={(value) => dialogForm.setValue("date_issued_year", value)}
              >
                <SelectTrigger data-testid="select-identity-doc-issue-year">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                  {years.map((year) => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Date of Expiry</Label>
            <div className="grid grid-cols-3 gap-2">
              <Select
                value={dialogForm.watch("date_expiry_day")}
                onValueChange={(value) => dialogForm.setValue("date_expiry_day", value)}
              >
                <SelectTrigger data-testid="select-identity-doc-expiry-day">
                  <SelectValue placeholder="Day" />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
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
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                  {months.map((month, idx) => (
                    <SelectItem key={month} value={(idx + 1).toString()}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={dialogForm.watch("date_expiry_year")}
                onValueChange={(value) => dialogForm.setValue("date_expiry_year", value)}
              >
                <SelectTrigger data-testid="select-identity-doc-expiry-year">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                  {futureYears.map((year) => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter className="gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
          Cancel
        </Button>
        <Button type="submit" className="bg-[#285646] hover:bg-[#1e4336] text-white" data-testid="button-ok">
          Ok
        </Button>
      </DialogFooter>
    </form>
  );
}

// Permanent Residency Dialog Schema
const prDialogSchema = z.object({
  country: z.string().min(1, "Country is required"),
  residency_status: z.string().min(1, "Residency status is required"),
  expiry_day: z.string().optional(),
  expiry_month: z.string().optional(),
  expiry_year: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.residency_status === "Temporary") {
    if (!data.expiry_day || !data.expiry_month || !data.expiry_year) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Expiry date is required for temporary residency",
        path: ["expiry_day"],
      });
    }
  }
});

function PermanentResidencyDialog({ editingRow, onSave, onCancel }) {
  const row = editingRow;
  const [residencyStatus, setResidencyStatus] = useState(row?.residency_status || "Permanent");

  const dialogForm = useForm({
    resolver: zodResolver(prDialogSchema),
    defaultValues: row || {
      country: "",
      residency_status: "Permanent",
      expiry_day: "",
      expiry_month: "",
      expiry_year: "",
    },
  });

  useEffect(() => {
    if (row?.residency_status) {
      setResidencyStatus(row.residency_status);
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
  const futureYears = Array.from({ length: 20 }, (_, i) => (currentYear + i).toString());

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
        <Label htmlFor="country">Country <span className="text-red-500">*</span></Label>
        <Select
          value={dialogForm.watch("country")}
          onValueChange={(value) => dialogForm.setValue("country", value, { shouldValidate: true })}
        >
          <SelectTrigger data-testid="select-pr-country">
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

      <div>
        <Label className="text-sm font-medium mb-2 block">
          Residency Status <span className="text-red-500">*</span>
        </Label>
        <RadioGroup
          value={residencyStatus}
          onValueChange={(value) => {
            setResidencyStatus(value);
            dialogForm.setValue("residency_status", value, { shouldValidate: true });
          }}
          className="flex gap-4"
          data-testid="radio-residency-status"
        >
          <div className="flex items-center">
            <RadioGroupItem value="Permanent" id="residency-permanent" />
            <Label htmlFor="residency-permanent" className="ml-2 cursor-pointer font-normal">Permanent</Label>
          </div>
          <div className="flex items-center">
            <RadioGroupItem value="Temporary" id="residency-temporary" />
            <Label htmlFor="residency-temporary" className="ml-2 cursor-pointer font-normal">Temporary</Label>
          </div>
        </RadioGroup>
        {dialogForm.formState.errors.residency_status && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.residency_status.message}</p>
        )}
      </div>

      {residencyStatus === "Temporary" && (
        <div>
          <Label className="mb-2 block">Expiry Date of Temporary Residency <span className="text-red-500">*</span></Label>
          <div className="grid grid-cols-3 gap-2">
            <Select
              value={dialogForm.watch("expiry_day")}
              onValueChange={(value) => dialogForm.setValue("expiry_day", value, { shouldValidate: true })}
            >
              <SelectTrigger data-testid="select-pr-expiry-day">
                <SelectValue placeholder="Day" />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                {days.map((day) => (
                  <SelectItem key={day} value={day}>{day}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={dialogForm.watch("expiry_month")}
              onValueChange={(value) => dialogForm.setValue("expiry_month", value, { shouldValidate: true })}
            >
              <SelectTrigger data-testid="select-pr-expiry-month">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                {months.map((month, idx) => (
                  <SelectItem key={month} value={(idx + 1).toString()}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={dialogForm.watch("expiry_year")}
              onValueChange={(value) => dialogForm.setValue("expiry_year", value, { shouldValidate: true })}
            >
              <SelectTrigger data-testid="select-pr-expiry-year">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                {futureYears.map((year) => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {dialogForm.formState.errors.expiry_day && (
            <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.expiry_day.message}</p>
          )}
        </div>
      )}

      <DialogFooter className="gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
          Cancel
        </Button>
        <Button type="submit" className="bg-[#285646] hover:bg-[#1e4336] text-white" data-testid="button-ok">
          Ok
        </Button>
      </DialogFooter>
    </form>
  );
}

// ========== Main Page Component ==========

export default function IdentityPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const snapshot = useSnapshot(draftStore);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const visaType = getVisaTypeFromPath(pathname);

  // Set application ID from URL params if available
  useEffect(() => {
    const appIdFromUrl = searchParams.get('applicationId');
    if (appIdFromUrl && appIdFromUrl !== snapshot.currentApplicationId) {
      draftStore.setApplicationId(appIdFromUrl);
      draftStore.loadDraft(appIdFromUrl);
    }
  }, [searchParams, snapshot.currentApplicationId]);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      is_current_citizen: "no",
      stateless_explanation: "",
      has_been_citizen: "no",
      citizenships: [],
      has_passport: "no",
      passports: [],
      has_identity_document: "no",
      identity_documents: [],
      has_permanent_residency: "no",
      pr_countries: [],
    },
  });

  // Load saved data when draft is available
  useEffect(() => {
    const savedData = snapshot.draft?.protection_identity || {};
    if (Object.keys(savedData).length > 0) {
      // Merge saved data with default values to ensure all fields are set
      const formData = {
        is_current_citizen: savedData.is_current_citizen || "no",
        stateless_explanation: savedData.stateless_explanation || "",
        has_been_citizen: savedData.has_been_citizen || "no",
        citizenships: savedData.citizenships || [],
        has_passport: savedData.has_passport || "no",
        passports: savedData.passports || [],
        has_identity_document: savedData.has_identity_document || "no",
        identity_documents: savedData.identity_documents || [],
        has_permanent_residency: savedData.has_permanent_residency || "no",
        pr_countries: savedData.pr_countries || [],
      };

      // Use reset to properly update all form fields
      form.reset(formData);
    }
  }, [snapshot.draft?.protection_identity]);

  // Watch form values
  const isCurrentCitizen = form.watch("is_current_citizen");
  const hasBeenCitizen = form.watch("has_been_citizen");
  const hasPassport = form.watch("has_passport");
  const hasIdentityDocument = form.watch("has_identity_document");
  const hasPermanentResidency = form.watch("has_permanent_residency");

  const citizenships = form.watch("citizenships") || [];
  const passports = form.watch("passports") || [];
  const identityDocuments = form.watch("identity_documents") || [];
  const prCountries = form.watch("pr_countries") || [];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Validate form before saving
      const isValid = await form.trigger();
      if (!isValid) {
        toast({
          title: "Validation Error",
          description: "Please fix the errors in the form before saving",
          variant: "destructive",
        });
        return;
      }

      const data = form.getValues();
      console.log("Saving protection_identity data:", data); // Debug log
      const result = await draftStore.saveSectionData("protection_identity", data);

      if (result.success) {
        toast({
          title: "Draft saved",
          description: "Your changes have been saved successfully",
        });
      } else {
        console.error("Save failed:", result.error); // Debug log
        toast({
          title: "Error",
          description: result.error || "Failed to save changes",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error in handleSave:", error); // Debug log
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const result = await draftStore.saveSectionData("protection_identity", data);
      if (result.success) {
        await draftStore.markPageComplete(`${visaType}/main-applicant/identity`);
        const nextRoute = getNextRoute(pathname, visaType, draftStore.currentApplicationId);
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
    } catch (error) {
      console.error("Error submitting:", error);
      toast({ title: "Error", description: "Failed to submit", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrevious = () => {
    const previousRoute = getPreviousRoute(pathname, visaType, draftStore.currentApplicationId);
    if (previousRoute) {
      router.push(previousRoute);
    }
  };

  // Helper functions for updating arrays
  const updateCitizenships = (newData) => {
    form.setValue("citizenships", newData);
  };

  const updatePassports = (newData) => {
    form.setValue("passports", newData);
  };

  const updateIdentityDocuments = (newData) => {
    form.setValue("identity_documents", newData);
  };

  const updatePrCountries = (newData) => {
    form.setValue("pr_countries", newData);
  };

  // Table column definitions
  const citizenshipColumns = [
    { key: "country", label: "Country" },
    { key: "how_obtained", label: "How was this Citizenship obtained?" },
    {
      key: "date_obtained",
      label: "Date Obtained",
      format: (row) => {
        if (!row.date_obtained_day || !row.date_obtained_month || !row.date_obtained_year) return "-";
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${row.date_obtained_day} ${months[parseInt(row.date_obtained_month) - 1]} ${row.date_obtained_year}`;
      }
    },
    {
      key: "still_citizen",
      label: "Are you still a Citizen of this Country?",
      format: (row) => row.still_citizen === "yes" ? "Yes" : "No"
    },
  ];

  const passportColumns = [
    { key: "document_number", label: "Passport/Document Number" },
    { key: "name", label: "Name" },
    { key: "nationality", label: "Nationality" },
    {
      key: "date_issued",
      label: "Date of Issue",
      format: (row) => {
        if (!row.date_issued_day || !row.date_issued_month || !row.date_issued_year) return "-";
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${row.date_issued_day} ${months[parseInt(row.date_issued_month) - 1]} ${row.date_issued_year}`;
      }
    },
    { key: "document_status", label: "Status" },
  ];

  const identityDocColumns = [
    { key: "document_type", label: "Document Type" },
    { key: "identification_number", label: "Identification Number" },
    { key: "name", label: "Name" },
    { key: "country_of_issue", label: "Country of Issue" },
    {
      key: "date_issued",
      label: "Date of Issue",
      format: (row) => {
        if (!row.date_issued_day || !row.date_issued_month || !row.date_issued_year) return "-";
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${row.date_issued_day} ${months[parseInt(row.date_issued_month) - 1]} ${row.date_issued_year}`;
      }
    },
  ];

  const prCountryColumns = [
    { key: "country", label: "Country" },
    { key: "residency_status", label: "Status" },
    {
      key: "expiry_date",
      label: "Expiry Date",
      format: (row) => {
        if (!row.expiry_day || !row.expiry_month || !row.expiry_year) return "-";
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${row.expiry_day} ${months[parseInt(row.expiry_month) - 1]} ${row.expiry_year}`;
      }
    },
  ];

  return (
    <div className="min-h-screen bg-[#E0E7FF]">
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <StickyNav
          onSave={handleSave}
          onPrev={handlePrevious}
          onNext={form.handleSubmit(onSubmit)}
          loading={isSaving}
          nextLabel="Continue"
          previousTestId="button-previous-mobile"
          nextTestId="button-continue-mobile"
          saveTestId="button-save-mobile"
        />

        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Identity</h1>
              <p className="text-gray-600">
                In this section, provide details about the main applicant's identity.
              </p>
            </div>

            <div className="space-y-10">
              {/* Question 1: Current Citizenship */}
              <div className="space-y-4">
                <Label className="text-base font-medium block">
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
                    <Label htmlFor="current-citizen-yes" className="ml-2 cursor-pointer font-normal">Yes</Label>
                  </div>
                  <div className="flex items-center">
                    <RadioGroupItem value="no" id="current-citizen-no" data-testid="radio-current-citizen-no" />
                    <Label htmlFor="current-citizen-no" className="ml-2 cursor-pointer font-normal">No</Label>
                  </div>
                </RadioGroup>

                {isCurrentCitizen === "yes" && (
                  <div className="mt-6 space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Citizenships for the Main Applicant
                    </h3>
                    <p className="text-sm text-gray-600">
                      Enter details of all Citizenships that you hold or have previously held
                    </p>
                    <RepeaterTable
                      data={citizenships}
                      columns={citizenshipColumns}
                      onAdd={(newRow) => updateCitizenships([...citizenships, newRow])}
                      onEdit={(index, updatedRow) => {
                        const updated = [...citizenships];
                        updated[index] = updatedRow;
                        updateCitizenships(updated);
                      }}
                      onDelete={(index) => {
                        const updated = citizenships.filter((_, i) => i !== index);
                        updateCitizenships(updated);
                      }}
                      DialogComponent={CitizenshipDialog}
                      addButtonText="Add"
                      emptyMessage="No citizenships added"
                      dialogTitle="Citizenship"
                      testIdPrefix="citizenship"
                    />
                  </div>
                )}

                {isCurrentCitizen === "no" && (
                  <div className="mt-4">
                    <Label className="text-sm font-normal mb-2 block text-gray-700">
                      You have answered that you are not a Citizen of any country. You must provide details of how, when and why you are stateless
                    </Label>
                    <Textarea
                      {...form.register("stateless_explanation")}
                      rows={4}
                      className="w-full"
                      placeholder=""
                      data-testid="textarea-stateless-explanation"
                    />
                  </div>
                )}
              </div>

              {/* Question 2: Have you ever been a Citizen - Only shown if Question 1 is "No" */}
              {isCurrentCitizen === "no" && (
                <div className="space-y-4 pt-6 border-t border-gray-200">
                  <Label className="text-base font-medium block">
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
                      <Label htmlFor="been-citizen-yes" className="ml-2 cursor-pointer font-normal">Yes</Label>
                    </div>
                    <div className="flex items-center">
                      <RadioGroupItem value="no" id="been-citizen-no" data-testid="radio-been-citizen-no" />
                      <Label htmlFor="been-citizen-no" className="ml-2 cursor-pointer font-normal">No</Label>
                    </div>
                  </RadioGroup>

                  {hasBeenCitizen === "yes" && (
                    <div className="mt-6 space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Citizenships for the Main Applicant
                      </h3>
                      <p className="text-sm text-gray-600">
                        Enter details of all Citizenships that you hold or have previously held
                      </p>
                      <RepeaterTable
                        data={citizenships}
                        columns={citizenshipColumns}
                        onAdd={(newRow) => updateCitizenships([...citizenships, newRow])}
                        onEdit={(index, updatedRow) => {
                          const updated = [...citizenships];
                          updated[index] = updatedRow;
                          updateCitizenships(updated);
                        }}
                        onDelete={(index) => {
                          const updated = citizenships.filter((_, i) => i !== index);
                          updateCitizenships(updated);
                        }}
                        DialogComponent={CitizenshipDialog}
                        addButtonText="Add"
                        emptyMessage="No citizenships added"
                        dialogTitle="Citizenship"
                        testIdPrefix="citizenship"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Question 3: Passport/Travel Document */}
              <div className="space-y-4 pt-6 border-t border-gray-200">
                <Label className="text-base font-medium block">
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
                    <Label htmlFor="passport-yes" className="ml-2 cursor-pointer font-normal">Yes</Label>
                  </div>
                  <div className="flex items-center">
                    <RadioGroupItem value="no" id="passport-no" data-testid="radio-passport-no" />
                    <Label htmlFor="passport-no" className="ml-2 cursor-pointer font-normal">No</Label>
                  </div>
                </RadioGroup>

                {hasPassport === "yes" && (
                  <div className="mt-6 space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Passports/Travel Documents for the Main Applicant
                    </h3>
                    <p className="text-sm text-gray-600">
                      Enter details of all passports ever held by you
                    </p>
                    <RepeaterTable
                      data={passports}
                      columns={passportColumns}
                      onAdd={(newRow) => updatePassports([...passports, newRow])}
                      onEdit={(index, updatedRow) => {
                        const updated = [...passports];
                        updated[index] = updatedRow;
                        updatePassports(updated);
                      }}
                      onDelete={(index) => {
                        const updated = passports.filter((_, i) => i !== index);
                        updatePassports(updated);
                      }}
                      DialogComponent={PassportDialog}
                      addButtonText="Add"
                      emptyMessage="No passports/travel documents added"
                      dialogTitle="Passport / Travel Document"
                      testIdPrefix="passport"
                    />
                  </div>
                )}
              </div>

              {/* Question 4: Government Identity Document */}
              <div className="space-y-4 pt-6 border-t border-gray-200">
                <Label className="text-base font-medium block">
                  Do you have or have you ever had a government issued Identity Document or Identity Number?
                </Label>
                <RadioGroup
                  value={hasIdentityDocument}
                  onValueChange={(value) => form.setValue("has_identity_document", value)}
                  className="flex gap-4"
                  data-testid="radio-identity-doc"
                >
                  <div className="flex items-center">
                    <RadioGroupItem value="yes" id="identity-doc-yes" data-testid="radio-identity-doc-yes" />
                    <Label htmlFor="identity-doc-yes" className="ml-2 cursor-pointer font-normal">Yes</Label>
                  </div>
                  <div className="flex items-center">
                    <RadioGroupItem value="no" id="identity-doc-no" data-testid="radio-identity-doc-no" />
                    <Label htmlFor="identity-doc-no" className="ml-2 cursor-pointer font-normal">No</Label>
                  </div>
                </RadioGroup>

                {hasIdentityDocument === "yes" && (
                  <div className="mt-6 space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Other Identity Documents for the Main Applicant
                    </h3>
                    <p className="text-sm text-gray-600">
                      Enter details of all government issued Identity Documents or Identity Numbers ever held by you
                    </p>
                    <RepeaterTable
                      data={identityDocuments}
                      columns={identityDocColumns}
                      onAdd={(newRow) => updateIdentityDocuments([...identityDocuments, newRow])}
                      onEdit={(index, updatedRow) => {
                        const updated = [...identityDocuments];
                        updated[index] = updatedRow;
                        updateIdentityDocuments(updated);
                      }}
                      onDelete={(index) => {
                        const updated = identityDocuments.filter((_, i) => i !== index);
                        updateIdentityDocuments(updated);
                      }}
                      DialogComponent={IdentityDocumentDialog}
                      addButtonText="Add"
                      emptyMessage="No identity documents added"
                      dialogTitle="Identity Document"
                      testIdPrefix="identity-doc"
                    />
                  </div>
                )}
              </div>

              {/* Question 5: Temporary or Permanent Residency */}
              <div className="space-y-4 pt-6 border-t border-gray-200">
                <Label className="text-base font-medium block">
                  Do you have the right to temporary or permanently reside in any country of which you are not a citizen?
                </Label>
                <RadioGroup
                  value={hasPermanentResidency}
                  onValueChange={(value) => form.setValue("has_permanent_residency", value)}
                  className="flex gap-4"
                  data-testid="radio-permanent-residency"
                >
                  <div className="flex items-center">
                    <RadioGroupItem value="yes" id="pr-yes" data-testid="radio-pr-yes" />
                    <Label htmlFor="pr-yes" className="ml-2 cursor-pointer font-normal">Yes</Label>
                  </div>
                  <div className="flex items-center">
                    <RadioGroupItem value="no" id="pr-no" data-testid="radio-pr-no" />
                    <Label htmlFor="pr-no" className="ml-2 cursor-pointer font-normal">No</Label>
                  </div>
                </RadioGroup>

                {hasPermanentResidency === "yes" && (
                  <div className="mt-6 space-y-4">
                    <p className="text-sm text-gray-600">
                      Enter details of all countries that you hold temporary or permanent residency for
                    </p>
                    <RepeaterTable
                      data={prCountries}
                      columns={prCountryColumns}
                      onAdd={(newRow) => updatePrCountries([...prCountries, newRow])}
                      onEdit={(index, updatedRow) => {
                        const updated = [...prCountries];
                        updated[index] = updatedRow;
                        updatePrCountries(updated);
                      }}
                      onDelete={(index) => {
                        const updated = prCountries.filter((_, i) => i !== index);
                        updatePrCountries(updated);
                      }}
                      DialogComponent={PermanentResidencyDialog}
                      addButtonText="Add"
                      emptyMessage="No permanent residencies added"
                      dialogTitle="Temporary or Permanent Residency"
                      testIdPrefix="pr-country"
                    />
                  </div>
                )}
              </div>
            </div>

            <FormNavigation
              onPrev={handlePrevious}
              onNext={form.handleSubmit(onSubmit)}
              onSave={handleSave}
              loading={isSaving}
              submitting={isSubmitting}
              disabledNext={!form.formState.isValid}
            />
          </div>
        </div>
      </form>
    </div>
  );
}
