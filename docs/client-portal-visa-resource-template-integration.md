# Client Portal Visa Resource Template Integration

## Goal
Update the main client portal resources page so it displays visa-specific resource templates from Firestore, grouped under the categories created in the admin portal.

The admin portal now publishes resources to:

```txt
resourceTemplates/{visaSlug}
resourceTemplates/{visaSlug}/items/{itemId}
```

The client portal should fetch the template for the current application visa type, show only active items, group them by `category`, and open the saved Firebase `externalUrl` when the client clicks a resource.

## Supported Visa Slugs
Use the same slug values that the admin portal writes:

```txt
186
482
partner
protection
```

The main portal already has `getApplicationSlug(app)` in:

```txt
src/lib/visaDisplay.js
```

Keep using that helper in the resource API so the client page does not need to guess from URL text.

## Firestore Shape Written By Admin Portal

### Template document
Path:

```txt
resourceTemplates/{visaSlug}
```

Important fields:

```js
{
  visaSlug: "186",
  title: "Subclass 186",
  status: "active",
  categories: [
    { name: "Uncategorized", icon: "folder" },
    { name: "Guides", icon: "guide" },
    { name: "Policies", icon: "policy" },
    { name: "Helpful Links", icon: "link" }
  ],
  updatedAt: Timestamp
}
```

### Item document
Path:

```txt
resourceTemplates/{visaSlug}/items/{itemId}
```

Important fields:

```js
{
  parentId: null,
  kind: "file", // "file", "link", "note", or "folder"
  name: "Secure Client Portal Instructions - Please read.pdf",
  category: "Guides",
  order: 0,
  status: "active",
  externalUrl: "https://workdrive.zohopublic.com.au/external/...",
  workdriveId: "...",
  mimeType: "application/pdf",
  size: 385000,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

Client-side display should use `externalUrl` only. The `workdriveId`, `workDriveResourceId`, and `workDrivePublicLinkId` fields are admin metadata and should not be shown to clients.

## API Contract
Keep the authenticated server route:

```txt
app/api/resources/template/route.js
```

The response should include:

```js
{
  success: true,
  template: {
    visaSlug: "186",
    title: "Subclass 186",
    status: "active",
    categories: [
      { name: "Uncategorized", icon: "folder" },
      { name: "Guides", icon: "guide" },
      { name: "Policies", icon: "policy" },
      { name: "Helpful Links", icon: "link" }
    ],
    updatedAt: "2026-06-11T09:49:00.000Z"
  },
  items: [
    {
      id: "abc123",
      parentId: null,
      kind: "file",
      name: "Secure Client Portal Instructions - Please read.pdf",
      category: "Guides",
      order: 0,
      externalUrl: "https://workdrive.zohopublic.com.au/external/...",
      mimeType: "application/pdf",
      size: 385000,
      createdAt: "2026-06-11T09:49:00.000Z",
      updatedAt: "2026-06-11T09:49:00.000Z"
    }
  ]
}
```

## API Implementation Notes
In `app/api/resources/template/route.js`, keep the current application ownership check, then return template categories and item categories.

Use a serializer so Firestore timestamps are safe for JSON:

```js
function serializeTimestamp(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && typeof value.seconds === "number") {
    return new Date(value.seconds * 1000).toISOString();
  }
  return value;
}
```

Normalize categories from the template document:

```js
const DEFAULT_TEMPLATE_CATEGORIES = [
  { name: "Uncategorized", icon: "folder" },
  { name: "Guides", icon: "guide" },
  { name: "Policies", icon: "policy" },
  { name: "Helpful Links", icon: "link" },
];

