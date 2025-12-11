# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Core Commands

All commands are intended to be run from the repository root.

### Local development

- Start dev server (Next.js App Router on port 5000):
  - `npm run dev`
- Build production bundle:
  - `npm run build`
- Start production server (after `npm run build`):
  - `npm start`
- Type-check (TypeScript only – no ESLint configured here):
  - `npm run check`

### Linting

There is no explicit lint script. To run Next.js’ built-in linting (assuming ESLint is configured), use:

- `npx next lint`

If this fails due to missing ESLint config, prefer type-checking (`npm run check`) and rely on editor tooling.

### Database / Drizzle

A Drizzle migration helper exists for a future Postgres path:

- Push Drizzle schema to the database:
  - `npm run db:push`

Use this only if/when the Postgres adapter and Drizzle schema are wired up (see `src/lib/adapters/postgres.js`).

### Tests

There are Jest-style unit tests for the adapter layer under `src/lib/adapters/__tests__/`, but **no test script is defined in `package.json`**.

- To integrate tests, you’ll need to add Jest (or another runner) and a `test` script in `package.json`.
- Once Jest is present, a typical way to run a single test file would be:
  - `npx jest src/lib/adapters/__tests__/localStorage.test.js`

The existing tests assume Jest globals (`describe`, `test`, `expect`, `jest.fn`) without explicit imports.

---

## High-Level Architecture

### Technology summary

Key points from `README.md` and the codebase:

- **Frontend**: Next.js 15 App Router (`app/`), React 18, Tailwind CSS, shadcn/ui.
- **State**: Valtio stores under `src/stores/`.
- **Backend**: Next.js route handlers (`app/api/**`), using Firebase (Auth + Firestore) and Zoho CRM.
- **Data access**: Pluggable database adapter layer in `src/lib/adapters/` with Firebase as the primary implementation.
- **External systems**: Firebase project (Auth + Firestore), Zoho CRM (contacts + deals, webhooks), optional Postgres/Drizzle in the future.

The top-level `README.md` documents the full business architecture (questionnaires, sync flows, data models, and webhooks). Use it as the canonical reference for product behavior and integration details; this `WARP.md` focuses on how the implementation is structured.

### 1. Next.js App Router & Providers

- **Root layout**: `app/layout.js`
  - Imports global styles and wraps the app in `Providers` from `app/providers.jsx`.
- **Global providers**: `app/providers.jsx`
  - `QueryClientProvider` (TanStack React Query) with `queryClient` from `src/lib/queryClient`.
  - `ThemeProvider` from `@/components/theme-provider` (dark/light themes stored under `ply-theme`).
  - `AuthGuard` from `@/components/AuthGuard`, which gates all pages behind authentication and the “first login must change password” flow described in `README.md`.

Implication for changes:

- Any new route under `app/` will automatically be wrapped in React Query, theming, and auth checks.
- If you need a publicly accessible page (e.g., marketing or webhook debugging), you either:
  - Implement it outside the guarded tree, or
  - Adjust `AuthGuard` to allow unauthenticated access for specific routes.

### 2. Questionnaire & Intake Routing

The multi-step visa questionnaires (Partner, Protection, Temporary Work) share a central routing definition:

- `src/lib/routes.js` defines:
  - `PARTNER_VISA_ROUTES`, `PROTECTION_VISA_ROUTES`, `TEMPORARY_WORK_VISA_ROUTES`.
  - Helper functions:
    - `getVisaTypeFromPath(pathname)` – derive `partner` / `protection` / `temporary-work` from URLs.
    - `getIntakeRoutes(visaType)` – return the route config array for a visa type.
    - `getNextRoute(currentHref, visaType, applicationId?)` / `getPreviousRoute(...)` – compute next/previous page URLs, optionally appending `?applicationId=...`.
    - `calculateProgress(currentHref, visaType)` – returns a 0–100 progress percentage.

Key behavior:

- All questionnaire URLs are of the form `/intake/{visaType}/...`.
- The navigation helpers work purely from the route arrays, so adding or reordering pages should go through `src/lib/routes.js`.

When you add or restructure intake pages:

- Update the appropriate `*_VISA_ROUTES` array.
- Keep the `visaType` argument threaded through calls to `getNextRoute`, `getPreviousRoute`, and completion tracking.

### 3. State Layer & Adapter-Based Data Access

