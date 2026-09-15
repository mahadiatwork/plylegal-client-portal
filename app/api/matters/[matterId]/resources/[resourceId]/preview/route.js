import { NextResponse } from "next/server";
import { getBearerToken, requireClient, verifyFirebaseIdentity } from "@/lib/serverAuth";
import { createFirestoreClient, getOwnedApplication, resourceErrorResponse } from "@/lib/firestoreClient";
import {
  buildPreviewHeaders,
  createPreviewToken,
  getPreviewCookieName,
  getPreviewCookieOptions,
  getPreviewTimeoutMs,
  isDocumentReviewResource,
  isValidRangeHeader,
  toWorkDriveDownloadUrl,
  validateWorkDriveRedirect,
  verifyPreviewToken,
} from "@/lib/workdrivePreview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(error, status) {
  return NextResponse.json(
    { success: false, error },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );
}

function getStoredDownloadUrl(resource) {
  for (const value of [
    resource.downloadUrl,
    resource.workDriveShareUrl,
    resource.publicUrl,
    resource.externalUrl,
    resource.url,
  ]) {
    const downloadUrl = toWorkDriveDownloadUrl(value);
    if (downloadUrl) return downloadUrl;
  }
  return null;
}

async function resolveAuthorizedResource(client, auth, matterId, resourceId) {
  if (!resourceId || resourceId.includes("/")) return { response: errorResponse("A valid resource ID is required", 400) };
  await getOwnedApplication(client, auth, matterId);
  const matterResource = await client.getDocument(`applications/${matterId}/resources/${resourceId}`);
  if (matterResource) {
    const resource = matterResource;
    if (!isDocumentReviewResource(resource)) {
      return { response: errorResponse("Resource not found", 404) };
    }

    const downloadUrl = getStoredDownloadUrl(resource);
    if (!downloadUrl) {
      return { response: errorResponse("A WorkDrive preview is not available for this file", 502) };
    }

    return { resource, downloadUrl };
  }

  // Resource Center files use their download-disabled WorkDrive viewer only.
  return { response: errorResponse("Resource not found", 404) };
}

async function resolveRequestResource(request, auth, matterId, resourceId) {
  try {
    const client = createFirestoreClient(getBearerToken(request), request.signal);
    return await resolveAuthorizedResource(client, auth, matterId, resourceId);
  } catch (error) {
    console.error("[resource-preview] Load failed", { status: error.status || 502, code: error.name });
    return { response: resourceErrorResponse(error) };
  }
}

async function authenticatePreviewRequest(request, matterId, resourceId) {
  if (request.headers.get("authorization")) {
    const auth = await verifyFirebaseIdentity(request);
    const clientCheck = requireClient(auth);
    return clientCheck.authorized ? auth : { response: errorResponse(clientCheck.error, clientCheck.status) };
  }

  const token = request.cookies?.get(getPreviewCookieName())?.value;
  const auth = verifyPreviewToken(token, { matterId, resourceId });
  return auth?.purpose === "documentReview"
    ? auth
    : { response: errorResponse("Authentication required", 401) };
}

function requestSignal(request) {
  const timeoutSignal = AbortSignal.timeout(getPreviewTimeoutMs());
  return request.signal ? AbortSignal.any([request.signal, timeoutSignal]) : timeoutSignal;
}

function resourceFilename(resource) {
  return resource.fileName || resource.name || resource.title || "document.pdf";
}

function resolveTokenBoundResource(auth) {
  if (!auth.downloadUrl) return null;

  const downloadUrl = toWorkDriveDownloadUrl(auth.downloadUrl);
  if (!downloadUrl) {
    return { response: errorResponse("Preview authorization is invalid", 401) };
  }

  return {
    downloadUrl,
    resource: {
      fileName: auth.fileName || "document.pdf",
      fileSize: auth.fileSize,
    },
  };
}

