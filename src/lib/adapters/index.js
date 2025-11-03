/**
 * Database Adapters
 * 
 * Provides abstraction layer for different database backends:
 * - localStorage (current/default)
 * - Firebase (planned)
 * - PostgreSQL with Drizzle (fallback)
 * 
 * Usage:
 * ```javascript
 * import { getAdapter } from '@/lib/adapters';
 * 
 * const db = getAdapter();
 * await db.login(credentials);
 * await db.saveDraft(data);
 * ```
 * 
 * Configuration:
 * Set NEXT_PUBLIC_DATABASE_TYPE in .env.local:
 * - "localStorage" (default)
 * - "firebase"
 * - "postgres"
 */

export { BaseAdapter } from './base';
export { LocalStorageAdapter } from './localStorage';
export { FirebaseAdapter } from './firebase';
export { PostgresAdapter } from './postgres';
export { getAdapter, createAdapter, resetAdapter } from './factory';
