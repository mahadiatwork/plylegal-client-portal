import { createHmac, timingSafeEqual } from "node:crypto";

const ZOHO_PUBLIC_DOMAIN_PATTERN = String.raw`(?:com|com\.au|eu|in|jp|ca|sa|com\.cn)`;
const WORKDRIVE_SHARE_HOST = new RegExp(
  `^workdrive\\.(?:zohoexternal|zohopublic)\\.${ZOHO_PUBLIC_DOMAIN_PATTERN}$`,
);
const WORKDRIVE_FILE_HOST = new RegExp(
  `^files(?:-accl)?\\.(zohoexternal|zohopublic)\\.${ZOHO_PUBLIC_DOMAIN_PATTERN}$`,
);
const FILE_DOWNLOAD_PATHS = {
  zohoexternal: /^\/public\/workdrive-external\/download\/[A-Za-z0-9_-]+$/,
  zohopublic: /^\/public\/workdrive-public\/download\/[A-Za-z0-9_-]+$/,
};
const GENERIC_FILE_MIME_TYPES = new Set([
  "",
  "application/octet-stream",
  "application/download",
  "application/force-download",
  "application/x-download",
  "binary/octet-stream",
]);

const EXTERNAL_PATH = /^\/external\/([A-Za-z0-9_-]+)(?:\/download)?\/?$/;
const PREVIEW_COOKIE = "plylegal_workdrive_preview";
const PREVIEW_TOKEN_TTL_SECONDS = 60 * 60;

function isPlainHttpsUrl(url) {
  return url.protocol === "https:" && !url.username && !url.password && !url.port;
}

export function toWorkDriveDownloadUrl(storedExternalUrl) {
  if (typeof storedExternalUrl !== "string" || !storedExternalUrl.trim()) return null;

  try {
    const source = new URL(storedExternalUrl);
    if (!isPlainHttpsUrl(source) || !WORKDRIVE_SHARE_HOST.test(source.hostname.toLowerCase())) {
      return null;
    }

    const match = source.pathname.match(EXTERNAL_PATH);
    if (!match) return null;

    return new URL(`/external/${match[1]}/download?directDownload=true`, source.origin);
  } catch {
    return null;
  }
}

export function validateWorkDriveRedirect(location) {
  if (typeof location !== "string" || !location.trim()) return null;

  try {
    const destination = new URL(location);
    const hostMatch = destination.hostname.toLowerCase().match(WORKDRIVE_FILE_HOST);
    const pathPattern = hostMatch ? FILE_DOWNLOAD_PATHS[hostMatch[1]] : null;
    if (!isPlainHttpsUrl(destination) || !pathPattern?.test(destination.pathname)) {
      return null;
    }
    return destination;
  } catch {
    return null;
  }
}

