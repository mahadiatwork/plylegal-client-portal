# Zoho CRM Chat API - Security Documentation

## Security Overview

The Zoho CRM Chat API endpoints are secured with **multi-layer authorization** to prevent unauthorized access to user data and messages.

## Security Layers

### 1. API Key Authentication
- All endpoints require a valid `ZOHO_API_KEY`
- Key can be provided via:
  - Header: `x-zoho-api-key: YOUR_KEY`
  - Authorization: `Authorization: Bearer YOUR_KEY`

### 2. Zoho Contact/Deal Verification (CRITICAL)
**This is the main security feature that prevents email enumeration attacks.**

All endpoints now require:
- **Zoho Contact ID** OR **Zoho Deal ID** (at least one)
- The email address must match the Contact/Deal in Zoho CRM

**Why this is secure:**
- Agents can only access data for Contacts/Deals they have access to in Zoho CRM
- Even if someone knows an email address, they cannot access data without the Contact/Deal ID
- The system verifies that the email matches the Contact/Deal, preventing mismatched access
- Zoho CRM's own permission system controls who can see which Contacts/Deals

## Updated API Endpoints

### GET `/api/zoho/search-user`

**Required Parameters:**
- `email` - User's email address
- `zohoContactId` OR `zohoDealId` - Zoho Contact/Deal ID (for authorization)

**Example:**
```bash
GET /api/zoho/search-user?email=user@example.com&zohoContactId=123456789
```

**Security Flow:**
1. Validates API key
2. Verifies Contact/Deal exists in Zoho CRM
3. Verifies email matches the Contact/Deal
4. Returns user data only if all checks pass

### GET `/api/zoho/messages`

**Required Parameters:**
- `email` OR `userId` - User identifier
- `zohoContactId` OR `zohoDealId` - Zoho Contact/Deal ID (for authorization)

**Example:**
```bash
GET /api/zoho/messages?email=user@example.com&zohoContactId=123456789&limit=30
```

**Security Flow:**
1. Validates API key
2. Verifies Contact/Deal exists in Zoho CRM
3. Verifies email matches the Contact/Deal
4. Returns messages only if all checks pass

### POST `/api/zoho/messages`

**Required Body Fields:**
- `email` OR `userId` - User identifier
- `zohoContactId` OR `zohoDealId` - Zoho Contact/Deal ID (for authorization)
- `senderUid` - Zoho agent/user ID
- `senderName` - Agent name
- `body` - Message text

**Example:**
```json
{
  "email": "user@example.com",
  "zohoContactId": "123456789",
  "senderType": "agent",
  "senderUid": "zoho-agent-123",
  "senderName": "John Agent",
  "body": "Hello from Zoho CRM!"
}
```

**Security Flow:**
1. Validates API key
2. Verifies Contact/Deal exists in Zoho CRM
3. Verifies email matches the Contact/Deal
4. Creates message only if all checks pass

### PATCH `/api/zoho/messages`

**Required Body Fields:**
- `messageIds` - Array of message IDs to mark as seen

**Note:** This endpoint doesn't require Contact/Deal ID because it operates on message IDs that were already retrieved through authorized access.

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Security: zohoContactId or zohoDealId is required. This ensures only authorized agents can access user data."
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Unauthorized: invalid or missing Zoho API key."
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "Access denied: Contact not found or you do not have access to this contact."
}
```

or

```json
{
  "success": false,
  "error": "Access denied: Email does not match the provided Contact."
}
```

## Implementation in Zoho CRM Widget

When building your Zoho CRM widget, you'll need to:

1. **Get Contact/Deal ID from Zoho CRM context:**
   ```javascript
   // In Zoho CRM widget, you can get the current record ID
   const contactId = ZOHO.CRM.API.getRecord({ Entity: "Contacts" }).then(function(response) {
     return response.data[0].id;
   });
   ```

2. **Include Contact/Deal ID in all API requests:**
   ```javascript
   const response = await fetch(
     `${API_BASE}/api/zoho/search-user?email=${email}&zohoContactId=${contactId}`,
     {
       headers: {
         'x-zoho-api-key': API_KEY,
       },
     }
   );
   ```

3. **Handle 403 errors gracefully:**
   - If access is denied, show a message to the agent
   - Log the attempt for security monitoring

## Security Benefits

✅ **Prevents Email Enumeration:** Attackers can't just try random emails to access data  
✅ **Respects Zoho Permissions:** Only agents with Zoho CRM access can view data  
✅ **Email Verification:** Ensures the email matches the Contact/Deal  
✅ **Audit Trail:** All access attempts are logged with Contact/Deal context  

## Migration Guide

If you have existing code calling these APIs, update it to include `zohoContactId` or `zohoDealId`:

**Before (INSECURE):**
```javascript
GET /api/zoho/search-user?email=user@example.com
```

**After (SECURE):**
```javascript
GET /api/zoho/search-user?email=user@example.com&zohoContactId=123456789
```

## Best Practices

1. **Always use Contact/Deal ID from Zoho CRM context** - Don't hardcode IDs
2. **Store API key securely** - Never expose it in client-side code
3. **Handle errors gracefully** - Don't expose internal error details to users
4. **Log access attempts** - Monitor for suspicious activity
5. **Use HTTPS** - Always use encrypted connections in production

## Testing

When testing, you'll need:
- A valid Zoho Contact ID or Deal ID
- The email address associated with that Contact/Deal
- A valid `ZOHO_API_KEY`

See `ZOHO_API_TEST_GUIDE.md` for updated testing instructions.

