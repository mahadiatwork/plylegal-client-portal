# Zoho CRM Chat Widget: Latest Method (Firebase-Backed)

## Overview
This is the modern implementation of the PlyLegal Matter Chat widget. It replaces the legacy Zoho-only subform storage with a unified backend powered by the ValidifyPro Portal (Firebase Firestore).

**Single Source of Truth:** Firestore (`conversations` and `messages` collections).

## Architecture
The widget runs as a Zoho CRM extension but communicates directly with the Portal APIs using a shared Admin API Key.

### 1. Authentication
Since the widget runs in a CRM iframe, it cannot use Firebase Auth directly.
- **Header:** `X-Admin-Key`
- **Value:** Matches `PORTAL_ADMIN_KEY` in the portal's `.env`.

### 2. Portal Endpoints (Widget Specific)
The portal provides two specialized endpoints for the widget that use the Zoho Deal ID as a lookup key:

- `GET /api/chat/widget/messages?zohoDealId=...`
  - Returns message history from Firestore.
  - Automatically marks the thread as "read" for the admin.
- `POST /api/chat/widget/send`
  - Payload: `{ zohoDealId, body }`
  - Saves admin reply to Firestore.
  - **Background Task:** Upserts a `Client_Messages` record in Zoho for unread tracking/notifications.

## Widget Setup ( plylegal-crm-chat-widget )

### Environment Configuration (`.env`)
```bash
VITE_PORTAL_BASE_URL=https://your-portal-domain.com
VITE_PORTAL_ADMIN_KEY=your_secure_admin_key
```

### Core Logic (`MatterChatApp.jsx`)
The widget uses a thin API client (`src/lib/portalApi.js`) to handle communication:
1. **Initialize:** Gets `EntityId` (Deal ID) from the Zoho page context.
2. **Fetch:** Calls `fetchMessages(dealId)` on mount.
3. **Poll:** Refreshes every 15 seconds to check for new client messages.
4. **Send:** Calls `sendMessage(dealId, text)` for admin replies.

## Syncing to Zoho CRM
After building the widget, use the sync script to move the assets into the portal's public directory:

```bash
cd F:\Projects\plylegal-crm-chat-widget
pnpm run build
pnpm run widget:sync
```

This copies the production bundle to:
- `f:\Projects\validifypro-visa-portal\app\widget.html`
- `f:\Projects\validifypro-visa-portal\app\assets/*`

## Benefits of this Method
1. **Performance:** Firestore reads/writes are sub-second.
2. **Consistency:** Client and Admin see the exact same message history.
3. **No Zoho Limits:** Bypasses Zoho CRM subform row limits and slow COQL queries for message rendering.
4. **Reliability:** Zoho CRM API calls happen in the background; they do not block the UI or message delivery.