function normalizeCategories(categories) {
  const source = Array.isArray(categories) && categories.length > 0
    ? categories
    : DEFAULT_TEMPLATE_CATEGORIES;

  return source
    .map((category) => ({
      name: String(category?.name || "").trim(),
      icon: String(category?.icon || "folder").trim() || "folder",
    }))
    .filter((category) => category.name);
}
```

When mapping item docs, include `category`, `createdAt`, `updatedAt`, and `externalUrl`:

```js
const items = itemsSnapshot.docs
  .map((doc) => {
    const data = doc.data() || {};

    return {
      id: doc.id,
      parentId: data.parentId || null,
      kind: String(data.kind || "file").toLowerCase(),
      name: data.name || data.fileName || "Untitled resource",
      category: data.category || "Uncategorized",
      order: typeof data.order === "number" ? data.order : 0,
      externalUrl: data.externalUrl || "",
      mimeType: data.mimeType || null,
      size: typeof data.size === "number" ? data.size : null,
      createdAt: serializeTimestamp(data.createdAt),
      updatedAt: serializeTimestamp(data.updatedAt),
    };
  })
  .filter((item) => item.kind !== "folder")
  .filter((item) => item.kind === "note" || item.externalUrl)
  .sort((a, b) => {
    const orderDiff = a.order - b.order;
    if (orderDiff !== 0) return orderDiff;
    return a.name.localeCompare(b.name);
  });
```

Return categories with the template:

```js
return NextResponse.json({
  success: true,
  template: {
    visaSlug,
    title: templateData.title || "",
    status: templateData.status,
    categories: normalizeCategories(templateData.categories),
    updatedAt: serializeTimestamp(templateData.updatedAt),
  },
  items,
});
```

## Client Page Grouping
Update:

```txt
app/applications/[slug]/[id]/resources/page.js
```

Replace the current tree-only rendering with category grouping.

Use these helpers:

```js
const DEFAULT_TEMPLATE_CATEGORIES = [
  { name: "Uncategorized", icon: "folder" },
  { name: "Guides", icon: "guide" },
  { name: "Policies", icon: "policy" },
  { name: "Helpful Links", icon: "link" },
];

function normalizeTemplateCategories(categories) {
  const source = Array.isArray(categories) && categories.length > 0
    ? categories
    : DEFAULT_TEMPLATE_CATEGORIES;

  return source
    .map((category) => ({
      name: String(category?.name || "").trim(),
      icon: String(category?.icon || "folder").trim() || "folder",
    }))
    .filter((category) => category.name);
}

function compareResourceItems(a, b) {
  const orderDiff = Number(a.order || 0) - Number(b.order || 0);
  if (orderDiff !== 0) return orderDiff;
  return String(a.name || "").localeCompare(String(b.name || ""));
}

