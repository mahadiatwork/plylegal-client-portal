/**
 * Database Adapter Factory
 * 
 * Returns the appropriate database adapter based on environment configuration.
 * Allows easy switching between localStorage, Firebase, and Postgres.
 */

import { LocalStorageAdapter } from './localStorage';
import { FirebaseAdapter } from './firebase';
import { PostgresAdapter } from './postgres';

/**
 * Get the configured database type from environment
 * 
 * Priority:
 * 1. NEXT_PUBLIC_DATABASE_TYPE environment variable
 * 2. Default to 'localStorage' (current working implementation)
 */
function getDatabaseType() {
  // Check environment variable
  const envType = process.env.NEXT_PUBLIC_DATABASE_TYPE;
  
  if (envType) {
    const validTypes = ['localStorage', 'firebase', 'postgres'];
    if (validTypes.includes(envType)) {
      return envType;
    } else {
      console.warn(
        `Invalid DATABASE_TYPE: ${envType}. Valid options: ${validTypes.join(', ')}. Falling back to localStorage.`
      );
    }
  }
  
  // Default to localStorage (current working implementation)
  return 'localStorage';
}

/**
 * Create and return the appropriate database adapter instance
 */
export function createAdapter() {
  const dbType = getDatabaseType();
  
  console.log(`📦 Using database adapter: ${dbType}`);
  
  switch (dbType) {
    case 'localStorage':
      return new LocalStorageAdapter();
    
    case 'firebase':
      try {
        return new FirebaseAdapter();
      } catch (error) {
        console.error('Firebase adapter failed to initialize:', error);
        console.warn('Falling back to localStorage adapter');
        return new LocalStorageAdapter();
      }
    
    case 'postgres':
      try {
        return new PostgresAdapter();
      } catch (error) {
        console.error('Postgres adapter failed to initialize:', error);
        console.warn('Falling back to localStorage adapter');
        return new LocalStorageAdapter();
      }
    
    default:
      console.warn(`Unknown database type: ${dbType}. Using localStorage.`);
      return new LocalStorageAdapter();
  }
}

/**
 * Singleton instance - create adapter only once
 */
let adapterInstance = null;

export function getAdapter() {
  if (!adapterInstance) {
    adapterInstance = createAdapter();
  }
  return adapterInstance;
}

/**
 * Reset adapter instance (useful for testing or switching databases)
 */
export function resetAdapter() {
  adapterInstance = null;
}
