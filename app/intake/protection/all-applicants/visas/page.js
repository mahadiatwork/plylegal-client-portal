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

const OUTCOME_OPTIONS = [
  "Granted",
  "Refused",
  "Withdrawn",
  "Pending"
];

const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 100 }, (_, i) => (currentYear - i).toString());

// Visa Dialog Schema
const visaDialogSchema = z.object({
  visa_country: z.string().min(1, "Visa Country is required"),
  visa_type: z.string().min(1, "Visa Type is required"),
  visa_conditions: z.string().optional(),
  application_date_day: z.string().min(1, "Day is required"),
  application_date_month: z.string().min(1, "Month is required"),
  application_date_year: z.string().min(1, "Year is required"),
  application_reference_number: z.string().optional(),
  outcome: z.string().min(1, "Outcome is required"),
  // Granted fields
  date_granted_day: z.string().optional(),
  date_granted_month: z.string().optional(),
  date_granted_year: z.string().optional(),
  expiry_date_day: z.string().optional(),
  expiry_date_month: z.string().optional(),
  expiry_date_year: z.string().optional(),
  place_of_issue: z.string().optional(),
  visa_number: z.string().optional(),
  visa_cancelled: z.enum(["yes", "no"]).optional(),
  cancellation_decision_date_day: z.string().optional(),
  cancellation_decision_date_month: z.string().optional(),
  cancellation_decision_date_year: z.string().optional(),
  cancellation_details: z.string().optional(),
  // Refused/Withdrawn fields
  decision_date_day: z.string().optional(),
  decision_date_month: z.string().optional(),
  decision_date_year: z.string().optional(),
  decision_details: z.string().optional(),
  // Linked Passport
  linked_passport: z.string().optional(),
}).superRefine((data, ctx) => {
  // If outcome is Granted, require date granted, place of issue, and visa number
  if (data.outcome === "Granted") {
    if (!data.date_granted_day || !data.date_granted_month || !data.date_granted_year) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Date Granted is required when outcome is Granted",
        path: ["date_granted_day"],
      });
    }
    if (!data.place_of_issue || data.place_of_issue.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Place of Issue is required when outcome is Granted",
        path: ["place_of_issue"],
      });
    }
    if (!data.visa_number || data.visa_number.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Visa Number is required when outcome is Granted",
        path: ["visa_number"],
      });
    }
    // If cancelled is Yes, require cancellation decision date and details
    if (data.visa_cancelled === "yes") {
      if (!data.cancellation_decision_date_day || !data.cancellation_decision_date_month || !data.cancellation_decision_date_year) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Cancellation Decision Date is required when visa is cancelled",
          path: ["cancellation_decision_date_day"],
        });
      }
      if (!data.cancellation_details || data.cancellation_details.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Cancellation details are required when visa is cancelled",
          path: ["cancellation_details"],
        });
      }
    }
  }

  // If outcome is Refused or Withdrawn, require decision date and details
  if (data.outcome === "Refused" || data.outcome === "Withdrawn") {
    if (!data.decision_date_day || !data.decision_date_month || !data.decision_date_year) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Decision Date is required",
        path: ["decision_date_day"],
      });
    }
    if (!data.decision_details || data.decision_details.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Decision details are required",
        path: ["decision_details"],
      });
    }
  }
});

