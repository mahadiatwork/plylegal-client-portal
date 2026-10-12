<!-- e90d87a2-497f-40ce-8187-6714421dbec6 d78b096f-19bb-41a0-b419-061e95355710 -->
# Zoho Chat Integration Plan

## Scope

- Leave existing chat feature untouched; introduce new components/services alongside current code.
- Embed the provided Zoho Form on the chat view’s right pane, passing the active matter/deal ID via query string.
- Sync Zoho CRM chat records into Firebase and read from there for display (read/write-aside pattern).

## Steps

1. **Add Zoho Form Embed**  

- Create a new UI component (e.g., [`frontend/src/components/chat/ZohoChatForm.tsx`](frontend/src/components/chat/ZohoChatForm.tsx)) that renders the Zoho form via an iframe with responsive sizing, loading fallback, and automatic `matter_id` injection in the URL (e.g., `https://forms.zohopublic.com.au/.../formperma/...?...matter_id=<currentId>`).  
- Update the chat page layout (likely [`frontend/src/pages/chat/index.tsx`](frontend/src/pages/chat/index.tsx) or equivalent) to render this component in the right-side column without removing existing chat UI.

2. **Firebase Mirror Setup**  

- Create a new backend or shared service file (e.g., [`backend/services/zohoChatSync.ts`](backend/services/zohoChatSync.ts)) that listens for Zoho CRM webhook updates (or scheduled pulls) and writes normalized chat records into Firebase (Firestore/RTDB).  
- Document required Firebase collections/paths (e.g., `firebase/zohoChats/{recordId}`) and configure security rules as needed.

3. **Chat Data Reader**  

- Build a new Firebase data-access module (e.g., [`frontend/src/services/firebaseZohoChats.ts`](frontend/src/services/firebaseZohoChats.ts)) that subscribes to the mirrored chat collection, returning structured messages for the UI.  
- Integrate this reader into a fresh chat view component (e.g., [`frontend/src/components/chat/ZohoChatFeed.tsx`](frontend/src/components/chat/ZohoChatFeed.tsx)), ensuring filter/sort parity with current chat feature if required.

4. **Configuration & Docs**  

- Add environment variables/placeholders for Zoho/Firebase credentials in `.env.example` and related config files.  
- Update project documentation (`README` or dedicated `docs/chat-sync.md`) with setup instructions, data flow diagrams, and rollback guidance so the old chat can be re-enabled easily.

## Todos

- `embed-form`: Implement Zoho form iframe component and integrate into chat layout.
- `firebase-sync`: Create Zoho→Firebase sync service and document webhook/cron wiring.
- `firebase-reader`: Implement Firebase reader + UI to display mirrored chat messages.
- `config-docs`: Add env config samples and documentation for the new flow.