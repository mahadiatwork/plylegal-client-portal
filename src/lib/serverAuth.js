import { getAdminAuth, getDb } from '@/lib/firebase-admin';

export function getBearerToken(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice('Bearer '.length).trim() || null;
}

export async function verifyFirebaseIdentity(request) {
  const idToken = getBearerToken(request);
  if (!idToken) {
    return { authenticated: false, error: 'Missing or invalid Authorization header' };
  }

  const authResult = getAdminAuth();
  if (!authResult.ok) {
    console.error('verifyFirebaseIdentity: Firebase Auth unavailable:', authResult.error);
    return { authenticated: false, error: 'Server configuration error' };
  }

  try {
    const decoded = await authResult.adminAuth.verifyIdToken(idToken);
    return {
      authenticated: true,
      uid: decoded.uid,
      email: decoded.email,
      role: 'client',
      profile: null,
    };
  } catch (error) {
    console.error('Firebase ID token verification failed:', error.message);
    return { authenticated: false, error: 'Invalid or expired token' };
  }
}

export async function verifyAuth(request) {
  const identity = await verifyFirebaseIdentity(request);
  if (!identity.authenticated) return identity;

  try {
    const dbResult = getDb();
    if (!dbResult.ok) {
      console.error('verifyAuth: Firestore unavailable:', dbResult.error);
      return { authenticated: false, error: 'Server configuration error' };
    }
    const db = dbResult.db;

    const userDoc = await db.collection('users').doc(identity.uid).get();
    const profile = userDoc.exists ? userDoc.data() : null;
    const role = profile?.role || 'client';

    return {
      ...identity,
      role,
      profile,
    };
  } catch (error) {
    console.error('Firebase user profile lookup failed:', error.message);
    return { authenticated: false, error: 'Unable to load user profile' };
  }
}

export function requireClient(auth) {
  if (!auth.authenticated) {
    return { authorized: false, status: 401, error: 'Authentication required' };
  }
  return { authorized: true };
}

export function requireAdmin(auth) {
  if (!auth.authenticated) {
    return { authorized: false, status: 401, error: 'Authentication required' };
  }
  if (auth.role !== 'admin') {
    return { authorized: false, status: 403, error: 'Admin access required' };
  }
  return { authorized: true };
}

export function verifyAdminKey(request) {
  const adminKey = request.headers.get('x-admin-key') || request.headers.get('X-Admin-Key');
  const expectedKey = process.env.PORTAL_ADMIN_KEY;

  if (!expectedKey) {
    console.error('verifyAdminKey: PORTAL_ADMIN_KEY not configured');
    return { authenticated: false, error: 'Server configuration error' };
  }

  if (!adminKey || adminKey !== expectedKey) {
    return { authenticated: false, error: 'Invalid admin key' };
  }

  return { authenticated: true };
}
