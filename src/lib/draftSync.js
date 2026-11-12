/**
 * Pure helpers behind the draft load/save optimisations.
 */

/**
 * Share one in-flight promise per key. Concurrent callers get the same promise;
 * the entry is removed once it settles (including on failure) so a later call
 * starts fresh. A missing key disables sharing.
 */
export function dedupeInFlight(inflight, key, start) {
  if (key === undefined || key === null || key === "") return start();

  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = Promise.resolve(start()).finally(() => {
    if (inflight.get(key) === promise) inflight.delete(key);
  });
  inflight.set(key, promise);
  return promise;
}

/** Stable per-top-level-key signatures of a draft. */
export function draftSignatures(draft = {}) {
  const signatures = {};
  for (const [key, value] of Object.entries(draft)) {
    signatures[key] = JSON.stringify(value) ?? "";
  }
  return signatures;
}

/**
 * Compare a draft with the signatures of the last loaded/saved state.
 * Returns the top-level keys that need writing and the draft's signatures.
 * Without a baseline everything is considered changed.
 */
export function diffDraftKeys(draft = {}, baseline) {
  const signatures = draftSignatures(draft);
  const changed = {};
  for (const [key, value] of Object.entries(draft)) {
    if (!baseline || baseline[key] !== signatures[key]) changed[key] = value;
  }
  return { changed, signatures };
}
