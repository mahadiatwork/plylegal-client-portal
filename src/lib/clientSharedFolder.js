const WORKDRIVE_PUBLIC_HOST = /^workdrive\.(?:zohopublic|zohoexternal)\.(?:com|com\.au|eu|in|jp|ca|sa|com\.cn)$/i;
const WORKDRIVE_EXTERNAL_PATH = /^\/external\/[A-Za-z0-9][A-Za-z0-9_-]*\/?$/;

/**
 * Only a client-facing external share link may be returned to the portal.
 * In particular, an internal matter-folder permalink must never be exposed.
 */
export function getClientSharedFolderAccess(value) {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const url = new URL(value.trim());
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      url.search ||
      url.hash ||
      !WORKDRIVE_PUBLIC_HOST.test(url.hostname)
    ) {
      return null;
    }

    if (WORKDRIVE_EXTERNAL_PATH.test(url.pathname)) {
      return { url: url.toString(), mode: "external" };
    }
  } catch {
    // Invalid and legacy values must never become iframe or navigation targets.
  }

  return null;
}
