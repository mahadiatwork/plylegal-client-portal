import { NextResponse } from "next/server";
import {
  getBearerToken,
  requireClient,
  verifyFirebaseIdentity,
} from "@/lib/serverAuth";
import {
  createPreviewToken,
  getPreviewCookieName,
  getPreviewCookieOptions,
  isDocumentReviewResource,
  toWorkDriveDownloadUrl,
} from "@/lib/workdrivePreview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FIRESTORE_PAGE_SIZE = 100;
const FIRESTORE_MAX_PAGES = 20;

function errorResponse(error, status) {
  return NextResponse.json(
    { success: false, error },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );
}

function timestampMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.toDate === "function") return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function decodeFirestoreValue(value) {
  if (!value || typeof value !== "object") return undefined;
  if ("nullValue" in value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("referenceValue" in value) return value.referenceValue;
  if ("arrayValue" in value) {
    return (value.arrayValue?.values || []).map(decodeFirestoreValue);
  }
  if ("mapValue" in value) return decodeFirestoreFields(value.mapValue?.fields);
  return undefined;
}

function decodeFirestoreFields(fields = {}) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, decodeFirestoreValue(value)]),
  );
}

function firestoreDocumentsUrl(projectId) {
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents`;
}

async function fetchFirestoreJson(url, idToken, signal) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    signal,
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

function firestoreErrorResponse(stage, status, data) {
  console.error("[document-preview] Firestore request failed", {
    stage,
    status,
    upstreamStatus: data?.error?.status || "unknown",
  });

  if (status === 401) return errorResponse("Authentication required", 401);
  if (status === 403) return errorResponse("Access denied", 403);
  return errorResponse("Unable to load the review document", 502);
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

async function resolveDocumentReviewResource(idToken, auth, matterId, signal) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    return { response: errorResponse("Firebase project is not configured", 500) };
  }

  const matterUrl = `${firestoreDocumentsUrl(projectId)}/applications/${encodeURIComponent(matterId)}`;
  const matterResult = await fetchFirestoreJson(matterUrl, idToken, signal);
  if (matterResult.response.status === 404) {
    return { response: errorResponse("Matter not found", 404) };
  }
  if (!matterResult.response.ok) {
    return {
      response: firestoreErrorResponse(
        "matter",
        matterResult.response.status,
        matterResult.data,
      ),
    };
  }

  const matter = decodeFirestoreFields(matterResult.data.fields);
  if (auth.role !== "admin" && matter.userId !== auth.uid) {
    return { response: errorResponse("Access denied", 403) };
  }

  const resourceDocuments = [];
  let pageToken = "";
  for (let page = 0; page < FIRESTORE_MAX_PAGES; page += 1) {
    const resourcesUrl = new URL(`${matterUrl}/resources`);
    resourcesUrl.searchParams.set("pageSize", String(FIRESTORE_PAGE_SIZE));
    if (pageToken) resourcesUrl.searchParams.set("pageToken", pageToken);

    const resourcesResult = await fetchFirestoreJson(resourcesUrl, idToken, signal);
    if (!resourcesResult.response.ok) {
      return {
        response: firestoreErrorResponse(
          "resources",
          resourcesResult.response.status,
          resourcesResult.data,
        ),
      };
    }

    resourceDocuments.push(...(resourcesResult.data.documents || []));
    pageToken = resourcesResult.data.nextPageToken || "";
    if (!pageToken) break;
  }

  if (pageToken) {
    console.error("[document-preview] Resource pagination limit exceeded", { matterId });
    return { response: errorResponse("Unable to load the review document", 502) };
  }

  const document = resourceDocuments
    .map((resourceDocument) => ({
      id: String(resourceDocument.name || "").split("/").pop(),
      resource: decodeFirestoreFields(resourceDocument.fields),
    }))
    .filter(({ resource }) => isDocumentReviewResource(resource))
    .sort((left, right) => (
      timestampMillis(right.resource.createdAt || right.resource.updatedAt) -
      timestampMillis(left.resource.createdAt || left.resource.updatedAt)
    ))[0];

  if (!document) return { response: errorResponse("PDF review document is not available", 404) };

  const downloadUrl = getStoredDownloadUrl(document.resource);
  if (!downloadUrl) {
    return { response: errorResponse("A WorkDrive preview is not available for this file", 502) };
  }

  return { ...document, downloadUrl };
}

export async function POST(request, { params }) {
  const { matterId } = await params;
  if (!matterId) return errorResponse("Matter ID is required", 400);

  const idToken = getBearerToken(request);
  const auth = await verifyFirebaseIdentity(request);
  const clientCheck = requireClient(auth);
  if (!clientCheck.authorized) return errorResponse(clientCheck.error, clientCheck.status);
  if (!idToken) return errorResponse("Authentication required", 401);

  try {
    const signal = request.signal
      ? AbortSignal.any([request.signal, AbortSignal.timeout(15_000)])
      : AbortSignal.timeout(15_000);
    const resolved = await resolveDocumentReviewResource(idToken, auth, matterId, signal);
    if (resolved.response) return resolved.response;

    const fileName = resolved.resource.fileName || resolved.resource.name || "Document preview";
    const downloadUrl = resolved.downloadUrl.toString();
    const token = createPreviewToken({
      uid: auth.uid,
      role: auth.role,
      matterId,
      resourceId: resolved.id,
      downloadUrl,
      fileName,
      fileSize: resolved.resource.fileSize || resolved.resource.size,
    });
    const previewPath = `/api/matters/${encodeURIComponent(matterId)}/resources/${encodeURIComponent(resolved.id)}/preview`;
    const response = NextResponse.json({
      success: true,
      fileName,
      previewUrl: previewPath,
      downloadUrl,
    });
    response.headers.set("Cache-Control", "private, no-store");
    response.cookies.set(
      getPreviewCookieName(),
      token,
      getPreviewCookieOptions(request, matterId, resolved.id),
    );
    return response;
  } catch (error) {
    console.error("[document-preview] Unable to prepare preview", {
      matterId,
      error: error instanceof Error ? error.message : String(error),
    });
    return errorResponse("Unable to prepare document preview", 500);
  }
}
