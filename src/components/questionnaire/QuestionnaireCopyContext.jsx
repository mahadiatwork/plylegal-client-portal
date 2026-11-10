"use client";

import { Children, cloneElement, createContext, isValidElement, useCallback, useContext, useMemo } from "react";
import { createLegacyQuestionnaireCopy, resolveLegacyQuestionnaireRepeaterPath, translateLegacyQuestionnaireCopy } from "@/lib/questionnaires/legacyCopy";

const QuestionnaireCopyContext = createContext(null);
const QuestionnaireCopyFieldContext = createContext(null);

export function QuestionnaireCopyProvider({ children, page }) {
  const copy = useMemo(() => createLegacyQuestionnaireCopy(page), [page]);
  return <QuestionnaireCopyContext.Provider value={copy}>{children}</QuestionnaireCopyContext.Provider>;
}

export function QuestionnaireCopyFieldScope({ children, fieldName }) {
  const parentFieldName = useContext(QuestionnaireCopyFieldContext);
  const path = fieldName || parentFieldName;
  return <QuestionnaireCopyFieldContext.Provider value={path}>{children}</QuestionnaireCopyFieldContext.Provider>;
}

function scopedFieldName(scope, fieldName) {
  if (!scope) return fieldName;
  if (!fieldName) return scope;
  const value = String(fieldName);
  if (value === scope || value.startsWith(`${scope}.`)) return value;
  return `${scope}.${value}`;
}

export function useQuestionnaireCopy(kind = "all", fieldName = null) {
  const copy = useContext(QuestionnaireCopyContext);
  const scope = useContext(QuestionnaireCopyFieldContext);
  const path = scopedFieldName(scope, fieldName);
  return useCallback((value) => copy ? translateLegacyQuestionnaireCopy(value, copy, kind, path) : value, [copy, kind, path]);
}

export function useQuestionnaireRepeaterFieldName(hints) {
  const copy = useContext(QuestionnaireCopyContext);
  const { fieldName, testIdPrefix, addButtonText, emptyMessage, dialogTitle, columns } = hints;
  return useMemo(() => resolveLegacyQuestionnaireRepeaterPath(copy, {
    fieldName,
    testIdPrefix,
    addButtonText,
    emptyMessage,
    dialogTitle,
    columns,
  }), [addButtonText, columns, copy, dialogTitle, emptyMessage, fieldName, testIdPrefix]);
}

/** Keep controls, refs and handlers intact while translating rendered React text. */
export function translateQuestionnaireChildren(children, translate) {
  const textNodes = Children.toArray(children);
  if (textNodes.length > 0 && textNodes.every((child) => typeof child === "string" || typeof child === "number")) {
    const original = textNodes.join("");
    const edited = translate(original);
    if (edited !== original) return edited;
  }
  return Children.map(children, (child) => {
    if (typeof child === "string") return translate(child);
    if (isValidElement(child) && child.props.children !== undefined) {
      return cloneElement(child, {}, translateQuestionnaireChildren(child.props.children, translate));
    }
    return child;
  });
}

export function QuestionnaireCopyText({ as: Component = "span", kind = "labels", fieldName = null, children, ...props }) {
  const translate = useQuestionnaireCopy(kind, fieldName);
  return <Component {...props}>{translateQuestionnaireChildren(children, translate)}</Component>;
}
