import { NextResponse } from "next/server";

function decodeValue(value) {
  if ("nullValue" in value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("referenceValue" in value) return value.referenceValue;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(decodeValue);
  if ("mapValue" in value) return decodeFields(value.mapValue.fields);
  return undefined;
}

function decodeFields(fields = {}) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]));
}

export class ResourceReadError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export function resourceErrorResponse(error) {
  return NextResponse.json(
    { success: false, error: error instanceof ResourceReadError ? error.message : "Unable to load resources" },
    { status: error instanceof ResourceReadError ? error.status : 502, headers: { "Cache-Control": "private, no-store" } },
  );
}

// Firebase ID tokens keep these reads subject to Firestore rules and do not
// depend on a server service-account key or its user-profile lookup.
export function createFirestoreClient(idToken, requestSignal) {
  if (!idToken) throw new ResourceReadError("Authentication required", 401);
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  if (!projectId) throw new ResourceReadError("Firebase project is not configured", 500);
  const root = `projects/${projectId}/databases/(default)/documents`;
  const base = `https://firestore.googleapis.com/v1/${root}`;
  const timeout = AbortSignal.timeout(15_000);
  const signal = requestSignal ? AbortSignal.any([requestSignal, timeout]) : timeout;
  const encodePath = (path) => path.split("/").map(encodeURIComponent).join("/");

  async function read(path, body) {
    const response = await fetch(`${base}${path}`, {
      method: body ? "POST" : "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${idToken}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal,
    });
    if (response.status === 404 && !body) return null;
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      console.error("[resources] Firestore read failed", {
        status: response.status,
        upstreamStatus: data?.error?.status || "unknown",
      });
      if (response.status === 401) throw new ResourceReadError("Authentication required", 401);
      if (response.status === 403) throw new ResourceReadError("Access denied", 403);
      throw new ResourceReadError("Unable to load resources", 502);
    }
    if (!data) throw new ResourceReadError("Unable to load resources", 502);
    return data;
  }

  return {
    async getDocument(path) {
      const document = await read(`/${encodePath(path)}`);
      return document ? decodeFields(document.fields) : null;
    },
    async getActiveDocuments(collectionPath, documentId) {
      const parts = collectionPath.split("/");
      const collectionId = parts.pop();
      const parent = parts.length ? `/${encodePath(parts.join("/"))}` : "";
      const filters = [{ fieldFilter: {
        field: { fieldPath: "status" }, op: "EQUAL", value: { stringValue: "active" },
      } }];
      if (documentId) filters.push({ fieldFilter: {
        field: { fieldPath: "__name__" }, op: "EQUAL",
        value: { referenceValue: `${root}/${collectionPath}/${documentId}` },
      } });
      // Rules are not filters: constrain the query to published documents.
      // Querying a template also returns [] for missing/draft templates, which
      // lets the caller use shared resources without treating a 403 as empty.
      const rows = await read(`${parent}:runQuery`, { structuredQuery: {
        from: [{ collectionId }],
        where: filters.length === 1 ? filters[0] : { compositeFilter: { op: "AND", filters } },
      } });
      if (!Array.isArray(rows) || rows.some((row) => row.error)) {
        throw new ResourceReadError("Unable to load resources", 502);
      }
      return rows.filter((row) => row.document).map(({ document }) => ({
        id: document.name.split("/").pop(),
        data: decodeFields(document.fields),
      }));
    },
  };
}

export async function getOwnedApplication(client, auth, applicationId) {
  if (!applicationId || applicationId.includes("/")) {
    throw new ResourceReadError("A valid applicationId is required", 400);
  }
  const application = await client.getDocument(`applications/${applicationId}`);
  if (!application) throw new ResourceReadError("Application not found", 404);
  if (application.userId !== auth.uid) throw new ResourceReadError("Access denied", 403);
  return application;
}
