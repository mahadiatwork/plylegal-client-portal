# Admin Messages API - Implementation Summary

## Files Changed

### Created Files

1. **`app/api/admin/messages/route.js`**
   - Main admin endpoint for fetching messages by email
   - Implements authentication, rate limiting, and message retrieval

2. **`src/lib/adminAuth.js`**
   - Admin key authentication middleware
   - Constant-time comparison to prevent timing attacks
   - No key logging for security

3. **`src/lib/rateLimiter.js`**
   - Simple in-memory rate limiter
   - 100 requests per minute per IP
   - Automatic cleanup of expired entries

4. **`test-admin-messages.js`**
   - Node.js test script for validation
   - Tests all error cases and success case

5. **`test-admin-messages.ps1`**
   - PowerShell test script for Windows
   - Same test coverage as Node.js version

6. **`ADMIN_API_DOCUMENTATION.md`**
   - Complete API documentation
   - Usage examples, error codes, troubleshooting

### Modified Files

1. **`src/lib/chatService-admin.js`**
   - Added `fetchMessagesByEmail()` function
   - Resolves email to userId, then fetches messages
   - Handles user-not-found gracefully (returns empty array)

## Endpoint Contract

### Route
```
GET /api/admin/messages
```

### Authentication
**Required Header:**
```
x-admin-key: <PORTAL_ADMIN_KEY>
```

### Query Parameters
- `email` (required): User's email address
- `limit` (optional, default: 50, max: 200): Number of messages
- `matterId` (optional): Filter by matter/application ID
- `before` (optional): Pagination cursor (ISO date)
- `after` (optional): Pagination cursor (ISO date)

### Response Format

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
- `400`: Missing or invalid email
- `401`: Missing or invalid admin key
- `429`: Rate limit exceeded
- `500`: Server error (Firebase Admin SDK not configured, etc.)

### Security Features

✅ **Admin Key Authentication:** Validates `x-admin-key` header  
✅ **Constant-Time Comparison:** Prevents timing attacks  
✅ **No Key Logging:** Keys never logged or exposed  
✅ **Rate Limiting:** 100 requests/minute per IP  
✅ **HTTPS Assumption:** Production should use HTTPS only  

## How to Test Locally

### Prerequisites

1. **Set Environment Variable:**
   ```bash
   # .env.local or environment
   PORTAL_ADMIN_KEY=your-secret-key-here
   FIREBASE_SERVICE_ACCOUNT_KEY=your-service-account-json
   ```

2. **Start Dev Server:**
   ```bash
   npm run dev
   ```

### Test Methods

#### Method 1: Node.js Script
```bash
# Set admin key
export PORTAL_ADMIN_KEY=your-key-here

# Run tests
node test-admin-messages.js user@example.com
```

#### Method 2: PowerShell Script (Windows)
```powershell
# Set admin key
$env:PORTAL_ADMIN_KEY = "your-key-here"

# Run tests
.\test-admin-messages.ps1 -Email "user@example.com"
```

#### Method 3: cURL
```bash
# Test with valid key
curl -X GET "http://localhost:5000/api/admin/messages?email=user@example.com" \
  -H "x-admin-key: your-key-here"

# Test 401 (missing key)
curl -X GET "http://localhost:5000/api/admin/messages?email=user@example.com"

# Test 401 (wrong key)
curl -X GET "http://localhost:5000/api/admin/messages?email=user@example.com" \
  -H "x-admin-key: wrong-key"

# Test 400 (missing email)
curl -X GET "http://localhost:5000/api/admin/messages" \
  -H "x-admin-key: your-key-here"
```

### Expected Test Results

✅ **Test 1:** 401 when key is missing  
✅ **Test 2:** 401 when key is wrong  
✅ **Test 3:** 400 when email is missing  
✅ **Test 4:** 200 with messages when key is correct  

## Zoho CRM Integration

### Deluge Function Example

```javascript
// In Zoho CRM Deluge function
email = "user@example.com";
adminKey = org.getVariable("PORTAL_ADMIN_KEY");

response = invokeurl
[
    url :"https://your-domain.com/api/admin/messages?email=" + email + "&limit=50"
    type :GET
    connection:"portal_admin"
];

// Connection "portal_admin" should have:
// Header: x-admin-key = {PORTAL_ADMIN_KEY}
```

### Zoho Org Variable Setup

1. Go to Zoho CRM Settings → Developer Space → Org Variables
2. Create variable: `PORTAL_ADMIN_KEY`
3. Set value to match portal's `PORTAL_ADMIN_KEY`
4. Use in Deluge: `org.getVariable("PORTAL_ADMIN_KEY")`

## Acceptance Criteria ✅

- [x] `/api/admin/messages?email=someone@x.com` works only with correct `x-admin-key`
- [x] Returns messages reliably from Firebase storage
- [x] Doesn't expose any secrets in logs or responses
- [x] Code matches project conventions (Next.js API routes, Firebase Admin SDK)
- [x] Rate limiting implemented (100 req/min)
- [x] Comprehensive error handling (400, 401, 429, 500)
- [x] Test scripts provided for validation
- [x] Documentation complete

## Next Steps

1. **Deploy to Production:**
   - Set `PORTAL_ADMIN_KEY` in production environment
   - Ensure HTTPS is enforced
   - Monitor rate limiting metrics

2. **Zoho CRM Setup:**
   - Create Org Variable `PORTAL_ADMIN_KEY`
   - Create Deluge function using the endpoint
   - Test with real user emails

3. **Monitoring:**
   - Monitor for 401 errors (potential key leaks)
   - Monitor rate limit hits
   - Log access attempts (without keys)

## Notes

- The endpoint uses the existing Firebase Admin SDK infrastructure
- Messages are fetched from the same Firestore collection as the frontend
- Response format matches frontend expectations for consistency
- Rate limiting is in-memory (single instance). For multi-instance deployments, consider Redis-based rate limiting
- The endpoint does NOT require Zoho Contact/Deal ID (unlike `/api/zoho/messages`) since it's for Deluge functions, not CRM widgets

