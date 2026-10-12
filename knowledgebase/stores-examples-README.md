# Store Examples - Adapter Pattern

This directory contains **example implementations** showing how to update the Valtio stores to use the database adapter pattern.

## ⚠️ Important

**These files are NOT currently in use.** They are examples for future migration.

The current working stores are in `src/stores/*.js` and use localStorage directly.

## Purpose

These examples show how stores would be updated to work with any database backend (localStorage, Firebase, or Postgres) through the adapter interface.

## Migration Path

When you're ready to use adapters:

### Option 1: Keep Current Implementation (Recommended for now)

```bash
# Current stores work perfectly, no changes needed
# Database adapter system exists but is not required
```

### Option 2: Migrate to Adapters (Future)

1. **Backup current stores** (already done in `src/stores/backup/`)

2. **Update each store file:**
   ```bash
   # Example: Update authStore
   cp src/stores/examples/authStore.adapter.example.js src/stores/authStore.js
   ```

3. **Configure database type in .env.local:**
   ```bash
   NEXT_PUBLIC_DATABASE_TYPE=localStorage  # or firebase, or postgres
   ```

4. **Test thoroughly:**
   - All auth flows (login/logout)
   - Draft persistence
   - Application management
   - App data (tasks, messages, etc.)

5. **Switch to Firebase when ready:**
   ```bash
   # Install Firebase
   npm install firebase
   
   # Configure Firebase in .env.local
   NEXT_PUBLIC_DATABASE_TYPE=firebase
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   # etc.
   
   # Implement Firebase adapter methods (currently stubs)
   # See src/lib/adapters/firebase.js
   ```

## What's Different in Adapter Version?

### Old Way (Current):
```javascript
// Direct localStorage calls in store
if (typeof window !== "undefined") {
  subscribe(authStore, () => {
    localStorage.setItem(SESSION_KEY, "true");
    localStorage.setItem(USER_KEY, JSON.stringify(authStore.user));
  });
}
```

### New Way (Adapter):
```javascript
// Adapter handles all persistence
import { getAdapter } from "@/lib/adapters";
const db = getAdapter();

async login(credentials) {
  const result = await db.login(credentials);
  if (result.success) {
    this.user = result.user;
    this.isAuthenticated = true;
  }
}
```

## Benefits of Adapter Pattern

1. **Easy Database Switching** - Change one env var to switch databases
2. **Real-time Sync** - Firebase adapter provides automatic real-time updates
3. **Better Testing** - Can mock database adapter for tests
4. **Future-Proof** - Easy to add new database backends (Supabase, etc.)
5. **Rollback Safety** - Can switch back to localStorage instantly

## Files in this Directory

- `authStore.adapter.example.js` - Auth with any database
- `draftStore.adapter.example.js` - Draft persistence with any database
- `README.md` - This file

## Current Status

✅ Adapter system created and ready to use
✅ localStorage adapter fully implemented
⏳ Firebase adapter is a stub (needs implementation)
⏳ Postgres adapter is a stub (needs implementation)
✅ Current stores use localStorage directly (working perfectly)

## Recommendation

**For now, keep using the current localStorage stores.** They work perfectly and have been thoroughly tested.

Use the adapter system when:
- You're ready to implement Firebase
- You need real-time sync
- You want to try Postgres
- You need multi-database support

The adapter system is there when you need it, but there's no rush to migrate!
