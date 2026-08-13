import { createHmac, timingSafeEqual } from "node:crypto";

const EXTERNAL_HOSTS = new Set([
  "workdrive.zohoexternal.com",
  "workdrive.zohopublic.com.au",
]);

const FILE_HOST_PATHS = new Map([
  ["files-accl.zohoexternal.com", /^\/public\/workdrive-external\/download\/[A-Za-z0-9_-]+$/],
  ["files.zohoexternal.com", /^\/public\/workdrive-external\/download\/[A-Za-z0-9_-]+$/],
]);

const EXTERNAL_PATH = /^\/external\/([A-Za-z0-9_-]+)\/?$/;
const PREVIEW_COOKIE = "plylegal_workdrive_preview";
const PREVIEW_TOKEN_TTL_SECONDS = 120;

function isPlainHttpsUrl(url) {
  return url.protocol === "https:" && !url.username && !url.password && !url.port;
}

export function toWorkDriveDownloadUrl(storedExternalUrl) {
  if (typeof storedExternalUrl !== "string" || !storedExternalUrl.trim()) return null;

  try {
    const source = new URL(storedExternalUrl);
    if (!isPlainHttpsUrl(source) || !EXTERNAL_HOSTS.has(source.hostname)) return null;

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
    const pathPattern = FILE_HOST_PATHS.get(destination.hostname);
    if (!isPlainHttpsUrl(destination) || !pathPattern || !pathPattern.test(destination.pathname)) {
      return null;
    }
    return destination;
  } catch {
    return null;
  }
}

export function isPdfResource(resource) {
  if (!resource || String(resource.kind || "").toLowerCase() !== "file") return false;

  const mimeType = String(resource.mimeType || "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();

  return mimeType === "application/pdf" || (!mimeType && /\.pdf$/i.test(String(resource.name || "")));
}

export function isPreviewableResource(resource) {
  return String(resource?.status || "").toLowerCase() === "active" && isPdfResource(resource);
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

export function createPreviewToken({ uid, role, matterId, resourceId }) {
  if (!getPreviewSecret()) throw new Error("Preview token secret is not configured");

  return signToken({
    uid,
    role,
    matterId,
    resourceId,
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

    return {
      authenticated: true,
      uid: payload.uid,
      role: payload.role || "client",
    };
  } catch {
    return null;
  }
}

export function getPreviewCookieName() {
  return PREVIEW_COOKIE;
}

export function getPreviewCookieOptions(request, matterId, resourceId) {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(request.url).protocol === "https:",
    maxAge: PREVIEW_TOKEN_TTL_SECONDS,
    path: `/api/matters/${encodeURIComponent(matterId)}/resources/${encodeURIComponent(resourceId)}/preview`,
  };
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
