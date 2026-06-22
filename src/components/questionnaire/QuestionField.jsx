"use client";

import { useController } from "react-hook-form";
import { Field } from "@/components/Field";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const YES_NO_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

const DEFAULT_MONTH_OPTIONS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
].map((label, index) => ({ value: String(index + 1), label }));

function getOptions(question, optionSources) {
  if (question.optionsSource) return optionSources?.[question.optionsSource] || [];
  if (question.type === "yesNo") return question.options || YES_NO_OPTIONS;
  return question.options || [];
}

function DatePartSelect({ control, name, label, options, placeholder }) {
  const { field, fieldState } = useController({ control, name });

  return (
    <div className="space-y-2">
      <Label htmlFor={name} className="text-xs text-gray-600">
        {label}
      </Label>
      <Select value={field.value || ""} onValueChange={field.onChange}>
        <SelectTrigger id={name} aria-invalid={!!fieldState.error}>
          <SelectValue placeholder={placeholder || label} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {fieldState.error?.message && (
        <p className="text-sm text-red-600">{fieldState.error.message}</p>
      )}
    </div>
  );
}

function DatePartsField({ question, form }) {
  const currentYear = new Date().getFullYear();
  const dayOptions = Array.from({ length: 31 }, (_, index) => {
    const value = String(index + 1);
    return { value, label: value };
  });
  const yearOptions = Array.from({ length: question.yearRange || 100 }, (_, index) => {
    const value = String((question.maxYear || currentYear) - index);
    return { value, label: value };
  });
  const names = question.parts || {
    day: `${question.answerKey}_day`,
    month: `${question.answerKey}_month`,
    year: `${question.answerKey}_year`,
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">
        {question.label}
        {question.required && <span className="text-red-600 ml-1">*</span>}
      </Label>
      {question.description && <p className="text-sm text-gray-600">{question.description}</p>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DatePartSelect control={form.control} name={names.day} label="Day" options={dayOptions} placeholder="Day" />
        <DatePartSelect control={form.control} name={names.month} label="Month" options={question.monthOptions || DEFAULT_MONTH_OPTIONS} placeholder="Month" />
        <DatePartSelect control={form.control} name={names.year} label="Year" options={yearOptions} placeholder="Year" />
      </div>
    </div>
  );
}

function RepeaterField({ question, repeaterRegistry, form }) {
  const Component = question.component ? repeaterRegistry?.[question.component] : null;

  if (Component) {
    return <Component question={question} form={form} />;
  }

  return (
    <div className="space-y-2 rounded-lg border border-dashed border-gray-300 p-4">
      <Label className="text-sm font-medium">
        {question.label}
        {question.required && <span className="text-red-600 ml-1">*</span>}
      </Label>
      {question.description && <p className="text-sm text-gray-600">{question.description}</p>}
      <Button type="button" variant="outline" disabled>
        Add
      </Button>
    </div>
  );
}

export function QuestionField({ form, optionSources, question, repeaterRegistry }) {
  const options = getOptions(question, optionSources);

  if (question.type === "dateParts") {
    return <DatePartsField question={question} form={form} />;
  }

  if (question.type === "repeater") {
    return <RepeaterField question={question} repeaterRegistry={repeaterRegistry} form={form} />;
  }

  if (question.type === "yesNo" || question.type === "radio") {
    return (
      <Field
        control={form.control}
        name={question.answerKey}
        type="radio"
        label={question.label}
        description={question.description}
        required={question.required}
        options={options}
      />
    );
  }

  if (question.type === "select") {
    return (
      <Field
        control={form.control}
        name={question.answerKey}
        type="select"
        label={question.label}
        description={question.description}
        placeholder={question.placeholder}
        required={question.required}
        options={options}
      />
    );
  }

  if (question.type === "textarea") {
    return (
      <Field
        control={form.control}
        name={question.answerKey}
        type="textarea"
        label={question.label}
        description={question.description}
        placeholder={question.placeholder}
        required={question.required}
        rows={question.rows || 4}
      />
    );
  }

  if (question.type === "checkbox") {
    return (
      <Field
        control={form.control}
        name={question.answerKey}
        type="checkbox"
        label={question.label}
        description={question.description}
        required={question.required}
      />
    );
  }

  return (
    <Field
      control={form.control}
      name={question.answerKey}
      type={question.inputType || "text"}
      label={question.label}
      description={question.description}
      placeholder={question.placeholder}
      required={question.required}
    />
  );
}