#### 3.1 Adapter architecture (`src/lib/adapters`)

The data layer is abstracted behind a **pluggable adapter interface**:

- `BaseAdapter` (`base.js`) defines the contract for:
  - Auth, drafts, applications, per-application data, and real-time subscriptions.
- Concrete implementations:
  - `LocalStorageAdapter` (`localStorage.js`)
    - Pure browser `localStorage` implementation.
    - Dummy auth flow (hard-coded demo credentials), used mainly as a fallback and for tests.
  - `FirebaseAdapter` (`firebase.js`)
    - Primary implementation used in production.
    - Integrates Firebase Auth & Firestore.
    - Handles draft storage per application, completion tracking, user profiles, and Zoho deal import.
  - `PostgresAdapter` (`postgres.js`)
    - Stub only; all methods throw with guidance to use `localStorage` instead.
- Factory & exports:
  - `factory.js` provides `getAdapter()` / `createAdapter()` / `resetAdapter()`.
  - `index.js` re-exports adapters and the factory for `@/lib/adapters` consumers.

**Adapter selection rules**:

- `factory.getAdapter()` reads `process.env.NEXT_PUBLIC_DATABASE_TYPE` and accepts:
  - `localStorage`, `firebase`, `postgres`.
  - Defaults to `localStorage` if unset/invalid.
- `next.config.js` exposes `NEXT_PUBLIC_DATABASE_TYPE` to the client and **defaults it to `'firebase'`** if not set in the environment.
- In practice this means:
  - On the client, the default build uses **FirebaseAdapter**.
  - If Firebase fails to initialize, the factory logs an error and falls back to `LocalStorageAdapter`.

When modifying data access:

- Prefer working through adapter methods rather than calling Firebase or storage APIs directly; this keeps both Firebase and test adapters usable.
- If you add a new data operation (e.g. a new per-application collection), add it to `BaseAdapter` and implement it in `FirebaseAdapter` and (optionally) `LocalStorageAdapter`.

#### 3.2 Valtio stores and how they use adapters

Key stores under `src/stores/`:

- `authStore.js`
  - Uses `getAdapter()` to call `login`, `logout`, `checkSession`, `getUserProfile`, `updateUserProfile`, `markProfileComplete`.
  - Keeps `user` (auth identity) and `userProfile` (Firestone profile) in memory.
  - `checkSession()` relies on the adapter returning `{ isAuthenticated, user, profile }` (FirebaseAdapter does this).
- `applicationsStore.js`
  - Uses `getAdapter()` lazily (`getDb()` helper) to avoid circular imports.
  - Methods: `loadApplications`, `createApplication`, `updateApplication`, `deleteApplication`.
  - Maintains `applications`, `currentAppId`, and `rawDealsData` (raw Zoho deals JSON for debugging).
  - Exposes `fetchDealsFromZoho(userId, zohoContactId)` which delegates to `db.fetchDealsFromZoho` if implemented (FirebaseAdapter provides it).
- `draftStore.js`
  - Manages the entire questionnaire draft for a single application.
  - Uses adapters to:
    - `saveDraft(draft, appId)` / `loadDraft(appId)` – persisted under `applications/{appId}/data/questionnaire` in Firebase.
    - `saveCompletionStatus(completionStatus, appId)` / `loadCompletionStatus(appId)` – persisted under `applications/{appId}/data/completion`.
    - `setPrefill` / `getPrefill` – user-level preferences in Firestore.
  - Tracks completion on a per-page basis using keys like `partner/main-applicant/details` and computes overall completion via `getCompletionPercentage()`, which reuses `getIntakeRoutes(visaType)`.
- `appDataStore.js`
  - Separate from the adapter system; it **still uses `localStorage` directly** for per-application UI data (uploads, tasks, deliverables, messages).
  - Stores are keyed as `ply:app:{appId}:{dataType}` and mirrored in a Valtio `cache`.
  - `initializeAppData(appId)` seeds demo uploads/tasks/deliverables/messages when no data exists.

Implications:

- For **core business data** (user profiles, applications, drafts, completion), work through adapters and stores.
- For **UI-only app data** (checklists, uploads, messages), changes currently only touch `localStorage` via `appDataStore`; extending these to Firestore would require new adapter methods.

### 4. Firebase & Zoho CRM Integration

