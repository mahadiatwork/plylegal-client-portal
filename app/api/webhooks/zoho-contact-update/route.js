import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

/**
 * POST /api/webhooks/zoho-contact-update
 * 
 * Webhook called by Zoho CRM when a contact is updated.
 * Syncs changes from Zoho CRM to Firebase.
 * 
 * Expected body:
 * {
 *   contactId: string (Zoho Contact ID)
 *   email: string
 *   firstName: string
 *   lastName: string
 *   phone: string
 *   mobile: string
 *   mailingStreet: string
 *   mailingCity: string
 *   mailingState: string
 *   mailingZip: string
 *   mailingCountry: string
 *   dependencies: string (formatted text from Description field)
 *   lastFirebaseSync: string (ISO timestamp from Zoho's Last_Firebase_Sync field)
 * }
 */
export async function POST(request) {
  try {
    // Security: Validate shared secret from Zoho webhook
    const authHeader = request.headers.get('Authorization');
    const expectedSecret = process.env.ZOHO_WEBHOOK_SECRET;
    
    if (expectedSecret && (!authHeader || authHeader !== `Bearer ${expectedSecret}`)) {
      console.error('❌ Unauthorized request to zoho-contact-update endpoint');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const {
      contactId,
      email,
      firstName,
      lastName,
      phone,
      mobile,
      mailingStreet,
      mailingCity,
      mailingState,
      mailingZip,
      mailingCountry,
      dependencies,
      lastFirebaseSync, // Zoho's Last_Firebase_Sync timestamp
    } = body;

    console.log('🔄 Zoho webhook received for contact:', contactId);

    // Validate required fields
    if (!contactId || !email) {
      return NextResponse.json(
        { error: 'contactId and email are required' },
        { status: 400 }
      );
    }

    // Find user by Zoho contact ID (using Admin SDK)
    const usersRef = db.collection('users');
    const querySnapshot = await usersRef.where('zohoContactId', '==', contactId).get();

    if (querySnapshot.empty) {
      console.log('⚠️ No user found with Zoho contact ID:', contactId);
      return NextResponse.json(
        { error: 'User not found with this Zoho contact ID' },
        { status: 404 }
      );
    }

    // Get the first matching user (should only be one)
    const userDoc = querySnapshot.docs[0];
    const userId = userDoc.id;

    console.log('✅ Found user:', userId, 'for Zoho contact:', contactId);

    // Parse dependencies from formatted text
    let dependenciesArray = [];
    if (dependencies) {
      try {
        // Dependencies are stored as formatted text like:
        // "1. John Doe (Spouse, DOB: 1990-01-15, Citizenship: USA)\n2. Jane Doe (Child, DOB: 2015-05-20, Citizenship: USA)"
        const lines = dependencies.split('\n').filter(line => line.trim());
        dependenciesArray = lines.map(line => {
          // Extract data using regex
          const nameMatch = line.match(/\d+\.\s*(.+?)\s*\(/);
          const relationMatch = line.match(/\(([^,]+)/);
          const dobMatch = line.match(/DOB:\s*([^,]+)/);
          const citizenshipMatch = line.match(/Citizenship:\s*([^)]+)/);

          return {
            firstName: nameMatch ? nameMatch[1].split(' ')[0] : '',
            lastName: nameMatch ? nameMatch[1].split(' ').slice(1).join(' ') : '',
            relationship: relationMatch ? relationMatch[1].trim() : '',
            dateOfBirth: dobMatch ? dobMatch[1].trim() : '',
            citizenship: citizenshipMatch ? citizenshipMatch[1].trim() : '',
          };
        });
      } catch (parseError) {
        console.error('❌ Error parsing dependencies:', parseError);
      }
    }

    // Get current user data for timestamp comparison
    const userRef = db.collection('users').doc(userId);
    const userSnapshot = await userRef.get();
    const currentData = userSnapshot.data() || {};

    // Implement last-write-wins: Compare Zoho's last Firebase sync with current Firebase timestamp
    // If Zoho's lastFirebaseSync is provided and is older than current Firebase updatedAt,
    // it means Firebase has made changes since Zoho last saw them - reject this update
    if (lastFirebaseSync) {
      const zohoKnowsAbout = new Date(lastFirebaseSync);
      const firebaseLastUpdated = currentData.updatedAt ? new Date(currentData.updatedAt) : new Date(0);
      
      // If Firebase was updated AFTER Zoho's last sync, Firebase has newer local changes
      if (firebaseLastUpdated > zohoKnowsAbout) {
        console.log('⚠️ Skipping Zoho update - Firebase has changes since Zoho last synced');
        console.log(`  Zoho knows about: ${zohoKnowsAbout.toISOString()}`);
        console.log(`  Firebase updated: ${firebaseLastUpdated.toISOString()}`);
        return NextResponse.json({
          success: true,
          skipped: true,
          reason: 'Firebase has newer data - conflict detected',
          firebaseTimestamp: firebaseLastUpdated.toISOString(),
          zohoTimestamp: zohoKnowsAbout.toISOString()
        });
      }
    }

    // Update user profile in Firestore (using Admin SDK)
    const updateTimestamp = new Date().toISOString();
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
      dependencies: dependenciesArray,
      
      // Metadata
      zohoContactId: contactId,
      zohoSyncedAt: updateTimestamp,
      syncSource: 'zoho', // Flag to prevent infinite loop
      updatedAt: updateTimestamp,
    }, { merge: true });

    console.log('✅ User profile synced from Zoho to Firebase');

    return NextResponse.json({
      success: true,
      message: 'Contact synced successfully',
      userId,
    });

  } catch (error) {
    console.error('❌ Error syncing Zoho contact to Firebase:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync contact' },
      { status: 500 }
    );
  }
}
