"use client";

import { useEffect } from "react";
import { evaluateVisibleIf } from "@/lib/questionnaires/validation";

export function ConditionalBlock({ children, clearWhenHidden = false, fieldDefaults = {}, form, values, visibleIf = [] }) {
  const isVisible = evaluateVisibleIf(visibleIf, values);
  const fieldDefaultsKey = JSON.stringify(fieldDefaults);

  useEffect(() => {
    if (!clearWhenHidden || isVisible || !form) return;
    const defaults = JSON.parse(fieldDefaultsKey);
    Object.entries(defaults).forEach(([fieldName, defaultValue]) => {
      form.setValue(fieldName, defaultValue, { shouldDirty: true, shouldValidate: false });
    });
  }, [clearWhenHidden, fieldDefaultsKey, form, isVisible]);

  if (!isVisible) return null;
  return children;
}
