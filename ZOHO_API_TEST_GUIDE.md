# Zoho CRM Chat API - Testing Guide

## Prerequisites

1. **Dev server running**: `npm run dev` (should be on port 5000)
2. **Environment variable set**: `ZOHO_API_KEY` in your `.env.local` or environment
3. **Firebase Admin SDK configured**: `FIREBASE_SERVICE_ACCOUNT_KEY` must be set

## Quick Test Methods

### Method 1: Browser Test (Easiest)

1. Open `test-zoho-api.html` in your browser
2. Enter your `ZOHO_API_KEY`
3. Enter a test email (must be a registered Firebase user)
4. Click "Run All Tests" or test individual endpoints

### Method 2: Node.js Script

```bash
# Set your API key (or add to .env.local)
export ZOHO_API_KEY=your-api-key-here

# Run the test script
node test-zoho-api.js user@example.com
```

### Method 3: cURL Commands

Replace `YOUR_API_KEY` and `user@example.com` with actual values:

#### 1. Search User by Email
```bash
# SECURITY: Now requires zohoContactId or zohoDealId
curl -X GET "http://localhost:5000/api/zoho/search-user?email=user@example.com&zohoContactId=123456789" \
  -H "x-zoho-api-key: YOUR_API_KEY"
```

#### 2. Fetch Messages
```bash
# SECURITY: Now requires zohoContactId or zohoDealId
curl -X GET "http://localhost:5000/api/zoho/messages?email=user@example.com&zohoContactId=123456789&limit=10" \
  -H "x-zoho-api-key: YOUR_API_KEY"
```

#### 3. Send Agent Message
```bash
# SECURITY: Now requires zohoContactId or zohoDealId
curl -X POST "http://localhost:5000/api/zoho/messages" \
  -H "Content-Type: application/json" \
  -H "x-zoho-api-key: YOUR_API_KEY" \
  -d '{
    "email": "user@example.com",
    "zohoContactId": "123456789",
    "senderType": "agent",
    "senderUid": "zoho-agent-123",
    "senderName": "Test Agent",
    "body": "Hello from Zoho CRM!"
  }'
```

#### 4. Mark Messages as Seen
```bash
curl -X PATCH "http://localhost:5000/api/zoho/messages" \
  -H "Content-Type: application/json" \
  -H "x-zoho-api-key: YOUR_API_KEY" \
  -d '{
    "messageIds": ["message-id-1", "message-id-2"]
  }'
```

## API Endpoints

### GET `/api/zoho/search-user`
Search for a user by email address.

**Query Parameters:**
- `email` (required): User's email address
- `zohoContactId` OR `zohoDealId` (required): Zoho Contact/Deal ID for authorization

**Response:**
```json
{
  "success": true,
  "user": {
    "uid": "firebase-user-id",
    "userId": "firebase-user-id",
    "email": "user@example.com",
    "displayName": "User Name",
    "phoneNumber": "+1234567890",
    "profile": { ... }
  }
}
```

### GET `/api/zoho/messages`
Fetch messages for a user.

**Query Parameters:**
- `userId` OR `email` (required): User ID or email
- `zohoContactId` OR `zohoDealId` (required): Zoho Contact/Deal ID for authorization
- `matterId` (optional): Filter by matter/application ID
- `limit` (optional, default: 30): Number of messages to fetch
- `before` (optional): Cursor for pagination (ISO date string)
- `after` (optional): Cursor for pagination (ISO date string)

**Response:**
```json
{
  "success": true,
  "userId": "user-id",
  "messages": [
    {
      "id": "message-id",
      "senderType": "client",
      "senderName": "User Name",
      "body": "Message text",
      "createdAt": "2024-01-01T12:00:00.000Z",
      "status": "sent"
    }
  ],
  "hasMore": false,
  "olderCursor": null,
  "newestCursor": "2024-01-01T12:00:00.000Z"
}
```

### POST `/api/zoho/messages`
Send a message as an agent.

**Request Body:**
```json
{
  "userId": "user-id",  // OR "email": "user@example.com"
  "zohoContactId": "123456789",  // OR "zohoDealId": "987654321" (required for security)
  "senderType": "agent",
  "senderUid": "zoho-agent-id",
  "senderName": "Agent Name",
  "body": "Message text",
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
    "body": "Message text",
    "createdAt": "2024-01-01T12:00:00.000Z",
    "status": "sent"
  }
}
```

### PATCH `/api/zoho/messages`
Mark messages as seen.

**Request Body:**
```json
{
  "messageIds": ["message-id-1", "message-id-2"]
}
```

**Response:**
```json
{
  "success": true,
  "updated": 2
}
```

## Authentication

All endpoints require authentication via one of these methods:

1. **Header**: `x-zoho-api-key: YOUR_API_KEY`
2. **Bearer Token**: `Authorization: Bearer YOUR_API_KEY`

Set `ZOHO_API_KEY` in your environment variables to configure the expected key.

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error message description"
}
```

Common status codes:
- `400`: Bad Request (missing/invalid parameters)
- `401`: Unauthorized (invalid/missing API key)
- `404`: Not Found (user not found)
- `500`: Server Error (Firebase Admin SDK not configured, etc.)

## Testing Checklist

- [ ] Dev server is running on port 5000
- [ ] `ZOHO_API_KEY` is set in environment
- [ ] `FIREBASE_SERVICE_ACCOUNT_KEY` is configured
- [ ] Test email exists in Firebase Auth
- [ ] **Zoho Contact ID or Deal ID** is available (required for security)
- [ ] Email matches the Contact/Deal in Zoho CRM
- [ ] Test user has messages in Firestore (optional, for message tests)

## Security Note

⚠️ **IMPORTANT:** All endpoints now require `zohoContactId` or `zohoDealId` for security. This prevents unauthorized access by email enumeration. See `ZOHO_API_SECURITY.md` for details.

## Troubleshooting

**"Server misconfiguration: ZOHO_API_KEY is not set"**
- Add `ZOHO_API_KEY` to your `.env.local` file or environment variables

**"Firebase Admin SDK is not configured"**
- Add `FIREBASE_SERVICE_ACCOUNT_KEY` to your environment (JSON string)

**"No Firebase user found for email"**
- The email must be registered in Firebase Auth
- Check Firebase Console > Authentication > Users

**"Unauthorized: invalid or missing Zoho API key"**
- Check that the API key in your request matches `ZOHO_API_KEY`
- Verify the header name is `x-zoho-api-key` (case-sensitive)

