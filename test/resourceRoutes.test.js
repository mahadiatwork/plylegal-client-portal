import assert from "node:assert/strict";
import { test } from "node:test";
import { Module } from "node:module";
import path from "node:path";
import { build } from "esbuild";
import { NextRequest } from "next/server.js";
import { getFirebaseIdentityAuth } from "../src/lib/firebaseIdentity.js";
import { createPreviewToken, getPreviewCookieName } from "../src/lib/workdrivePreview.js";

async function loadRoute(entry) {
  const result = await build({
    entryPoints: [entry], bundle: true, write: false, platform: "node",
    format: "cjs", packages: "external", logLevel: "silent",
  });
  const filename = path.resolve("test", "resource-route-bundle.cjs");
  const module = new Module(filename);
  module.filename = filename;
  module.paths = Module._nodeModulePaths(path.dirname(filename));
  module._compile(result.outputFiles[0].text, filename);
  return module.exports;
}

const template = await loadRoute("app/api/resources/template/route.js");
const shared = await loadRoute("app/api/resources/shared/route.js");
const preview = await loadRoute("app/api/matters/[matterId]/resources/[resourceId]/preview/route.js");
const root = "projects/resources-test/databases/(default)/documents";
const shareUrl = "https://workdrive.zohopublic.com.au/external/resource-share";

function value(input) {
  if (input === null) return { nullValue: null };
  if (input instanceof Date) return { timestampValue: input.toISOString() };
  if (Array.isArray(input)) return { arrayValue: { values: input.map(value) } };
  if (typeof input === "object") return { mapValue: { fields: fields(input) } };
  if (typeof input === "number") return { integerValue: String(input) };
  if (typeof input === "boolean") return { booleanValue: input };
  return { stringValue: input };
}

function fields(input) {
  return Object.fromEntries(Object.entries(input).map(([key, item]) => [key, value(item)]));
}

