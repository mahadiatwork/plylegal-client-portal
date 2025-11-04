import { NextResponse } from 'next/server';
import { ZohoCRMClient } from '@/lib/zohoClient';
import { getAdapter } from '@/lib/adapters';

export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      userId,
      email, 
      firstName, 
      lastName, 
      phone, 
      streetAddress, 
      suburb, 
      state, 
      postcode, 
      country, 
      dependencies,
      syncSource // Track where the update came from to prevent loops
    } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    // Prevent infinite loop: If this update came from Zoho, don't sync back
    if (syncSource === 'zoho') {
      console.log('⚠️ Skipping Zoho sync - update came from Zoho webhook');
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'Update originated from Zoho CRM'
      });
    }

    const zohoClient = new ZohoCRMClient();

    // Search for existing contact by email
    console.log('🔍 Searching for contact with email:', email);
    const existingContact = await zohoClient.findContactByEmail(email);

    // Prepare contact data for Zoho CRM with timestamp
    // Only include fields that have values (Zoho may reject empty strings for some fields)
    const contactData = {
      First_Name: firstName || '',
      Last_Name: lastName || '',
      Email: email,
      Phone: phone || '',
      Mailing_Street: streetAddress || '',
      Mailing_Suburb: suburb || '',
      Mailing_State: state || '', // Use Mailing_State as per Zoho CRM API
      Mailing_Zip: postcode || '',
      Mailing_Country: country || '',
      // Store Firebase sync timestamp for conflict resolution
      Last_Firebase_Sync: new Date().toISOString(),
    };
    
    // Log the data being sent for debugging
    console.log('📦 Contact data being sent to Zoho:', JSON.stringify(contactData, null, 2));
    console.log('📍 State value:', state, '→ Mailing_State:', contactData.Mailing_State);

    let contactId;
    let action;
    
    if (existingContact) {
      // Update existing contact
      console.log('📝 Updating existing contact:', existingContact.id);
      await zohoClient.updateRecord('Contacts', existingContact.id, contactData);
      contactId = existingContact.id;
      action = 'updated';
    } else {
      // Create new contact
      console.log('➕ Creating new contact');
      const result = await zohoClient.createRecord('Contacts', contactData);
      
      // Extract contact ID from result (v7 API returns { data: [{ id: "...", ... }] })
      if (result?.id) {
        contactId = result.id;
      } else if (result?.details?.id) {
        contactId = result.details.id;
      } else {
        throw new Error('Failed to create contact - no ID returned');
      }
      action = 'created';
    }

    // Sync dependencies to Partner_Dependents related list
    if (contactId && dependencies && dependencies.length > 0) {
      try {
        console.log(`🔄 Syncing ${dependencies.length} dependencies to Partner_Dependents related list`);
        await zohoClient.syncDependencies(contactId, dependencies);
        console.log('✅ Dependencies synced successfully');
      } catch (depError) {
        console.error('⚠️ Failed to sync dependencies to related list (non-critical):', depError.message);
        // Don't fail the whole sync if dependencies fail - log and continue
      }
    } else if (contactId && (!dependencies || dependencies.length === 0)) {
      // If no dependencies provided, clear existing ones
      try {
        console.log('🔄 Clearing existing dependencies (none provided)');
        await zohoClient.syncDependencies(contactId, []);
      } catch (depError) {
        console.error('⚠️ Failed to clear dependencies (non-critical):', depError.message);
      }
    }

    // Store contactId in Firebase profile if userId is provided
    if (userId && contactId) {
      try {
        const db = getAdapter();
        await db.updateUserProfile(userId, {
          zohoContactId: contactId,
          zohoLastSyncedAt: new Date().toISOString(),
        });
        console.log('✅ Stored zohoContactId in Firebase profile:', contactId);
      } catch (profileError) {
        console.error('⚠️ Failed to store zohoContactId in profile (non-critical):', profileError);
        // Don't fail the whole sync if profile update fails
      }
    }
    
    return NextResponse.json({
      success: true,
      action: action,
      contactId: contactId,
      message: `Contact ${action} successfully in Zoho CRM`
    });
  } catch (error) {
    console.error('❌ Error syncing to Zoho CRM:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to sync with Zoho CRM',
        details: error.response?.data || null
      },
      { status: 500 }
    );
  }
}
