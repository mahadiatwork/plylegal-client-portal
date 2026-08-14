import { NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { requireClient, verifyAuth } from "@/lib/serverAuth";
import {
  createPreviewToken,
  getPreviewCookieName,
  getPreviewCookieOptions,
  isDocumentReviewResource,
  toWorkDriveDownloadUrl,
} from "@/lib/workdrivePreview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

async function resolveDocumentReviewResource(db, auth, matterId) {
  const matterDoc = await db.collection("applications").doc(matterId).get();
  if (!matterDoc.exists) return { response: errorResponse("Matter not found", 404) };

  const matter = matterDoc.data() || {};
  if (auth.role !== "admin" && matter.userId !== auth.uid) {
    return { response: errorResponse("Access denied", 403) };
  }

  const snapshot = await matterDoc.ref.collection("resources").get();
  const document = snapshot.docs
    .map((doc) => ({ id: doc.id, resource: doc.data() || {} }))
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

  const dbResult = getDb();
  if (!dbResult.ok) return errorResponse(dbResult.error, 500);

  const auth = await verifyAuth(request);
  const clientCheck = requireClient(auth);
  if (!clientCheck.authorized) return errorResponse(clientCheck.error, clientCheck.status);

  const resolved = await resolveDocumentReviewResource(dbResult.db, auth, matterId);
  if (resolved.response) return resolved.response;

  try {
    const token = createPreviewToken({
      uid: auth.uid,
      role: auth.role,
      matterId,
      resourceId: resolved.id,
    });
    const previewPath = `/api/matters/${encodeURIComponent(matterId)}/resources/${encodeURIComponent(resolved.id)}/preview`;
    const response = NextResponse.json({
      success: true,
      fileName: resolved.resource.fileName || resolved.resource.name || "Document preview",
      previewUrl: previewPath,
      downloadUrl: resolved.downloadUrl.toString(),
    });
    response.headers.set("Cache-Control", "private, no-store");
    response.cookies.set(
      getPreviewCookieName(),
      token,
      getPreviewCookieOptions(request, matterId, resolved.id),
    );
    return response;
  } catch {
    return errorResponse("Unable to prepare document preview", 500);
  }
}
