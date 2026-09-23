import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_TEMPLATE_CATEGORIES,
  loadResourcePageData,
} from "../src/lib/resourcePageData.js";
import { LAST_RESOURCE_ORDER, compareResourceItems } from "../src/lib/resourceOrdering.js";

function json(body, status = 200) {
  return Response.json(body, { status });
}

test("resource page data combines ordered template and matter items", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    if (url.startsWith("/api/resources/template")) {
      return json({
        success: true,
        template: { templateSlug: "482", categories: [{ name: "Guides", icon: "guide" }] },
        items: [{ id: "same-id", name: "Template guide", category: "Guides", order: 4 }],
      });
    }
    if (url.startsWith("/api/resources/matter")) {
      return json({
        success: true,
        items: [{ id: "same-id", name: "Client note", category: "For this matter", order: 2 }],
      });
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  const result = await loadResourcePageData({
    appId: "matter/with spaces",
    slug: "482",
    idToken: "signed-token",
    fetchImpl,
  });

  assert.equal(result.template.templateSlug, "482");
  assert.deepEqual(result.items, [
    {
      id: "same-id", name: "Template guide", category: "Guides", order: 4,
      resourceSource: "template",
    },
    {
      id: "same-id", name: "Client note", category: "For this matter", order: 2,
      resourceSource: "matter",
    },
  ]);
  assert.deepEqual(calls.map(({ url }) => url), [
    "/api/resources/template?applicationId=matter%2Fwith%20spaces",
    "/api/resources/matter?applicationId=matter%2Fwith%20spaces",
  ]);
  assert.ok(calls.every(({ options }) => options.headers.Authorization === "Bearer signed-token"));
});

test("resource page data combines matter items with shared fallback when a template is absent", async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    if (url.startsWith("/api/resources/template")) {
      return json({ success: false, error: "No resource template found for this visa type" }, 404);
    }
    if (url.startsWith("/api/resources/matter")) {
      return json({ success: true, items: [{ id: "matter-note", order: 7 }] });
    }
    if (url.startsWith("/api/resources/shared")) {
      return json({
        success: true,
        resources: [{
          id: "shared-link", type: "link", title: "Shared link", category: "Guides",
          url: "https://example.test/shared",
        }],
      });
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  const result = await loadResourcePageData({
    appId: "matter-1",
    slug: "482",
    idToken: "signed-token",
    fetchImpl,
  });

  assert.deepEqual(result.template.categories, DEFAULT_TEMPLATE_CATEGORIES);
  assert.deepEqual(result.items.map(({ id, resourceSource, order }) => ({ id, resourceSource, order })), [
    { id: "shared-link", resourceSource: "shared", order: LAST_RESOURCE_ORDER },
    { id: "matter-note", resourceSource: "matter", order: 7 },
  ]);
  assert.deepEqual(calls, [
    "/api/resources/template?applicationId=matter-1",
    "/api/resources/matter?applicationId=matter-1",
    "/api/resources/shared?applicationId=matter-1",
  ]);
});

test("resource page data does not silently hide a matter-resource read failure", async () => {
  const fetchImpl = async (url) => url.startsWith("/api/resources/template")
    ? json({ success: true, template: {}, items: [] })
    : json({ success: false, error: "Access denied" }, 403);

  await assert.rejects(
    loadResourcePageData({ appId: "matter-1", slug: "482", idToken: "signed-token", fetchImpl }),
    /Access denied/,
  );
});

test("shared fallback retains stored positions instead of replacing them with response indices", async () => {
  const fetchImpl = async (url) => {
    if (url.startsWith("/api/resources/template")) {
      return json({ success: false, error: "No resource template found for this visa type" }, 404);
    }
    if (url.startsWith("/api/resources/matter")) {
      return json({ success: true, items: [{ id: "matter-resource", name: "Matter", order: 2 }] });
    }
    return json({ success: true, resources: [
      { id: "shared-later", title: "Later", order: "5" },
      { id: "shared-first", title: "First", order: 0 },
      { id: "shared-missing", title: "Missing" },
    ] });
  };

  const result = await loadResourcePageData({ appId: "matter-1", slug: "482", idToken: "signed-token", fetchImpl });
  assert.deepEqual(result.items.sort(compareResourceItems).map(({ id, order }) => ({ id, order })), [
    { id: "shared-first", order: 0 },
    { id: "matter-resource", order: 2 },
    { id: "shared-later", order: 5 },
    { id: "shared-missing", order: LAST_RESOURCE_ORDER },
  ]);
});

test("shared fallback carries explicit rich notes and never derives HTML from legacy text", async () => {
  const fetchImpl = async (url) => {
    if (url.startsWith("/api/resources/template")) {
      return json({ success: false, error: "No resource template found for this visa type" }, 404);
    }
    if (url.startsWith("/api/resources/matter")) {
      return json({ success: true, items: [] });
    }
    return json({ success: true, resources: [
      {
        id: "rich-note", type: "note", title: "Formatted", noteText: "Formatted",
        noteHtml: "<p><strong>Formatted</strong></p>",
      },
      {
        id: "legacy-note", type: "note", title: "Legacy",
        noteText: "<strong>Keep this literal</strong>",
      },
    ] });
  };

  const result = await loadResourcePageData({
    appId: "matter-1",
    slug: "482",
    idToken: "signed-token",
    fetchImpl,
  });
  const byId = Object.fromEntries(result.items.map((item) => [item.id, item]));

  assert.equal(byId["rich-note"].noteHtml, "<p><strong>Formatted</strong></p>");
  assert.equal(byId["legacy-note"].noteHtml, "");
  assert.equal(byId["legacy-note"].noteText, "<strong>Keep this literal</strong>");
});
