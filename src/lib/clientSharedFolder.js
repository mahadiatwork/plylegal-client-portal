const WORKDRIVE_PUBLIC_HOST = /^workdrive\.(?:zoho|zohopublic|zohoexternal)\.(?:com|com\.au|eu|in|jp|ca|sa|com\.cn)$/i;
const WORKDRIVE_RESOURCE_PATH = /^\/(?:file|folder)\/[A-Za-z0-9][A-Za-z0-9_-]*\/?$/;
const WORKDRIVE_EXTERNAL_PATH = /^\/external\/[A-Za-z0-9][A-Za-z0-9_-]*\/?$/;

/**
 * Accept only WorkDrive URLs that can be shown to the client.
 * Published file/folder permalinks are embeddable; custom external share links
 * remain available as a safe new-tab fallback.
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

    if (WORKDRIVE_RESOURCE_PATH.test(url.pathname)) {
      return { url: url.toString(), mode: "embed" };
    }

    if (WORKDRIVE_EXTERNAL_PATH.test(url.pathname)) {
      return { url: url.toString(), mode: "external" };
    }
  } catch {
    // Invalid and legacy values must never become iframe or navigation targets.
  }

  return null;
}
