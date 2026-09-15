import assert from "node:assert/strict";
import { test } from "node:test";
import { Module } from "node:module";
import path from "node:path";
import { build } from "esbuild";
import { NextRequest } from "next/server.js";
import { getFirebaseIdentityAuth } from "../src/lib/firebaseIdentity.js";
import { getPreviewCookieName, verifyPreviewToken } from "../src/lib/workdrivePreview.js";

async function loadRoute(entry) {
  const result = await build({
    entryPoints: [entry], bundle: true, write: false, platform: "node",
    format: "cjs", packages: "external", logLevel: "silent",
  });
  const filename = path.resolve("test", "preview-route-bundle.cjs");
  const module = new Module(filename);
  module.filename = filename;
  module.paths = Module._nodeModulePaths(path.dirname(filename));
  module._compile(result.outputFiles[0].text, filename);
  return module.exports;
}

const bootstrap = await loadRoute("app/api/matters/[matterId]/document-preview/route.js");
const proxy = await loadRoute("app/api/matters/[matterId]/resources/[resourceId]/preview/route.js");
const docUrl = "https://firestore.googleapis.com/v1/projects/preview-test/databases/(default)/documents/applications/matter-1";
const fileUrl = "https://files.zohopublic.com.au/public/workdrive-public/download/file-token";
const shareUrl = "https://workdrive.zohopublic.com.au/external/share-token/download?directDownload=true";
const fields = (data) => Object.fromEntries(Object.entries(data).map(([key, value]) => [key, { stringValue: value }]));

test("owned document bootstraps and streams PDF bytes with an unusable Admin credential", async (t) => {
  const previous = { ...process.env };
  t.after(() => { process.env = previous; });
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "preview-test";
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY = "invalid-service-account-sentinel";
  process.env.PREVIEW_TOKEN_SECRET = "preview-route-test-secret";
  const identity = getFirebaseIdentityAuth();
  t.mock.method(identity, "verifyIdToken", async (token) => {
    assert.equal(token, "signed-client-token");
    return { uid: "owner-1" };
  });

  let owner = "owner-1";
  let firestoreReads = 0;
  let denyFirestore = false;
  let upstreamReads = 0;
  t.mock.method(globalThis, "fetch", async (input, options = {}) => {
    const url = String(input);
    if (url.startsWith(docUrl)) {
      firestoreReads += 1;
      assert.equal(options.headers.Authorization, "Bearer signed-client-token");
      if (denyFirestore) return Response.json({ error: { status: "PERMISSION_DENIED" } }, { status: 403 });
      if (url === docUrl) return Response.json({ fields: fields({ userId: owner }) });
      assert.match(url, /\/resources\?pageSize=100/);
      return Response.json({ documents: [{
        name: `${docUrl}/resources/resource-1`,
        fields: { ...fields({
          type: "file", source: "documentReview", status: "active",
          mimeType: "application/pdf", fileName: "review.pdf", downloadUrl: shareUrl,
        }), createdAt: { timestampValue: "2026-09-08T00:00:00Z" } },
      }] });
    }
    upstreamReads += 1;
    assert.equal(options.redirect, url === shareUrl ? "manual" : "error");
    if (url === shareUrl) return new Response(null, { status: 302, headers: { Location: fileUrl } });
    assert.equal(url, fileUrl);
    assert.equal(options.headers.Range, "bytes=0-7");
    return new Response("%PDF-1.7", { status: 206, headers: {
      "Content-Type": "application/pdf", "Content-Range": "bytes 0-7/1000", "Content-Length": "8",
    } });
  });

  const request = () => new NextRequest("https://portal.example/api/matters/matter-1/document-preview", {
    method: "POST", headers: { Authorization: "Bearer signed-client-token" },
  });
  const context = { params: Promise.resolve({ matterId: "matter-1" }) };
  const prepared = await bootstrap.POST(request(), context);
  assert.equal(prepared.status, 200);
  const data = await prepared.json();
  assert.equal(data.fileName, "review.pdf");
  const cookie = prepared.cookies.get(getPreviewCookieName());
  assert.ok(cookie?.value);
  assert.equal(cookie.httpOnly, true);
  assert.equal(cookie.secure, true);

  const pdfRequest = (value = cookie.value, range = "bytes=0-7") => new NextRequest(`https://portal.example${data.previewUrl}`, {
    headers: { Cookie: `${getPreviewCookieName()}=${value}`, Range: range },
  });
  const pdfContext = { params: Promise.resolve({ matterId: "matter-1", resourceId: "resource-1" }) };
  const pdf = await proxy.GET(pdfRequest(), pdfContext);
  assert.equal(pdf.status, 206);
  assert.equal(pdf.headers.get("content-type"), "application/pdf");
  assert.equal(await pdf.text(), "%PDF-1.7");
  assert.equal(firestoreReads, 2, "stream must not perform an Admin database lookup");
  assert.equal(upstreamReads, 2);

  const tampered = await proxy.GET(pdfRequest(`changed${cookie.value}`), pdfContext);
  assert.equal(tampered.status, 401);
  const malformedRange = await proxy.GET(pdfRequest(cookie.value, "bytes=50-2"), pdfContext);
  assert.equal(malformedRange.status, 416);
  assert.equal(upstreamReads, 2, "invalid authorization and ranges must not fetch the file");

  owner = "another-client";
  assert.equal((await bootstrap.POST(request(), context)).status, 403);
  owner = "owner-1";
  denyFirestore = true;
  assert.equal((await bootstrap.POST(request(), context)).status, 403);
  assert.equal((await bootstrap.POST(new NextRequest(request().url, { method: "POST" }), context)).status, 401);
});

