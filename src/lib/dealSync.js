/**
 * Pure helpers for the Zoho deal -> application sync.
 */

/** Whether enough time has passed since the last successful sync. */
export function shouldSyncDeals({ lastSyncedAt, now, minIntervalMs }) {
  const last = Number(lastSyncedAt);
  if (!Number.isFinite(last) || last <= 0) return true;
  if (now < last) return true; // clock moved backwards: do not stay stuck
  return now - last >= minIntervalMs;
}

/**
 * Decide which stored applications to delete after a sync.
 * - duplicates: the 2nd and later application sharing a zohoId
 * - orphans: CRM-linked applications whose deal no longer exists
 * An application is never in both lists.
 */
export function planApplicationCleanup(applications = [], deals = []) {
  const dealIds = new Set((deals || []).map((deal) => String(deal.id)));
  const seen = new Set();
  const duplicates = [];
  const orphans = [];

  for (const app of applications || []) {
    if (!app?.zohoId) continue;
    if (seen.has(app.zohoId)) {
      duplicates.push(app);
      continue;
    }
    seen.add(app.zohoId);
    if (!dealIds.has(app.zohoId)) orphans.push(app);
  }

  return { duplicates, orphans };
}
