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
const matter = await loadRoute("app/api/resources/matter/route.js");
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
      description: "Use Code 33",
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
    ["applications/matter-1/resources/matter-note", {
      status: "active", type: "note", title: "Matter note", noteText: "Only for this client",
      category: "Matter notes", order: 1,
    }],
    ["applications/matter-1/resources/matter-link", {
      status: "active", type: "link", title: "Matter link", url: "https://example.test/matter",
      category: "Matter guides", order: 2, description: "Matter-specific instructions",
    }],
    ["applications/matter-1/resources/matter-file", {
      status: "active", type: "file", title: "Matter file", fileName: "matter.pdf",
      workDriveShareUrl: shareUrl, downloadAllowed: false, downloadUrl: "https://example.test/private-file",
      fileSize: 2048, category: "Matter guides", order: 3,
    }],
    ["applications/matter-1/resources/matter-raw-file", {
      status: "active", type: "file", title: "Legacy matter file", fileName: "legacy.pdf",
      url: "https://example.test/source-url-sentinel", downloadUrl: "https://example.test/download-url-sentinel",
    }],
    ["applications/matter-1/resources/document-review", {
      status: "active", type: "file", source: "documentReview", title: "Correction.pdf",
      downloadUrl: shareUrl,
    }],
    ["applications/matter-1/resources/hidden-flag", {
      status: "active", type: "link", title: "Hidden", url: "https://example.test/hidden", hidden: true,
    }],
    ["applications/matter-1/resources/hidden-status", {
      status: "hidden", type: "link", title: "Hidden status", url: "https://example.test/hidden-status",
    }],
    ["applications/matter-1/resources/archived", {
      status: "archived", type: "link", title: "Archived", url: "https://example.test/archived",
    }],
    ["applications/matter-1/resources/folder", {
      status: "active", type: "folder", title: "Folder",
    }],
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
    assert.deepEqual(data.items.map((item) => item.id), ["note", "pdf", "no-url"]);
    const pdf = data.items.find((item) => item.id === "pdf");
    assert.equal(pdf.viewerUrl, shareUrl);
    assert.equal(pdf.downloadAllowed, false);
    assert.equal(pdf.externalUrl, "");
    assert.equal(pdf.size, 1000);
    assert.equal("downloadUrl" in pdf, false);
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

test("matter resources are owner-scoped, active-only, ordered, and stripped of raw file URLs", async (t) => {
  setup(t);
  const response = await matter.GET(request("matter"));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  const data = await response.json();
  assert.deepEqual(data.items.map((item) => item.id), [
    "matter-note", "matter-link", "matter-file", "matter-raw-file",
  ]);

  const byId = Object.fromEntries(data.items.map((item) => [item.id, item]));
  assert.equal(byId["matter-note"].category, "Matter notes");
  assert.equal(byId["matter-note"].order, 1);
  assert.equal(byId["matter-link"].externalUrl, "https://example.test/matter");
  assert.equal(byId["matter-link"].description, "Matter-specific instructions");
  assert.equal(byId["matter-link"].noteText, "Matter-specific instructions");
  assert.equal(byId["matter-file"].viewerUrl, shareUrl);
  assert.equal(byId["matter-file"].downloadAllowed, false);
  assert.equal(byId["matter-file"].externalUrl, "");
  assert.equal(byId["matter-file"].size, 2048);
  assert.equal(byId["matter-raw-file"].viewerUrl, "");
  assert.equal(byId["matter-raw-file"].externalUrl, "");
  assert.equal(byId["matter-raw-file"].category, "For this matter");
  assert.doesNotMatch(JSON.stringify(data), /private-file|source-url-sentinel|download-url-sentinel|Correction|Hidden|Archived/);
});

test("template, shared and matter resources expose descriptions separately from note content", async (t) => {
  const { documents } = setup(t);
  documents.get("resources/general").description = "General instructions";
  documents.get("resourceTemplates/482/items/note").noteText = "Template note content";
  documents.get("resourceTemplates/482/items/note").description = "Legacy note fallback";

  const templateData = await (await template.GET(request())).json();
  const sharedData = await (await shared.GET(request("shared"))).json();
  const matterData = await (await matter.GET(request("matter"))).json();
  const templateItems = Object.fromEntries(templateData.items.map((item) => [item.id, item]));
  const sharedItems = Object.fromEntries(sharedData.resources.map((item) => [item.id, item]));
  const matterItems = Object.fromEntries(matterData.items.map((item) => [item.id, item]));

  assert.equal(templateItems.pdf.description, "Use Code 33");
  assert.equal(templateItems.pdf.noteText, "Use Code 33");
  assert.equal(templateItems.note.description, "Legacy note fallback");
  assert.equal(templateItems.note.noteText, "Template note content");
  assert.equal(sharedItems.general.description, "General instructions");
  assert.equal(sharedItems.general.noteText, "General instructions");
  assert.equal(matterItems["matter-link"].description, "Matter-specific instructions");
  assert.equal(matterItems["matter-link"].noteText, "Matter-specific instructions");
});

