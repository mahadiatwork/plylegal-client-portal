"use client";

import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RepeaterTable } from "@/components/RepeaterTable";
import { COUNTRIES } from "@/reuseable/countries";
import { PERSONAL_MONTHS, MARITAL_STATUSES, MARITAL_DATE_LABELS } from "@/lib/targetVisaPersonalDetails";
import { TargetCitizenshipDialog } from "./TargetCitizenshipDialog";

export function PersonalDetailsFields({ form, countrySelector = true, showPreferredNames = true }) {
  const id = useId();
  const { register, watch, setValue, formState } = form;
  const days = Array.from({ length: 31 }, (_, index) => String(index + 1));
  const years = Array.from({ length: 100 }, (_, index) => String(new Date().getFullYear() - index));
  const status = watch("marital_status");
  const citizenships = watch("citizenships") || [];
  const set = (key, value) => setValue(key, value, { shouldDirty: true, shouldValidate: true });
  const error = (name) => formState.errors[name]?.message ? <p className="text-sm text-red-600 mt-1">{formState.errors[name].message}</p> : null;
  const select = (name, options, placeholder, testId, month = false) => {
    const current = watch(name) || "";
    const choices = options.map((text, index) => ({ text, value: month ? String(index + 1) : text }));
    if (current && !choices.some((choice) => choice.value === current)) choices.push({ text: current, value: current });
    return <Select value={current} onValueChange={(value) => set(name, value)}>
      <SelectTrigger data-testid={testId}><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>{choices.map((choice) => <SelectItem key={choice.value} value={choice.value}>{choice.text}</SelectItem>)}</SelectContent>
    </Select>;
  };
  const text = (name, label, placeholder) => <div><Label>{label}</Label><Input {...register(name)} placeholder={placeholder} data-testid={`input-${name.replaceAll("_", "-")}`} />{error(name)}</div>;
  const yesNo = (name, label) => <div>
    <Label className="text-base font-medium mb-3 block">{label}</Label>
    <RadioGroup value={watch(name) || ""} onValueChange={(value) => set(name, value)} className="flex gap-4">
      {["yes", "no"].map((value) => <div className="flex items-center" key={value}>
        <RadioGroupItem id={`${id}-${name}-${value}`} value={value} />
        <Label htmlFor={`${id}-${name}-${value}`} className="ml-2 cursor-pointer font-normal">{value === "yes" ? "Yes" : "No"}</Label>
      </div>)}
    </RadioGroup>{error(name)}
  </div>;

  return <>
    <div className="space-y-6">
      <h3 className="text-lg font-medium border-b pb-2">Personal Information</h3>
      {text("family_name", "Family Name")}
      {text("given_names", "Given Names")}
      <div><Label>Gender</Label>
        <RadioGroup value={watch("gender") || ""} onValueChange={(value) => set("gender", value)} className="flex gap-4 mt-2" data-testid="radio-gender">
          {["Male", "Female", "Other"].map((gender) => <div className="flex items-center" key={gender}>
            <RadioGroupItem id={`${id}-gender-${gender}`} value={gender} />
            <Label htmlFor={`${id}-gender-${gender}`} className="ml-2 cursor-pointer font-normal">{gender}</Label>
          </div>)}
        </RadioGroup>{error("gender")}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div><Label>Date of Birth - Day</Label>{select("birth_day", days, "Choose Day", "select-birth-day")}{error("birth_day")}</div>
        <div><Label>Month</Label>{select("birth_month", PERSONAL_MONTHS, "Choose Month", "select-birth-month", true)}{error("birth_month")}</div>
        <div><Label>Year</Label>{select("birth_year", years, "Choose Year", "select-birth-year")}{error("birth_year")}</div>
      </div>
      <div><Label>What is your marital status?</Label>{select("marital_status", MARITAL_STATUSES, "Choose Marital Status", "select-marital-status")}{error("marital_status")}</div>
      {MARITAL_DATE_LABELS[status] && <div className="space-y-2">
        <Label className="text-sm font-medium">{MARITAL_DATE_LABELS[status]} <span className="text-red-600">*</span></Label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><Label className="text-xs text-gray-600">Day</Label>{select("marital_status_date_day", days, "Day")}</div>
          <div><Label className="text-xs text-gray-600">Month</Label>{select("marital_status_date_month", PERSONAL_MONTHS, "Month", undefined, true)}</div>
          <div><Label className="text-xs text-gray-600">Year</Label>{select("marital_status_date_year", years, "Year")}</div>
        </div>
      </div>}
    </div>
    <div className="space-y-6">
      <h3 className="text-lg font-medium border-b pb-2">Birthplace Information</h3>
      {countrySelector ? <div><Label>Country of Birth</Label>{select("country_of_birth", COUNTRIES, "Choose Country", "select-country-of-birth")}{error("country_of_birth")}</div> : text("country_of_birth", "Country of Birth", "Choose Country")}
      {text("city_of_birth", "City or Town of Birth")}
      {text("state_of_birth", "State or Province of Birth")}
    </div>
    <div className="space-y-6">
      <h3 className="text-lg font-medium border-b pb-2">Citizenships</h3>
      {yesNo("citizenship_of_passport_country", "Is this applicant a citizen of their country of passport?")}
      {yesNo("citizenship_other_than_birth", "Is this applicant a citizen of any other country?")}
      {watch("citizenship_other_than_birth") === "yes" && <div>
        <p className="text-sm text-gray-600 mb-4">Enter details of each other citizenship held by this applicant.</p>
        <RepeaterTable data={citizenships} columns={[
          { key: "country", label: "Country" },
          { key: "how_obtained", label: "How was this Citizenship obtained?" },
          { key: "date_obtained_day", label: "Date Obtained", format: (row) => `${row.date_obtained_day || ""} ${row.date_obtained_month || ""} ${row.date_obtained_year || ""}` },
        ]} onAdd={(row) => set("citizenships", [...citizenships, row])}
          onEdit={(index, row) => set("citizenships", citizenships.map((current, i) => i === index ? { ...current, ...row } : current))}
          onDelete={(index) => set("citizenships", citizenships.filter((_, i) => i !== index))}
          DialogComponent={TargetCitizenshipDialog} addButtonText="Add" testIdPrefix="details-citizenship" />
        {error("citizenships")}
      </div>}
    </div>
    {showPreferredNames && <div className="space-y-6"><h3 className="text-lg font-medium border-b pb-2">Other names/spellings</h3>{text("preferred_names", "Preferred Names")}</div>}
  </>;
}
