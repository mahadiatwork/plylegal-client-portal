# Zoho CRM Chat Widget - Implementation Plan

## Overview
Build a Zoho CRM widget/application that allows agents to search for users by email, view their chat messages from Firebase, and send replies. This creates a two-way communication channel between the portal (clients) and Zoho CRM (agents).

## Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Zoho CRM      │         │   Next.js API    │         │   Firebase      │
│   Widget        │────────▶│   Routes         │────────▶│   Firestore     │
│   (React)       │  REST   │   (Server-side)  │         │   (Database)    │
└─────────────────┘         └──────────────────┘         └─────────────────┘
```

## Phase 1: API Endpoints (Backend)

### 1.1 Search User by Email
**Endpoint:** `GET /api/zoho/search-user?email={email}`

**Purpose:** Allow Zoho CRM to find a user by email address

**Request:**
```javascript
GET /api/zoho/search-user?email=user@example.com
```

**Response:**
```json
{
  "success": true,
  "user": {
    "uid": "firebase-user-id",
    "email": "user@example.com",
    "name": "User Name",
    "userId": "user-id-for-messages"
  }
}
```

**Implementation:**
- Use Firebase Admin SDK to search users collection by email
- Return user profile with UID and userId
- Include error handling for not found

**Files to Create:**
- `app/api/zoho/search-user/route.js`

---

### 1.2 Fetch Messages for User
**Endpoint:** `GET /api/zoho/messages?userId={userId}&limit={limit}&before={cursor}&after={cursor}`

**Purpose:** Retrieve chat messages for a specific user

**Request:**
```javascript
GET /api/zoho/messages?userId=user-id&limit=50
```

**Response:**
```json
{
  "success": true,
  "messages": [
    {
      "id": "message-id",
      "senderType": "client",
      "senderName": "User Name",
      "body": "Message text",
      "createdAt": "2024-01-01T12:00:00Z",
      "status": "sent"
    }
  ],
  "hasMore": false,
  "olderCursor": null,
  "newestCursor": "2024-01-01T12:00:00Z"
}
```

**Implementation:**
- Use Firebase Admin SDK to query messages collection
- Filter by userId
- Support pagination with cursors
- Sort by createdAt descending (newest first)

**Files to Create:**
- `app/api/zoho/messages/route.js`

---

### 1.3 Send Agent Message
**Endpoint:** `POST /api/zoho/messages`

**Purpose:** Allow Zoho CRM agents to send messages to users

**Request:**
```json
{
  "userId": "user-id",
  "senderType": "agent",
  "senderUid": "zoho-agent-id",
  "senderName": "Agent Name",
  "body": "Agent reply message",
  "matterId": "optional-matter-id"
}
```

**Response:**
```json
{
  "success": true,
  "message": {
    "id": "message-id",
    "senderType": "agent",
    "senderName": "Agent Name",
    "body": "Agent reply message",
    "createdAt": "2024-01-01T12:00:00Z",
    "status": "sent"
  }
}
```

**Implementation:**
- Use Firebase Admin SDK to create message
- Set senderType to "agent"
- Store agent information (Zoho user ID, name)
- Link to userId for the client

**Files to Create:**
- `app/api/zoho/messages/route.js` (extend existing or create new)

---

### 1.4 Mark Messages as Seen (Agent)
**Endpoint:** `PATCH /api/zoho/messages/seen`

**Purpose:** Mark client messages as seen when agent views them

**Request:**
```json
{
  "messageIds": ["msg-id-1", "msg-id-2"]
}
```

**Response:**
```json
{
  "success": true,
  "updated": 2
}
```

**Files to Create:**
- Extend `app/api/zoho/messages/route.js`

---

### 1.5 Authentication/Authorization
**Purpose:** Secure API endpoints for Zoho CRM access

**Options:**
1. **API Key Authentication** (Simplest)
   - Store API key in Zoho CRM custom function
   - Validate API key in API routes
   - Environment variable: `ZOHO_API_KEY`

2. **OAuth 2.0** (More Secure)
   - Zoho OAuth flow
   - JWT token validation
   - More complex but production-ready

**Implementation:**
- Create middleware for API key validation
- Add to all Zoho API routes

**Files to Create:**
- `src/lib/zoho-api-auth.js` or middleware

---

## Phase 2: Zoho CRM Widget (Frontend)

### 2.1 Widget Structure
**Technology:** React (Zoho CRM supports React widgets)

**Components:**
```
ChatWidget/
├── SearchBar.jsx          # Email search input
├── UserInfo.jsx           # Display user details
├── ChatWindow.jsx         # Message list
├── MessageBubble.jsx      # Individual message
├── MessageInput.jsx       # Send message input
└── ChatWidget.jsx         # Main container
```

### 2.2 Widget Features

**Search Functionality:**
- Input field for email address
- Search button
- Display user info when found
- Error handling for not found

**Chat Display:**
- Scrollable message list
- Client messages (right-aligned, different color)
- Agent messages (left-aligned, different color)
- Timestamps
- Auto-scroll to bottom
- Load older messages (pagination)

**Message Sending:**
- Text input area
- Send button
- Real-time updates (polling or WebSocket)
- Status indicators (sent, seen)

**User Context:**
- Display user name, email
- Show associated applications/matters
- Link to user profile if needed

### 2.3 Zoho CRM Integration

**Widget Placement:**
- Contact Detail Page (Sidebar or Tab)
- Deal/Matter Detail Page
- Custom Page

**Zoho CRM APIs Needed:**
- `ZOHO.CRM.API.getRecord()` - Get contact/deal info
- `ZOHO.CRM.API.updateRecord()` - Update records if needed
- Custom Functions for API calls

**Widget Configuration:**
- Widget manifest/config file
- API endpoint URLs
- API key configuration

---

## Phase 3: Real-time Updates

### 3.1 Polling (Initial Implementation)
**Approach:** Poll for new messages every 5-10 seconds

**Implementation:**
- Use `setInterval` in React widget
- Fetch messages with `after` cursor
- Update UI when new messages arrive

### 3.2 WebSocket (Future Enhancement)
**Approach:** Use Firebase Realtime Database or Firestore listeners

**Benefits:**
- Instant message delivery
- No polling overhead
- Better user experience

**Implementation:**
- Firebase Realtime Database WebSocket
- Or Firestore real-time listeners (requires client SDK)

---

## Phase 4: Data Model & Schema

### 4.1 Message Schema (Already Exists)
```javascript
{
  id: "message-id",
  userId: "user-firebase-uid",
  senderType: "client" | "agent",
  senderUid: "firebase-uid" | "zoho-user-id",
  senderName: "Display Name",
  body: "Message text",
  status: "sent" | "seen",
  createdAt: Timestamp,
  matterId: "optional-matter-id"
}
```

### 4.2 User Search Index
**Requirement:** Fast email lookup

**Options:**
1. Firestore query with email field (requires index)
2. Maintain email-to-UID mapping
3. Use Firebase Auth Admin SDK to search users

**Recommended:** Use Firebase Admin SDK `getUserByEmail()`

---

## Phase 5: Security & Permissions

### 5.1 API Security
- API key authentication
- Rate limiting
- CORS configuration (allow Zoho domains)
- Input validation
- SQL injection prevention (N/A for Firestore, but validate inputs)

### 5.2 Data Access Control
- Agents can only access messages for users they have access to
- Validate agent permissions in Zoho CRM
- Log all agent actions for audit

### 5.3 Firestore Security Rules
**Update rules to allow:**
- Admin SDK operations (already bypass rules)
- Consider adding agent access rules if using client SDK

---

## Phase 6: Implementation Steps

### Step 1: Backend API (Week 1)
- [ ] Create `/api/zoho/search-user` endpoint
- [ ] Create `/api/zoho/messages` GET endpoint
- [ ] Create `/api/zoho/messages` POST endpoint
- [ ] Create `/api/zoho/messages` PATCH endpoint
- [ ] Add API key authentication middleware
- [ ] Test all endpoints with Postman/curl

### Step 2: Zoho CRM Widget Setup (Week 1-2)
- [ ] Set up Zoho CRM custom widget project
- [ ] Configure widget manifest
- [ ] Set up React development environment
- [ ] Create basic widget structure

### Step 3: Widget UI Components (Week 2)
- [ ] Build SearchBar component
- [ ] Build UserInfo component
- [ ] Build ChatWindow component
- [ ] Build MessageBubble component
- [ ] Build MessageInput component
- [ ] Integrate all components

### Step 4: Widget Functionality (Week 2-3)
- [ ] Implement email search
- [ ] Implement message fetching
- [ ] Implement message sending
- [ ] Implement message status updates
- [ ] Add error handling
- [ ] Add loading states

### Step 5: Real-time Updates (Week 3)
- [ ] Implement polling mechanism
- [ ] Add auto-refresh
- [ ] Handle connection errors
- [ ] Optimize polling frequency

### Step 6: Testing & Deployment (Week 4)
- [ ] Test with real Zoho CRM environment
- [ ] Test with multiple users
- [ ] Performance testing
- [ ] Security audit
- [ ] Deploy widget to Zoho CRM
- [ ] Deploy API to production

---

## Phase 7: Technical Specifications

### 7.1 API Endpoints Summary

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/api/zoho/search-user` | Find user by email | API Key |
| GET | `/api/zoho/messages` | Get user messages | API Key |
| POST | `/api/zoho/messages` | Send agent message | API Key |
| PATCH | `/api/zoho/messages/seen` | Mark as seen | API Key |

