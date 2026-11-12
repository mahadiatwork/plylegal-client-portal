/**
 * Small promise cache: shares in-flight loads, keeps successful results for
 * `ttlMs`, and never caches failures.
 */
export function createTtlCache({ ttlMs, now = Date.now } = {}) {
  const entries = new Map();

  return {
    get(key, load) {
      const cached = entries.get(key);
      if (cached && now() - cached.at < ttlMs) return cached.promise;

      const entry = { at: now(), promise: null };
      let started;
      try {
        started = Promise.resolve(load());
      } catch (error) {
        started = Promise.reject(error);
      }
      entry.promise = started
        .catch((error) => {
          if (entries.get(key) === entry) entries.delete(key);
          throw error;
        });
      entries.set(key, entry);
      return entry.promise;
    },
    clear() {
      entries.clear();
    },
  };
}
