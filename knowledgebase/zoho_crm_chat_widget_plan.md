# Zoho CRM Chat Widget — Implementation Plan

> **Architecture**: Single-Module Chat with Subform-Based Message Log  
> **One conversation per Matter / Deal — every message is a subform row**

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Phase 1 — CRM Module & Subform Setup](#2-phase-1--crm-module--subform-setup)
3. [Phase 2 — CRM Widget (Admin View)](#3-phase-2--crm-widget-admin-view)
4. [Phase 3 — Integration Layer (Portal → CRM)](#4-phase-3--integration-layer-portal--crm)
5. [Phase 4 — Client Portal Chat UI](#5-phase-4--client-portal-chat-ui)
6. [Phase 5 — Notifications](#6-phase-5--notifications)
7. [Phase 6 — Polish & Future Enhancements](#7-phase-6--polish--future-enhancements)
8. [Testing Checklist](#8-testing-checklist)

---

## 1. Architecture Overview

```
┌──────────────┐      ┌────────────────────┐      ┌───────────────────────────────┐      ┌──────────────────────┐
│ Client Portal│─────▶│ Integration Layer  │─────▶│  Zoho CRM: Client_Messages   │◀─────│ CRM Widget (Admin)   │
│ (Next.js)    │      │ Webhook / Fn / API │      │  1 record per Matter/Deal    │      │ Embedded in Deal     │
│              │◀─────│                    │◀─────│  Subform: Message_Log        │      │ layout               │
└──────────────┘      └────────────────────┘      └───────────────────────────────┘      └──────────────────────┘
```

### Key Principles

| Principle | Detail |
|---|---|
| **One module only** | `Client_Messages` custom module — simpler data model |
| **One record per Matter/Deal** | Lookup field links to the Deal |
| **Every message = one subform row** | No "message + reply" pairing — each message is independent |
| **Chronological subform** | `Message_Log` subform sorted by `Timestamp` |
| **Bidirectional** | Client sends via portal; Admin replies via CRM widget |
| **Future-ready** | Attachment field per row, read-tracking per row |

---

## 2. Phase 1 — CRM Module & Subform Setup

### 2.1 Create Custom Module: `Client_Messages`

> **Setup → Modules and Fields → Create New Module**

#### Parent Record Fields

| Field Name | API Name | Type | Notes |
|---|---|---|---|
| Matter / Deal | `Matter_Deal` | Lookup (Deals) | Required — links to the Deal |
| Contact | `Contact` | Lookup (Contacts) | Auto-populated from Deal's contact |
| Status | `Status` | Picklist | `Active`, `Archived` |
| Last Message At | `Last_Message_At` | DateTime | Updated on every new message |
| Unread for Admin | `Unread_for_Admin` | Number (integer) | Count of unread client messages |
| Unread for Client | `Unread_for_Client` | Number (integer) | Count of unread admin messages |

### 2.2 Create Subform: `Message_Log`

> Added inside the `Client_Messages` module layout

| Field Name | API Name | Type | Notes |
|---|---|---|---|
| Sender | `Sender` | Picklist | `Client`, `Admin` |
| Message | `Message1` | Multi-line (large) | The message body |
| Timestamp | `Timestamp` | DateTime | When the message was sent |
| Attachment | `Attachment` | File Upload / URL | Optional file |
| Read By Admin | `Read_By_Admin` | Checkbox | Marked when admin views |
| Read By Client | `Read_By_Client` | Checkbox | Marked when client views |

> **IMPORTANT**: Do NOT store one message + one reply only. Store every message as a separate subform row. This enables unlimited conversation length and clean chronological ordering.

### 2.3 Workflow Rules (optional automation)

| Trigger | Action |
|---|---|
| New subform row where `Sender = Client` | Increment `Unread_for_Admin` |
| New subform row where `Sender = Admin` | Increment `Unread_for_Client` |
| Record update via widget (mark read) | Reset `Unread_for_Admin` to `0` |

---

## 3. Phase 2 — CRM Widget (Admin View)

### 3.1 Overview

The widget is embedded in the **Deal detail page** (Related List or custom button/tab). It reads the `Client_Messages` record linked to the current Deal and renders a chat feed.

### 3.2 Widget Project Structure

```
crm-chat-widget/
├── app/
│   ├── widget.html          # Main widget entry point
│   ├── css/
│   │   └── widget.css        # Chat styling
│   └── js/
│       └── widget.js         # Core logic
├── plugin-manifest.json      # Zoho widget manifest
└── README.md
```

### 3.3 `plugin-manifest.json`

```json
{
  "service": "CRM",
  "components": {
    "widgets": [
      {
        "widgetNamespace": "plylegal__chatWidget",
        "location": "crm.deal.detail.rightpanel",
        "url": "/app/widget.html",
        "logo": "/app/img/chat-icon.png",
        "name": "Matter Chat"
      }
    ]
  }
}
```

> **Note**: `location` options include `crm.deal.detail.rightpanel`, `crm.deal.detail.tab`, or `crm.deal.canvas.button`. Choose based on UX preference.

### 3.4 Widget Logic (`widget.js`) — Pseudocode

```javascript
// 1. Initialise Zoho Embedded SDK
ZOHO.embeddedApp.on("PageLoad", async function (data) {
  const dealId = data.EntityId;       // Current Deal ID
  const moduleName = "Deals";

  // 2. Find or create Client_Messages record for this Deal
  let chatRecord = await findChatRecord(dealId);
  if (!chatRecord) {
    chatRecord = await createChatRecord(dealId);
  }

  // 3. Load Message_Log subform rows
  const messages = chatRecord.Message_Log || [];
  renderChatFeed(messages);

  // 4. Mark all client messages as read
  await markMessagesRead(chatRecord.id, messages);
});

ZOHO.embeddedApp.init();

// --- Core Functions ---

async function findChatRecord(dealId) {
  const resp = await ZOHO.CRM.API.coql({
    select_query: `SELECT id, Message_Log, Unread_for_Admin
                   FROM Client_Messages
                   WHERE Matter_Deal = '${dealId}' LIMIT 1`
  });
  return resp.data?.[0] || null;
}

async function createChatRecord(dealId) {
  const resp = await ZOHO.CRM.API.insertRecord({
    Entity: "Client_Messages",
    APIData: {
      Matter_Deal: dealId,
      Status: "Active",
      Unread_for_Admin: 0,
      Unread_for_Client: 0
    }
  });
  return resp.data?.[0]?.details || null;
}

async function sendAdminReply(chatRecordId, messageText, existingRows) {
  const newRow = {
    Sender: "Admin",
    Message1: messageText,
    Timestamp: new Date().toISOString(),
    Read_By_Admin: true,
    Read_By_Client: false
  };

  // Append to existing subform rows
  const updatedLog = [...existingRows, newRow];

  await ZOHO.CRM.API.updateRecord({
    Entity: "Client_Messages",
    RecordID: chatRecordId,
    APIData: {
      Message_Log: updatedLog,
      Last_Message_At: new Date().toISOString()
    }
  });
}

function renderChatFeed(messages) {
  const container = document.getElementById("chat-messages");
  container.innerHTML = "";

  // Sort chronologically
  messages.sort((a, b) => new Date(a.Timestamp) - new Date(b.Timestamp));

  messages.forEach(msg => {
    const bubble = document.createElement("div");
    bubble.className = msg.Sender === "Admin" ? "msg-admin" : "msg-client";
    bubble.innerHTML = `
      <div class="msg-body">${escapeHtml(msg.Message1)}</div>
      <div class="msg-meta">
        ${formatTime(msg.Timestamp)}
        ${msg.Attachment ? '<span class="attachment-icon">📎</span>' : ''}
      </div>
    `;
    container.appendChild(bubble);
  });

  container.scrollTop = container.scrollHeight;
}
```

### 3.5 Widget UI Layout

```
┌──────────────────────────────────────────┐
│  Matter: Mahmudu Hassan - Skills in Demand│
│──────────────────────────────────────────│
│                                          │
│  ┌─ Client ─────────────────────┐        │
│  │ Hi, I have a question about  │ 10:02  │
│  │ my matter timeline.          │   AM   │
│  └──────────────────────────────┘        │
│                                          │
│        ┌──────────────────── Admin ─┐    │
│        │ Thanks for reaching out.   │    │
│        │ I'll review and get back   │    │
│   10:05│ to you shortly.            │    │
│     AM └────────────────────────────┘    │
│                                          │
│  ┌─ Client ─────────────────────┐        │
│  │ Great, thank you!            │ 10:06  │
│  └──────────────────────────────┘   AM   │
│                                          │
│──────────────────────────────────────────│
│  [Type your reply...]        [Send ▶]   │
└──────────────────────────────────────────┘
```

### 3.6 Key CSS Classes

| Class | Purpose |
|---|---|
| `.chat-container` | Full widget wrapper, flex column |
| `.chat-header` | Matter name + unread badge |
| `.chat-messages` | Scrollable message area, flex-grow |
| `.msg-client` | Left-aligned bubble, light grey bg |
| `.msg-admin` | Right-aligned bubble, brand-green bg |
| `.msg-meta` | Timestamp + attachment icon |
| `.chat-input` | Fixed bottom input bar |

---

## 4. Phase 3 — Integration Layer (Portal → CRM)

### 4.1 Purpose

When a **client sends a message** from the portal, the integration layer:

1. Finds (or creates) the `Client_Messages` record for the Matter/Deal
2. Appends a new row to the `Message_Log` subform
3. Updates `Last_Message_At`
4. Increments `Unread_for_Admin`
5. Triggers a notification

### 4.2 Implementation Options

| Option | Pros | Cons |
|---|---|---|
| **Next.js API route** (existing pattern) | Reuses `zohoClient.js`, simple | Needs Zoho OAuth token |
| **Zoho Function (serverless)** | Native CRM access, no token mgmt | Separate deployment |
| **Zoho Webhook + Flow** | No-code | Less flexible |

> **Recommended**: Use the existing **Next.js API route** pattern since the project already has `zohoClient.js` with token management.

### 4.3 API Route: `/api/messages/send`

```javascript
// app/api/messages/send/route.js
import { NextResponse } from "next/server";
import { ZohoCRMClient } from "@/lib/zohoClient";

export async function POST(request) {
  const { dealId, contactId, message, attachment } = await request.json();
  const zoho = new ZohoCRMClient();

  // 1. Find existing Client_Messages record
  let chatRecords = await zoho.coqlQuery(
    `SELECT id, Message_Log, Unread_for_Admin
     FROM Client_Messages
     WHERE Matter_Deal = '${dealId}' LIMIT 1`
  );
  let chatRecord = chatRecords[0];

  // 2. Create if not exists
  if (!chatRecord) {
    const created = await zoho.createRecord("Client_Messages", {
      Matter_Deal: dealId,
      Contact: contactId,
      Status: "Active",
      Unread_for_Admin: 0,
      Unread_for_Client: 0,
    });
    chatRecord = { id: created.details.id, Message_Log: [] };
  }

  // 3. Append new message row
  const existingLog = chatRecord.Message_Log || [];
  const newRow = {
    Sender: "Client",
    Message1: message,
    Timestamp: new Date().toISOString(),
    Read_By_Admin: false,
    Read_By_Client: true,
  };

  await zoho.updateRecord("Client_Messages", chatRecord.id, {
    Message_Log: [...existingLog, newRow],
    Last_Message_At: new Date().toISOString(),
    Unread_for_Admin: (chatRecord.Unread_for_Admin || 0) + 1,
  });

  return NextResponse.json({ success: true });
}
```

### 4.4 API Route: `/api/messages/fetch`

```javascript
// app/api/messages/fetch/route.js
import { NextResponse } from "next/server";
import { ZohoCRMClient } from "@/lib/zohoClient";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const dealId = searchParams.get("dealId");
  const zoho = new ZohoCRMClient();

  const records = await zoho.coqlQuery(
    `SELECT id, Message_Log, Unread_for_Client
     FROM Client_Messages
     WHERE Matter_Deal = '${dealId}' LIMIT 1`
  );

  const chatRecord = records[0];
  if (!chatRecord) {
    return NextResponse.json({ messages: [], unread: 0 });
  }

  // Mark admin messages as read by client
  const log = (chatRecord.Message_Log || []).map(row => ({
    ...row,
    Read_By_Client: true,
  }));

  // Reset unread counter
  await zoho.updateRecord("Client_Messages", chatRecord.id, {
    Message_Log: log,
    Unread_for_Client: 0,
  });

  return NextResponse.json({
    messages: log.sort((a, b) => new Date(a.Timestamp) - new Date(b.Timestamp)),
    unread: 0,
  });
}
```

---

## 5. Phase 4 — Client Portal Chat UI

### 5.1 Location

Integrated into the existing messages page at:
```
app/applications/[id]/messages/page.js
```

### 5.2 Component Hierarchy

```
<MessagesPage>
  ├── <ChatHeader />          — Matter name + status
  ├── <ChatMessageList />     — Scrollable message feed
  │     └── <ChatBubble />    — Individual message bubble
  └── <ChatInput />           — Text input + attach + send
```

### 5.3 Polling Strategy

- **On mount**: Fetch full chat history
- **Every 15 seconds**: Poll for new messages (compare array length)
- **On send**: Optimistic UI update + re-fetch after 2s
- **Future**: Replace polling with Zoho webhook → Supabase Realtime / SSE

---

## 6. Phase 5 — Notifications

### 6.1 Notification Triggers

| Event | Who gets notified | Channel |
|---|---|---|
| Client sends message | Admin | CRM notification + Email |
| Admin replies | Client | Email + Portal badge |
| Unread count > 0 | Both | Badge in respective UI |

### 6.2 CRM Notification (Workflow Rule)

- **Module**: `Client_Messages`
- **Trigger**: Field update where `Unread_for_Admin` > 0
- **Action**: Send CRM notification / Email alert to Deal owner
- **Optional**: Post to Zoho Cliq channel

### 6.3 Client Notification

- Portal shows unread badge on the Messages nav item
- Email notification via Zoho workflow or a scheduled function

---

## 7. Phase 6 — Polish & Future Enhancements

| Enhancement | Priority | Notes |
|---|---|---|
| File attachments in subform | High | Add file upload to portal + widget |
| Unread badge in portal sidebar | High | Read `Unread_for_Client` on page load |
| Typing indicator | Low | Would need WebSocket / Realtime |
| Message search | Medium | Filter subform rows client-side |
| Rich text / markdown | Low | Render markdown in bubbles |
| Read receipts (double-tick) | Medium | Use `Read_By_Admin` / `Read_By_Client` |
| Webhook-based real-time | Medium | Replace polling with push notifications |

---

## 8. Testing Checklist

### CRM Module
- [ ] `Client_Messages` module created with all parent fields
- [ ] `Message_Log` subform created with all fields
- [ ] Lookup to Deals works correctly
- [ ] Workflow rules for unread counts fire correctly

### CRM Widget
- [ ] Widget loads in Deal detail page
- [ ] COQL query finds existing chat record
- [ ] New chat record created when none exists
- [ ] All messages render in chronological order
- [ ] Admin can type and send a reply
- [ ] Reply appends to subform (does not overwrite)
- [ ] Unread badge clears on widget open
- [ ] Attachments display when present

### Integration Layer
- [ ] `/api/messages/fetch` returns sorted messages
- [ ] `/api/messages/send` appends new subform row
- [ ] Unread counter increments correctly
- [ ] `Last_Message_At` updates on every message
- [ ] No data loss when concurrent messages arrive

### Client Portal
- [ ] Chat loads full history on mount
- [ ] Client messages appear right-aligned
- [ ] Admin messages appear left-aligned
- [ ] Timestamps display correctly
- [ ] Send button disabled when empty
- [ ] Optimistic UI update on send
- [ ] Polling picks up new admin replies
- [ ] Attachment upload works (when implemented)

### Notifications
- [ ] Admin gets CRM notification on new client message
- [ ] Client gets email on new admin reply
- [ ] Unread badge shows in portal nav

---

## Important Caveats

**Subform row limit**: Zoho CRM subforms have a maximum of **200 rows** per record (varies by edition). For very long conversations, consider archiving older messages or splitting into multiple records. Monitor this limit in production.

**Existing code reuse**: The project already has `zohoClient.js` with `coqlQuery()`, `createRecord()`, `updateRecord()`, and token management. The new API routes should follow the exact same patterns documented in `ZOHO_CRM_INTEGRATION_GUIDE.md`.
