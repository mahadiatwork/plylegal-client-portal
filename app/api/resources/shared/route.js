import { NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { requireClient, verifyAuth } from "@/lib/serverAuth";

function serializeTimestamp(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && typeof value.seconds === "number") {
    return new Date(value.seconds * 1000).toISOString();
  }
  return value;
}

function normalizeResource(docSnap) {
  const data = docSnap.data() || {};
  const type = String(data.type || "link").toLowerCase();
  const scope = String(data.scope || "shared").toLowerCase();

  return {
    id: docSnap.id,
    title: data.title || "Untitled resource",
    description: data.description || "",
    noteText: data.noteText || data.content || data.description || "",
    url: data.publicUrl || data.url || "",
    type,
    status: String(data.status || "draft").toLowerCase(),
    category: String(data.category || data.section || data.group || "").toLowerCase(),
    scope,
    program: String(data.program || "").toLowerCase(),
    audience: String(data.audience || "").toLowerCase(),
    createdAt: serializeTimestamp(data.createdAt),
    updatedAt: serializeTimestamp(data.updatedAt),
  };
}

function isVisibleSharedResource(resource) {
  return resource.status === "active" && (!resource.scope || resource.scope === "shared");
}

function toMillis(value) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
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

    if (applicationId) {
      const appDoc = await db.collection("applications").doc(applicationId).get();

      if (!appDoc.exists) {
        return NextResponse.json({ success: false, error: "Application not found" }, { status: 404 });
      }

      const appData = appDoc.data();
      if (auth.role !== "admin" && appData.userId !== auth.uid) {
        return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
      }
    }

    const snapshot = await db.collection("resources").get();
    const resources = snapshot.docs
      .map(normalizeResource)
      .filter(isVisibleSharedResource)
      .sort((a, b) => toMillis(b.updatedAt || b.createdAt) - toMillis(a.updatedAt || a.createdAt));

    return NextResponse.json({ success: true, resources });
  } catch (error) {
    console.error("Error fetching shared resources:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch shared resources" },
      { status: 500 }
    );
  }
}
