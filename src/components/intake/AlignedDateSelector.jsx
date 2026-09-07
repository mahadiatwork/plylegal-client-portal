"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { monthNames } from "@/reuseable/months";

// Target-only presentation: retain DateSelector's values and year windows,
// while displaying days consistently with the accepted questionnaires.
export function AlignedDateSelector({ label, values, onValueChange, errors, testIdPrefix, required, future = false, yearsBack = 100 }) {
  const [currentYear, setCurrentYear] = useState(null);
  useEffect(() => setCurrentYear(new Date().getFullYear()), []);
  if (!currentYear) return null;

  const years = Array.from({ length: future ? 10 : yearsBack }, (_, i) => String(currentYear + (future ? i : -i)));
  // Retain an existing date outside the picker window rather than hiding it.
  if (values.year && !years.includes(String(values.year))) years.push(String(values.year));
  const numericMonth = /^\d+$/.test(String(values.month || ""));
  const shownMonth = numericMonth ? String(Number(values.month)) : String(monthNames.indexOf(values.month) + 1 || "");
  const hasError = errors?.day || errors?.month || errors?.year;
  const fields = [
    { type: "day", value: values.day ? String(Number(values.day)) : "", options: Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: String(i + 1).padStart(2, "0") })) },
    { type: "month", value: shownMonth, options: monthNames.map((name, i) => ({ value: String(i + 1), label: name })) },
    { type: "year", value: values.year || "", options: years.map((year) => ({ value: year, label: year })) },
  ];
  const change = (type, value) => {
    if (type === "day" && /^0\d$/.test(String(values.day || ""))) value = value.padStart(2, "0");
    if (type === "month" && values.month && !numericMonth) value = monthNames[Number(value) - 1];
    onValueChange(type, value);
  };

  return <div className="space-y-2">
    {label && <Label>{label}{required && <span className="text-red-500 ml-1">*</span>}</Label>}
    <div className="grid grid-cols-3 gap-2">
      {fields.map(({ type, value, options }) => <Select key={type} value={value} onValueChange={(next) => change(type, next)}>
        <SelectTrigger data-testid={`${testIdPrefix}-${type}`} className={hasError ? "border-red-600" : ""}>
          <SelectValue placeholder={`Choose ${type[0].toUpperCase()}${type.slice(1)}`} />
        </SelectTrigger>
        <SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
      </Select>)}
    </div>
    {hasError && <p className="text-sm text-red-600 mt-1">{errors?.day?.message || errors?.month?.message || errors?.year?.message || "Date is required"}</p>}
  </div>;
}
