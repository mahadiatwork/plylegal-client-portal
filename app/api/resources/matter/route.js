import { NextResponse } from "next/server";
import { getBearerToken, requireClient, verifyFirebaseIdentity } from "@/lib/serverAuth";
import { createFirestoreClient, getOwnedApplication, resourceErrorResponse } from "@/lib/firestoreClient";
import { getResourceViewerUrl } from "@/lib/resourceAccess";
import { compareResourceItems, normalizeResourceOrder } from "@/lib/resourceOrdering";
import { sanitizeResourceNoteHtml } from "@/lib/resourceRichText.server";

const DEFAULT_MATTER_CATEGORY = "For this matter";

function serializeTimestamp(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && typeof value.seconds === "number") {
    return new Date(value.seconds * 1000).toISOString();
  }
  return value;
}

function normalizeStatus(value, fallback = "draft") {
  return String(value || fallback).trim().toLowerCase();
}

function normalizeLinkUrl(value) {
  if (typeof value !== "string" || !value.trim()) return "";

  try {
    const url = new URL(value.trim());
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

function isHiddenResource(data) {
  return (
    data.hidden === true ||
    data.isHidden === true ||
    data.visible === false ||
    String(data.visibility || "").trim().toLowerCase() === "hidden"
  );
}

function normalizeMatterResource(doc) {
  const data = doc.data;
  const kind = String(data.type || data.kind || "link").trim().toLowerCase();
  const status = normalizeStatus(data.status);

  if (
    status !== "active" ||
    isHiddenResource(data) ||
    String(data.source || "").trim().toLowerCase() === "documentreview" ||
    !["file", "link", "note"].includes(kind)
  ) {
    return null;
  }

  const externalUrl = kind === "link"
    ? normalizeLinkUrl(data.externalUrl || data.publicUrl || data.url)
    : "";
  const viewerUrl = kind === "file" ? getResourceViewerUrl(data) : "";

  if (kind === "link" && !externalUrl) return null;

  return {
    id: doc.id,
    parentId: null,
    kind,
    name: data.title || data.name || data.fileName || "Untitled resource",
    category: String(data.category || DEFAULT_MATTER_CATEGORY).trim() || DEFAULT_MATTER_CATEGORY,
    order: normalizeResourceOrder(data.order),
    status,
    externalUrl,
    viewerUrl,
    downloadAllowed: kind === "file" && data.downloadAllowed === false ? false : null,
    description: data.description || "",
    noteText: data.noteText || data.content || data.description || "",
    noteHtml: sanitizeResourceNoteHtml(data.noteHtml),
    mimeType: data.mimeType || null,
    size: typeof data.size === "number" ? data.size : typeof data.fileSize === "number" ? data.fileSize : null,
    createdAt: serializeTimestamp(data.createdAt),
    updatedAt: serializeTimestamp(data.updatedAt),
  };
}

export async function GET(request) {
  try {
    const auth = await verifyFirebaseIdentity(request);
    const clientCheck = requireClient(auth);
    if (!clientCheck.authorized) {
      return NextResponse.json({ success: false, error: clientCheck.error }, { status: clientCheck.status });
    }

    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get("applicationId");
    if (!applicationId) {
      return NextResponse.json({ success: false, error: "applicationId is required" }, { status: 400 });
    }

    const client = createFirestoreClient(getBearerToken(request), request.signal);
    await getOwnedApplication(client, auth, applicationId);
    const documents = await client.getActiveDocuments(`applications/${applicationId}/resources`);
    const items = documents
      .map(normalizeMatterResource)
      .filter(Boolean)
      .sort(compareResourceItems);

    return NextResponse.json(
      { success: true, items },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("[resources/matter] Load failed", { status: error.status || 502, code: error.name });
    return resourceErrorResponse(error);
  }
}
