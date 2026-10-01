import { NextResponse } from "next/server";
import { getBearerToken, requireClient, verifyFirebaseIdentity } from "@/lib/serverAuth";
import { createFirestoreClient, getOwnedApplication, resourceErrorResponse } from "@/lib/firestoreClient";
import { getResourceViewerUrl } from "@/lib/resourceAccess";
import { compareResourceItems, normalizeResourceOrder } from "@/lib/resourceOrdering";
import {
  resourceNoteHtmlToPlainText,
  sanitizeResourceNoteHtml,
} from "@/lib/resourceRichText.server";
import {
  getApplicationResourceVisaSlug,
  getResourceTemplateSlug,
} from "@/lib/resourceVisa";

const GLOBAL_TEMPLATE_SLUG = "global";

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
function mergeCategories(templates) {
  const categories = [];
  const categoryIndexes = new Map();

  templates.forEach(({ data }) => {
    normalizeCategories(data.categories).forEach((category) => {
      const key = category.name.toLowerCase();
      const existingIndex = categoryIndexes.get(key);

      if (existingIndex === undefined) {
        categoryIndexes.set(key, categories.length);
        categories.push(category);
      } else {
        // Keep the global-first position, but let the visa template refine the
        // display name and icon for a shared category.
        categories[existingIndex] = category;
      }
    });
  });

  return categories;
}

function normalizeTemplateItem(doc, templateSlug) {
  const data = doc.data;
  const kind = String(data.kind || "file").toLowerCase();
  const noteHtml = sanitizeResourceNoteHtml(data.noteHtml);
  const noteText = data.noteText || data.body || data.content || data.description || "";

  return {
    id: doc.id,
    templateSlug,
    resourceSource: `template:${templateSlug}`,
    parentId: data.parentId || null,
    kind,
    name:
      kind === "note"
        ? String(data.name || "").trim()
        : data.name || data.fileName || "Untitled resource",
    category: data.category || "Uncategorized",
    order: normalizeResourceOrder(data.order),
    status: normalizeStatus(data.status),
    externalUrl: kind === "link" ? data.externalUrl || data.publicUrl || data.url || "" : "",
    viewerUrl: kind === "file" ? getResourceViewerUrl(data) : "",
    downloadAllowed: kind === "file" && data.downloadAllowed === false ? false : null,
    description: data.description || "",
    noteText,
    noteHtml,
    notePreviewText:
      kind === "note"
        ? noteHtml
          ? resourceNoteHtmlToPlainText(noteHtml)
          : noteText
        : "",
    mimeType: data.mimeType || null,
    size: typeof data.size === "number" ? data.size : null,
    createdAt: serializeTimestamp(data.createdAt),
    updatedAt: serializeTimestamp(data.updatedAt),
  };
}

function missingTemplateResponse(hasKnownTemplateSlug) {
  return NextResponse.json(
    {
      success: false,
      error: hasKnownTemplateSlug
        ? "No resource template found for this visa type"
        : "No resource template available for this application type",
    },
    { status: 404 },
  );
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
    const visaSlug = getApplicationResourceVisaSlug(appData, questionnaireData);
    const specificTemplateSlug = getResourceTemplateSlug(visaSlug);
    const requestedTemplateSlugs = [
      GLOBAL_TEMPLATE_SLUG,
      ...(specificTemplateSlug ? [specificTemplateSlug] : []),
    ];
    const templateResults = await Promise.all(requestedTemplateSlugs.map(async (templateSlug) => {
      const [document] = await client.getActiveDocuments("resourceTemplates", templateSlug);
      return document && normalizeStatus(document.data.status) === "active"
        ? { slug: templateSlug, data: document.data }
        : null;
    }));
    const activeTemplates = templateResults.filter(Boolean);

    if (activeTemplates.length === 0) {
      return missingTemplateResponse(Boolean(specificTemplateSlug));
    }

    const itemCollections = await Promise.all(activeTemplates.map(({ slug: templateSlug }) => (
      client.getActiveDocuments(`resourceTemplates/${templateSlug}/items`)
    )));
    const visibleItemsBySlug = new Map(activeTemplates.map(({ slug }, index) => [
      slug,
      itemCollections[index]
        .map((document) => normalizeTemplateItem(document, slug))
        .filter((item) => item.status === "active")
        .filter((item) => item.kind !== "folder")
        .filter((item) => item.kind === "note" || item.kind === "file" || item.externalUrl),
    ]));
    const specificTemplate = activeTemplates.find(({ slug }) => slug === specificTemplateSlug);
    const globalItems = visibleItemsBySlug.get(GLOBAL_TEMPLATE_SLUG) || [];

    // An empty auto-created global template must not hide the existing shared
    // resource fallback while a visa-specific template is still absent.
    if (!specificTemplate && globalItems.length === 0) {
      return missingTemplateResponse(Boolean(specificTemplateSlug));
    }

    const items = activeTemplates
      .flatMap(({ slug }) => visibleItemsBySlug.get(slug) || [])
      .filter((item) => item.status === "active")
      .sort(compareResourceItems);

    const primaryTemplate = specificTemplate || activeTemplates[0];
    const templateData = primaryTemplate.data;

    return NextResponse.json({
      success: true,
      template: {
        visaSlug,
        templateSlug: primaryTemplate.slug,
        title: templateData.title || "",
        status: "active",
        categories: mergeCategories(activeTemplates),
        updatedAt: serializeTimestamp(templateData.updatedAt),
      },
      items,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[resources/template] Load failed", { status: error.status || 502, code: error.name });
    return resourceErrorResponse(error);
  }
}
