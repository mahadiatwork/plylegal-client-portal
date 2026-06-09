# Client Portal Shared Resources Implementation

## Goal
Update the main portal so the client resources page reads from the shared top-level Firestore `resources` collection instead of `applications/{appId}/resources`.

This should make shared resources created in the admin portal visible across eligible client matters without requiring per-application uploads.

## Current Main Portal Behavior
- Current file: `app/applications/[slug]/[id]/resources/page.js`
- Current query:
  - `collection(db, "applications", appId, "resources")`
  - `getDocs(resourcesRef)`
- Current visibility filter:
  - hides `inactive`
  - hides `archived`
- Current grouping logic:
  - groups resources into:
    - `documents`
    - `health`
    - `lodgement`
    - `guides`

## Required Change

### 1. Switch the Firestore read path
In `app/applications/[slug]/[id]/resources/page.js`, replace the current subcollection query:

```js
const resourcesRef = collection(db, "applications", appId, "resources");
const resourcesSnap = await getDocs(resourcesRef);
```

with a shared collection query:

```js
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";

const resourcesRef = collection(db, "resources");
const resourcesQuery = query(
  resourcesRef,
  where("status", "==", "active"),
  orderBy("updatedAt", "desc")
);
const resourcesSnap = await getDocs(resourcesQuery);
```

## Why This Matters
The admin portal now supports:
- `draft`
- `active`
- `inactive`
- `archived`

The client portal should only show `active` shared resources.

The current main portal filter:

```js
.filter((resource) => resource.status !== "inactive" && resource.status !== "archived")
```

is no longer strict enough because it would still allow `draft` resources through if they are queried.

## 2. Update the normalization shape
The current `normalizeResource(docSnap)` function is mostly compatible, but it should preserve the new shared fields so future targeting logic is available.

Suggested version:

```js
function normalizeResource(docSnap) {
  const data = docSnap.data() || {};
  const type = String(data.type || "link").toLowerCase();

  return {
    id: docSnap.id,
    title: data.title || "Untitled resource",
    description: data.description || "",
    noteText: data.noteText || data.content || data.description || "",
    url: data.publicUrl || data.url || "",
    type,
    status: String(data.status || "draft").toLowerCase(),
    category: String(data.category || data.section || data.group || "").toLowerCase(),
    scope: String(data.scope || "shared").toLowerCase(),
    program: String(data.program || "").toLowerCase(),
    audience: String(data.audience || "").toLowerCase(),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}
```

## 3. Keep the existing grouping UI
The existing grouping code can stay in place.

No change is required for:
- `RESOURCE_SECTION_ORDER`
- `RESOURCE_SECTIONS`
- `getResourceSectionKey(resource)`
- `ResourceCard`

As long as `category`, `title`, `description`, and `noteText` continue to be populated, the current grouping behavior should still work.

## 4. Replace the resource-loading effect
Current effect:

```js
useEffect(() => {
  const loadResources = async () => {
    if (!appId) return;
    setResourcesLoading(true);
    setResourcesError("");

    try {
      const resourcesRef = collection(db, "applications", appId, "resources");
      const resourcesSnap = await getDocs(resourcesRef);
      const loadedResources = resourcesSnap.docs
        .map(normalizeResource)
        .filter((resource) => resource.status !== "inactive" && resource.status !== "archived")
        .sort((a, b) => toMillis(b.createdAt || b.updatedAt) - toMillis(a.createdAt || a.updatedAt));

      setResources(loadedResources);
    } catch (error) {
      console.error("Error loading resources:", error);
      setResourcesError("We could not load your resources. Please refresh the page or contact Ply Legal.");
    } finally {
      setResourcesLoading(false);
    }
  };

  loadResources();
}, [appId]);
```

Suggested replacement:

```js
useEffect(() => {
  const loadResources = async () => {
    setResourcesLoading(true);
    setResourcesError("");

    try {
      const resourcesRef = collection(db, "resources");
      const resourcesQuery = query(
        resourcesRef,
        where("status", "==", "active"),
        orderBy("updatedAt", "desc")
      );

      const resourcesSnap = await getDocs(resourcesQuery);
      const loadedResources = resourcesSnap.docs
        .map(normalizeResource)
        .sort((a, b) => toMillis(b.updatedAt || b.createdAt) - toMillis(a.updatedAt || a.createdAt));

      setResources(loadedResources);
    } catch (error) {
      console.error("Error loading shared resources:", error);
      setResourcesError("We could not load your resources. Please refresh the page or contact Ply Legal.");
    } finally {
      setResourcesLoading(false);
    }
  };

  loadResources();
}, []);
```

## 5. Firestore rules update is required
Current `firestore.rules` only allows:
- application owner access to `applications/{appId}`
- application owner access to `applications/{appId}/{document=**}`

There is currently no rule for top-level `resources`.

### Add a shared resources match block
Suggested rules addition:

```txt
match /resources/{resourceId} {
  allow read: if request.auth != null &&
    resource.data.status == "active";
}
```

### Important note
If you want future targeting, keep the rule simple for now and do targeting in client code first.

Do not add complex program/audience logic at the rules layer until the client portal has a stable way to determine:
- the applicant's visa program
- the applicant's intake flow
- any audience segmentation fields

## 6. Optional targeting support
The admin portal now stores optional fields:
- `scope`
- `program`
- `audience`

For the first rollout, the safest approach is:
- show all `active` resources
- only rely on `status == "active"`
- treat targeting as phase two

If you want to add lightweight targeting now, do it in client code after `normalizeResource()`:

```js
function isResourceVisible(resource, application) {
  if (resource.status !== "active") return false;

  if (!resource.scope || resource.scope === "shared") {
    return true;
  }

  return true;
}
```

and then:

```js
.filter((resource) => isResourceVisible(resource, application))
```

For now, this can still return `true` for everything except non-active resources.

## 7. Copy updates for the empty state
The current empty state says:

> Ply Legal has not shared any resources for this application yet.

Once the page becomes shared-library based, the wording should change to something like:

> No shared resources are available yet.

This is optional, but it will better match the new behavior.

## 8. QA checklist
- Shared `active` resource appears in the main portal resources page.
- `draft` resource does not appear.
- `inactive` resource does not appear.
- `archived` resource does not appear.
- Link resources open correctly.
- File resources open or download correctly.
- Note resources render correctly.
- Existing category grouping still works.
- Empty state still works when no active shared resources exist.
- Error state still works if Firestore read fails.

## 9. Rollout order
1. Update Firestore rules to allow authenticated reads of active shared resources.
2. Update `app/applications/[slug]/[id]/resources/page.js` to query `resources`.
3. Verify shared resources render in the existing grouped UI.
4. Confirm no `draft`, `inactive`, or `archived` resource leaks into the client portal.
5. Optionally remove old per-application resource assumptions from UI copy later.

## Summary
The minimum safe implementation is:
- change the query from `applications/{appId}/resources` to `resources`
- query only `status == "active"`
- keep the current grouping UI
- add a Firestore rule for top-level shared resources

That gets the main portal onto the shared-resources model without forcing targeting logic into the first rollout.
