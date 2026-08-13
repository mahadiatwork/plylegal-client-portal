import { NextResponse } from "next/server";
import { getDb } from "@/lib/firebase-admin";
import { requireClient, verifyAuth } from "@/lib/serverAuth";
import { getApplicationSlug, PROTECTION_PUBLIC_SLUG } from "@/lib/visaDisplay";
import {
  buildPreviewHeaders,
  createPreviewToken,
  getPreviewCookieName,
  getPreviewCookieOptions,
  getPreviewTimeoutMs,
  isPreviewableResource,
  toWorkDriveDownloadUrl,
  validateWorkDriveRedirect,
  verifyPreviewToken,
} from "@/lib/workdrivePreview";

const SUPPORTED_SLUGS = new Set(["820", "partner", "protection", PROTECTION_PUBLIC_SLUG, "482", "186"]);

function errorResponse(error, status) {
  return NextResponse.json({ success: false, error }, { status });
}

async function getRouteParams(params) {
  return await params;
}

async function resolveAuthorizedResource(db, auth, matterId, resourceId) {
  const matterDoc = await db.collection("applications").doc(matterId).get();
  if (!matterDoc.exists) return { response: errorResponse("Matter not found", 404) };

  const matter = matterDoc.data() || {};
  if (auth.role !== "admin" && matter.userId !== auth.uid) {
    return { response: errorResponse("Access denied", 403) };
  }

  const questionnaireDoc = await matterDoc.ref.collection("data").doc("questionnaire").get();
  const questionnaire = questionnaireDoc.exists ? questionnaireDoc.data() || {} : {};
  const visaSlug = getApplicationSlug({
    ...matter,
    questionnaireVisaContext: questionnaire.visaContext,
  });
  if (!visaSlug || !SUPPORTED_SLUGS.has(visaSlug)) {
    return { response: errorResponse("Resource not found", 404) };
  }

  const templateSlug = visaSlug === "820"
    ? "partner"
    : visaSlug === PROTECTION_PUBLIC_SLUG
      ? "protection"
      : visaSlug;
  const templateDoc = await db.collection("resourceTemplates").doc(templateSlug).get();
  if (!templateDoc.exists || String(templateDoc.data()?.status || "").toLowerCase() !== "active") {
    return { response: errorResponse("Resource not found", 404) };
  }

  const resourceDoc = await templateDoc.ref.collection("items").doc(resourceId).get();
  if (!resourceDoc.exists) return { response: errorResponse("Resource not found", 404) };

  const resource = resourceDoc.data() || {};
  if (String(resource.status || "").toLowerCase() !== "active") {
    return { response: errorResponse("Resource not found", 404) };
  }
  if (!isPreviewableResource(resource)) {
    return { response: errorResponse("Only active PDF files can be previewed", 415) };
  }

  const downloadUrl = toWorkDriveDownloadUrl(resource.externalUrl);
  if (!downloadUrl) return { response: errorResponse("Resource not found", 404) };

  return { resource, downloadUrl };
}

async function authenticatePreviewRequest(request, matterId, resourceId) {
  if (request.headers.get("authorization")) {
    const auth = await verifyAuth(request);
    const clientCheck = requireClient(auth);
    return clientCheck.authorized ? auth : { response: errorResponse(clientCheck.error, clientCheck.status) };
  }

  const token = request.cookies?.get(getPreviewCookieName())?.value;
  const auth = verifyPreviewToken(token, { matterId, resourceId });
  return auth || { response: errorResponse("Authentication required", 401) };
}

function requestSignal(request) {
  const timeoutSignal = AbortSignal.timeout(getPreviewTimeoutMs());
  return request.signal ? AbortSignal.any([request.signal, timeoutSignal]) : timeoutSignal;
}

async function preview(request, context) {
  const { matterId, resourceId } = await getRouteParams(context.params);
  if (!matterId || !resourceId) return errorResponse("Matter and resource are required", 400);

  const dbResult = getDb();
  if (!dbResult.ok) return errorResponse(dbResult.error, 500);

  const auth = await authenticatePreviewRequest(request, matterId, resourceId);
  if (auth.response) return auth.response;

  const resolved = await resolveAuthorizedResource(dbResult.db, auth, matterId, resourceId);
  if (resolved.response) return resolved.response;

  const range = request.headers.get("range");
  const signal = requestSignal(request);

  try {
    const redirectResponse = await fetch(resolved.downloadUrl, {
      headers: { Accept: "application/pdf" },
      redirect: "manual",
      signal,
    });
    if (![301, 302, 303, 307, 308].includes(redirectResponse.status)) {
      return errorResponse("WorkDrive did not return a valid file redirect", 502);
    }

    const destination = validateWorkDriveRedirect(redirectResponse.headers.get("location"));
    if (!destination) return errorResponse("WorkDrive redirect was not allowed", 502);

    const upstream = await fetch(destination, {
      headers: {
        Accept: "application/pdf",
        ...(range ? { Range: range } : {}),
      },
      redirect: "error",
      signal,
    });

    if (![200, 206, 416].includes(upstream.status)) {
      return errorResponse("WorkDrive file request failed", 502);
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: buildPreviewHeaders({
        filename: resolved.resource.name || resolved.resource.fileName,
        upstreamHeaders: upstream.headers,
      }),
    });
  } catch {
    return errorResponse("Unable to preview document", 504);
  }
}

export async function POST(request, context) {
  const { matterId, resourceId } = await getRouteParams(context.params);
  if (!matterId || !resourceId) return errorResponse("Matter and resource are required", 400);

  const dbResult = getDb();
  if (!dbResult.ok) return errorResponse(dbResult.error, 500);

  const auth = await authenticatePreviewRequest(request, matterId, resourceId);
  if (auth.response) return auth.response;

  const resolved = await resolveAuthorizedResource(dbResult.db, auth, matterId, resourceId);
  if (resolved.response) return resolved.response;

  try {
    const response = NextResponse.json({ success: true });
    response.cookies.set(
      getPreviewCookieName(),
      createPreviewToken({ uid: auth.uid, role: auth.role, matterId, resourceId }),
      getPreviewCookieOptions(request, matterId, resourceId),
    );
    return response;
  } catch {
    return errorResponse("Unable to prepare document preview", 500);
  }
}

export async function GET(request, context) {
  return preview(request, context);
}
