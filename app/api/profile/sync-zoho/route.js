import { NextResponse } from 'next/server';
import { ZohoCRMClient } from '@/lib/zohoClient';

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
    const contactData = {
      First_Name: firstName || '',
      Last_Name: lastName || '',
      Email: email,
      Phone: phone || '',
      Mailing_Street: streetAddress || '',
      Mailing_City: suburb || '',
      Mailing_State: state || '',
      Mailing_Zip: postcode || '',
      Mailing_Country: country || '',
      // Store Firebase sync timestamp for conflict resolution
      Last_Firebase_Sync: new Date().toISOString(),
    };

    // Add dependencies as a description/note (or custom field if available)
    if (dependencies && dependencies.length > 0) {
      const dependenciesText = dependencies.map((dep, index) => 
        `${index + 1}. ${dep.firstName} ${dep.lastName} - ${dep.relationship} - DOB: ${dep.dateOfBirth} - Citizenship: ${dep.citizenship}`
      ).join('\n');
      
      contactData.Description = `Dependencies:\n${dependenciesText}`;
    }

    let result;
    
    if (existingContact) {
      // Update existing contact
      console.log('📝 Updating existing contact:', existingContact.id);
      result = await zohoClient.updateRecord('Contacts', existingContact.id, contactData);
      
      return NextResponse.json({
        success: true,
        action: 'updated',
        contactId: existingContact.id,
        message: 'Contact updated successfully in Zoho CRM'
      });
    } else {
      // Create new contact
      console.log('➕ Creating new contact');
      result = await zohoClient.createRecord('Contacts', contactData);
      
      if (result?.details?.id) {
        return NextResponse.json({
          success: true,
          action: 'created',
          contactId: result.details.id,
          message: 'Contact created successfully in Zoho CRM'
        });
      } else {
        throw new Error('Failed to create contact - no ID returned');
      }
    }
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
