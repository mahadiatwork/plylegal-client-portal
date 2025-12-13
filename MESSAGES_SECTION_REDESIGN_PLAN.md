# Messages Section Redesign Plan

## Overview
Redesign the messages section to use a single chat interface with message box at the bottom, integrated directly with Zoho CRM's `Client_Messages` related list. No Firebase involved - direct bidirectional integration with Zoho CRM.

## Current State
- Split view: "New Message" panel on left, "Conversation" panel on right
- Messages stored in localStorage via `appDataStore`
- No Zoho CRM integration
- No attachment support

## Target State
- Single unified chat interface
- Message input box at the bottom with attachment support
- Messages fetched from Zoho CRM `Client_Messages` related list
- Messages created directly in Zoho CRM
- Real-time message display (sorted by time)
- Bidirectional communication (client messages and replies)

---

## Technical Architecture

### 1. Data Source
- **Module**: `Deals` (Matter/Application)
- **Related List**: `Client_Messages`
- **API Endpoint**: `GET /Deals/{dealId}/Client_Messages`
- **Create Endpoint**: `POST /Deals/{dealId}/Client_Messages`

### 2. Zoho CRM Fields Required

#### Fields to Fetch:
- `id` - Record ID
- `Name` - Record name (matter name + date/time)
- `Message_from_Client` - Client's message text
- `Reply_Message` - Reply from Ply Legal (if exists)
- `Time_Sent` - When client sent the message
- `Time_Replied` - When Ply Legal replied (if exists)
- `File_Attachment` or attachment-related fields (if available)

#### Fields to Create:
- `Name` - Format: `{matter_name} - {date_time}` (e.g., "Mahmudul Hassan1 - Protection Visa (Subclass 866) - 2024-01-15 14:30")
- `Message_from_Client` - The message text from client
- `Time_Sent` - Current timestamp when sending
- `Reply_Message` - Empty initially (filled when Ply Legal replies)
- `Time_Replied` - Empty initially

### 3. API Routes to Create

#### `/api/messages/fetch` (GET)
- **Purpose**: Fetch all messages for a Deal/Matter
- **Parameters**: `dealId` (query parameter)
- **Returns**: Array of message records from `Client_Messages` related list
- **Implementation**:
  ```javascript
  const zohoClient = new ZohoCRMClient();
  const fields = 'id,Name,Message_from_Client,Reply_Message,Time_Sent,Time_Replied,Created_Time,Modified_Time';
  const messages = await zohoClient.getRelatedRecords('Deals', dealId, 'Client_Messages', fields);
  ```

#### `/api/messages/create` (POST)
- **Purpose**: Create a new message in `Client_Messages` related list
- **Body**:
  ```javascript
  {
    dealId: string,
    message: string,
    attachments?: File[] // Optional file attachments
  }
  ```
- **Returns**: Created message record
- **Implementation**:
  ```javascript
  const zohoClient = new ZohoCRMClient();
  const matterName = deal.Deal_Name || deal.DealName || 'Unknown Matter';
  const dateTime = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const recordName = `${matterName} - ${dateTime}`;
  
  const messageData = {
    Name: recordName,
    Message_from_Client: message,
    Time_Sent: new Date().toISOString(),
    Reply_Message: '',
    Time_Replied: null
  };
  
  const created = await zohoClient.createRelatedRecord('Deals', dealId, 'Client_Messages', messageData);
  
  // If attachments exist, upload them
  if (attachments && attachments.length > 0) {
    for (const file of attachments) {
      await zohoClient.uploadAttachment('Client_Messages', created.id, fileBuffer, fileName, contentType);
    }
  }
  ```

#### `/api/messages/upload-attachment` (POST)
- **Purpose**: Upload file attachment to a message record
- **Body**: FormData with file
- **Parameters**: `messageId` (query parameter)
- **Implementation**: Use existing `uploadAttachment` method from `zohoClient`

---

## UI/UX Design

### Layout Structure
```
┌─────────────────────────────────────────┐
│  Header: "Send Message"                │
│  Subtitle: "Communicate securely..."   │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│                                         │
│  [Message History - Scrollable]        │
│                                         │
│  ┌─────────────────────────────────┐  │
│  │ Ply Legal                        │  │
│  │ Welcome message...               │  │
│  │ [Timestamp]                      │  │
│  └─────────────────────────────────┘  │
│                                         │
│  ┌─────────────────────────────────┐  │
│  │ You                             │  │
│  │ Client message...                │  │
│  │ [Timestamp]                     │  │
│  │ [Attachment icon if exists]     │  │
│  └─────────────────────────────────┘  │
│                                         │
│  ┌─────────────────────────────────┐  │
│  │ Ply Legal                        │  │
│  │ Reply message...                 │  │
│  │ [Timestamp]                      │  │
│  └─────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  [📎] [Message Input Box] [Send Button] │
│  [Attached Files Preview]               │
└─────────────────────────────────────────┘
```

### Message Display
- **Client Messages**: Right-aligned, different background color (e.g., blue/green)
- **Ply Legal Messages**: Left-aligned, different background color (e.g., gray/light green)
- **Timestamps**: Display `Time_Sent` for client messages, `Time_Replied` for replies
- **Attachments**: Show attachment icon/link if file exists
- **Sorting**: Sort by `Time_Sent` or `Created_Time` (oldest first)

