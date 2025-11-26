import { NextResponse } from 'next/server';
import { enforceZohoApiKey, verifyZohoAccess } from '@/lib/zohoApiAuth';
import { adminAuth, db, isAdminSDKInitialized } from '@/lib/firebase-admin';

function normalizeString(value) {
  return value ? value.trim() : '';
}

export async function GET(request) {
  const apiCheck = enforceZohoApiKey(request);
  if (!apiCheck.ok) {
    return apiCheck.response;
  }

  if (!isAdminSDKInitialized() || !adminAuth || !db) {
    return NextResponse.json(
      {
        success: false,
        error: 'Firebase Admin SDK is not configured. Please add FIREBASE_SERVICE_ACCOUNT_KEY.',
      },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const email = normalizeString(searchParams.get('email')).toLowerCase();
  const zohoContactId = normalizeString(searchParams.get('zohoContactId'));
  const zohoDealId = normalizeString(searchParams.get('zohoDealId'));

  if (!email) {
    return NextResponse.json(
      { success: false, error: 'Query parameter "email" is required.' },
      { status: 400 },
    );
  }

  // SECURITY: Verify Zoho access before returning user data
  const accessCheck = await verifyZohoAccess(email, zohoContactId, zohoDealId);
  if (!accessCheck.ok) {
    return accessCheck.response;
  }

  try {
    const userRecord = await adminAuth.getUserByEmail(email);
    const profileSnap = await db.collection('users').doc(userRecord.uid).get();
    const profile = profileSnap.exists ? profileSnap.data() : null;

    return NextResponse.json({
      success: true,
      user: {
        uid: userRecord.uid,
        userId: userRecord.uid,
        email: userRecord.email,
        displayName:
          userRecord.displayName ||
          profile?.fullName ||
          profile?.name ||
          profile?.displayName ||
          null,
        phoneNumber: userRecord.phoneNumber || profile?.phoneNumber || null,
        profile,
      },
    });
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      return NextResponse.json(
        { success: false, error: `No Firebase user found for ${email}` },
        { status: 404 },
      );
    }

    console.error('❌ Error searching user by email:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to look up user by email.',
      },
      { status: 500 },
    );
  }
}


