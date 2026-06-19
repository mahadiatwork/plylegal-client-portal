import { NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { requireClient, verifyAuth } from "@/lib/serverAuth";
import { getApplicationSlug } from "@/lib/visaDisplay";

const SUPPORTED_SLUGS = new Set(["820", "partner", "protection", "482", "186"]);

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
  const source = Array.isArray(categories) && categories.length > 0
    ? categories
    : DEFAULT_TEMPLATE_CATEGORIES;

  return source
    .map((category) => ({
      name: String(category?.name || "").trim(),
      icon: String(category?.icon || "folder").trim() || "folder",
    }))
    .filter((category) => category.name);
}

export async function GET(request) {
  try {
    const dbResult = getDb();
    if (!dbResult.ok) {
      return NextResponse.json({ success: false, error: dbResult.error }, { status: 500 });
    }
    const db = dbResult.db;

    const auth = await verifyAuth(request);
    const clientCheck = requireClient(auth);
    if (!clientCheck.authorized) {
      return NextResponse.json({ success: false, error: clientCheck.error }, { status: clientCheck.status });
    }

    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get("applicationId");

    if (!applicationId) {
      return NextResponse.json({ success: false, error: "applicationId is required" }, { status: 400 });
    }

    const appDoc = await db.collection("applications").doc(applicationId).get();
    if (!appDoc.exists) {
      return NextResponse.json({ success: false, error: "Application not found" }, { status: 404 });
    }

    const appData = appDoc.data();
    if (auth.role !== "admin" && appData.userId !== auth.uid) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    const questionnaireDoc = await appDoc.ref.collection("data").doc("questionnaire").get();
    const questionnaireData = questionnaireDoc.exists ? questionnaireDoc.data() || {} : {};
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

    const templateSlug = visaSlug === "820" ? "partner" : visaSlug;
    const templateDoc = await db.collection("resourceTemplates").doc(templateSlug).get();
    if (!templateDoc.exists) {
      return NextResponse.json(
        { success: false, error: "No resource template found for this visa type" },
        { status: 404 }
      );
    }

    const templateData = templateDoc.data() || {};
    if (templateData.status !== "active") {
      return NextResponse.json(
        { success: false, error: "Resource template is not currently active" },
        { status: 404 }
      );
    }

    const itemsSnapshot = await db
      .collection("resourceTemplates")
      .doc(templateSlug)
      .collection("items")
      .where("status", "==", "active")
      .get();

    const items = itemsSnapshot.docs
      .map((doc) => {
        const data = doc.data() || {};
        return {
          id: doc.id,
          parentId: data.parentId || null,
          kind: String(data.kind || "file").toLowerCase(),
          name: data.name || data.fileName || "Untitled resource",
          category: data.category || "Uncategorized",
          order: typeof data.order === "number" ? data.order : 0,
          externalUrl: data.externalUrl || "",
          noteText: data.noteText || data.body || data.content || data.description || "",
          mimeType: data.mimeType || null,
          size: typeof data.size === "number" ? data.size : null,
          createdAt: serializeTimestamp(data.createdAt),
          updatedAt: serializeTimestamp(data.updatedAt),
        };
      })
      .filter((item) => item.kind !== "folder")
      .filter((item) => item.kind === "note" || item.externalUrl)
      .sort((a, b) => {
        const orderDiff = a.order - b.order;
        if (orderDiff !== 0) return orderDiff;
        return a.name.localeCompare(b.name);
      });

    return NextResponse.json({
      success: true,
      template: {
        visaSlug,
        templateSlug,
        title: templateData.title || "",
        status: templateData.status,
        categories: normalizeCategories(templateData.categories),
        updatedAt: serializeTimestamp(templateData.updatedAt),
      },
      items,
    });
  } catch (error) {
    console.error("Error fetching resource template:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch resource template" },
      { status: 500 }
    );
  }
}