### 7.2 Environment Variables Needed

```env
# Zoho CRM Integration
ZOHO_API_KEY=your-secret-api-key
ZOHO_ALLOWED_ORIGINS=https://crm.zoho.com,https://crm.zoho.com.au

# Firebase (already exists)
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
FIREBASE_SERVICE_ACCOUNT_KEY=your-service-account-json
```

### 7.3 Zoho CRM Widget Configuration

**Widget Type:** Custom Widget (React)

**Required Permissions:**
- Read Contact records
- Read Deal records
- Custom Functions (for API calls)

**Widget Settings:**
- API endpoint URL
- API key (stored securely)
- Refresh interval

---

## Phase 8: Future Enhancements

### 8.1 Advanced Features
- [ ] File attachments support
- [ ] Message reactions/emojis
- [ ] Typing indicators
- [ ] Message search within conversation
- [ ] Message export/print
- [ ] Conversation history export

### 8.2 Integration Features
- [ ] Link messages to Zoho CRM activities
- [ ] Create tasks from messages
- [ ] Auto-tag messages
- [ ] Sentiment analysis
- [ ] Auto-responses for common queries

### 8.3 Performance
- [ ] WebSocket for real-time (replace polling)
- [ ] Message caching
- [ ] Optimistic UI updates
- [ ] Lazy loading for old messages