### Input Area
- **Message Textarea**: Multi-line input at bottom
- **Attachment Button**: Paperclip icon to attach files
- **File Preview**: Show attached files before sending
- **Send Button**: Submit message and attachments
- **Loading State**: Show spinner while sending

---

## Implementation Steps

### Phase 1: API Routes Setup
1. **Create `/api/messages/fetch/route.js`**
   - Accept `dealId` as query parameter
   - Fetch messages from `Client_Messages` related list
   - Return sorted messages (oldest first)
   - Handle errors gracefully

2. **Create `/api/messages/create/route.js`**
   - Accept `dealId`, `message`, and optional `attachments`
   - Generate record name: `{matter_name} - {date_time}`
   - Create record in `Client_Messages` related list
   - Upload attachments if provided
   - Return created record

3. **Update `zohoClient.js`**
   - Add `Client_Messages` to field mapping in `getRelatedRecords` if needed
   - Ensure `createRelatedRecord` works for `Client_Messages`

### Phase 2: UI Components
1. **Message List Component**
   - Display messages in chronological order
   - Different styling for client vs. Ply Legal messages
   - Show timestamps
   - Display attachment links/icons

2. **Message Input Component**
   - Textarea for message text
   - File input for attachments
   - File preview before sending
   - Send button with loading state

3. **Main Messages Page**
   - Single column layout (full width or centered)
   - Scrollable message history area
   - Fixed input area at bottom
   - Auto-scroll to latest message

### Phase 3: Data Flow
1. **Load Messages on Mount**
   - Fetch messages from API on page load
   - Display loading state
   - Handle empty state (no messages)

2. **Send Message Flow**
   - Validate message (not empty)
   - Show loading state
   - Call create API
   - Refresh message list
   - Clear input and attachments
   - Show success/error toast

3. **Polling/Refresh** (Optional)
   - Periodically refresh messages to check for replies
   - Or add manual refresh button
   - Or use WebSocket if real-time needed (future enhancement)

### Phase 4: Error Handling
1. **API Errors**
   - Handle Zoho API errors gracefully
   - Show user-friendly error messages
   - Log errors for debugging

2. **Network Errors**
   - Retry logic for failed requests
   - Offline state handling
   - Error toasts

---

## File Structure

```
app/
  api/
    messages/
      fetch/
        route.js          # GET messages from Zoho
      create/
        route.js          # POST new message to Zoho
      upload-attachment/
        route.js          # POST file attachment
  applications/
    [id]/
      messages/
        page.js           # Main messages page (redesigned)
```

---

## Data Format Examples

### Message Record from Zoho
```json
{
  "id": "1234567890001",
  "Name": "Mahmudul Hassan1 - Protection Visa (Subclass 866) - 2024-01-15 14:30:25",
  "Message_from_Client": "Hello, I have a question about my application.",
  "Reply_Message": "Thank you for your message. We will review and respond shortly.",
  "Time_Sent": "2024-01-15T14:30:25+00:00",
  "Time_Replied": "2024-01-15T15:45:10+00:00",
  "Created_Time": "2024-01-15T14:30:25+00:00",
  "Modified_Time": "2024-01-15T15:45:10+00:00"
}
```

### Create Message Request
```json
{
  "dealId": "9876543210001",
  "message": "I need to update my address information.",
  "attachments": [] // Optional
}
```

---

## Testing Checklist

- [ ] Messages load correctly from Zoho CRM
- [ ] New messages are created in Zoho CRM
- [ ] Record name format is correct (matter name + date/time)
- [ ] All required fields are saved (Message_from_Client, Time_Sent, etc.)
- [ ] Attachments can be uploaded
- [ ] Messages display in correct order (oldest first)
- [ ] Client messages vs. Ply Legal messages are styled differently
- [ ] Timestamps display correctly
- [ ] Empty state shows when no messages
- [ ] Loading states work correctly
- [ ] Error handling works for API failures
- [ ] Message input clears after sending
- [ ] File attachments are cleared after sending

---

## Notes

1. **Record Name Format**: `{matter_name} - {YYYY-MM-DD HH:MM:SS}`
   - Example: "Mahmudul Hassan1 - Protection Visa (Subclass 866) - 2024-01-15 14:30:25"

2. **Time Fields**: 
   - `Time_Sent`: ISO 8601 format when client sends
   - `Time_Replied`: ISO 8601 format when Ply Legal replies (null if no reply yet)

3. **Attachments**: 
   - May need to check Zoho CRM field names for attachments
   - Could be separate related list or file attachment field
   - Use `uploadAttachment` method if available

4. **Bidirectional**: 
   - Client can send messages (Message_from_Client)
   - Ply Legal can reply (Reply_Message, Time_Replied)
   - UI should show both types clearly

5. **No Firebase**: 
   - All data operations go directly to Zoho CRM
   - No intermediate storage layer
   - Real-time updates would require polling or WebSocket (future)

---

## Future Enhancements (Not in Scope)

- Real-time message updates via WebSocket
- Message read receipts
- Typing indicators
- Rich text formatting
- Message search/filter
- Message deletion (if needed)




