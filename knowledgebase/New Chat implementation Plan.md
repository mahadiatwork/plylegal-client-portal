# New Chat implementation Plan (Client/Admin Messaging)

## Goal
Add a clean client/admin messaging feature connected to each visa application:

- Client can open a visa application and send a message.
- Admin can view conversations needing attention, open a thread, and reply.
- Full message history is stored in Firebase (source of truth).
- Zoho CRM stores only a lightweight thread/reference record per application (not full history, no subforms).
- Unread indicators work for both client and admin.
- UI is mobile friendly, with loading/error/empty states and clear send feedback.

---

## What exists today (codebase findings)

### Client visa application messaging UI (already chat-like)
- `app/applications/[slug]/[id]/messages/page.js`
  - Renders a chat thread UI (bubbles, timestamps, newest visible via scroll-to-bottom).
  - Has optimistic send + loading state + toast errors/success.
  - Currently reads/writes via `/api/messages/fetch` + `/api/messages/create`.

### Current Zoho-backed messaging (not desired as source of truth)
- `app/api/messages/fetch/route.js`
  - Fetches `Client_Messages` record for a Deal via COQL, then reads `Message_Log` subform rows.
- `app/api/messages/create/route.js`
  - Creates/updates `Client_Messages` and appends to `Message_Log` subform (full history in Zoho).

This violates the new direction:
- Do **not** store full history in Zoho.
- Do **not** use Zoho subforms for chat history.

### Firebase patterns already present
- Client SDK: `src/lib/firebase.js` (Auth + Firestore).
- Admin SDK: `src/lib/firebase-admin.js` (Firestore + Admin Auth using `FIREBASE_SERVICE_ACCOUNT_KEY`).
- Applications are stored in Firestore `applications` collection:
  - `applications/{applicationId}` includes `userId` and `zohoId` (Zoho Deal id).
  - Loaded via `src/lib/adapters/firebase.js` and used by `applicationsStore`.
- Current Firestore rules exist in `firestore.rules` but for v1 chat we can route all chat reads/writes through server APIs using Admin SDK.

### Zoho CRM API patterns already present
- `src/lib/zohoClient.js` provides:
  - `coqlQuery`, `getRecord`, `createRecord`, `updateRecord`, `getRelatedRecords`, etc.
- Existing `Client_Messages` module usage is already implemented in `/api/messages/*`.

---

## Target architecture (v1)

### Source of truth
- Firebase Firestore stores the full conversation and all messages.
- Zoho CRM stores a single thread/reference record per visa application conversation:
  - used for admin visibility/notifications only
  - stores latest preview + unread flags + portal link + Firebase conversation reference
  - does **not** store full message history

### Conversation identity
- **Use the portal `applicationId` as the `conversationId`**.
  - Keeps lookups simple and guarantees “one conversation per visa application”.

---

## Firestore data model (new)

### `conversations/{conversationId}`
Recommended fields (v1 minimal):
- `conversationId` (string) = `applicationId`
- `applicationId` (string)
- `zohoDealId` (string) (from application doc `zohoId`)
- `clientUid` (string) (application doc `userId`)
- `clientName` (string) (from user profile if available)
- `applicationType` (string) (from application doc `type`)
- `latestMessagePreview` (string)
- `latestMessageAt` (timestamp/ISO string)
- `latestSenderRole` (`client` | `admin`)
- `unreadForAdmin` (boolean)
- `unreadForClient` (boolean)
- `createdAt`, `updatedAt` (timestamps)

### `conversations/{conversationId}/messages/{messageId}`
- `senderRole` (`client` | `admin`)
- `senderUid` (string)
- `body` (string)
- `createdAt` (timestamp)

Notes:
- For v1, keep messages text-only. Design documents so attachments can be added later (e.g., `attachments: []` field can be added later without schema churn).

---

## Zoho “thread/reference” record (lightweight)

Continue to use the existing custom module `Client_Messages` as the *thread reference* (one record per Deal/application).

### Fields to store in Zoho (minimum set)
Existing fields already used in code:
- `Matter` (lookup to `Deals`) = Zoho Deal id
- `Unread_for_Admin` (number/bool-like) (admin has unread if client sent)
- `Unread_for_Client` (number/bool-like) (client has unread if admin replied)
- `Last_Message_At` (datetime)

