import { auth } from "@/lib/firebase";

export async function requestQuestionnaireCrmSync({
  applicationId,
  mode,
  pageId = null,
  profileId = null,
} = {}) {
  // Local drafts have no corresponding server-side application to synchronize,
  // even if Firebase credentials happen to be present in the environment.
  if (process.env.NEXT_PUBLIC_DATABASE_TYPE === "localStorage") {
    return { success: true, skipped: true, state: "idle", reason: "local_storage" };
  }
  if (!auth) return { success: true, skipped: true, state: "idle", reason: "firebase_not_configured" };
  let token;
  try {
    await auth.authStateReady?.();
    token = await auth.currentUser?.getIdToken();
  } catch {
    return { success: false, state: "failed", error: { code: "authentication_unavailable", message: "Unable to verify your session" } };
  }
  if (!token) {
    return { success: false, state: "failed", error: { code: "unauthenticated", message: "Authentication required" } };
  }
  try {
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
  } catch {
    return { success: false, state: "failed", error: { code: "network_error", message: "Unable to contact the CRM synchronization service" } };
  }
}

export function describeCrmSyncResult(result) {
  if (!result || result.skipped) return null;
  if (result.success && (result.dryRun || result.preview)) {
    return { state: "pending", message: "Saved. CRM synchronization is in dry-run mode." };
  }
  if (result.success) {
    const attentionCount = new Set((result.summary?.attention || []).map((item) =>
      item.fieldApiName ? `${item.module}:${item.fieldApiName}` : `${item.pageId}:${item.questionId}`
    )).size;
    const matterId = /^\d{6,32}$/.test(String(result.matterId || "")) ? result.matterId : null;
    const destination = matterId ? `CRM Matter ${matterId}` : "the Matter in CRM";
    return {
      state: "succeeded",
      message: attentionCount
        ? `Saved and verified in ${destination}. ${attentionCount} field${attentionCount === 1 ? "" : "s"} could not be mapped and may need review.`
        : `Saved and verified in ${destination}.`,
    };
  }
  const rawCode = result.error && typeof result.error === "object" ? result.error.code : null;
  const code = typeof rawCode === "string" && /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(rawCode)
    ? rawCode
    : null;
  return {
    state: "failed",
    message: `Saved. CRM synchronization failed${code ? ` (${code})` : ""}. Select Retry CRM sync to try again.`,
  };
}
