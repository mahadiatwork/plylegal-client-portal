const WORKDRIVE_VIEWER_HOST = /^workdrive\.(?:zoho|zohopublic|zohoexternal)\.(?:com|com\.au|eu|in|jp|ca|sa|com\.cn)$/i;
const WORKDRIVE_VIEWER_PATH = /^\/external\/[A-Za-z0-9_-]+\/?$/;

// Only admin-verified, download-disabled WorkDrive links may open client files.
export function getResourceViewerUrl(resource) {
  if (resource?.downloadAllowed !== false) return "";

  for (const value of [
    resource.viewerUrl,
    resource.externalUrl,
    resource.publicUrl,
    resource.workDriveShareUrl,
    resource.workdriveShareUrl,
    resource.url,
  ]) {
    if (typeof value !== "string" || !value.trim()) continue;
    try {
      const url = new URL(value);
      if (
        url.protocol === "https:" && !url.username && !url.password && !url.port &&
        WORKDRIVE_VIEWER_HOST.test(url.hostname) && WORKDRIVE_VIEWER_PATH.test(url.pathname) &&
        !url.search && !url.hash
      ) {
        return url.toString();
      }
    } catch {
      // A malformed or legacy URL must never become a file download fallback.
    }
  }
  return "";
}