function setup(t, slug = "482") {
  const previous = { ...process.env };
  t.after(() => { process.env = previous; });
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "resources-test";
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY = "unusable-service-account-sentinel";
  process.env.PREVIEW_TOKEN_SECRET = "resources-route-test-secret";
  t.mock.method(getFirebaseIdentityAuth(), "verifyIdToken", async (token) => {
    if (token !== "signed-client-token") throw new Error("Invalid token");
    return { uid: "owner-1" };
  });
  const templateSlug = slug === "820" ? "partner" : slug === "866" ? "protection" : slug;
  const documents = new Map([
    ["applications/matter-1", { userId: "owner-1", visaSlug: slug }],
    ["applications/matter-1/data/questionnaire", { visaContext: slug }],
    [`resourceTemplates/${templateSlug}`, {
      status: "active", title: "Visa resources",
      categories: [{ name: "Guides", icon: "guide" }],
      updatedAt: new Date("2026-09-08T00:00:00Z"),
    }],
    [`resourceTemplates/${templateSlug}/items/pdf`, {
      status: "active", kind: "file", name: "Guide.pdf", mimeType: "application/pdf",
      externalUrl: shareUrl, downloadAllowed: false, size: 1000, category: "Guides", order: 2,
    }],
    [`resourceTemplates/${templateSlug}/items/note`, {
      status: "active", kind: "note", name: "Instructions", noteText: "Read the guide", order: 1,
    }],
    [`resourceTemplates/${templateSlug}/items/draft`, {
      status: "draft", kind: "file", name: "Unpublished.pdf", externalUrl: shareUrl,
    }],
    [`resourceTemplates/${templateSlug}/items/folder`, { status: "active", kind: "folder", name: "Folder" }],
    [`resourceTemplates/${templateSlug}/items/no-url`, { status: "active", kind: "file", name: "Unavailable" }],
    ["resources/general", { status: "active", scope: "shared", title: "General", url: "https://example.test/general" }],
    ["resources/482", { status: "active", scope: "shared", title: "482 only", program: "482", url: "https://example.test/482" }],
    ["resources/186", { status: "active", scope: "shared", title: "186 only", program: "186", url: "https://example.test/186" }],
    ["resources/private", { status: "active", scope: "matter", title: "Private", url: "https://example.test/private" }],
    ["resources/draft", { status: "draft", title: "Draft", url: "https://example.test/draft" }],
  ]);
  const calls = [];
  let failureStatus = null;
  t.mock.method(globalThis, "fetch", async (input, options = {}) => {
    const url = String(input);
    calls.push({ url, options });
    if (!url.startsWith(`https://firestore.googleapis.com/v1/${root}`)) {
      assert.equal(url, `${shareUrl}/download?directDownload=true`);
      return new Response(null, { status: 302, headers: {
        Location: "https://files.zohopublic.com.au/public/workdrive-public/download/resource-file",
      } });
    }
    assert.equal(options.headers.Authorization, "Bearer signed-client-token");
    assert.equal(options.cache, "no-store");
    assert.ok(options.signal);
    if (failureStatus) return Response.json({ error: { status: "UPSTREAM_ERROR", message: "private-detail-sentinel" } }, { status: failureStatus });
    const docPath = decodeURIComponent(url.slice(`https://firestore.googleapis.com/v1/${root}/`.length));
    if (options.method === "POST") {
      const { structuredQuery: query } = JSON.parse(options.body);
      const filters = query.where.compositeFilter?.filters || [query.where];
      assert.ok(filters.some(({ fieldFilter: filter }) => (
        filter.field.fieldPath === "status" && filter.op === "EQUAL" && filter.value.stringValue === "active"
      )), "every resource query must satisfy the published-only Firestore rules");
      const reference = filters.find(({ fieldFilter: filter }) => filter.field.fieldPath === "__name__")?.fieldFilter.value.referenceValue;
      const parent = url.slice(`https://firestore.googleapis.com/v1/${root}`.length).replace(/:runQuery$/, "").replace(/^\//, "");
      const collection = [parent, query.from[0].collectionId].filter(Boolean).join("/");
      const rows = [...documents].filter(([documentPath, data]) => (
        documentPath.slice(0, documentPath.lastIndexOf("/")) === collection && data.status === "active"
        && (!reference || `${root}/${documentPath}` === reference)
      )).map(([documentPath, data]) => ({ document: { name: `${root}/${documentPath}`, fields: fields(data) } }));
      return Response.json(rows.length ? rows : [{ readTime: "2026-09-08T00:00:00Z" }]);
    }
    const data = documents.get(docPath);
    return data ? Response.json({ name: `${root}/${docPath}`, fields: fields(data) }) : Response.json({}, { status: 404 });
  });
  return { documents, calls, templateSlug, failWith: (status) => { failureStatus = status; } };
}

const request = (route = "template", token = "signed-client-token", applicationId = "matter-1") => new NextRequest(
  `https://portal.example/api/resources/${route}?applicationId=${encodeURIComponent(applicationId)}`,
  { headers: token ? { Authorization: `Bearer ${token}` } : {} },
);

for (const slug of ["482", "186", "820", "866"]) {
  test(`${slug} resources load without Admin credentials, preserving categories, order and links`, async (t) => {
    const { templateSlug, calls } = setup(t, slug);
    const response = await template.GET(request());
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    const data = await response.json();
    assert.equal(data.template.templateSlug, templateSlug);
    assert.deepEqual(data.template.categories, [{ name: "Guides", icon: "guide" }]);
    assert.equal(data.template.updatedAt, "2026-09-08T00:00:00.000Z");
    assert.deepEqual(data.items.map((item) => item.id), ["no-url", "note", "pdf"]);
    assert.equal(data.items[2].viewerUrl, shareUrl);
    assert.equal(data.items[2].downloadAllowed, false);
    assert.equal(data.items[2].externalUrl, "");
    assert.equal(data.items[2].size, 1000);
    assert.equal("downloadUrl" in data.items[2], false);
    assert.equal(calls.some(({ url }) => url.includes("/users/")), false);
  });
}

test("missing and draft templates permit the existing shared fallback and visa targeting", async (t) => {
  const { documents } = setup(t);
  for (const status of ["draft", null]) {
    if (status) documents.get("resourceTemplates/482").status = status;
    else documents.delete("resourceTemplates/482");
    const response = await template.GET(request());
    assert.equal(response.status, 404);
    assert.equal((await response.json()).error, "No resource template found for this visa type");
    const fallback = await shared.GET(request("shared"));
    assert.equal(fallback.status, 200);
    assert.deepEqual((await fallback.json()).resources.map((resource) => resource.id).sort(), ["482", "general"]);
  }
});

test("missing/invalid tokens and another owner's application cannot read resources", async (t) => {
  const { documents, calls } = setup(t);
  for (const route of [template, shared]) {
    assert.equal((await route.GET(request("template", null))).status, 401);
    assert.equal((await route.GET(request("template", "invalid-token"))).status, 401);
  }
  assert.equal(calls.length, 0);
  documents.get("applications/matter-1").userId = "another-owner";
  assert.equal((await template.GET(request())).status, 403);
  assert.equal((await shared.GET(request("shared"))).status, 403);
  assert.equal(calls.some(({ options }) => options.method === "POST"), false);
  assert.equal((await template.GET(request("template", "signed-client-token", "matter-1/data"))).status, 400);
});

test("upstream permission and service errors are not reported as missing resources or exposed", async (t) => {
  const { failWith } = setup(t);
  for (const [upstream, expected] of [[401, 401], [403, 403], [500, 502]]) {
    failWith(upstream);
    for (const route of [template, shared]) {
      const response = await route.GET(request());
      assert.equal(response.status, expected);
      assert.doesNotMatch(await response.text(), /private-detail-sentinel|service-account-sentinel/);
    }
  }
});

test("Resource Center PDFs cannot be fetched through the old raw preview route", async (t) => {
  const { documents, calls } = setup(t);
  const context = { params: Promise.resolve({ matterId: "matter-1", resourceId: "pdf" }) };
  const prepare = () => preview.POST(new NextRequest("https://portal.example/api/matters/matter-1/resources/pdf/preview", {
    method: "POST", headers: { Authorization: "Bearer signed-client-token" },
  }), context);
  assert.equal((await prepare()).status, 404);
  assert.equal((await preview.GET(new NextRequest("https://portal.example/api/matters/matter-1/resources/pdf/preview", {
    headers: { Authorization: "Bearer signed-client-token" },
  }), context)).status, 404);
  const oldToken = createPreviewToken({
    uid: "owner-1", role: "client", matterId: "matter-1", resourceId: "pdf",
    downloadUrl: shareUrl, fileName: "Guide.pdf",
  });
  assert.equal((await preview.GET(new NextRequest("https://portal.example/api/matters/matter-1/resources/pdf/preview", {
    headers: { Cookie: `${getPreviewCookieName()}=${oldToken}` },
  }), context)).status, 401);
  assert.equal(calls.every(({ url }) => url.startsWith("https://firestore.googleapis.com/")), true);
  documents.get("resourceTemplates/482/items/pdf").status = "draft";
  assert.equal((await prepare()).status, 404);
  documents.get("applications/matter-1").userId = "another-owner";
  assert.equal((await prepare()).status, 403);
});

test("template files retain metadata but expose only verified viewer URLs, including office documents", async (t) => {
  const { documents } = setup(t);
  const prefix = "resourceTemplates/482/items/";
  const unsafeUrl = "https://example.test/private-source.docx";
  documents.set(`${prefix}docx`, {
    status: "active", kind: "file", name: "Instructions.docx",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    externalUrl: shareUrl, downloadAllowed: false, downloadUrl: unsafeUrl,
    downloadURL: unsafeUrl, workDriveDownloadUrl: unsafeUrl, download_url: unsafeUrl,
  });
  documents.set(`${prefix}legacy`, {
    status: "active", kind: "file", name: "Legacy.pdf", externalUrl: unsafeUrl,
    publicUrl: unsafeUrl, workDriveShareUrl: unsafeUrl, downloadUrl: unsafeUrl,
  });
  documents.set(`${prefix}download-link`, {
    status: "active", kind: "file", name: "Workbook.xlsx", downloadAllowed: false,
    externalUrl: `${shareUrl}/download?directDownload=true`,
  });
  documents.set(`${prefix}link`, {
    status: "active", kind: "link", name: "Website", externalUrl: "https://example.test/guidance",
  });
  const data = await (await template.GET(request())).json();
  const byId = Object.fromEntries(data.items.map((item) => [item.id, item]));
  assert.equal(byId.docx.viewerUrl, shareUrl);
  assert.equal(byId.docx.externalUrl, "");
  assert.equal(byId.legacy.viewerUrl, "");
  assert.equal(byId.legacy.externalUrl, "");
  assert.equal(byId.legacy.downloadAllowed, null);
  assert.equal(byId["download-link"].viewerUrl, "");
  assert.equal(byId.link.externalUrl, "https://example.test/guidance");
  assert.doesNotMatch(JSON.stringify(data), /private-source|directDownload|workDriveDownloadUrl|downloadURL|download_url/);
});

test("shared files use the same restricted viewer policy while links and notes remain available", async (t) => {
  const { documents } = setup(t);
  const unsafeUrl = "https://example.test/source.xlsx";
  documents.set("resources/office", {
    status: "active", type: "file", title: "Workbook.xlsx", publicUrl: shareUrl,
    downloadAllowed: false, downloadUrl: unsafeUrl, mimeType: "application/vnd.ms-excel", fileSize: 1500,
  });
  documents.set("resources/legacy-file", {
    status: "active", type: "file", title: "Legacy", url: unsafeUrl, downloadUrl: unsafeUrl,
  });
  documents.set("resources/note", {
    status: "active", type: "note", title: "Instructions", noteText: "Contact your advisor.",
  });
  const data = await (await shared.GET(request("shared"))).json();
  const byId = Object.fromEntries(data.resources.map((item) => [item.id, item]));
  assert.equal(byId.office.viewerUrl, shareUrl);
  assert.equal(byId.office.downloadAllowed, false);
  assert.equal(byId.office.url, "");
  assert.equal(byId.office.size, 1500);
  assert.equal(byId["legacy-file"].url, "");
  assert.equal(byId["legacy-file"].viewerUrl, "");
  assert.equal(byId.general.url, "https://example.test/general");
  assert.equal(byId.note.noteText, "Contact your advisor.");
  assert.doesNotMatch(JSON.stringify(data), /source\.xlsx|downloadUrl/);
});

test("an explicit empty category list stays empty after categories are deleted", async (t) => {
  const { documents } = setup(t);
  documents.get("resourceTemplates/482").categories = [];
  const data = await (await template.GET(request())).json();
  assert.deepEqual(data.template.categories, []);
});