---

## Phase 9: Documentation

### 9.1 API Documentation
- [ ] OpenAPI/Swagger specification
- [ ] Endpoint documentation
- [ ] Authentication guide
- [ ] Error codes reference

### 9.2 Widget Documentation
- [ ] Installation guide
- [ ] Configuration guide
- [ ] User manual
- [ ] Troubleshooting guide

### 9.3 Developer Documentation
- [ ] Architecture overview
- [ ] Code structure
- [ ] Contribution guidelines
- [ ] Testing guide

---

## Phase 10: Testing Strategy

### 10.1 Unit Tests
- [ ] API endpoint tests
- [ ] Widget component tests
- [ ] Utility function tests

### 10.2 Integration Tests
- [ ] API + Firebase integration
- [ ] Widget + API integration
- [ ] End-to-end message flow

### 10.3 User Acceptance Testing
- [ ] Agent workflow testing
- [ ] Client-agent conversation flow
- [ ] Error scenario testing
- [ ] Performance testing

---

## Deliverables

1. **Backend API**
   - REST API endpoints for Zoho CRM
   - Authentication middleware
   - API documentation

2. **Zoho CRM Widget**
   - React-based chat widget
   - Search and display functionality
   - Message sending capability

3. **Documentation**
   - API documentation
   - Widget installation guide
   - User manual

4. **Testing**
   - Test suite
   - Test documentation
   - Performance benchmarks

---

## Timeline Estimate

- **Phase 1 (Backend API):** 1 week
- **Phase 2-3 (Widget Development):** 2 weeks
- **Phase 4-5 (Data & Security):** 1 week
- **Phase 6 (Implementation):** 4 weeks (as outlined above)
- **Phase 7-10 (Polish & Testing):** 1-2 weeks

**Total Estimated Time:** 8-10 weeks

---

## Notes

- Start with MVP (search, view, send) before adding advanced features
- Use polling initially, upgrade to WebSocket later
- Keep API simple and RESTful
- Ensure proper error handling at all levels
- Consider rate limiting for API endpoints
- Plan for scalability (multiple agents, high message volume)

---

## Questions to Resolve

1. **Authentication Method:** API Key vs OAuth 2.0?
2. **Widget Placement:** Where in Zoho CRM should it appear?
3. **Real-time:** Start with polling or implement WebSocket from day 1?
4. **Agent Identification:** How to identify which Zoho user is sending messages?
5. **Message Limits:** Any limits on message length, frequency?
6. **Multi-language:** Support for multiple languages?

---

## Next Steps

1. Review and approve this plan
2. Set up development environment
3. Begin Phase 1 (Backend API)
4. Create detailed technical specifications for each component
5. Set up project repository structure
6. Begin implementation



