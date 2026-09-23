import { NextResponse } from "next/server";
import { getBearerToken, requireClient, verifyFirebaseIdentity } from "@/lib/serverAuth";
import { createFirestoreClient, getOwnedApplication, resourceErrorResponse } from "@/lib/firestoreClient";
import { getApplicationSlug, PROTECTION_PUBLIC_SLUG } from "@/lib/visaDisplay";
import { getResourceViewerUrl } from "@/lib/resourceAccess";
import { compareResourceItems, normalizeResourceOrder } from "@/lib/resourceOrdering";
import { sanitizeResourceNoteHtml } from "@/lib/resourceRichText.server";

const SUPPORTED_SLUGS = new Set(["820", "partner", "protection", PROTECTION_PUBLIC_SLUG, "482", "186"]);

const DEFAULT_TEMPLATE_CATEGORIES = [
  { name: "Uncategorized", icon: "folder" },
  { name: "Guides", icon: "guide" },
  { name: "Policies", icon: "policy" },
  { name: "Helpful Links", icon: "link" },
];

function serializeTimestamp(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && typeof value.seconds === "number") {
    return new Date(value.seconds * 1000).toISOString();
  }
  return value;
}

function normalizeCategories(categories) {
  const source = Array.isArray(categories)
    ? categories
    : DEFAULT_TEMPLATE_CATEGORIES;

  return source
    .map((category) => ({
      name: String(category?.name || "").trim(),
      icon: String(category?.icon || "folder").trim() || "folder",
    }))
    .filter((category) => category.name);
}

function normalizeStatus(value, fallback = "draft") {
  return String(value || fallback).trim().toLowerCase();
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
    const appData = await getOwnedApplication(client, auth, applicationId);
    const questionnaireData = await client.getDocument(`applications/${applicationId}/data/questionnaire`) || {};
    const visaSlug = getApplicationSlug({
      ...appData,
      questionnaireVisaContext: questionnaireData.visaContext,
    });
    if (!visaSlug || !SUPPORTED_SLUGS.has(visaSlug)) {
      return NextResponse.json(
        { success: false, error: "No resource template available for this application type" },
        { status: 404 }
      );
    }

    const templateSlug = visaSlug === "820"
      ? "partner"
      : visaSlug === PROTECTION_PUBLIC_SLUG
        ? "protection"
        : visaSlug;
    const [templateDoc] = await client.getActiveDocuments("resourceTemplates", templateSlug);
    if (!templateDoc) {
      return NextResponse.json(
        { success: false, error: "No resource template found for this visa type" },
        { status: 404 }
      );
    }

    const templateData = templateDoc.data;
    const templateStatus = normalizeStatus(templateData.status);
    if (templateStatus !== "active") {
      return NextResponse.json(
        { success: false, error: "Resource template is not currently active" },
        { status: 404 }
      );
    }

    const itemDocuments = await client.getActiveDocuments(`resourceTemplates/${templateSlug}/items`);

    const items = itemDocuments
      .map((doc) => {
        const data = doc.data;
        const kind = String(data.kind || "file").toLowerCase();
        return {
          id: doc.id,
          parentId: data.parentId || null,
          kind,
          name: data.name || data.fileName || "Untitled resource",
          category: data.category || "Uncategorized",
          order: normalizeResourceOrder(data.order),
          status: normalizeStatus(data.status),
          externalUrl: kind === "link" ? data.externalUrl || data.publicUrl || data.url || "" : "",
          viewerUrl: kind === "file" ? getResourceViewerUrl(data) : "",
          downloadAllowed: kind === "file" && data.downloadAllowed === false ? false : null,
          description: data.description || "",
          noteText: data.noteText || data.body || data.content || data.description || "",
          noteHtml: sanitizeResourceNoteHtml(data.noteHtml),
          mimeType: data.mimeType || null,
          size: typeof data.size === "number" ? data.size : null,
          createdAt: serializeTimestamp(data.createdAt),
          updatedAt: serializeTimestamp(data.updatedAt),
        };
      })
      .filter((item) => item.status === "active")
      .filter((item) => item.kind !== "folder")
      .filter((item) => item.kind === "note" || item.kind === "file" || item.externalUrl)
      .sort(compareResourceItems);

    return NextResponse.json({
      success: true,
      template: {
        visaSlug,
        templateSlug,
        title: templateData.title || "",
        status: templateStatus,
        categories: normalizeCategories(templateData.categories),
        updatedAt: serializeTimestamp(templateData.updatedAt),
      },
      items,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[resources/template] Load failed", { status: error.status || 502, code: error.name });
    return resourceErrorResponse(error);
  }
}
