import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPreviewHeaders,
  createPreviewToken,
  isPdfResource,
  isPreviewableResource,
  toWorkDriveDownloadUrl,
  validateWorkDriveRedirect,
  verifyPreviewToken,
} from "../src/lib/workdrivePreview.js";

test("converts only an allowed WorkDrive external share URL", () => {
  assert.equal(
    toWorkDriveDownloadUrl("https://workdrive.zohoexternal.com/external/abc_123" ).toString(),
    "https://workdrive.zohoexternal.com/external/abc_123/download?directDownload=true",
  );
  assert.equal(toWorkDriveDownloadUrl("https://attacker.example/external/abc_123"), null);
  assert.equal(toWorkDriveDownloadUrl("https://workdrive.zohoexternal.com/external/abc_123/file.pdf"), null);
  assert.equal(toWorkDriveDownloadUrl("http://workdrive.zohoexternal.com/external/abc_123"), null);
});

test("allows only the WorkDrive file redirect destination", () => {
  assert.ok(validateWorkDriveRedirect(
    "https://files-accl.zohoexternal.com/public/workdrive-external/download/file-token?x=1",
  ));
  assert.equal(validateWorkDriveRedirect("https://files-accl.zohoexternal.com/private/file-token"), null);
  assert.equal(validateWorkDriveRedirect("https://evil.example/public/workdrive-external/download/file-token"), null);
  assert.equal(validateWorkDriveRedirect("http://files-accl.zohoexternal.com/public/workdrive-external/download/file-token"), null);
});

test("rejects archived, non-file, and non-PDF resources", () => {
  assert.equal(isPreviewableResource({ kind: "file", mimeType: "application/pdf", status: "archived" }), false);
  assert.equal(isPdfResource({ kind: "folder", mimeType: "application/pdf" }), false);
  assert.equal(isPdfResource({ kind: "file", mimeType: "application/msword" }), false);
  assert.equal(isPdfResource({ kind: "file", name: "guide.pdf" }), true);
});

test("builds inline range-aware PDF response headers", () => {
  const headers = buildPreviewHeaders({
    filename: "Résumé\r\n.pdf",
    upstreamHeaders: new Headers({
      "accept-ranges": "bytes",
      "content-range": "bytes 0-99/1000",
      "content-length": "100",
    }),
  });

  assert.equal(headers.get("content-type"), "application/pdf");
  assert.match(headers.get("content-disposition"), /^inline; filename\*=UTF-8''/);
  assert.equal(headers.get("accept-ranges"), "bytes");
  assert.equal(headers.get("content-range"), "bytes 0-99/1000");
  assert.equal(headers.get("content-length"), "100");
  assert.equal(headers.get("cache-control"), "private, no-store");
  assert.equal(headers.get("x-content-type-options"), "nosniff");
});

test("scopes preview authorization to the matter and resource", () => {
  const previousSecret = process.env.PREVIEW_TOKEN_SECRET;
  process.env.PREVIEW_TOKEN_SECRET = "test-preview-secret";

  try {
    const token = createPreviewToken({ uid: "client-1", role: "client", matterId: "matter-1", resourceId: "resource-1" });
    assert.equal(verifyPreviewToken(token, { matterId: "matter-1", resourceId: "resource-1" })?.uid, "client-1");
    assert.equal(verifyPreviewToken(token, { matterId: "matter-2", resourceId: "resource-1" }), null);
    assert.equal(verifyPreviewToken(token, { matterId: "matter-1", resourceId: "resource-2" }), null);
  } finally {
    if (previousSecret === undefined) delete process.env.PREVIEW_TOKEN_SECRET;
    else process.env.PREVIEW_TOKEN_SECRET = previousSecret;
  }
});

test("preserves a WorkDrive 416 range response", () => {
  const headers = buildPreviewHeaders({
    filename: "guide.pdf",
    upstreamHeaders: new Headers({ "content-range": "bytes */385000" }),
  });

  assert.equal(headers.get("content-range"), "bytes */385000");
  assert.equal(headers.get("content-type"), "application/pdf");
});
