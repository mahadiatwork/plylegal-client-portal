export const DEFAULT_TEMPLATE_CATEGORIES = [
  { name: "Uncategorized", icon: "folder" },
  { name: "Guides", icon: "guide" },
  { name: "Policies", icon: "policy" },
  { name: "Helpful Links", icon: "link" },
];

const MISSING_TEMPLATE_ERRORS = new Set([
  "No resource template available for this application type",
  "No resource template found for this visa type",
  "Resource template is not currently active",
]);

function isMissingTemplateResponse(response, data) {
  return response.status === 404 && MISSING_TEMPLATE_ERRORS.has(data?.error);
}

function normalizeSharedResourceKind(type) {
  const value = String(type || "link").toLowerCase();
  if (value === "file" || value === "note") return value;
  return "link";
}

function mapSharedResourcesToItems(resources) {
  if (!Array.isArray(resources)) return [];

  return resources.map((resource, index) => {
    const kind = normalizeSharedResourceKind(resource.type);
    return {
      id: resource.id,
      parentId: null,
      kind,
      name: resource.title || resource.name || "Untitled resource",
      category: resource.category || "Uncategorized",
      order: index,
      status: resource.status || "active",
      externalUrl: resource.url || resource.externalUrl || "",
      viewerUrl: resource.viewerUrl || "",
      downloadAllowed: resource.downloadAllowed,
      noteText: resource.noteText || resource.description || "",
      mimeType: resource.mimeType || null,
      size: typeof resource.size === "number" ? resource.size : null,
      createdAt: resource.createdAt || null,
      updatedAt: resource.updatedAt || null,
    };
  });
}

function identifyItems(items, resourceSource) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => ({ ...item, resourceSource }));
}

async function parseResponse(response) {
  return response.json().catch(() => ({}));
}

export async function loadResourcePageData({ appId, slug, idToken, fetchImpl = fetch }) {
  const applicationId = encodeURIComponent(appId);
  const headers = { Authorization: `Bearer ${idToken}` };
  const [templateResponse, matterResponse] = await Promise.all([
    fetchImpl(`/api/resources/template?applicationId=${applicationId}`, { headers }),
    fetchImpl(`/api/resources/matter?applicationId=${applicationId}`, { headers }),
  ]);
  const [templateData, matterData] = await Promise.all([
    parseResponse(templateResponse),
    parseResponse(matterResponse),
  ]);

  if (!matterResponse.ok || !matterData.success) {
    throw new Error(matterData.error || "Failed to load resources for this matter");
  }

  let template;
  let baseItems;
  let baseSource;

  if ((!templateResponse.ok || !templateData.success) && isMissingTemplateResponse(templateResponse, templateData)) {
    const sharedResponse = await fetchImpl(`/api/resources/shared?applicationId=${applicationId}`, { headers });
    const sharedData = await parseResponse(sharedResponse);

    if (!sharedResponse.ok || !sharedData.success) {
      throw new Error(sharedData.error || templateData.error || "Failed to load resources");
    }

    template = {
      visaSlug: slug,
      templateSlug: null,
      title: "",
      status: "active",
      categories: DEFAULT_TEMPLATE_CATEGORIES,
    };
    baseItems = mapSharedResourcesToItems(sharedData.resources || []);
    baseSource = "shared";
  } else {
    if (!templateResponse.ok || !templateData.success) {
      throw new Error(templateData.error || "Failed to load resources");
    }

    template = templateData.template || null;
    baseItems = templateData.items || [];
    baseSource = "template";
  }

  return {
    template,
    items: [
      ...identifyItems(baseItems, baseSource),
      ...identifyItems(matterData.items, "matter"),
    ],
  };
}
