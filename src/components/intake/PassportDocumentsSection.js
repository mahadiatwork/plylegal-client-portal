"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { RepeaterTable } from "@/components/RepeaterTable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COUNTRIES } from "@/reuseable/countries";

const PASSPORT_TYPE_OPTIONS = ["Passport", "Emergency Passport", "Travel Document"];
const GENDER_OPTIONS = ["Male", "Female", "X/Unspecified"];
const DOCUMENT_STATUS_OPTIONS = ["Current", "Expired", "Lost", "Stolen", "Cancelled", "Damaged"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAYS = Array.from({ length: 31 }, (_, index) => String(index + 1));

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
  (data) => data.document_status !== "Current" || Boolean(data.date_expiry_day && data.date_expiry_month && data.date_expiry_year),
  { message: "Expiry date is required for current documents", path: ["date_expiry_day"] }
);

function SelectField({ form, name, label, placeholder, options, testId }) {
  const error = form.formState.errors[name];
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Select value={form.watch(name)} onValueChange={(value) => form.setValue(name, value, { shouldValidate: true })}>
        <SelectTrigger id={name} data-testid={testId}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-red-600 mt-1">{error.message}</p>}
    </div>
  );
}

function DateFields({ form, prefix, years, testIdPrefix }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <Select value={form.watch(`${prefix}_day`)} onValueChange={(value) => form.setValue(`${prefix}_day`, value, { shouldValidate: true })}>
        <SelectTrigger data-testid={`select-${testIdPrefix}-day`}><SelectValue placeholder="Choose Day" /></SelectTrigger>
        <SelectContent>{DAYS.map((day) => <SelectItem key={day} value={day}>{day}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={form.watch(`${prefix}_month`)} onValueChange={(value) => form.setValue(`${prefix}_month`, value, { shouldValidate: true })}>
        <SelectTrigger data-testid={`select-${testIdPrefix}-month`}><SelectValue placeholder="Choose Month" /></SelectTrigger>
        <SelectContent>{MONTHS.map((month) => <SelectItem key={month} value={month}>{month}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={form.watch(`${prefix}_year`)} onValueChange={(value) => form.setValue(`${prefix}_year`, value, { shouldValidate: true })}>
        <SelectTrigger data-testid={`select-${testIdPrefix}-year`}><SelectValue placeholder="Choose Year" /></SelectTrigger>
        <SelectContent>{years.map((year) => <SelectItem key={year} value={year}>{year}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

function PassportDialog({ editingRow, onSave, onCancel }) {
  const originalDate = String(editingRow?.is_original_date || "yes").toLowerCase() === "no" ? "no" : "yes";
  const [isOriginalDate, setIsOriginalDate] = useState(originalDate);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, index) => String(currentYear - index));
  const expiryYears = Array.from({ length: currentYear + 50 - 2016 + 1 }, (_, index) => String(2016 + index));
  const form = useForm({
    resolver: zodResolver(passportDialogSchema),
    defaultValues: {
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
      ...editingRow,
      is_original_date: originalDate,
    },
  });

  useEffect(() => {
    setIsOriginalDate(originalDate);
    form.setValue("is_original_date", originalDate);
  }, [editingRow, form, originalDate]);

  return (
    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
      <SelectField form={form} name="document_type" label="Type of Document" placeholder="Choose Type" options={PASSPORT_TYPE_OPTIONS} testId="select-passport-type" />

      <div>
        <Label htmlFor="document_number">Passport/Document Number</Label>
        <Input id="document_number" {...form.register("document_number")} data-testid="input-passport-number" />
        {form.formState.errors.document_number && <p className="text-sm text-red-600 mt-1">{form.formState.errors.document_number.message}</p>}
      </div>

      <SelectField form={form} name="passport_country" label="Passport Country" placeholder="Choose Country" options={COUNTRIES} testId="select-passport-country" />

      <div>
        <Label htmlFor="place_of_issue">Place of Issue / Issuing Authority</Label>
        <Input id="place_of_issue" {...form.register("place_of_issue")} data-testid="input-place-of-issue" />
        {form.formState.errors.place_of_issue && <p className="text-sm text-red-600 mt-1">{form.formState.errors.place_of_issue.message}</p>}
      </div>

      <SelectField form={form} name="nationality" label="Nationality" placeholder="Choose Nationality" options={COUNTRIES} testId="select-passport-nationality" />
      <SelectField form={form} name="gender" label="Gender as shown on this document" placeholder="Choose Gender" options={GENDER_OPTIONS} testId="select-passport-gender" />

      <div>
        <Label htmlFor="passport_name">Name</Label>
        <Input id="passport_name" {...form.register("name")} data-testid="input-passport-name" placeholder="Enter name exactly as shown on document" />
        {form.formState.errors.name && <p className="text-sm text-red-600 mt-1">{form.formState.errors.name.message}</p>}
      </div>

      <div className="pt-4 border-t border-gray-200">
        <h3 className="text-base font-medium text-gray-900 mb-3">Dates and Status</h3>
        <p className="text-sm text-gray-600 mb-4">Enter the issue date, expiry date and status of the Document</p>

        <div>
          <Label>Date of Issue</Label>
          <DateFields form={form} prefix="date_issued" years={years} testIdPrefix="passport-issue" />
        </div>

        <div className="mt-4">
          <Label className="text-sm font-normal mb-2 block">Is this the Original Date of Issue?</Label>
          <RadioGroup
            value={isOriginalDate}
            onValueChange={(value) => {
              setIsOriginalDate(value);
              form.setValue("is_original_date", value);
            }}
            className="flex gap-4"
            data-testid="radio-original-date"
          >
            <div className="flex items-center" data-testid="radio-original-date-yes">
              <RadioGroupItem value="yes" id="original-date-yes" />
              <Label htmlFor="original-date-yes" className="ml-2 cursor-pointer font-normal">Yes</Label>
            </div>
            <div className="flex items-center" data-testid="radio-original-date-no">
              <RadioGroupItem value="no" id="original-date-no" />
              <Label htmlFor="original-date-no" className="ml-2 cursor-pointer font-normal">No</Label>
            </div>
          </RadioGroup>
        </div>

        {isOriginalDate === "no" && (
          <div className="mt-4">
            <Label>Original Date of Issue</Label>
            <DateFields form={form} prefix="original_date" years={years} testIdPrefix="original" />
          </div>
        )}

        <div className="mt-4">
          <Label>Date of Expiry</Label>
          <DateFields form={form} prefix="date_expiry" years={expiryYears} testIdPrefix="passport-expiry" />
          {form.formState.errors.date_expiry_day && <p className="text-sm text-red-600 mt-1">{form.formState.errors.date_expiry_day.message}</p>}
        </div>

        <div className="mt-4">
          <SelectField form={form} name="document_status" label="Document Status" placeholder="Choose Status" options={DOCUMENT_STATUS_OPTIONS} testId="select-passport-status" />
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">Cancel</Button>
        <Button type="button" onClick={form.handleSubmit(onSave)} data-testid="button-ok">OK</Button>
      </DialogFooter>
    </div>
  );
}

export function PassportDocumentsSection({ hasPassport, passports = [], onHasPassportChange, onPassportsChange, error }) {
  const normalizedHasPassport = String(hasPassport || "no").toLowerCase() === "yes" ? "yes" : "no";
  return (
    <div>
      <Label className="text-base font-medium mb-3 block">Do you currently hold or have you ever held a Passport or Travel Document?</Label>
      <RadioGroup value={normalizedHasPassport} onValueChange={onHasPassportChange} className="flex gap-4" data-testid="radio-passport">
        <div className="flex items-center">
          <RadioGroupItem value="yes" id="passport-yes" data-testid="radio-passport-yes" />
          <Label htmlFor="passport-yes" className="ml-2 cursor-pointer font-normal">Yes</Label>
        </div>
        <div className="flex items-center">
          <RadioGroupItem value="no" id="passport-no" data-testid="radio-passport-no" />
          <Label htmlFor="passport-no" className="ml-2 cursor-pointer font-normal">No</Label>
        </div>
      </RadioGroup>

      {normalizedHasPassport === "yes" && (
        <div className="mt-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b">Passports/Travel Documents</h2>
          <p className="text-sm text-gray-600 mb-4">Enter details of all current passports.</p>
          <RepeaterTable
            data={passports}
            columns={[
              { key: "document_number", label: "Passport/Document Number" },
              { key: "name", label: "Name" },
              { key: "nationality", label: "Nationality" },
              { key: "date_issued_day", label: "Date of Issue", format: (row) => `${row.date_issued_day} ${row.date_issued_month} ${row.date_issued_year}` },
              { key: "document_status", label: "Status" },
            ]}
            onAdd={(row) => onPassportsChange([...passports, row])}
            onEdit={(index, row) => onPassportsChange(passports.map((item, itemIndex) => itemIndex === index ? row : item))}
            onDelete={(index) => onPassportsChange(passports.filter((_, itemIndex) => itemIndex !== index))}
            DialogComponent={PassportDialog}
            addButtonText="Add"
            dialogTitle="Passport/Travel Document"
            testIdPrefix="passport"
          />
          {error && <p className="text-sm text-red-600 mt-2">{error.message || error}</p>}
        </div>
      )}
    </div>
  );
}