test("missing/invalid tokens and another owner's application cannot read resources", async (t) => {
  const { documents, calls } = setup(t);
  for (const route of [template, shared, matter]) {
    assert.equal((await route.GET(request("template", null))).status, 401);
    assert.equal((await route.GET(request("template", "invalid-token"))).status, 401);
  }
  assert.equal(calls.length, 0);
  documents.get("applications/matter-1").userId = "another-owner";
  assert.equal((await template.GET(request())).status, 403);
  assert.equal((await shared.GET(request("shared"))).status, 403);
  assert.equal((await matter.GET(request("matter"))).status, 403);
  assert.equal(calls.some(({ options }) => options.method === "POST"), false);
  assert.equal((await template.GET(request("template", "signed-client-token", "matter-1/data"))).status, 400);
});

test("upstream permission and service errors are not reported as missing resources or exposed", async (t) => {
  const { failWith } = setup(t);
  for (const [upstream, expected] of [[401, 401], [403, 403], [500, 502]]) {
    failWith(upstream);
    for (const route of [template, shared, matter]) {
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

test("all resource routes sanitize explicit rich note HTML with the same strict policy", async (t) => {
  const { documents } = setup(t);
  const dirtyHtml = [
    '<h2 style="text-align: center; color: red" onclick="alert(1)">Heading</h2>',
    '<p><strong>Bold</strong> <em>Italic</em> <u>Underline</u> <s>Strike</s> <mark>Mark</mark></p>',
    '<ul><li>Bullet</li></ul><ol><li>Numbered</li></ol>',
    '<blockquote>Quoted</blockquote><pre><code>const safe = true;</code></pre><hr>',
    '<p><a href="https://example.test/path" target="_self" rel="opener">Web</a> ',
    '<a href="mailto:advisor@example.test">Email</a> <a href="tel:+61234567890">Call</a> ',
    '<a href="/relative">Relative</a> <a href="javascript:alert(1)">Script URL</a> ',
    '<a href="data:text/html,bad">Data URL</a></p>',
    '<img src=x onerror="alert(1)"><iframe src="https://example.test"></iframe><script>alert(1)</script>',
    '<textarea></textarea/><img src=x onerror="alert(2)">',
    '<svg><animate attributeName="href" values="#safe;javascript:alert(3)"></animate></svg>',
    '<form action="javascript:alert(4)"><button>Submit</button></form>',
  ].join("");
  const legacyText = "<strong>Legacy text remains literal</strong>";

  documents.get("resourceTemplates/482/items/note").noteHtml = dirtyHtml;
  documents.get("resourceTemplates/482/items/note").noteText = legacyText;
  documents.get("applications/matter-1/resources/matter-note").noteHtml = dirtyHtml;
  documents.get("applications/matter-1/resources/matter-note").noteText = legacyText;
  documents.set("resources/rich-note", {
    status: "active", scope: "shared", type: "note", title: "Rich note",
    noteHtml: dirtyHtml, noteText: legacyText,
  });

  const templateData = await (await template.GET(request())).json();
  const matterData = await (await matter.GET(request("matter"))).json();
  const sharedData = await (await shared.GET(request("shared"))).json();
  const notes = [
    templateData.items.find((item) => item.id === "note"),
    matterData.items.find((item) => item.id === "matter-note"),
    sharedData.resources.find((item) => item.id === "rich-note"),
  ];

  for (const note of notes) {
    assert.equal(note.noteText, legacyText);
    assert.match(note.noteHtml, /<h2 style="text-align:center">Heading<\/h2>/);
    assert.match(note.noteHtml, /<strong>Bold<\/strong>/);
    assert.match(note.noteHtml, /<em>Italic<\/em>/);
    assert.match(note.noteHtml, /<u>Underline<\/u>/);
    assert.match(note.noteHtml, /<s>Strike<\/s>/);
    assert.match(note.noteHtml, /<mark>Mark<\/mark>/);
    assert.match(note.noteHtml, /<ul><li>Bullet<\/li><\/ul>/);
    assert.match(note.noteHtml, /<ol><li>Numbered<\/li><\/ol>/);
    assert.match(note.noteHtml, /<blockquote>Quoted<\/blockquote>/);
    assert.match(note.noteHtml, /<pre><code>const safe = true;<\/code><\/pre><hr \/>/);
    assert.match(note.noteHtml, /href="https:\/\/example\.test\/path" target="_blank" rel="noopener noreferrer"/);
    assert.match(note.noteHtml, /href="mailto:advisor@example\.test" target="_blank" rel="noopener noreferrer"/);
    assert.match(note.noteHtml, /href="tel:\+61234567890" target="_blank" rel="noopener noreferrer"/);
    assert.doesNotMatch(note.noteHtml, /onclick|color\s*:|target="_self"|rel="opener"/i);
    assert.doesNotMatch(note.noteHtml, /javascript:|data:text|href="\/relative"/i);
    assert.doesNotMatch(note.noteHtml, /<img|<iframe|<script|<textarea|<svg|<animate|<form|<button|alert\([1-4]\)/i);
  }
});

test("resource routes never infer rich HTML from legacy note text", async (t) => {
  const { documents } = setup(t);
  const legacyText = "<h2>Literal heading text</h2>\nNext line";

  documents.get("resourceTemplates/482/items/note").noteText = legacyText;
  documents.get("applications/matter-1/resources/matter-note").noteText = legacyText;
  documents.set("resources/legacy-note", {
    status: "active", scope: "shared", type: "note", title: "Legacy note", noteText: legacyText,
  });

  const templateData = await (await template.GET(request())).json();
  const matterData = await (await matter.GET(request("matter"))).json();
  const sharedData = await (await shared.GET(request("shared"))).json();
  const notes = [
    templateData.items.find((item) => item.id === "note"),
    matterData.items.find((item) => item.id === "matter-note"),
    sharedData.resources.find((item) => item.id === "legacy-note"),
  ];

  for (const note of notes) {
    assert.equal(note.noteText, legacyText);
    assert.equal(note.noteHtml, "");
  }
});

test("an explicit empty category list stays empty after categories are deleted", async (t) => {
  const { documents } = setup(t);
  documents.get("resourceTemplates/482").categories = [];
  const data = await (await template.GET(request())).json();
  assert.deepEqual(data.template.categories, []);
});

for (const [label, route, prefix, orderedIds, idsAfterReorder] of [
  ["template", template, "resourceTemplates/482/items/", ["pdf", "note", "no-url"], ["note", "pdf", "no-url"]],
  ["matter", matter, "applications/matter-1/resources/", ["matter-link", "matter-note", "matter-file", "matter-raw-file"], ["matter-note", "matter-link", "matter-file", "matter-raw-file"]],
]) {
  test(`${label} resources honor string and zero positions and reload a saved reorder`, async (t) => {
    const { documents } = setup(t);
    documents.get(`${prefix}${orderedIds[0]}`).order = 0;
    documents.get(`${prefix}${orderedIds[1]}`).order = "1";
    if (label === "matter") documents.get(`${prefix}matter-file`).order = "10";

    const firstResponse = await route.GET(request(label));
    assert.equal(firstResponse.headers.get("cache-control"), "private, no-store");
    const first = await firstResponse.json();
    assert.deepEqual(first.items.map(({ id }) => id), orderedIds);
    assert.equal(first.items[0].order, 0);
    assert.equal(first.items[1].order, 1);
    assert.equal(first.items.at(-1).order, Number.MAX_SAFE_INTEGER);

    documents.get(`${prefix}${orderedIds[1]}`).order = 0;
    documents.get(`${prefix}${orderedIds[0]}`).order = 3;
    const refreshed = await (await route.GET(request(label))).json();
    assert.deepEqual(refreshed.items.map(({ id }) => id), idsAfterReorder);
  });
}

test("shared fallback resources expose stored positions and refresh order before update-date sorting", async (t) => {
  const { documents } = setup(t);
  documents.get("resources/482").order = 0;
  documents.get("resources/general").order = "1";
  documents.set("resources/newest", {
    status: "active", scope: "shared", title: "Latest without a position",
    url: "https://example.test/latest", updatedAt: new Date("2026-09-15T00:00:00Z"),
  });

  const firstResponse = await shared.GET(request("shared"));
  assert.equal(firstResponse.headers.get("cache-control"), "private, no-store");
  const first = await firstResponse.json();
  assert.deepEqual(first.resources.map(({ id, order }) => ({ id, order })), [
    { id: "482", order: 0 },
    { id: "general", order: 1 },
    { id: "newest", order: Number.MAX_SAFE_INTEGER },
  ]);

  documents.get("resources/general").order = 0;
  documents.get("resources/482").order = 2;
  const refreshed = await (await shared.GET(request("shared"))).json();
  assert.deepEqual(refreshed.resources.map(({ id }) => id), ["general", "482", "newest"]);
});