function groupResourcesByCategory(categories, items) {
  const categoryMap = new Map();

  normalizeTemplateCategories(categories).forEach((category) => {
    categoryMap.set(category.name.toLowerCase(), {
      ...category,
      items: [],
    });
  });

  items.forEach((item) => {
    if (item.status && item.status !== "active") return;
    if (item.kind !== "note" && !item.externalUrl) return;

    const categoryName = item.category || "Uncategorized";
    const key = categoryName.toLowerCase();

    if (!categoryMap.has(key)) {
      categoryMap.set(key, {
        name: categoryName,
        icon: "folder",
        items: [],
      });
    }

    categoryMap.get(key).items.push(item);
  });

  return Array.from(categoryMap.values())
    .map((category) => ({
      ...category,
      items: category.items.sort(compareResourceItems),
    }))
    .filter((category) => category.items.length > 0);
}
```

After loading the API response:

```js
setTemplate(data.template || null);
setItems(data.items || []);
```

Create grouped data:

```js
const groupedResources = useMemo(() => {
  return groupResourcesByCategory(template?.categories, items);
}, [template?.categories, items]);
```

## Rendering Rules
Render categories first, then their resources.

Recommended behavior:

- Show only categories that contain at least one active resource.
- Render the category name from `template.categories`.
- Render the category icon from `template.categories[].icon`.
- For `file` and `link` items, open `item.externalUrl` in a new tab.
- For `note` items, render the note body without an external link.
- Do not render raw WorkDrive IDs or raw Firebase metadata.
- Do not render hidden resources.

Example render:

```jsx
{groupedResources.map((category) => (
  <section key={category.name} className="rounded-xl border bg-white shadow-sm">
    <div className="border-b px-5 py-4">
      <div className="flex items-center gap-3">
        <CategoryIcon icon={category.icon} />
        <div>
          <h2 className="font-serif text-xl font-semibold">{category.name}</h2>
          <p className="text-sm text-muted-foreground">
            {category.items.length} {category.items.length === 1 ? "resource" : "resources"}
          </p>
        </div>
      </div>
    </div>

    <div className="divide-y">
      {category.items.map((item) => (
        <ResourceTemplateItem key={item.id} item={item} />
      ))}
    </div>
  </section>
))}
```

Example item component:

```jsx
function ResourceTemplateItem({ item }) {
  const isNote = item.kind === "note";

  return (
    <article className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="min-w-0">
        <h3 className="truncate text-sm font-semibold text-gray-900">{item.name}</h3>
        <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
          {item.kind}
        </p>
        {isNote && item.noteText ? (
          <p className="mt-2 text-sm text-muted-foreground">{item.noteText}</p>
        ) : null}
      </div>

      {!isNote && item.externalUrl ? (
        <a
          href={item.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-gray-50"
        >
          <ExternalLink className="h-4 w-4" />
          Open
        </a>
      ) : null}
    </article>
  );
}
```

## Category Icon Mapping
The admin portal stores icon keys, not SVG markup. Map those keys to local icons in the client portal.

Example using `lucide-react`:

```js
import {
  BookOpen,
  FileText,
  Folder,
  Link as LinkIcon,
  ScrollText,
  ShieldCheck,
} from "lucide-react";

const CATEGORY_ICONS = {
  folder: Folder,
  guide: BookOpen,
  policy: ShieldCheck,
  link: LinkIcon,
  file: FileText,
  note: ScrollText,
};

function CategoryIcon({ icon }) {
  const Icon = CATEGORY_ICONS[icon] || Folder;
  return (
    <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#EEF7F2] text-[#255E4A]">
      <Icon className="h-5 w-5" />
    </span>
  );
}
```

## Firestore Rules
The main portal already has a `resourceTemplates` rule. Confirm it remains in place:

```txt
match /resourceTemplates/{visaSlug} {
  allow read: if request.auth != null &&
    resource.data.status == "active";

  match /items/{itemId} {
    allow read: if request.auth != null &&
      resource.data.status == "active" &&
      get(/databases/$(database)/documents/resourceTemplates/$(visaSlug)).data.status == "active";
  }
}
```

If the client portal only reads through `app/api/resources/template/route.js` using Firebase Admin, these rules are still useful as defense-in-depth for any future direct client reads.

## Acceptance Checklist
- A subclass 186 application loads `resourceTemplates/186`.
- A subclass 482 application loads `resourceTemplates/482`.
- A partner visa application loads `resourceTemplates/partner`.
- A protection visa application loads `resourceTemplates/protection`.
- Only template docs with `status: "active"` are returned.
- Only item docs with `status: "active"` are returned.
- Hidden items do not appear in the client portal.
- Items appear under their saved `category`.
- Items sort by `order`, then by `name`.
- File and link resources open `externalUrl` in a new tab.
- The page never displays raw WorkDrive IDs, public link IDs, or long raw URLs.
- Empty categories are hidden from the client page.

## Important Notes
- The admin portal saves the Zoho public share link into `externalUrl` after upload.
- The client portal should not create, refresh, or mutate Zoho links.
- The client portal should treat Firebase as the source of truth for resource display.
- The old flat `resources` collection can remain available for legacy shared resources, but visa-template resources should come from `resourceTemplates/{visaSlug}/items`.