The original `README.md` documents a webhook-driven, bidirectional sync between Firebase and Zoho using several API routes (`/api/admin/create-user`, `/api/profile/sync-zoho`, `/api/webhooks/zoho-contact-update`, etc.). On top of that, the adapter layer now provides a more **programmatic** integration via `FirebaseAdapter`.

Key responsibilities of `FirebaseAdapter` (high level only):

- **Auth and profile**
  - `login(credentials)`:
    - Attempts `signInWithEmailAndPassword`.
    - On success: ensures a user profile exists, then kicks off a non-blocking Zoho deal fetch (via `/api/applications/fetch-zoho-deals`).
    - On specific errors (user not found, invalid credential, configuration issues) it may auto-create a Firebase user and then call `populateFromZoho(...)` to hydrate the profile and applications from Zoho.
  - `checkSession()` waits for Firebase Auth to initialize (`onAuthStateChanged`), then returns `{ isAuthenticated, user, profile }`.
  - `getUserProfile`, `updateUserProfile`, `markProfileComplete` manage Firestore `users/{userId}` documents.
- **Zoho contact & deal import**
  - Uses `ZohoCRMClient` (`src/lib/zohoClient.js`) to talk to Zoho via access tokens, as set up in the README’s Zoho section.
  - `populateFromZoho(userId, email)`:
    - Searches Zoho contacts by email, maps Zoho fields (name, address, custom fields like `Pick_List_1`, related lists like `Partner_Dependents`) into Firestore profile shape.
    - Marks `profileCompleted` when all required fields are present and stores `dependencies` if found.
    - Optionally imports related Deals into `applications` (mapping Zoho stages to internal `status`, Deal names to `reference`, visa type heuristics, etc.).
  - `fetchDealsFromZoho(userId, zohoContactId)`:
    - Fetches Deals from Zoho’s `Contacts → Deals` related list.
    - Upserts them into `applications` collection and mirrors them into `applicationsStore.applications` and `rawDealsData`.

When modifying Zoho/Firebase interactions:

- Check both the adapter (`FirebaseAdapter`) **and** the documented webhook flows in `README.md` for consistency.
- The business rules around conflict resolution, timestamps, and allowed fields are specified in `README.md` under “Bidirectional Sync System”; maintain those invariants when touching API routes.

### 5. Review & PDF Sub-App

The **Review & PDF app** is a standalone, public-facing flow documented in `src/lib/review-pdf/README.md`:

- Route: `app/review-pdf/[matterId]/page.js` – public review page, no Firebase Auth required.
- API routes:
  - `app/api/review-pdf/application/[matterId]/route.js` – fetch the application by Zoho Deal ID (`matterId`, stored as `zohoId` in Firestore `applications`).
  - `app/api/review-pdf/application/[matterId]/draft/route.js` – fetch associated questionnaire/draft data.
- Uses the same Firebase configuration as the main app (client-side Firestore, no auth).
- PDF is currently handled via the browser’s print dialog with tailored `@media print` CSS in `app/globals.css`.

For modifications:

- Treat this as a small, read-only projection layer over `applications` + questionnaire data.
- Any schema changes to questionnaire storage (`applications/{id}/data/questionnaire`) must be reflected in how the review page maps fields to sections.

### 6. Environment & Configuration

Important environment variables (see `README.md` “Development Setup” and `.env.local` examples):

- **Firebase (client)** – all prefixed with `NEXT_PUBLIC_` and exported through `next.config.js`:
  - `NEXT_PUBLIC_FIREBASE_API_KEY`
  - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
  - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
  - `NEXT_PUBLIC_FIREBASE_APP_ID`
- **Firebase Admin (server)** – passed as JSON string:
  - `FIREBASE_SERVICE_ACCOUNT_KEY`
- **Zoho CRM**:
  - `ZOHO_ACCESS_TOKEN_URL` – URL of a Zoho Function that returns an access token.
  - `ZOHO_WEBHOOK_SECRET` – shared secret for Zoho → Next.js webhook authentication.
- **Database adapter selection**:
  - `NEXT_PUBLIC_DATABASE_TYPE` – `firebase` (default), `localStorage`, or `postgres`.
- **App URL** (used in various contexts):
  - `NEXT_PUBLIC_APP_URL` – e.g. `http://localhost:5000` in development.

When adding new environment-dependent behavior, surface variables via `next.config.js` if they’re needed on the client and keep names consistent with the existing pattern.
