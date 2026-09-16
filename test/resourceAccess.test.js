import assert from "node:assert/strict";
import { test } from "node:test";
import { Module } from "node:module";
import path from "node:path";
import { build } from "esbuild";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getResourceViewerUrl } from "../src/lib/resourceAccess.js";

const viewerUrl = "https://workdrive.zohopublic.com.au/external/restricted-share";

test("view-only files accept supported WorkDrive viewers and require the verified boolean marker", () => {
  for (const domain of ["com", "com.au", "eu", "in", "jp", "ca", "sa", "com.cn"]) {
    for (const provider of ["zoho", "zohopublic", "zohoexternal"]) {
      const url = `https://workdrive.${provider}.${domain}/external/restricted-share`;
      assert.equal(getResourceViewerUrl({ downloadAllowed: false, externalUrl: url }), url);
    }
  }
  for (const marker of [undefined, null, true, "false", 0]) {
    assert.equal(getResourceViewerUrl({ downloadAllowed: marker, externalUrl: viewerUrl }), "");
  }
});

test("view-only files reject direct downloads, query actions, other hosts and unsafe URL forms", () => {
  const urls = [
    `${viewerUrl}/download`, `${viewerUrl}?directDownload=true`, `${viewerUrl}?download=1`,
    `${viewerUrl}#download`, `${viewerUrl}/file.pdf`,
    "https://workdrive.zohopublic.com.au.attacker.test/external/restricted-share",
    "https://files.zohopublic.com.au/public/workdrive-public/download/restricted-share",
    "https://attacker.test/external/restricted-share", viewerUrl.replace("https:", "http:"),
    viewerUrl.replace("https://", "https://user:password@"),
    viewerUrl.replace(".com.au/", ".com.au:8080/"), "javascript:alert(1)", "not-a-url",
  ];
  for (const url of urls) {
    assert.equal(getResourceViewerUrl({ downloadAllowed: false, viewerUrl: url }), "", url);
  }
  assert.equal(getResourceViewerUrl({ downloadAllowed: false, downloadUrl: viewerUrl }), "");
});

const result = await build({
  entryPoints: ["src/components/ResourceCenterItem.jsx"], bundle: true, write: false,
  platform: "node", format: "cjs", packages: "external", jsx: "automatic", logLevel: "silent",
});
const filename = path.resolve("test", "resource-item-bundle.cjs");
const componentModule = new Module(filename);
componentModule.filename = filename;
componentModule.paths = Module._nodeModulePaths(path.dirname(filename));
componentModule._compile(result.outputFiles[0].text, filename);
const { ResourceCenterItem } = componentModule.exports;
const render = (item) => renderToStaticMarkup(createElement(ResourceCenterItem, { item }));

test("client document cards offer only the restricted viewer for PDF, DOCX and other files", () => {
  for (const name of ["Guide.pdf", "Instructions.docx", "Workbook.xlsx", "Slides.pptx", "Notes.txt"]) {
    const html = render({
      kind: "file", name, downloadAllowed: false, viewerUrl,
      downloadUrl: "https://example.test/unrestricted-file",
    });
    assert.match(html, /View document/);
    assert.match(html, new RegExp(`href="${viewerUrl}"`));
    assert.doesNotMatch(html, /[Dd]ownload|unrestricted-file|<iframe/);
  }
});

test("client links offer only Open for template, shared and matter resources", () => {
  for (const resourceSource of ["template", "shared", "matter"]) {
    for (const downloadAllowed of [undefined, null, false, true]) {
      const html = render({
        kind: "link", name: "Visa guidance", resourceSource, downloadAllowed,
        externalUrl: "https://example.test/guidance",
        viewerUrl,
        downloadUrl: "https://example.test/unrestricted-file",
      });
      assert.equal((html.match(/<a\b/g) || []).length, 1);
      assert.match(html, /href="https:\/\/example.test\/guidance"/);
      assert.match(html, /target="_blank" rel="noopener noreferrer"/);
      assert.match(html, />Open<|Open<\/a>/);
      assert.doesNotMatch(html, /[Dd]ownload|unrestricted-file|View document|restricted-share/);
    }
  }
});

test("links without an external URL do not fall back to file download or viewer URLs", () => {
  const html = render({
    kind: "link", name: "Incomplete link", downloadAllowed: true, viewerUrl,
    downloadUrl: "https://example.test/unrestricted-file",
  });
  assert.doesNotMatch(html, /<a\b|[Dd]ownload|unrestricted-file|restricted-share/);
});

test("document cards show readable file types instead of raw office MIME types", () => {
  const html = render({
    kind: "file", name: "Instructions", downloadAllowed: false, viewerUrl,
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 1024,
  });
  assert.match(html, /Word document \| 1 KB/);
  assert.doesNotMatch(html, /application\/vnd|wordprocessingml/);
});

test("legacy or unsafe file cards cannot open files and notes and links still render", () => {
  for (const item of [
    { kind: "file", name: "Legacy.pdf", externalUrl: viewerUrl, downloadUrl: viewerUrl },
    { kind: "file", name: "Unsafe.docx", downloadAllowed: false, viewerUrl: `${viewerUrl}/download` },
  ]) {
    const html = render(item);
    assert.match(html, /Document preview is not available yet/);
    assert.doesNotMatch(html, /href=|[Dd]ownload|<iframe/);
  }
  assert.match(render({ kind: "note", name: "Note", noteText: "Please read the guide." }), /Please read the guide/);
  const link = render({ kind: "link", name: "Guidance", externalUrl: "https://example.test/guidance" });
  assert.match(link, /href="https:\/\/example.test\/guidance"/);
  assert.match(link, />Open<|Open<\/a>/);
});