function VisaDialog({ editingRow, onSave, onCancel }) {
  const row = editingRow;
  const [outcome, setOutcome] = useState(row?.outcome || "");
  const [visaCancelled, setVisaCancelled] = useState(row?.visa_cancelled || "no");

  const dialogForm = useForm({
    resolver: zodResolver(visaDialogSchema),
    defaultValues: row || {
      visa_country: "",
      visa_type: "",
      visa_conditions: "",
      application_date_day: "",
      application_date_month: "",
      application_date_year: "",
      application_reference_number: "",
      outcome: "",
      date_granted_day: "",
      date_granted_month: "",
      date_granted_year: "",
      expiry_date_day: "",
      expiry_date_month: "",
      expiry_date_year: "",
      place_of_issue: "",
      visa_number: "",
      visa_cancelled: "no",
      cancellation_decision_date_day: "",
      cancellation_decision_date_month: "",
      cancellation_decision_date_year: "",
      cancellation_details: "",
      decision_date_day: "",
      decision_date_month: "",
      decision_date_year: "",
      decision_details: "",
      linked_passport: "",
    },
  });

  useEffect(() => {
    if (row?.outcome) {
      setOutcome(row.outcome);
    }
    if (row?.visa_cancelled) {
      setVisaCancelled(row.visa_cancelled);
    }
  }, [row]);

  // Get available passports from draft store for linked passport dropdown
  const draftSnap = useSnapshot(draftStore);
  const identityData = draftSnap.draft?.protection_identity || {};
  const passports = identityData.passports || [];

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
        Enter details of the Visa applied for or held by you
      </p>

      {/* Visa Country */}
      <div>
        <Label className="mb-2 block">
          Visa Country <span className="text-red-500">*</span>
        </Label>
        <Select
          value={dialogForm.watch("visa_country")}
          onValueChange={(value) => dialogForm.setValue("visa_country", value, { shouldValidate: true })}
        >
          <SelectTrigger data-testid="select-visa-country">
            <SelectValue placeholder="Choose Country" />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
            {COUNTRY_OPTIONS.map((country) => (
              <SelectItem key={country} value={country}>{country}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.visa_country && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.visa_country.message}</p>
        )}
      </div>

      {/* Visa Type */}
      <div>
        <Label htmlFor="visa_type" className="mb-2 block">
          Visa Type <span className="text-red-500">*</span>
        </Label>
        <Input
          id="visa_type"
          {...dialogForm.register("visa_type")}
          data-testid="input-visa-type"
        />
        {dialogForm.formState.errors.visa_type && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.visa_type.message}</p>
        )}
      </div>

      {/* Visa Conditions */}
      <div>
        <Label htmlFor="visa_conditions" className="mb-2 block">Visa Conditions</Label>
        <Textarea
          id="visa_conditions"
          {...dialogForm.register("visa_conditions")}
          rows={3}
          data-testid="textarea-visa-conditions"
        />
      </div>

      {/* Application Date */}
      <div>
        <Label className="mb-2 block">
          Application Date <span className="text-red-500">*</span>
        </Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("application_date_day")}
            onValueChange={(value) => dialogForm.setValue("application_date_day", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-application-day">
              <SelectValue placeholder="Day" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              {days.map((day) => (
                <SelectItem key={day} value={day}>{day}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("application_date_month")}
            onValueChange={(value) => dialogForm.setValue("application_date_month", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-application-month">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              {months.map((month, idx) => (
                <SelectItem key={month} value={(idx + 1).toString()}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("application_date_year")}
            onValueChange={(value) => dialogForm.setValue("application_date_year", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-application-year">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              {years.map((year) => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {dialogForm.formState.errors.application_date_day && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.application_date_day.message}</p>
        )}
      </div>

      {/* Application Reference Number (TRN) */}
      <div>
        <Label htmlFor="application_reference_number" className="mb-2 block">
          Application Reference Number (TRN)
        </Label>
        <Input
          id="application_reference_number"
          {...dialogForm.register("application_reference_number")}
          data-testid="input-application-reference"
        />
      </div>

      {/* Application Outcome Section */}
      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-base font-semibold text-gray-900">Application Outcome</h3>
        <p className="text-sm text-gray-600">Enter details on the outcome of the Visa application</p>

        <div>
          <Label className="mb-2 block">
            Outcome <span className="text-red-500">*</span>
          </Label>
          <Select
            value={outcome}
            onValueChange={(value) => {
              setOutcome(value);
              dialogForm.setValue("outcome", value, { shouldValidate: true });
            }}
          >
            <SelectTrigger data-testid="select-outcome">
              <SelectValue placeholder="Choose Outcome" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              {OUTCOME_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {dialogForm.formState.errors.outcome && (
            <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.outcome.message}</p>
          )}
        </div>

        {/* Granted Fields */}
        {outcome === "Granted" && (
          <>
            <div>
              <Label className="mb-2 block">
                Date Granted <span className="text-red-500">*</span>
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <Select
                  value={dialogForm.watch("date_granted_day")}
                  onValueChange={(value) => dialogForm.setValue("date_granted_day", value, { shouldValidate: true })}
                >
                  <SelectTrigger data-testid="select-granted-day">
                    <SelectValue placeholder="Day" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                    {days.map((day) => (
                      <SelectItem key={day} value={day}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={dialogForm.watch("date_granted_month")}
                  onValueChange={(value) => dialogForm.setValue("date_granted_month", value, { shouldValidate: true })}
                >
                  <SelectTrigger data-testid="select-granted-month">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                    {months.map((month, idx) => (
                      <SelectItem key={month} value={(idx + 1).toString()}>{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={dialogForm.watch("date_granted_year")}
                  onValueChange={(value) => dialogForm.setValue("date_granted_year", value, { shouldValidate: true })}
                >
                  <SelectTrigger data-testid="select-granted-year">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                    {years.map((year) => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {dialogForm.formState.errors.date_granted_day && (
                <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.date_granted_day.message}</p>
              )}
            </div>

            <div>
              <Label className="mb-2 block">Expiry Date (leave blank if visa has no expiry)</Label>
              <div className="grid grid-cols-3 gap-2">
                <Select
                  value={dialogForm.watch("expiry_date_day")}
                  onValueChange={(value) => dialogForm.setValue("expiry_date_day", value)}
                >
                  <SelectTrigger data-testid="select-expiry-day">
                    <SelectValue placeholder="Day" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                    {days.map((day) => (
                      <SelectItem key={day} value={day}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={dialogForm.watch("expiry_date_month")}
                  onValueChange={(value) => dialogForm.setValue("expiry_date_month", value)}
                >
                  <SelectTrigger data-testid="select-expiry-month">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                    {months.map((month, idx) => (
                      <SelectItem key={month} value={(idx + 1).toString()}>{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={dialogForm.watch("expiry_date_year")}
                  onValueChange={(value) => dialogForm.setValue("expiry_date_year", value)}
                >
                  <SelectTrigger data-testid="select-expiry-year">
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
              <Label htmlFor="place_of_issue" className="mb-2 block">
                Place of Issue <span className="text-red-500">*</span>
              </Label>
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
              <Label htmlFor="visa_number" className="mb-2 block">
                Visa Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="visa_number"
                {...dialogForm.register("visa_number")}
                data-testid="input-visa-number"
              />
              {dialogForm.formState.errors.visa_number && (
                <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.visa_number.message}</p>
              )}
            </div>

            <div className="pt-4 border-t">
              <Label className="text-base font-medium mb-3 block">
                Has this Visa ever been cancelled?
              </Label>
              <RadioGroup
                value={visaCancelled}
                onValueChange={(value) => {
                  setVisaCancelled(value);
                  dialogForm.setValue("visa_cancelled", value);
                }}
                className="flex gap-4"
              >
                <div className="flex items-center">
                  <RadioGroupItem value="yes" id="visa-cancelled-yes" />
                  <Label htmlFor="visa-cancelled-yes" className="ml-2 cursor-pointer font-normal">
                    Yes
                  </Label>
                </div>
                <div className="flex items-center">
                  <RadioGroupItem value="no" id="visa-cancelled-no" />
                  <Label htmlFor="visa-cancelled-no" className="ml-2 cursor-pointer font-normal">
                    No
                  </Label>
                </div>
              </RadioGroup>

              {visaCancelled === "yes" && (
                <div className="mt-4 space-y-4">
                  <div>
                    <Label className="mb-2 block">
                      Decision Date <span className="text-red-500">*</span>
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      <Select
                        value={dialogForm.watch("cancellation_decision_date_day")}
                        onValueChange={(value) => dialogForm.setValue("cancellation_decision_date_day", value, { shouldValidate: true })}
                      >
                        <SelectTrigger data-testid="select-cancellation-decision-day">
                          <SelectValue placeholder="Day" />
                        </SelectTrigger>
                        <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                          {days.map((day) => (
                            <SelectItem key={day} value={day}>{day}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={dialogForm.watch("cancellation_decision_date_month")}
                        onValueChange={(value) => dialogForm.setValue("cancellation_decision_date_month", value, { shouldValidate: true })}
                      >
                        <SelectTrigger data-testid="select-cancellation-decision-month">
                          <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                          {months.map((month, idx) => (
                            <SelectItem key={month} value={(idx + 1).toString()}>{month}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={dialogForm.watch("cancellation_decision_date_year")}
                        onValueChange={(value) => dialogForm.setValue("cancellation_decision_date_year", value, { shouldValidate: true })}
                      >
                        <SelectTrigger data-testid="select-cancellation-decision-year">
                          <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                          {years.map((year) => (
                            <SelectItem key={year} value={year}>{year}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {dialogForm.formState.errors.cancellation_decision_date_day && (
                      <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.cancellation_decision_date_day.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="cancellation_details" className="mb-2 block">
                      Enter details: <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="cancellation_details"
                      {...dialogForm.register("cancellation_details")}
                      rows={3}
                      data-testid="textarea-cancellation-details"
                    />
                    {dialogForm.formState.errors.cancellation_details && (
                      <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.cancellation_details.message}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Refused or Withdrawn Fields */}
        {(outcome === "Refused" || outcome === "Withdrawn") && (
          <>
            <div>
              <Label className="mb-2 block">
                Decision Date <span className="text-red-500">*</span>
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <Select
                  value={dialogForm.watch("decision_date_day")}
                  onValueChange={(value) => dialogForm.setValue("decision_date_day", value, { shouldValidate: true })}
                >
                  <SelectTrigger data-testid="select-decision-day">
                    <SelectValue placeholder="Day" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                    {days.map((day) => (
                      <SelectItem key={day} value={day}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={dialogForm.watch("decision_date_month")}
                  onValueChange={(value) => dialogForm.setValue("decision_date_month", value, { shouldValidate: true })}
                >
                  <SelectTrigger data-testid="select-decision-month">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                    {months.map((month, idx) => (
                      <SelectItem key={month} value={(idx + 1).toString()}>{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={dialogForm.watch("decision_date_year")}
                  onValueChange={(value) => dialogForm.setValue("decision_date_year", value, { shouldValidate: true })}
                >
                  <SelectTrigger data-testid="select-decision-year">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                    {years.map((year) => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {dialogForm.formState.errors.decision_date_day && (
                <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.decision_date_day.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="decision_details" className="mb-2 block">
                Enter details: <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="decision_details"
                {...dialogForm.register("decision_details")}
                rows={3}
                data-testid="textarea-decision-details"
              />
              {dialogForm.formState.errors.decision_details && (
                <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.decision_details.message}</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Linked Passport */}
      <div className="pt-4 border-t">
        <Label className="mb-2 block">Linked Passport</Label>
        <Select
          value={dialogForm.watch("linked_passport") || undefined}
          onValueChange={(value) => dialogForm.setValue("linked_passport", value === "none" ? "" : value)}
        >
          <SelectTrigger data-testid="select-linked-passport">
            <SelectValue placeholder="Choose Passport" />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
            <SelectItem value="none">None</SelectItem>
            {passports.map((passport, idx) => {
              const passportLabel = passport.document_number
                ? `${passport.document_number} - ${passport.name || 'Unnamed'}`
                : `Passport ${idx + 1}`;
              return (
                <SelectItem key={idx} value={passportLabel}>{passportLabel}</SelectItem>
              );
            })}
          </SelectContent>
        </Select>
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
  has_previous_visa: z.enum(["yes", "no"]).optional(),
  main_applicant_visas: z.array(z.object({
    visa_country: z.string(),
    visa_type: z.string(),
    visa_conditions: z.string().optional(),
    application_date_day: z.string(),
    application_date_month: z.string(),
    application_date_year: z.string(),
    application_reference_number: z.string().optional(),
    outcome: z.string(),
    date_granted_day: z.string().optional(),
    date_granted_month: z.string().optional(),
    date_granted_year: z.string().optional(),
    expiry_date_day: z.string().optional(),
    expiry_date_month: z.string().optional(),
    expiry_date_year: z.string().optional(),
    place_of_issue: z.string().optional(),
    visa_number: z.string().optional(),
    visa_cancelled: z.string().optional(),
    cancellation_decision_date_day: z.string().optional(),
    cancellation_decision_date_month: z.string().optional(),
    cancellation_decision_date_year: z.string().optional(),
    cancellation_details: z.string().optional(),
    decision_date_day: z.string().optional(),
    decision_date_month: z.string().optional(),
    decision_date_year: z.string().optional(),
    decision_details: z.string().optional(),
    linked_passport: z.string().optional(),
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
      has_previous_visa: "no",
      main_applicant_visas: [],
    },
  });

  const hasPreviousVisa = form.watch("has_previous_visa");
  const mainApplicantVisas = form.watch("main_applicant_visas") || [];

  // Get main applicant name from draft store
  const mainApplicantDetails = draftSnap.draft?.protection_details || {};
  const mainApplicantName = mainApplicantDetails.family_name && mainApplicantDetails.given_names
    ? `${mainApplicantDetails.given_names} ${mainApplicantDetails.family_name}`
    : "the Main Applicant";

  useEffect(() => {
    const savedData = draftSnap.draft?.protection_visas || {};
    if (Object.keys(savedData).length > 0) {
      form.reset({
        has_previous_visa: savedData.has_previous_visa || "",
        main_applicant_visas: savedData.main_applicant_visas || [],
      });
    }
  }, [draftSnap.draft?.protection_visas]);

  // Clear visa data when "No" is selected
  useEffect(() => {
    if (hasPreviousVisa === "no") {
      form.setValue("main_applicant_visas", []);
    }
  }, [hasPreviousVisa]);

  const updateMainApplicantVisas = (newVisas) => {
    form.setValue("main_applicant_visas", newVisas);
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      await draftStore.saveSectionData("protection_visas", data);
      await draftStore.markPageComplete(`${visaType}/all-applicants/visas`, null, "protection_visas");
      const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId);
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
      console.log("Saving protection_visas data:", formData);
      const result = await draftStore.saveSectionData("protection_visas", formData);

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
  const visaColumns = [
    { key: "visa_country", label: "Country" },
    { key: "visa_type", label: "Type" },
    { key: "linked_passport", label: "Linked Passport", format: (row) => row.linked_passport || "-" },
    {
      key: "decision_date",
      label: "Decision Date",
      format: (row) => {
        // Use cancellation decision date if cancelled, otherwise use decision date, otherwise use date granted
        let day, month, year;
        if (row.visa_cancelled === "yes" && row.cancellation_decision_date_day) {
          day = row.cancellation_decision_date_day;
          month = row.cancellation_decision_date_month;
          year = row.cancellation_decision_date_year;
        } else if (row.decision_date_day) {
          day = row.decision_date_day;
          month = row.decision_date_month;
          year = row.decision_date_year;
        } else if (row.date_granted_day) {
          day = row.date_granted_day;
          month = row.date_granted_month;
          year = row.date_granted_year;
        }
        if (!day || !month || !year) return "-";
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${day} ${months[parseInt(month) - 1]} ${year}`;
      }
    },
    { key: "outcome", label: "Outcome" },
    {
      key: "cancelled",
      label: "Cancelled",
      format: (row) => row.visa_cancelled === "yes" ? "Yes" : "No"
    },
  ];

  return (
    <div className="min-h-screen bg-[#E0E7FF]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 md:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Visas</h1>
            <p className="text-muted-foreground mt-2">
              In this section you are to provide the visa history of the following included Applicants:
            </p>
          </div>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-8 mb-5">
              {/* Top Yes/No Question */}
              <div>
                <Label className="text-base font-medium mb-3 block">
                  Has {mainApplicantName} ever previously applied for or held a Visa for Australia?
                </Label>
                <RadioGroup
                  value={hasPreviousVisa}
                  onValueChange={(value) => form.setValue("has_previous_visa", value)}
                  className="flex gap-4"
                  data-testid="radio-has-previous-visa"
                >
                  <div className="flex items-center">
                    <RadioGroupItem value="yes" id="has-visa-yes" />
                    <Label htmlFor="has-visa-yes" className="ml-2 cursor-pointer font-normal">
                      Yes
                    </Label>
                  </div>
                  <div className="flex items-center">
                    <RadioGroupItem value="no" id="has-visa-no" />
                    <Label htmlFor="has-visa-no" className="ml-2 cursor-pointer font-normal">
                      No
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Visa Table - Only show when Yes */}
              {hasPreviousVisa === "yes" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Visa for {mainApplicantName}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Enter details of all Australian Visas applied for or held by this person
                  </p>
                  <RepeaterTable
                    data={mainApplicantVisas}
                    columns={visaColumns}
                    onAdd={(newRow) => updateMainApplicantVisas([...mainApplicantVisas, newRow])}
                    onEdit={(index, updatedRow) => {
                      const updated = [...mainApplicantVisas];
                      updated[index] = updatedRow;
                      updateMainApplicantVisas(updated);
                    }}
                    onDelete={(index) => {
                      const updated = mainApplicantVisas.filter((_, i) => i !== index);
                      updateMainApplicantVisas(updated);
                    }}
                    DialogComponent={VisaDialog}
                    addButtonText="Add"
                    emptyMessage="No visas added"
                    dialogTitle="Visa Application"
                    testIdPrefix="visa"
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

