/**
 * URLSearchParams keys are case-sensitive. Normalize common intake query names
 * so links that use `profileid` / `applicationid` still resolve.
 */
export function getApplicationIdFromSearchParams(searchParams) {
  if (!searchParams) return null;
  return (
    searchParams.get("applicationId") ??
    searchParams.get("applicationid") ??
    null
  );
}

export function getProfileIdFromSearchParams(searchParams) {
  if (!searchParams) return null;
  return searchParams.get("profileId") ?? searchParams.get("profileid") ?? null;
}
