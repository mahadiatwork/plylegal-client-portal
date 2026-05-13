import { getAdminAuth, getDb } from '@/lib/firebase-admin';

export async function verifyAuth(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authenticated: false, error: 'Missing or invalid Authorization header' };
  }

  const idToken = authHeader.split('Bearer ')[1];
  if (!idToken) {
    return { authenticated: false, error: 'Missing token' };
  }

  const authResult = getAdminAuth();
  if (!authResult.ok) {
    console.error('verifyAuth: Firebase Auth unavailable:', authResult.error);
    return { authenticated: false, error: 'Server configuration error' };
  }
  const adminAuth = authResult.adminAuth;

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    const dbResult = getDb();
    if (!dbResult.ok) {
      console.error('verifyAuth: Firestore unavailable:', dbResult.error);
      return { authenticated: false, error: 'Server configuration error' };
    }
    const db = dbResult.db;

    const userDoc = await db.collection('users').doc(uid).get();
    const profile = userDoc.exists ? userDoc.data() : null;
    const role = profile?.role || 'client';

    return {
      authenticated: true,
      uid,
      email: decoded.email,
      role,
      profile,
    };
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return { authenticated: false, error: 'Invalid or expired token' };
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
