import { NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { requireClient, verifyAuth } from "@/lib/serverAuth";
import { extractSubclass, getApplicationSlug } from "@/lib/visaDisplay";

const GENERIC_RESOURCE_TARGETS = new Set([
  "all",
  "any",
  "global",
  "shared",
  "client",
  "clients",
  "applicant",
  "applicants",
  "all applicants",
  "all clients",
]);

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
  const targetTags = getResourceTargetTags(data);

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
    targetTags,
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

function toList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(toList);
  return String(value)
    .split(/[,;|/]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeTarget(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactTarget(value) {
  return normalizeTarget(value).replace(/[^a-z0-9]/g, "");
}

function addTarget(set, value) {
  const normalized = normalizeTarget(value);
  if (!normalized) return;
  set.add(normalized);
  set.add(compactTarget(normalized));
}

function isVisaTargetLike(value) {
  const text = normalizeTarget(value);
  return (
    /\b\d{3}\b/.test(text) ||
    text.includes("temporary") ||
    text.includes("work") ||
    text.includes("skills") ||
    text.includes("demand") ||
    text.includes("employer") ||
    text.includes("nomination") ||
    text.includes("partner") ||
    text.includes("protection")
  );
}

function getResourceTargetTags(data) {
  const directTargets = [
    data.program,
    data.visaType,
    data.visa_type,
    data.visaTypes,
    data.visa_types,
    data.applicationType,
    data.application_type,
    data.subclass,
    data.subclasses,
    data.visaSubclass,
    data.visa_subclass,
  ].flatMap(toList);

  const audienceTargets = toList(data.audience).filter(isVisaTargetLike);
  return [...directTargets, ...audienceTargets].map(normalizeTarget).filter(Boolean);
}

function getApplicationTargetSet(application) {
  const targets = new Set();
  const textParts = [
    application?.type,
    application?.reference,
    application?.visaType,
    application?.visaTypeCode,
  ].filter(Boolean);
  const text = textParts.join(" ");
  const subclass = extractSubclass(text);
  const slug = getApplicationSlug(application);

  textParts.forEach((part) => addTarget(targets, part));
  addTarget(targets, slug);
  addTarget(targets, application?.visaTypeCode);

  if (subclass) {
    addTarget(targets, subclass);
    addTarget(targets, `subclass ${subclass}`);
  }

  if (slug === "186") {
    ["186", "subclass 186", "employer nomination", "employer nomination scheme", "temporary-work", "temporary work"].forEach((tag) => addTarget(targets, tag));
  } else if (slug === "482") {
    ["482", "subclass 482", "skills in demand", "temporary skill shortage", "tss", "temporary-work", "temporary work"].forEach((tag) => addTarget(targets, tag));
  } else if (slug === "partner") {
    ["partner", "partner visa", "820", "309", "subclass 820", "subclass 309"].forEach((tag) => addTarget(targets, tag));
  } else if (slug === "protection") {
    ["protection", "protection visa"].forEach((tag) => addTarget(targets, tag));
  }

  return targets;
}

function resourceMatchesApplication(resource, applicationTargets) {
  if (!applicationTargets) return true;

  const targetTags = (resource.targetTags || [])
    .map(normalizeTarget)
    .filter((tag) => tag && !GENERIC_RESOURCE_TARGETS.has(tag));

  if (targetTags.length === 0) return true;

  return targetTags.some((tag) => (
    applicationTargets.has(tag) ||
    applicationTargets.has(compactTarget(tag)) ||
    applicationTargets.has(`subclass ${tag}`)
  ));
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
    let applicationTargets = null;

    if (applicationId) {
      const appDoc = await db.collection("applications").doc(applicationId).get();

      if (!appDoc.exists) {
        return NextResponse.json({ success: false, error: "Application not found" }, { status: 404 });
      }

      const appData = appDoc.data();
      if (auth.role !== "admin" && appData.userId !== auth.uid) {
        return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
      }

      applicationTargets = getApplicationTargetSet(appData);
    }

    const snapshot = await db.collection("resources").get();
    const resources = snapshot.docs
      .map(normalizeResource)
      .filter(isVisibleSharedResource)
      .filter((resource) => resourceMatchesApplication(resource, applicationTargets))
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
