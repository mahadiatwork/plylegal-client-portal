// src/hooks/useDraftForm.js

import { useForm, UseFormProps } from "react-hook-form";
import { useEffect, useRef } from "react";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import debounce from "lodash/debounce";

/**
 * Hook that integrates react-hook-form with draftStore.
 * It loads saved values for a given profile and section, auto‑saves on change (debounced),
 * and provides a saveNow method for explicit Save Draft / Continue actions.
 */
export function useDraftForm<T>(
  profileId: string | null,
  sectionKey: string,
  formOptions?: UseFormProps<T>
) {
  const form = useForm<T>({
    ...formOptions,
    defaultValues: {} as T,
  });
  const draftSnap = useSnapshot(draftStore);
  const isFirstLoad = useRef(true);

  // Load saved data when profileId changes
  useEffect(() => {
    if (!profileId) return;
    const saved = draftSnap.draft?.profiles_data?.[profileId]?.[sectionKey] ?? {};
    form.reset(saved as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, draftSnap.draft?.profiles_data]);

  // Auto‑save on any field change (debounced)
  useEffect(() => {
    const subscription = form.watch((value) => {
      if (isFirstLoad.current) return; // skip initial load
      if (!profileId) return;
      draftStore.autoSaveDebounced(profileId, sectionKey, value);
    });
    return subscription;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.watch, profileId, sectionKey]);

  // Reset first‑load flag after mount
  useEffect(() => {
    isFirstLoad.current = false;
  }, []);

  const saveNow = async () => {
    if (!profileId) return;
    const data = form.getValues();
    await draftStore.saveProfileSectionData(profileId, sectionKey, data);
  };

  return { form, saveNow };
}
