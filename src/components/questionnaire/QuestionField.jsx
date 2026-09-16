"use client";

import { useController, useFieldArray, useWatch } from "react-hook-form";
import { Field } from "@/components/Field";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ConditionalBlock } from "@/components/questionnaire/ConditionalBlock";
import { getQuestionnaireRowDefaults, scopeQuestionnaireRowField } from "@/lib/questionnaires/repeaters";

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
  if (question.type === "yesNo") {
    return Array.isArray(question.options) && question.options.length
      ? question.options
      : YES_NO_OPTIONS;
  }
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

function RepeaterQuestions({ questions, prefix, values, form, optionSources, repeaterRegistry }) {
  return questions.map((question) => {
    const defaults = Object.fromEntries(Object.entries(getQuestionnaireRowDefaults([question]))
      .map(([name, value]) => [`${prefix}.${name}`, value]));
    return (
      <ConditionalBlock key={question.id} clearWhenHidden={question.clearWhenHidden} fieldDefaults={defaults} form={form} values={values} visibleIf={question.visibleIf}>
        <div className="space-y-4">
          <QuestionField form={form} optionSources={optionSources} question={scopeQuestionnaireRowField(question, prefix)} repeaterRegistry={repeaterRegistry} />
          {question.followUps?.length > 0 && <RepeaterQuestions questions={question.followUps} prefix={prefix} values={values} form={form} optionSources={optionSources} repeaterRegistry={repeaterRegistry} />}
        </div>
      </ConditionalBlock>
    );
  });
}

function ObjectRepeaterField({ question, form, optionSources, repeaterRegistry }) {
  const values = useWatch({ control: form.control, name: question.answerKey }) || {};
  return <div className="space-y-5 rounded-lg border border-border p-5"><RepeaterQuestions questions={question.metadata.fields} prefix={question.answerKey} values={values} form={form} optionSources={optionSources} repeaterRegistry={repeaterRegistry} /></div>;
}

function ArrayRepeaterField({ question, form, optionSources, repeaterRegistry }) {
  const { fields, append, remove } = useFieldArray({ control: form.control, name: question.answerKey, keyName: "_questionnaireRowId" });
  const values = useWatch({ control: form.control, name: question.answerKey }) || [];
  return (
    <div className="space-y-4">
      {fields.map((field, index) => (
        <div key={field._questionnaireRowId} className="space-y-5 rounded-lg border border-border p-5">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-semibold">{question.label} {index + 1}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => remove(index)} aria-label={`Remove ${question.label} ${index + 1}`}>Remove</Button>
          </div>
          <RepeaterQuestions questions={question.metadata.fields} prefix={`${question.answerKey}.${index}`} values={values[index] || {}} form={form} optionSources={optionSources} repeaterRegistry={repeaterRegistry} />
        </div>
      ))}
      <Button type="button" variant="outline" onClick={() => append({ id: globalThis.crypto?.randomUUID?.() || `row_${Date.now()}_${Math.random().toString(36).slice(2)}`, ...getQuestionnaireRowDefaults(question.metadata.fields) })}>{question.metadata.addLabel || `Add ${question.label}`}</Button>
    </div>
  );
}

function SchemaRepeaterField(props) {
  const { question, form } = props;
  const { fieldState } = useController({ control: form.control, name: question.answerKey, defaultValue: question.metadata.collection === "object" ? {} : [] });
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">{question.label}{question.required && <span className="ml-1 text-red-600">*</span>}</Label>
      {question.description && <p className="text-sm text-gray-600">{question.description}</p>}
      {question.metadata.collection === "object" ? <ObjectRepeaterField {...props} /> : <ArrayRepeaterField {...props} />}
      {fieldState.error?.message && <p className="text-sm text-red-600">{fieldState.error.message}</p>}
    </div>
  );
}

function RepeaterField({ question, repeaterRegistry, form, optionSources }) {
  const Component = question.component ? repeaterRegistry?.[question.component] : null;

  if (Component) {
    return <Component question={question} form={form} />;
  }

  if (Array.isArray(question.metadata?.fields) && question.metadata.fields.length > 0) {
    return <SchemaRepeaterField question={question} repeaterRegistry={repeaterRegistry} form={form} optionSources={optionSources} />;
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
    return <RepeaterField question={question} repeaterRegistry={repeaterRegistry} form={form} optionSources={optionSources} />;
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
