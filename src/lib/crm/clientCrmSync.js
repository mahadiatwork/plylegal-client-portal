import { auth } from "@/lib/firebase";

export async function requestQuestionnaireCrmSync({
  applicationId,
  mode,
  pageId = null,
  profileId = null,
} = {}) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) {
    return { success: false, state: "failed", error: { code: "unauthenticated", message: "Authentication required" } };
  }
  const response = await fetch("/api/intake/crm-sync", {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      applicationId,
      mode,
      ...(pageId ? { pageId } : {}),
      ...(profileId ? { profileId } : {}),
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      success: false,
      state: payload.state || "failed",
      jobId: payload.jobId || null,
      error: payload.error || { message: "CRM synchronization failed" },
      summary: payload.summary || null,
    };
  }
  return payload;
}

export function describeCrmSyncResult(result) {
  if (!result || result.skipped) return null;
  if (result.success && (result.dryRun || result.preview)) {
    return { state: "pending", message: "Saved. CRM synchronization is in dry-run mode." };
  }
  if (result.success) {
    return { state: "succeeded", message: "Saved and synchronized to CRM." };
  }
  return {
    state: "failed",
    message: "Saved. CRM synchronization failed and will be retried.",
  };
}
