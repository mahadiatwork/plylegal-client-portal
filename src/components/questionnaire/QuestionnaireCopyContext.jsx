"use client";

import { Children, cloneElement, createContext, isValidElement, useCallback, useContext, useMemo } from "react";
import { createLegacyQuestionnaireCopy, translateLegacyQuestionnaireCopy } from "@/lib/questionnaires/legacyCopy";

const QuestionnaireCopyContext = createContext(null);

export function QuestionnaireCopyProvider({ children, page }) {
  const copy = useMemo(() => createLegacyQuestionnaireCopy(page), [page]);
  return <QuestionnaireCopyContext.Provider value={copy}>{children}</QuestionnaireCopyContext.Provider>;
}

export function useQuestionnaireCopy(kind = "all", fieldName = null) {
  const copy = useContext(QuestionnaireCopyContext);
  return useCallback((value) => copy ? translateLegacyQuestionnaireCopy(value, copy, kind, fieldName) : value, [copy, fieldName, kind]);
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