function rangeNotSatisfiable(resource, contentRange = null) {
  const size = Number(resource.fileSize || resource.size);
  const upstreamHeaders = new Headers();
  if (contentRange) {
    upstreamHeaders.set("Content-Range", contentRange);
  } else if (Number.isSafeInteger(size) && size >= 0) {
    upstreamHeaders.set("Content-Range", `bytes */${size}`);
  }

  return new Response(null, {
    status: 416,
    headers: buildPreviewHeaders({
      filename: resourceFilename(resource),
      upstreamHeaders,
    }),
  });
}

async function preview(request, context) {
  const { matterId, resourceId } = await context.params;
  if (!matterId || !resourceId) return errorResponse("Matter and resource are required", 400);

  const auth = await authenticatePreviewRequest(request, matterId, resourceId);
  if (auth.response) return auth.response;

  let resolved = resolveTokenBoundResource(auth);
  if (!resolved) {
    resolved = await resolveRequestResource(request, auth, matterId, resourceId);
  }
  if (resolved.response) return resolved.response;

  const range = request.headers.get("range");
  if (!isValidRangeHeader(range)) return rangeNotSatisfiable(resolved.resource);

  const signal = requestSignal(request);

  try {
    const redirectResponse = await fetch(resolved.downloadUrl, {
      cache: "no-store",
      headers: { Accept: "application/pdf" },
      redirect: "manual",
      signal,
    });
    const location = redirectResponse.headers.get("location");
    await redirectResponse.body?.cancel();

    if (![301, 302, 303, 307, 308].includes(redirectResponse.status)) {
      return errorResponse("WorkDrive did not return a valid file redirect", 502);
    }

    const destination = validateWorkDriveRedirect(location);
    if (!destination) return errorResponse("WorkDrive redirect was not allowed", 502);

    const upstream = await fetch(destination, {
      cache: "no-store",
      headers: {
        Accept: "application/pdf",
        ...(range ? { Range: range } : {}),
      },
      redirect: "error",
      signal,
    });

    if (upstream.status === 416) {
      const contentRange = upstream.headers.get("content-range");
      await upstream.body?.cancel();
      return /^bytes \*\/\d+$/.test(contentRange || "")
        ? rangeNotSatisfiable(resolved.resource, contentRange)
        : errorResponse("WorkDrive returned an invalid range response", 502);
    }

    const contentType = upstream.headers.get("content-type")?.toLowerCase() || "";
    if (
      ![200, 206].includes(upstream.status) ||
      !upstream.body ||
      !contentType.startsWith("application/pdf")
    ) {
      await upstream.body?.cancel();
      return errorResponse("WorkDrive could not load the PDF preview", 502);
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: buildPreviewHeaders({
        filename: resourceFilename(resolved.resource),
        upstreamHeaders: upstream.headers,
      }),
    });
  } catch {
    return errorResponse("Unable to preview document", 504);
  }
}

export async function POST(request, context) {
  const { matterId, resourceId } = await context.params;
  if (!matterId || !resourceId) return errorResponse("Matter and resource are required", 400);

  const auth = await authenticatePreviewRequest(request, matterId, resourceId);
  if (auth.response) return auth.response;

  const resolved = await resolveRequestResource(request, auth, matterId, resourceId);
  if (resolved.response) return resolved.response;

  try {
    const token = createPreviewToken({
      uid: auth.uid,
      role: auth.role,
      matterId,
      resourceId,
      purpose: "documentReview",
      downloadUrl: resolved.downloadUrl.toString(),
      fileName: resourceFilename(resolved.resource),
      fileSize: resolved.resource.fileSize || resolved.resource.size,
    });
    const path = `/api/matters/${encodeURIComponent(matterId)}/resources/${encodeURIComponent(resourceId)}/preview`;
    const response = NextResponse.json({
      success: true,
      previewUrl: path,
    });
    response.headers.set("Cache-Control", "private, no-store");
    response.cookies.set(getPreviewCookieName(), token, getPreviewCookieOptions(request, matterId, resourceId));
    return response;
  } catch {
    return errorResponse("Unable to prepare document preview", 500);
  }
}

export async function GET(request, context) {
  return preview(request, context);
}
