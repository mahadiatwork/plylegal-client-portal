# Admin API Documentation

## Overview

The Admin API provides secure endpoints for Zoho CRM Deluge functions to interact with the portal's message storage. These endpoints use a shared static admin key (`PORTAL_ADMIN_KEY`) for authentication, separate from Firebase user authentication.

## Endpoint: GET `/api/admin/messages`

Fetches stored messages for a given user email address.

### Authentication

**Required Header:**
```
x-admin-key: <PORTAL_ADMIN_KEY>
```

The `PORTAL_ADMIN_KEY` must match the value set in:
- Portal environment: `PORTAL_ADMIN_KEY`
- Zoho CRM Org Variable: `PORTAL_ADMIN_KEY`

### Request

**URL:** `GET /api/admin/messages`

**Query Parameters:**
- `email` (required): User's email address
- `limit` (optional, default: 50, max: 200): Number of messages to return
- `matterId` (optional): Filter messages by matter/application ID
- `before` (optional): ISO date string - fetch messages before this date (pagination)
- `after` (optional): ISO date string - fetch messages after this date (pagination)

**Note:** Use either `before` or `after`, not both.

### Response

**Success (200):**
```json
{
  "success": true,
  "messages": [
    {
      "id": "message-id",
      "userId": "firebase-user-id",
      "senderType": "client",
      "senderUid": "user-uid",
      "senderName": "User Name",
      "body": "Message text",
      "status": "sent",
      "createdAt": "2024-01-01T12:00:00.000Z",
      "matterId": "optional-matter-id"
    }
  ],
  "hasMore": false,
  "olderCursor": "2024-01-01T11:00:00.000Z",
  "newestCursor": "2024-01-01T12:00:00.000Z"
}
```

**Error Responses:**

- **400 Bad Request:** Missing or invalid email parameter
- **401 Unauthorized:** Missing or invalid `x-admin-key` header
- **429 Too Many Requests:** Rate limit exceeded
- **500 Internal Server Error:** Server error (Firebase Admin SDK not configured, etc.)

### Response Headers

- `X-RateLimit-Limit`: Maximum requests per window (100)
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: ISO timestamp when rate limit resets

### Example cURL Request

```bash
curl -X GET "https://your-domain.com/api/admin/messages?email=user@example.com&limit=50" \
  -H "x-admin-key: your-portal-admin-key"
```

### Example Zoho Deluge Function

```javascript
// Zoho CRM Deluge function
response = invokeurl
[
    url :"https://your-domain.com/api/admin/messages?email=" + email + "&limit=50"
    type :GET
    connection:"portal_api"
];

// Connection "portal_api" should have header:
// x-admin-key: {PORTAL_ADMIN_KEY}
```

### Rate Limiting

- **Limit:** 100 requests per minute per IP address
- **Window:** 60 seconds
- **Response:** 429 status code when exceeded

### Security Features

1. **Admin Key Authentication:** All requests require valid `x-admin-key` header
2. **Constant-Time Comparison:** Prevents timing attacks on key validation
3. **No Key Logging:** Admin keys are never logged or exposed in error messages
4. **Rate Limiting:** Prevents abuse and brute force attacks
5. **HTTPS Required:** Endpoint should only be accessed over HTTPS in production

### Error Handling

The endpoint returns consistent error responses:

```json
{
  "success": false,
  "error": "Error message description"
}
```

Common errors:
- `"Unauthorized: Missing x-admin-key header."` - Header not provided
- `"Unauthorized: Invalid admin key."` - Key doesn't match
- `"Query parameter \"email\" is required."` - Email missing
- `"Invalid email format."` - Email format invalid
- `"Rate limit exceeded. Please try again later."` - Too many requests

### Testing

Use the provided test script:

```bash
# Set environment variable
export PORTAL_ADMIN_KEY=your-key-here

# Run tests
node test-admin-messages.js user@example.com
```

The test script validates:
- ✅ 401 when key is missing
- ✅ 401 when key is wrong
- ✅ 400 when email is missing
- ✅ 200 with valid request

### Implementation Details

**Files:**
- Endpoint: `app/api/admin/messages/route.js`
- Auth: `src/lib/adminAuth.js`
- Rate Limiter: `src/lib/rateLimiter.js`
- Message Service: `src/lib/chatService-admin.js`

**Dependencies:**
- Firebase Admin SDK (for Firestore access)
- Next.js API Routes

**Storage:**
- Messages stored in Firestore `messages` collection
- Messages indexed by `userId` and `createdAt`

### Migration Notes

If migrating from the Zoho API endpoints (`/api/zoho/messages`), note:
- This endpoint uses `x-admin-key` instead of `x-zoho-api-key`
- This endpoint does NOT require Zoho Contact/Deal ID verification
- This endpoint is specifically for Zoho Deluge functions, not Zoho CRM widgets

### Troubleshooting

**"Server misconfiguration: Portal admin key is not set"**
- Add `PORTAL_ADMIN_KEY` to your `.env.local` or environment variables

**"Firebase Admin SDK is not configured"**
- Add `FIREBASE_SERVICE_ACCOUNT_KEY` to your environment (JSON string)

**"Unauthorized: Invalid admin key"**
- Verify `PORTAL_ADMIN_KEY` matches in both portal and Zoho CRM
- Check for whitespace or encoding issues

**"Rate limit exceeded"**
- Wait for the rate limit window to reset (60 seconds)
- Consider implementing request batching in Deluge functions

### Support

For issues or questions:
1. Check server logs (without exposing keys)
2. Verify environment variables are set correctly
3. Test with the provided test script
4. Contact development team with error details (excluding keys)

