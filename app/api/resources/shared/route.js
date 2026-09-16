import { NextResponse } from "next/server";
import { getBearerToken, requireClient, verifyFirebaseIdentity } from "@/lib/serverAuth";
import { createFirestoreClient, getOwnedApplication, resourceErrorResponse } from "@/lib/firestoreClient";
import { extractSubclass, getApplicationSlug, PROTECTION_PUBLIC_SLUG } from "@/lib/visaDisplay";
import { getResourceViewerUrl } from "@/lib/resourceAccess";
import { normalizeResourceOrder } from "@/lib/resourceOrdering";

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
  const data = docSnap.data;
  const type = String(data.type || "link").toLowerCase();
  const scope = String(data.scope || "shared").toLowerCase();
  const targetTags = getResourceTargetTags(data);

  return {
    id: docSnap.id,
    title: data.title || "Untitled resource",
    description: data.description || "",
    noteText: data.noteText || data.content || data.description || "",
    url: type === "link" ? data.publicUrl || data.url || data.externalUrl || "" : "",
    viewerUrl: type === "file" ? getResourceViewerUrl(data) : "",
    downloadAllowed: type === "file" && data.downloadAllowed === false ? false : null,
    mimeType: data.mimeType || null,
    size: typeof data.size === "number" ? data.size : typeof data.fileSize === "number" ? data.fileSize : null,
    type,
    status: String(data.status || "draft").toLowerCase(),
    category: String(data.category || data.section || data.group || "").toLowerCase(),
    order: normalizeResourceOrder(data.order),
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
  } else if (slug === "820" || slug === "partner") {
    ["partner", "partner visa", "820", "309", "subclass 820", "subclass 309"].forEach((tag) => addTarget(targets, tag));
  } else if (slug === PROTECTION_PUBLIC_SLUG || slug === "protection") {
    [PROTECTION_PUBLIC_SLUG, `subclass ${PROTECTION_PUBLIC_SLUG}`, "protection", "protection visa"].forEach((tag) => addTarget(targets, tag));
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
    const auth = await verifyFirebaseIdentity(request);
    const clientCheck = requireClient(auth);
    if (!clientCheck.authorized) {
      return NextResponse.json({ success: false, error: clientCheck.error }, { status: clientCheck.status });
    }

    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get("applicationId");
    const client = createFirestoreClient(getBearerToken(request), request.signal);
    let applicationTargets = null;

    if (applicationId) {
      const appData = await getOwnedApplication(client, auth, applicationId);
      applicationTargets = getApplicationTargetSet(appData);
    }

    const documents = await client.getActiveDocuments("resources");
    const resources = documents
      .map(normalizeResource)
      .filter(isVisibleSharedResource)
      .filter((resource) => resourceMatchesApplication(resource, applicationTargets))
      .sort((a, b) => (
        a.order - b.order || toMillis(b.updatedAt || b.createdAt) - toMillis(a.updatedAt || a.createdAt)
      ));

    return NextResponse.json({ success: true, resources }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[resources/shared] Load failed", { status: error.status || 502, code: error.name });
    return resourceErrorResponse(error);
  }
}
