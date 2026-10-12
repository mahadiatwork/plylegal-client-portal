# Stores Backup - Original localStorage Implementation

This directory contains backups of the original Valtio stores that use localStorage for persistence.

## Purpose

These backups preserve the working localStorage-based implementation before migrating to Firebase. If Firebase integration has issues, you can quickly rollback to this version.

## Files Backed Up

- `authStore.backup.js` - User authentication with localStorage
- `draftStore.backup.js` - Intake form draft persistence
- `applicationsStore.backup.js` - Applications list management
- `appDataStore.backup.js` - Per-app data (tasks, messages, uploads, etc.)
- `index.backup.js` - Store exports

## Backup Date

October 27, 2025

## How to Restore

If you need to rollback to localStorage:

1. **Copy backup files to replace current stores:**
   ```bash
   cp src/stores/backup/authStore.backup.js src/stores/authStore.js
   cp src/stores/backup/draftStore.backup.js src/stores/draftStore.js
   cp src/stores/backup/applicationsStore.backup.js src/stores/applicationsStore.js
   cp src/stores/backup/appDataStore.backup.js src/stores/appDataStore.js
   cp src/stores/backup/index.backup.js src/stores/index.js
   ```

2. **Or use environment variable to switch:**
   ```bash
   # Set in .env.local
   NEXT_PUBLIC_DATABASE_TYPE=localStorage
   ```

## Current Implementation State

All stores use:
- ✅ Valtio proxy for reactive state
- ✅ localStorage for persistence
- ✅ subscribe() for auto-save
- ✅ Immutable update patterns
- ✅ Server-side rendering safe (typeof window checks)

## Data Stored

**authStore:**
- Session: `ply_session` (boolean)
- User: `ply_user` (JSON object)

**draftStore:**
- Draft data: `intake_draft` (complete form data)
- Prefill flag: `intake_prefill` (boolean)

**applicationsStore:**
- Applications list: `ply:applications` (array)

**appDataStore:**
- Per-app data: `ply:app:{appId}:{dataType}` (uploads, tasks, messages, etc.)

## Notes

- This backup was created before Firebase integration
- All 21 intake pages were working with this implementation
- E2E tests passed for all completed pages
- Design preserved exactly as specified by user
