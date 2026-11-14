/** Table cell formatting for definition-driven repeaters (metadata.presentation.columns[].format). */

function dateBase(key) {
  return String(key || "").replace(/_(day|month|year)$/, "");
}

function groupedDate(row, key) {
  const base = dateBase(key);
  return [row?.[`${base}_day`], row?.[`${base}_month`], row?.[`${base}_year`]]
    .filter((part) => part !== undefined && part !== null && String(part).trim() !== "")
    .join(" ");
}

function optionLabel(fields, key, value) {
  const field = (fields || []).find((candidate) => candidate.answerKey === key);
  const option = (field?.options || []).find((candidate) => candidate.value === value);
  return option?.label ?? value;
}

// Formats mirror the hand-written legacy tables, e.g. "1 January 2020" and "Ongoing".
export function formatQuestionnaireColumnValue(row, column, { fields = [], optionSources = {} } = {}) {
  const value = row?.[column.key];
  switch (column.format) {
    case "groupedDate":
    case "protectionDate":
      return groupedDate(row, column.key);
    case "groupedDateOrOngoing":
    case "protectionDateOrOngoing":
      return groupedDate(row, column.key) || "Ongoing";
    case "yearFromDateParts":
      return row?.[`${dateBase(column.key)}_year`] ?? "";
    case "yesNoLabel":
      return value === "yes" ? "Yes" : value === "no" ? "No" : value ?? "";
    case "applicantNames": {
      const names = new Map((optionSources.applicantIds || []).map((option) => [String(option.value), option.label]));
      const list = Array.isArray(value) ? value : value ? [value] : [];
      return list.map((entry) => names.get(String(entry)) || String(entry).replace(/^legacy_name:/, "")).join(", ");
    }
    case "commaSeparatedLabels":
      return (Array.isArray(value) ? value : value ? [value] : []).map((entry) => optionLabel(fields, column.key, entry)).join(", ");
    default:
      if (Array.isArray(value)) return value.join(", ");
      if (value && typeof value === "object") return "";
      return optionLabel(fields, column.key, value) ?? "";
  }
}