Recommended new fields (configure in Zoho module; code should fail-soft if missing):
- `Firebase_Conversation_Id` (string) = `conversationId`
- `Latest_Message_Preview` (string)
- `Latest_Message_Date` (datetime) (can reuse `Last_Message_At` if preferred)
- `Related_Contact` (lookup to `Contacts`) (from `users/{uid}.zohoContactId` when available)
- `Portal_Chat_Link` (URL) (link back to portal thread, e.g., `/admin/messages/{conversationId}`)

### Update rules (v1)
- On client send:
  - ensure Zoho `Client_Messages` record exists for `Matter = dealId`, create if missing
  - set/update preview + last date
  - set `Unread_for_Admin = 1` (or increment), set `Unread_for_Client = 0`
- On admin reply:
  - update preview + last date
  - set `Unread_for_Client = 1`, set `Unread_for_Admin = 0`

Important:
- Do not write individual messages into Zoho.
- Do not use `Message_Log` subform.

---

## API design (Next.js route handlers, v1)

### Authentication & authorization (server-side)
Implement Firebase ID-token verification in server routes:
- Read `Authorization: Bearer <firebase_id_token>`
- Verify via `adminAuth.verifyIdToken` (Admin SDK)

Authorization rules:
- Client can only access conversation for applications they own:
  - `applications/{applicationId}.userId` must equal `requesterUid`
- Admin can access:
  - v1 simplest: `users/{uid}.role === 'admin'`
  - later: enforce “allowed to manage” via assignment rules or Zoho owner mapping

### Endpoints (minimal)

1) `GET /api/chat/messages?applicationId=...`
- Returns:
  - conversation metadata
  - last N messages (start with 50)
- Also:
  - If caller is client => mark `unreadForClient=false`
  - If caller is admin => mark `unreadForAdmin=false`

2) `POST /api/chat/send`
- Body:
  - `applicationId` (string)
  - `body` (string)
- Behavior:
  - Validate non-empty body
  - Write message to Firestore
  - Update conversation doc (latest preview/date/unread flags)
  - Create/update Zoho `Client_Messages` reference record (fail-soft)

3) `GET /api/chat/admin/conversations`
- Admin only
- Returns conversations ordered by `latestMessageAt desc`
- UI can filter “needs attention” where `unreadForAdmin=true`

---

## UI changes (v1)

### Client messaging page (reuse existing UI)
Update `app/applications/[slug]/[id]/messages/page.js` to:
- Load chat from `/api/chat/messages?applicationId=...` (instead of Zoho-based `/api/messages/fetch`).
- Send via `/api/chat/send`.
- Keep:
  - optimistic bubble
  - send button loading spinner
  - empty state (“No messages yet”)
  - error handling with retry
- Attachments:
  - v1: hide/disable paperclip button or show “Attachments coming soon”.

Unread indicator for client:
- When client opens the thread, server marks `unreadForClient=false`.

### Admin pages (new)
Add:
- `app/admin/messages/page.js`
  - list conversations needing attention
  - show: client name, application type, latest message, latest date, unread badge, open button
- `app/admin/messages/[conversationId]/page.js`
  - thread view using same chat UI pattern
  - reply box at bottom
  - opening marks `unreadForAdmin=false`

### Admin route protection
Update `src/components/AuthGuard.jsx` to:
- Protect `/admin/*` routes
- Redirect non-admin users to `/access-denied`

---

## Step-by-step implementation order (smallest reliable v1)

1) Add Firestore conversation/message schema (server writes only).
2) Add server auth helper (verify token + load profile + role).
3) Implement `/api/chat/messages`, `/api/chat/send`, `/api/chat/admin/conversations`.
4) Implement Zoho reference upsert in `/api/chat/send` using `ZohoCRMClient` + fail-soft field updates.
5) Switch client UI page to new Firebase-backed chat endpoints.
6) Add admin list + thread pages.
7) Add unread behavior (flags in Firestore + mirrored in Zoho reference).
8) Quick verification:
   - client sends => admin sees unread + preview
   - admin replies => client sees unread
   - client cannot open other users’ threads
   - non-admin cannot access `/admin/messages`

---

## Out of scope (v1)
- Attachments (but keep schema extensible)
- Real-time updates via onSnapshot (can be added later; start with fetch + refresh)
- Fine-grained admin “allowed to manage” rules beyond `role=admin`
- Push notifications / email notifications

