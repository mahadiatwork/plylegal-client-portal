"use client";

import { useEffect } from "react";
import { evaluateVisibleIf } from "@/lib/questionnaires/validation";

export function ConditionalBlock({ children, clearWhenHidden = false, fieldNames = [], form, values, visibleIf = [] }) {
  const isVisible = evaluateVisibleIf(visibleIf, values);

  useEffect(() => {
    if (!clearWhenHidden || isVisible || !form) return;
    fieldNames.forEach((fieldName) => {
      form.setValue(fieldName, "", { shouldDirty: true, shouldValidate: false });
    });
  }, [clearWhenHidden, fieldNames, form, isVisible]);

  if (!isVisible) return null;
  return children;
}
