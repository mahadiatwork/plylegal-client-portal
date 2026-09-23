"use client";

import { useController, useFieldArray, useWatch } from "react-hook-form";
import { Field } from "@/components/Field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConditionalBlock } from "@/components/questionnaire/ConditionalBlock";
import { getQuestionnaireMonthOptions } from "@/lib/questionnaires/answers";
import { getQuestionnaireCountryOptions } from "@/lib/questionnaires/presentation";
import { getQuestionnaireRowDefaults, scopeQuestionnaireRowField } from "@/lib/questionnaires/repeaters";

const YES_NO_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

function getOptions(question, optionSources) {
  if (question.optionsSource) return optionSources?.[question.optionsSource] || [];
  if (question.type === "yesNo") {
    return Array.isArray(question.options) && question.options.length
      ? question.options
      : YES_NO_OPTIONS;
  }
  return question.options || [];
}

function DatePartSelect({ control, monthQuestion = null, name, label, options, placeholder }) {
  const { field, fieldState } = useController({ control, name });
  const compatibleOptions = monthQuestion
    ? getQuestionnaireMonthOptions(monthQuestion, field.value)
    : options;

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
          {compatibleOptions.map((option) => (
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
  const dynamicLabel = question.metadata?.labelByValue;
  const sourceValue = useWatch({
    control: form.control,
    name: dynamicLabel?.field || "",
    disabled: !dynamicLabel?.field,
  });
  const displayLabel = dynamicLabel?.labels?.[sourceValue] || question.label;
  const partLabels = question.metadata?.partLabels || {};

  return (
    <div className="space-y-3">
      {!question.metadata?.hideDateHeading && (
        <Label className="text-sm font-medium">
          {displayLabel}
          {question.required && <span className="text-red-600 ml-1">*</span>}
        </Label>
      )}
      {question.description && <p className="text-sm text-gray-600">{question.description}</p>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DatePartSelect control={form.control} name={names.day} label={partLabels.day || "Day"} options={dayOptions} placeholder={partLabels.day || "Day"} />
        <DatePartSelect control={form.control} monthQuestion={question} name={names.month} label={partLabels.month || "Month"} options={[]} placeholder={partLabels.month || "Month"} />
        <DatePartSelect control={form.control} name={names.year} label={partLabels.year || "Year"} options={yearOptions} placeholder={partLabels.year || "Year"} />
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

function CountrySelectField({ question, form }) {
  const currentValue = useWatch({ control: form.control, name: question.answerKey });
  return (
    <Field
      control={form.control}
      name={question.answerKey}
      type="select"
      label={question.label}
      description={question.description}
      placeholder={question.placeholder || "Choose Country"}
      required={question.required}
      options={getQuestionnaireCountryOptions(currentValue)}
    />
  );
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

function ApplicantIdArrayField({ question, form, optionSources }) {
  const { field, fieldState } = useController({
    control: form.control,
    name: question.answerKey,
    defaultValue: [],
  });
  const values = Array.isArray(field.value) ? field.value.map(String) : [];
  const configured = Array.isArray(optionSources?.applicantIds) ? optionSources.applicantIds : [];
  const configuredIds = new Set(configured.map((option) => String(option.value)));
  const options = [
    ...configured,
    ...values
      .filter((value) => !configuredIds.has(value))
      .map((value) => ({
        value,
        label: value.startsWith("legacy_name:")
          ? `${value.slice("legacy_name:".length)} (saved applicant)`
          : `${value} (saved applicant)`,
      })),
  ];

  const setChecked = (value, checked) => {
    const next = checked
      ? [...new Set([...values, value])]
      : values.filter((entry) => entry !== value);
    field.onChange(next);
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">
        {question.label}
        {question.required && <span className="ml-1 text-red-600">*</span>}
      </Label>
      {question.description && <p className="text-sm text-gray-600">{question.description}</p>}
      {options.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-gray-600">
          Add applicants in the application before selecting them here.
        </p>
      ) : (
        <div className="space-y-2 rounded-lg border border-border p-4">
          {options.map((option, index) => {
            const value = String(option.value);
            const inputId = `${question.id || question.answerKey}-applicant-${index}`;
            return (
              <div key={value} className="flex items-center gap-2">
                <Checkbox
                  id={inputId}
                  checked={values.includes(value)}
                  onCheckedChange={(checked) => setChecked(value, checked === true)}
                />
                <Label htmlFor={inputId} className="cursor-pointer font-normal">
                  {option.label}
                </Label>
              </div>
            );
          })}
        </div>
      )}
      {fieldState.error?.message && <p className="text-sm text-red-600">{fieldState.error.message}</p>}
    </div>
  );
}

function StringArrayRepeaterField({ question, form }) {
  const { field, fieldState } = useController({
    control: form.control,
    name: question.answerKey,
    defaultValue: [],
  });
  const values = Array.isArray(field.value) ? field.value : [];
  const itemDefinition = question.metadata?.fields?.[0] || {};
  const itemLabel = itemDefinition.label || question.label;

  const updateItem = (index, value) => {
    const next = [...values];
    next[index] = value;
    field.onChange(next);
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">
        {question.label}
        {question.required && <span className="ml-1 text-red-600">*</span>}
      </Label>
      {question.description && <p className="text-sm text-gray-600">{question.description}</p>}
      <div className="space-y-3">
        {values.map((value, index) => (
          <div key={index} className="flex items-center gap-3">
            <Input
              aria-label={`${itemLabel} ${index + 1}`}
              onChange={(event) => updateItem(index, event.target.value)}
              placeholder={itemDefinition.placeholder || question.placeholder}
              value={typeof value === "string" ? value : ""}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => field.onChange(values.filter((_, itemIndex) => itemIndex !== index))}
              aria-label={`Remove ${itemLabel} ${index + 1}`}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" onClick={() => field.onChange([...values, ""])}>
        {question.metadata?.addLabel || `Add ${question.label}`}
      </Button>
      {fieldState.error?.message && <p className="text-sm text-red-600">{fieldState.error.message}</p>}
    </div>
  );
}

function ApplicantAddressesField({ question, form, optionSources, pageQuestions, repeaterRegistry }) {
  const { fieldState } = useController({
    control: form.control,
    name: question.answerKey,
    defaultValue: {},
  });
  const allSameAddress = useWatch({ control: form.control, name: "all_same_address" });
  const applicants = Array.isArray(optionSources?.applicantIds) ? optionSources.applicantIds : [];
  const mainApplicant = applicants.find((applicant) => applicant.relationship === "main_applicant")
    || applicants[0];
  const additionalApplicants = applicants.filter(
    (applicant) => String(applicant.value) !== String(mainApplicant?.value || ""),
  );
  const addressQuestion = (pageQuestions || []).find(
    (candidate) => candidate.answerKey === "main_applicant_addresses"
      && candidate.type === "repeater"
      && Array.isArray(candidate.metadata?.fields),
  );

  if (allSameAddress !== "no") {
    return (
      <p className="rounded-lg border border-dashed p-4 text-sm text-gray-600">
        The main applicant&apos;s address history will be used for every applicant.
      </p>
    );
  }

  if (!addressQuestion || additionalApplicants.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-sm text-gray-600">
        There are no additional applicants who need a separate address history.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <Label className="text-sm font-medium">Addresses for each additional applicant</Label>
        {question.description && <p className="mt-1 text-sm text-gray-600">{question.description}</p>}
      </div>
      {additionalApplicants.map((applicant) => (
        <SchemaRepeaterField
          key={applicant.value}
          question={{
            ...addressQuestion,
            id: `${question.id}-${applicant.value}`,
            answerKey: `${question.answerKey}.${applicant.value}`,
            label: `${applicant.label} address history`,
            metadata: {
              ...addressQuestion.metadata,
              addLabel: `Add address for ${applicant.label}`,
            },
          }}
          form={form}
          optionSources={optionSources}
          repeaterRegistry={repeaterRegistry}
        />
      ))}
      {fieldState.error?.message && <p className="text-sm text-red-600">{fieldState.error.message}</p>}
    </div>
  );
}

function ApplicantLanguagesRepeaterField({ question, form, optionSources, repeaterRegistry }) {
  const { fieldState } = useController({
    control: form.control,
    name: question.answerKey,
    defaultValue: [],
  });
  const applicants = useWatch({ control: form.control, name: question.answerKey }) || [];
  const languageQuestions = (question.metadata?.fields || []).filter(
    (field) => field.answerKey !== "name",
  );

  return (
    <div className="space-y-6">
      {applicants.length === 0 && (
        <p className="rounded-lg border border-dashed p-5 text-sm text-gray-600">
          There are no applicants who need to provide language details.
        </p>
      )}
      {applicants.map((applicant, index) => (
        <section key={applicant.id || index} className="space-y-4 rounded-lg border border-border p-5">
          <div>
            <h3 className="font-semibold">{applicant.name || `Applicant ${index + 1}`}</h3>
            {applicant._languageEligibility === "unknown" && (
              <p className="mt-1 text-sm text-amber-700">
                Enter this applicant&apos;s date of birth in Details before completing languages.
              </p>
            )}
          </div>
          <RepeaterQuestions
            questions={languageQuestions}
            prefix={`${question.answerKey}.${index}`}
            values={applicant}
            form={form}
            optionSources={optionSources}
            repeaterRegistry={repeaterRegistry}
          />
        </section>
      ))}
      {fieldState.error?.message && <p className="text-sm text-red-600">{fieldState.error.message}</p>}
    </div>
  );
}

function RepeaterField({ answerLayout, question, repeaterRegistry, form, optionSources, pageQuestions }) {
  const Component = question.component ? repeaterRegistry?.[question.component] : null;

  if (Component) {
    return <Component question={question} form={form} />;
  }

  if (question.metadata?.itemType === "string") {
    return question.answerKey.split(".").pop() === "applicant_ids"
      ? <ApplicantIdArrayField question={question} form={form} optionSources={optionSources} />
      : <StringArrayRepeaterField question={question} form={form} />;
  }

  if (answerLayout === "applicantLanguages" && question.answerKey === "applicants") {
    return (
      <ApplicantLanguagesRepeaterField
        question={question}
        form={form}
        optionSources={optionSources}
        repeaterRegistry={repeaterRegistry}
      />
    );
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

export function QuestionField({ answerLayout, form, optionSources, pageQuestions, question, repeaterRegistry }) {
  const options = getOptions(question, optionSources);

  if (answerLayout === "applicantAddresses" && question.answerKey === "addresses_by_applicant") {
    return (
      <ApplicantAddressesField
        question={question}
        form={form}
        optionSources={optionSources}
        pageQuestions={pageQuestions}
        repeaterRegistry={repeaterRegistry}
      />
    );
  }

  if (
    question.metadata?.clientControl === "select"
    && question.answerKey.split(".").pop() === "country_of_birth"
  ) {
    return <CountrySelectField question={question} form={form} />;
  }

  if (question.type === "dateParts") {
    return <DatePartsField question={question} form={form} />;
  }

  if (question.type === "repeater") {
    return <RepeaterField answerLayout={answerLayout} question={question} repeaterRegistry={repeaterRegistry} form={form} optionSources={optionSources} pageQuestions={pageQuestions} />;
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
