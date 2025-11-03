import { NextResponse } from 'next/server';
import { adminAuth, db } from '@/lib/firebase-admin';

/**
 * POST /api/admin/create-user
 * 
 * Creates a Firebase user with temp password from Zoho CRM workflow.
 * Called by Zoho when a new contact is created.
 * 
 * Expected body:
 * {
 *   email: string (required)
 *   tempPassword: string (required)
 *   firstName: string
 *   lastName: string
 *   phone: string
 *   mobile: string
 *   mailingStreet: string
 *   mailingCity: string
 *   mailingState: string
 *   mailingZip: string
 *   mailingCountry: string
 *   zohoContactId: string
 * }
 */
export async function POST(request) {
  try {
    // Security: Validate shared secret from Zoho webhook
    const authHeader = request.headers.get('Authorization');
    const expectedSecret = process.env.ZOHO_WEBHOOK_SECRET;
    
    if (expectedSecret && (!authHeader || authHeader !== `Bearer ${expectedSecret}`)) {
      console.error('❌ Unauthorized request to create-user endpoint');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { 
      email, 
      tempPassword,
      firstName,
      lastName,
      phone,
      mobile,
      mailingStreet,
      mailingCity,
      mailingState,
      mailingZip,
      mailingCountry,
      zohoContactId
    } = body;

    // Validate required fields
    if (!email || !tempPassword) {
      return NextResponse.json(
        { error: 'Email and tempPassword are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    console.log('🔐 Creating Firebase user from Zoho:', email);

    // Check if user already exists
    let userRecord;
    try {
      userRecord = await adminAuth.getUserByEmail(email);
      console.log('⚠️ User already exists:', userRecord.uid);
      
      // User exists - update their profile with Zoho data (using Admin SDK)
      const userRef = db.collection('users').doc(userRecord.uid);
      await userRef.set({
        email,
        firstName: firstName || '',
        lastName: lastName || '',
        fullName: `${firstName || ''} ${lastName || ''}`.trim(),
        phone: phone || mobile || '',
        mobile: mobile || '',
        mailingStreet: mailingStreet || '',
        mailingCity: mailingCity || '',
        mailingState: mailingState || '',
        mailingZip: mailingZip || '',
        mailingCountry: mailingCountry || '',
        zohoContactId: zohoContactId || '',
        zohoSyncedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Don't set needsPasswordChange for existing users
      }, { merge: true });

      return NextResponse.json({
        success: true,
        message: 'User already exists, profile updated',
        userId: userRecord.uid,
        isNewUser: false
      });
    } catch (error) {
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
      // User doesn't exist, proceed to create
    }

    // Create new Firebase Auth user with temp password
    userRecord = await adminAuth.createUser({
      email,
      password: tempPassword,
      emailVerified: false, // Force them to verify
      displayName: `${firstName || ''} ${lastName || ''}`.trim() || email.split('@')[0],
    });

    console.log('✅ Firebase user created:', userRecord.uid);

    // Create user profile in Firestore with Zoho data (using Admin SDK)
    const userRef = db.collection('users').doc(userRecord.uid);
    await userRef.set({
      email,
      firstName: firstName || '',
      lastName: lastName || '',
      fullName: `${firstName || ''} ${lastName || ''}`.trim(),
      phone: phone || mobile || '',
      mobile: mobile || '',
      mailingStreet: mailingStreet || '',
      mailingCity: mailingCity || '',
      mailingState: mailingState || '',
      mailingZip: mailingZip || '',
      mailingCountry: mailingCountry || '',
      zohoContactId: zohoContactId || '',
      
      // Metadata flags
      needsPasswordChange: true, // Force password change on first login
      profileCompleted: false,
      zohoSyncedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    console.log('✅ User profile created in Firestore');

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      userId: userRecord.uid,
      isNewUser: true,
      needsPasswordChange: true
    });

  } catch (error) {
    console.error('❌ Error creating user from Zoho:', error);
    
    // Handle specific Firebase errors
    if (error.code === 'auth/email-already-exists') {
      return NextResponse.json(
        { error: 'Email already in use' },
        { status: 409 }
      );
    }
    
    if (error.code === 'auth/invalid-password') {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create user' },
      { status: 500 }
    );
  }
}