export function isPdfResource(resource) {
  const resourceType = String(resource?.kind || resource?.type || "").toLowerCase();
  if (!resource || resourceType !== "file") return false;

  const mimeType = String(resource.mimeType || "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();

  const filename = resource.name || resource.fileName || resource.title || "";
  return mimeType === "application/pdf" ||
    (GENERIC_FILE_MIME_TYPES.has(mimeType) && /\.pdf$/i.test(String(filename)));
}

export function isPreviewableResource(resource) {
  return String(resource?.status || "").toLowerCase() === "active" && isPdfResource(resource);
}

export function isDocumentReviewResource(resource) {
  return String(resource?.source || "") === "documentReview" && isPreviewableResource(resource);
}

export function isValidRangeHeader(range) {
  if (!range) return true;

  const match = String(range).match(/^bytes=(\d*)-(\d*)$/);
  if (!match || (!match[1] && !match[2])) return false;

  const start = match[1] ? Number(match[1]) : null;
  const end = match[2] ? Number(match[2]) : null;
  if (
    (start !== null && !Number.isSafeInteger(start)) ||
    (end !== null && !Number.isSafeInteger(end))
  ) {
    return false;
  }

  return start === null || end === null || start <= end;
}

function getPreviewSecret() {
  return process.env.PREVIEW_TOKEN_SECRET || process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "";
}

function encodeTokenPart(value) {
  return Buffer.from(value).toString("base64url");
}

function signToken(payload) {
  const encodedPayload = encodeTokenPart(JSON.stringify(payload));
  const signature = createHmac("sha256", getPreviewSecret()).update(encodedPayload).digest("base64url");
  return `${encodedPayload}.${signature}`;
}

export function createPreviewToken({
  uid,
  role,
  matterId,
  resourceId,
  downloadUrl,
  fileName,
  fileSize,
  purpose,
}) {
  if (!getPreviewSecret()) throw new Error("Preview token secret is not configured");

  if (downloadUrl !== undefined && (typeof downloadUrl !== "string" || downloadUrl.length > 2048)) {
    throw new Error("Preview download URL is invalid");
  }
  if (fileName !== undefined && (typeof fileName !== "string" || fileName.length > 255)) {
    throw new Error("Preview filename is invalid");
  }

  return signToken({
    uid,
    role,
    matterId,
    resourceId,
    ...(downloadUrl ? { downloadUrl } : {}),
    ...(fileName ? { fileName } : {}),
    ...(fileSize !== undefined ? { fileSize } : {}),
    ...(purpose ? { purpose } : {}),
    exp: Math.floor(Date.now() / 1000) + PREVIEW_TOKEN_TTL_SECONDS,
  });
}

export function verifyPreviewToken(token, { matterId, resourceId }) {
  if (!getPreviewSecret() || typeof token !== "string") return null;

  const [encodedPayload, encodedSignature] = token.split(".");
  if (!encodedPayload || !encodedSignature) return null;

  try {
    const expectedSignature = createHmac("sha256", getPreviewSecret())
      .update(encodedPayload)
      .digest("base64url");
    const actual = Buffer.from(encodedSignature);
    const expected = Buffer.from(expectedSignature);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;

    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    if (
      !payload.uid ||
      payload.matterId !== matterId ||
      payload.resourceId !== resourceId ||
      !Number.isFinite(payload.exp) ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    if (
      (payload.downloadUrl !== undefined && typeof payload.downloadUrl !== "string") ||
      (payload.fileName !== undefined && typeof payload.fileName !== "string")
    ) {
      return null;
    }

    return {
      authenticated: true,
      uid: payload.uid,
      role: payload.role || "client",
      downloadUrl: payload.downloadUrl || "",
      fileName: payload.fileName || "",
      fileSize: payload.fileSize,
      purpose: payload.purpose || "",
    };
  } catch {
    return null;
  }
}

export function getPreviewCookieName() {
  return PREVIEW_COOKIE;
}

export function getPreviewCookieOptionsForPath(request, path) {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(request.url).protocol === "https:",
    maxAge: PREVIEW_TOKEN_TTL_SECONDS,
    path,
  };
}

export function getPreviewCookieOptions(request, matterId, resourceId) {
  return getPreviewCookieOptionsForPath(
    request,
    `/api/matters/${encodeURIComponent(matterId)}/resources/${encodeURIComponent(resourceId)}/preview`,
  );
}

export function buildPreviewHeaders({ filename, upstreamHeaders }) {
  const safeFilename = String(filename || "document.pdf").replace(/[\r\n]/g, " ").trim() || "document.pdf";
  const encodedFilename = encodeURIComponent(safeFilename).replace(/[!'()*]/g, (character) => (
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  ));
  const headers = new Headers({
    "Content-Type": "application/pdf",
    "Content-Disposition": `inline; filename*=UTF-8''${encodedFilename}`,
    "Accept-Ranges": upstreamHeaders.get("accept-ranges") || "bytes",
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  });

  for (const name of ["content-range", "content-length"]) {
    const value = upstreamHeaders.get(name);
    if (value) headers.set(name, value);
  }

  return headers;
}

export function getPreviewTimeoutMs() {
  const configured = Number(process.env.WORKDRIVE_PREVIEW_TIMEOUT_MS);
  return Number.isFinite(configured) && configured > 0 ? Math.min(configured, 120_000) : 30_000;
}
