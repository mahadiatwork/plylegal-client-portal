# Visa-Type Resource Template Folders

## Summary

The client portal should display live resource folder templates based on the visa type of the current application. Resource folders are "set and forget" templates: once a template is configured for a visa type, every matching client portal loads that folder tree automatically.

This project is responsible for showing the resource folders only. The separate admin portal is responsible for uploading files and folders to Zoho WorkDrive, creating external share links, and publishing the folder/file metadata into the shared Firebase project.

Supported initial templates:

- Partner
- Protection
- Subclass 482
- Subclass 186

## Firestore Contract

Use a top-level `resourceTemplates` collection keyed by a stable visa slug.

```txt
resourceTemplates/{visaSlug}
  visaSlug: "partner" | "protection" | "482" | "186"
  title: string
  status: "active" | "draft" | "archived"
  updatedAt
```

Each template has an `items` subcollection containing folders, files, and links.

```txt
resourceTemplates/{visaSlug}/items/{itemId}
  parentId: string | null
  kind: "folder" | "file" | "link"
  name: string
  order: number
  status: "active" | "hidden"
  externalUrl: string | null
  workdriveId: string | null
  mimeType: string | null
  size: number | null
```

`parentId` controls nesting. Top-level folders and files use `null`. The admin portal should publish item records in this shape after uploading and sharing files through Zoho WorkDrive.

## Client Portal Behavior

The Resources page should resolve the current application's visa type and load only the matching active template.

Expected behavior:

- A Partner application loads the `partner` resource template.
- A Protection application loads the `protection` resource template.
- A Subclass 482 application loads the `482` resource template.
- A Subclass 186 application loads the `186` resource template.
- Users do not choose whether to share resources globally or with individual records.
- Updates to an active template are reflected for every matching client application without copying data into each application.

The Resources page should render the returned records as a folder tree. Folders expand or group nested items. Files and links open their `externalUrl` in a new tab.

## API Changes

Add a resource-template endpoint:

```txt
GET /api/resources/template?applicationId={applicationId}
```

The endpoint should:

- Verify the Firebase ID token.
- Confirm the authenticated user owns the application, unless the user is an admin.
- Resolve the application to one of the supported resource template slugs.
- Fetch the active `resourceTemplates/{visaSlug}` document.
- Fetch active items from `resourceTemplates/{visaSlug}/items`.
- Return the template and items sorted by `order`, then name.

Keep `/api/resources/shared` temporarily as a compatibility alias that uses the same visa-template resolver, so existing client code can migrate safely.

## Firestore Rules

The client portal needs read access to active resource templates and active template items for authenticated users. If the admin portal writes through Firebase client auth, admin-only write access should also be supported.

Recommended rule intent:

```txt
match /resourceTemplates/{visaSlug} {
  allow read: if request.auth != null && resource.data.status == "active";
  allow write: if request.auth != null &&
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin";

  match /items/{itemId} {
    allow read: if request.auth != null &&
      resource.data.status == "active" &&
      get(/databases/$(database)/documents/resourceTemplates/$(visaSlug)).data.status == "active";
    allow write: if request.auth != null &&
      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin";
  }
}
```

No Firebase Storage rule changes are required for this feature because files live in Zoho WorkDrive and this portal displays external WorkDrive links.

## Test Plan

- API returns the `partner` template for Partner applications.
- API returns the `protection` template for Protection applications.
- API returns the `482` template for Subclass 482 applications.
- API returns the `186` template for Subclass 186 applications.
- API returns `403` when a non-owner requests another user's application.
- API excludes draft or archived templates.
- API excludes hidden items.
- Resources page displays nested folders and files in the expected order.
- Files and links open WorkDrive external URLs in a new tab.
- Unsupported or unknown application types do not fall back to the wrong template.

## Assumptions

- The separate admin portal writes resource template metadata into the same Firebase project used by this client portal.
- Zoho WorkDrive upload and sharing happens outside this project.
- Published WorkDrive links are external links that clients are allowed to open directly.
- Current supported templates are Partner, Protection, Subclass 482, and Subclass 186.
- Templates are live rather than copied into individual applications.