test("review clients can select every active PDF while previews stay bound to the owned document", async (t) => {
  const previous = { ...process.env };
  t.after(() => { process.env = previous; });
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "preview-test";
  process.env.PREVIEW_TOKEN_SECRET = "preview-route-test-secret";
  t.mock.method(getFirebaseIdentityAuth(), "verifyIdToken", async () => ({ uid: "owner-1" }));

  const resource = (id, overrides = {}) => ({
    name: `${docUrl}/resources/${id}`,
    fields: {
      ...fields({
        type: "file", source: "documentReview", status: "active",
        mimeType: "application/pdf", fileName: `${id}.pdf`, downloadUrl: shareUrl,
        ...overrides,
      }),
      createdAt: { timestampValue: id === "latest" ? "2026-09-10T00:00:00Z" : "2026-09-08T00:00:00Z" },
    },
  });
  let owner = "owner-1";
  t.mock.method(globalThis, "fetch", async (input, options = {}) => {
    assert.equal(options.headers.Authorization, "Bearer signed-client-token");
    const url = String(input);
    if (url === docUrl) return Response.json({ fields: fields({ userId: owner }) });
    assert.ok(url.startsWith(`${docUrl}/resources?`), "only this matter's resources may be read");
    if (new URL(url).searchParams.get("pageToken") === "next-page") {
      return Response.json({ documents: [
        resource("latest"),
        resource("general", { source: "resources" }),
        resource("not-pdf", { mimeType: "image/png", fileName: "image.png" }),
      ] });
    }
    return Response.json({ documents: [
      resource("earlier", { downloadUrl: "https://workdrive.zohopublic.com.au/external/earlier-token" }),
      resource("archived", { status: "archived" }),
    ], nextPageToken: "next-page" });
  });

  const context = { params: Promise.resolve({ matterId: "matter-1" }) };
  const request = (resourceId) => new NextRequest("https://portal.example/api/matters/matter-1/document-preview", {
    method: "POST",
    headers: { Authorization: "Bearer signed-client-token", "Content-Type": "application/json" },
    ...(resourceId === undefined ? {} : { body: JSON.stringify({ resourceId }) }),
  });

  const latest = await bootstrap.POST(request(), context);
  assert.equal(latest.status, 200);
  const latestData = await latest.json();
  assert.equal(latestData.resourceId, "latest", "requests without a selection retain the latest-document default");
  assert.deepEqual(latestData.documents, [
    { id: "latest", fileName: "latest.pdf" },
    { id: "earlier", fileName: "earlier.pdf" },
  ]);

  const earlier = await bootstrap.POST(request("earlier"), context);
  assert.equal(earlier.status, 200);
  const earlierData = await earlier.json();
  assert.equal(earlierData.resourceId, "earlier");
  assert.equal(earlierData.fileName, "earlier.pdf");
  assert.equal(earlierData.previewUrl, "/api/matters/matter-1/resources/earlier/preview");
  assert.match(earlierData.downloadUrl, /external\/earlier-token\/download/);
  assert.deepEqual(earlierData.documents, latestData.documents);

  const cookie = earlier.cookies.get(getPreviewCookieName());
  assert.equal(cookie.path, "/api/matters/matter-1/resources/earlier/preview");
  const claims = verifyPreviewToken(cookie.value, { matterId: "matter-1", resourceId: "earlier" });
  assert.equal(claims.purpose, "documentReview");
  assert.equal(claims.fileName, "earlier.pdf");
  assert.equal(verifyPreviewToken(cookie.value, { matterId: "matter-1", resourceId: "latest" }), null);

  for (const unavailableId of ["archived", "general", "not-pdf", "foreign-resource"]) {
    const unavailable = await bootstrap.POST(request(unavailableId), context);
    assert.equal(unavailable.status, 404, `${unavailableId} must not fall back to another document`);
    assert.equal(unavailable.cookies.get(getPreviewCookieName()), undefined);
  }
  assert.equal((await bootstrap.POST(request("../another-matter"), context)).status, 400);
  assert.equal((await bootstrap.POST(request(42), context)).status, 400);
  owner = "another-client";
  assert.equal((await bootstrap.POST(request("earlier"), context)).status, 403);
});
