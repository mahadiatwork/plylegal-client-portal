import { NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { requireClient, verifyAuth } from "@/lib/serverAuth";
import { getApplicationSlug } from "@/lib/visaDisplay";

const SUPPORTED_SLUGS = new Set(["partner", "protection", "482", "186"]);

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

    const visaSlug = getApplicationSlug(appData);
    if (!visaSlug || !SUPPORTED_SLUGS.has(visaSlug)) {
      return NextResponse.json(
        { success: false, error: "No resource template available for this application type" },
        { status: 404 }
      );
    }

    const templateDoc = await db.collection("resourceTemplates").doc(visaSlug).get();
    if (!templateDoc.exists) {
      return NextResponse.json(
        { success: false, error: "No resource template found for this visa type" },
        { status: 404 }
      );
    }

    const templateData = templateDoc.data();
    if (templateData.status !== "active") {
      return NextResponse.json(
        { success: false, error: "Resource template is not currently active" },
        { status: 404 }
      );
    }

    const itemsSnapshot = await db
      .collection("resourceTemplates")
      .doc(visaSlug)
      .collection("items")
      .where("status", "==", "active")
      .get();

    const items = itemsSnapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          parentId: data.parentId || null,
          kind: data.kind || "file",
          name: data.name || "Untitled",
          order: typeof data.order === "number" ? data.order : 0,
          externalUrl: data.externalUrl || null,
          workdriveId: data.workdriveId || null,
          mimeType: data.mimeType || null,
          size: data.size || null,
        };
      })
      .sort((a, b) => {
        const orderDiff = a.order - b.order;
        if (orderDiff !== 0) return orderDiff;
        return a.name.localeCompare(b.name);
      });

    return NextResponse.json({
      success: true,
      template: {
        visaSlug,
        title: templateData.title || "",
        status: templateData.status,
        updatedAt: templateData.updatedAt || null,
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
