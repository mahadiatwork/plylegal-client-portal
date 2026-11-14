"use client";

import { useMemo } from "react";
import { useController, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { RepeaterTable } from "@/components/RepeaterTable";
import { QuestionRenderer } from "@/components/questionnaire/QuestionRenderer";
import {
  getQuestionnairePageValidationIssues,
  sanitizeQuestionnairePageValues,
} from "@/lib/questionnaires/answers";
import { getQuestionnaireRowDefaults } from "@/lib/questionnaires/repeaters";
import { formatQuestionnaireColumnValue } from "@/lib/questionnaires/columnFormat";

/**
 * Definition-driven equivalent of the hand-written RepeaterTable + popup dialogs used by
 * legacy pages. Table copy, columns and dialog titles come from metadata.presentation;
 * popup fields come from metadata.fields (metadata.group on a field starts a popup section).
 */

function defaultColumns(fields) {
  return fields
    .filter((field) => field.type !== "repeater" && !field.metadata?.storageOnly)
    .slice(0, 4)
    .map((field) => field.type === "dateParts"
      ? { key: field.answerKey, label: field.label, format: "groupedDate" }
      : { key: field.answerKey, label: field.label });
}

const ROW_KEY = "__row";
const COLLECTION_RULES = new Set(["minimumRows", "minRowsWhenEquals", "continuousHistoryCoverage", "residenceHistoryCoverage"]);

/** Validate one popup row exactly as page submission validates rows (field + per-row rules). */
function getRowValidationIssues(question, row) {
  const rules = (question.metadata?.validation?.rules || []).filter((rule) => !COLLECTION_RULES.has(rule.id));
  const page = {
    questions: [{
      ...question,
      answerKey: ROW_KEY,
      required: false,
      visibleIf: undefined,
      validation: undefined,
      metadata: { ...question.metadata, validation: { rules } },
    }],
  };
  const prefix = `${ROW_KEY}.0.`;
  return getQuestionnairePageValidationIssues(page, { [ROW_KEY]: [row] })
    .filter((issue) => issue.fieldName.startsWith(prefix))
    .map((issue) => ({ ...issue, fieldName: issue.fieldName.slice(prefix.length) }));
}

function DynamicRowDialog({ cancelLabel, confirmLabel, editingRow, fields, onCancel, onSave, optionSources, question, repeaterRegistry }) {
  const defaultValues = useMemo(
    () => ({ ...getQuestionnaireRowDefaults(fields), ...(editingRow || {}) }),
    [editingRow, fields]
  );
  const dialogForm = useForm({ defaultValues });
  const values = dialogForm.watch();
  const rowPage = useMemo(() => ({ questions: fields }), [fields]);

  const handleOk = () => {
    const sanitized = sanitizeQuestionnairePageValues(rowPage, dialogForm.getValues());
    dialogForm.clearErrors();
    const issues = getRowValidationIssues(question, sanitized);
    if (issues.length) {
      issues.forEach(({ fieldName, message }) => dialogForm.setError(fieldName, { type: "required", message }));
      return;
    }
    // Keep any stored row keys this definition does not manage.
    onSave({ ...(editingRow || {}), ...sanitized });
    dialogForm.reset(getQuestionnaireRowDefaults(fields));
  };

  return (
    <>
      <div className="space-y-6 max-h-[70vh] overflow-y-auto px-1" data-testid="dynamic-row-dialog">
        <QuestionRenderer nested
          form={dialogForm}
          optionSources={optionSources}
          questions={fields}
          repeaterRegistry={repeaterRegistry}
          values={values}
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
          {cancelLabel}
        </Button>
        <Button type="button" onClick={handleOk} className="bg-[#4F726B] hover:bg-[#4F726B] text-white" data-testid="button-ok">
          {confirmLabel}
        </Button>
      </DialogFooter>
    </>
  );
}

export function SchemaRepeaterTable({ question, form, optionSources, repeaterRegistry }) {
  const { field, fieldState } = useController({ control: form.control, name: question.answerKey, defaultValue: [] });
  const rows = Array.isArray(field.value) ? field.value : [];
  const fields = question.metadata?.fields || [];
  const presentation = question.metadata?.presentation || {};
  const columns = (presentation.columns?.length ? presentation.columns : defaultColumns(fields)).map((column) => ({
    key: column.key,
    label: column.label,
    format: (row) => formatQuestionnaireColumnValue(row, column, { fields, optionSources }),
  }));
  const actions = presentation.actions || {};
  const testIdPrefix = String(question.answerKey || "entry").split(".").pop().replace(/_/g, "-");

  const update = (next) => field.onChange(next);

  return (
    <div className="space-y-2" data-testid={`repeater-${testIdPrefix}`}>
      {!presentation.hideLabel && (
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {question.label}
          {question.required && <span className="text-red-600 ml-1">*</span>}
        </h3>
      )}
      {question.description && <p className="text-sm text-gray-600">{question.description}</p>}
      <RepeaterTable
        data={rows}
        columns={columns}
        onAdd={(row) => update([...rows, row])}
        onEdit={(index, row) => update(rows.map((existing, rowIndex) => (rowIndex === index ? row : existing)))}
        onDelete={(index) => update(rows.filter((_, rowIndex) => rowIndex !== index))}
        DialogComponent={DynamicRowDialog}
        dialogProps={{
          fields,
          question,
          optionSources,
          repeaterRegistry,
          cancelLabel: actions.cancel || "Cancel",
          confirmLabel: actions.confirm || "Ok",
        }}
        addButtonText={presentation.addLabel || "Add"}
        emptyMessage={presentation.emptyMessage || "No entries added"}
        dialogTitle={presentation.addDialogTitle}
        editDialogTitle={presentation.editDialogTitle}
        dialogSubtitle={presentation.dialogSubtitle}
        fieldName={question.answerKey}
        testIdPrefix={testIdPrefix}
      />
      {fieldState.error?.message && <p className="text-sm text-red-600" data-testid={`${testIdPrefix}-error`}>{fieldState.error.message}</p>}
    </div>
  );
}
