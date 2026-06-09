# Admin Portal Shared Resources Plan

## Goal
Move resource uploads out of individual applications and into a shared resource library managed from the admin portal, so every eligible user can see the same resources.

## Current Behavior
- Client resources are loaded from `applications/{appId}/resources`.
- That makes each upload application-specific.
- The admin portal does not currently have a dedicated resources management screen.

## Target Behavior
- Admins create, edit, publish, and archive resources from one shared admin screen.
- Resources live in a top-level Firestore collection such as `resources`.
- Client pages read from the shared collection instead of an application subcollection.
- Optional targeting fields control visibility when a resource should not be shown to every user.

## Proposed Data Model
Use a top-level `resources` collection with fields similar to:
- `title`
- `description`
- `noteText`
- `url`
- `type`
- `category`
- `status` (`active`, `inactive`, `archived`)
- `scope` (`shared`, `group`, `application`) if future targeting is needed
- `audience` or `program` if resources need filtering by visa type or intake flow
- `createdAt`
- `updatedAt`
- `createdBy`
- `updatedBy`

## Admin Portal Changes
1. Add a new admin route, for example `/admin/resources`.
2. Build a resource list view with search, filters, status badges, and timestamps.
3. Add create/edit/delete/archive actions.
4. Support both link resources and file-based resources.
5. Add a publish workflow so draft content is not visible until activated.
6. Add validation for required fields and supported file/link types.
7. Restrict access to admins only using the existing auth role check.

## Firestore Changes
1. Create the shared `resources` collection.
2. Update Firestore rules so:
   - admins can read/write shared resources
   - non-admin users can read only active shared resources, if intended
3. If old per-application resources must remain temporarily, keep read support during migration only.

## Client Portal Changes
1. Update the resources page to query the shared `resources` collection.
2. Filter by `status === "active"`.
3. Group resources by category the same way the current UI already does.
4. Keep the current empty-state and error-state behavior.

## Migration Plan
1. Identify any existing resources stored under application subcollections.
2. Copy them into the new shared `resources` collection.
3. Map old fields to the new shared schema.
4. Confirm all live resources render correctly in the client portal.
5. Remove old per-application resource writes after the new flow is stable.

## QA Checklist
- Admin can create a shared resource.
- Admin can edit and archive a shared resource.
- A new resource appears for all eligible users.
- Inactive or archived resources do not show in the client portal.
- Resource links open correctly.
- File resources download or preview correctly if supported.

## Rollout Notes
- Ship the admin screen and shared collection first.
- Then switch the client portal read path.
- Keep migration logic available until old data is fully moved.

