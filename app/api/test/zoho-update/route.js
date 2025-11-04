import { NextResponse } from 'next/server';
import zohoClient from '@/lib/zohoClient';

/**
 * POST /api/test/zoho-update
 * 
 * Test endpoint to update a Zoho CRM contact
 * 
 * Body:
 * {
 *   contactId: string (required)
 *   First_Name: string
 *   Last_Name: string
 *   Email: string
 *   Phone: string
 *   Mailing_Street: string
 *   Mailing_Suburb: string
 *   Mailing_State: string
 *   Mailing_Zip: string
 *   Mailing_Country: string
 *   Description: string
 *   Last_Firebase_Sync: string (ISO timestamp)
 * }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      contactId,
      First_Name,
      Last_Name,
      Email,
      Phone,
      Mailing_Street,
      Mailing_Suburb,
      Mailing_State,
      Mailing_Zip,
      Mailing_Country,
      Description,
      Last_Firebase_Sync,
    } = body;

    if (!contactId) {
      return NextResponse.json(
        { success: false, error: 'contactId is required' },
        { status: 400 }
      );
    }

    console.log('📝 Updating Zoho contact:', contactId);

    // Prepare update data (only include fields that are provided)
    const updateData = {};
    
    if (First_Name !== undefined) updateData.First_Name = First_Name;
    if (Last_Name !== undefined) updateData.Last_Name = Last_Name;
    if (Email !== undefined) updateData.Email = Email;
    if (Phone !== undefined) updateData.Phone = Phone;
    if (Mailing_Street !== undefined) updateData.Mailing_Street = Mailing_Street;
    if (Mailing_Suburb !== undefined) updateData.Mailing_Suburb = Mailing_Suburb;
    if (Mailing_State !== undefined) updateData.Mailing_State = Mailing_State;
    if (Mailing_Zip !== undefined) updateData.Mailing_Zip = Mailing_Zip;
    if (Mailing_Country !== undefined) updateData.Mailing_Country = Mailing_Country;
    if (Description !== undefined) updateData.Description = Description;
    
    // Add timestamp if provided
    if (Last_Firebase_Sync !== undefined) {
      updateData.Last_Firebase_Sync = Last_Firebase_Sync;
    } else {
      // Auto-set timestamp if not provided
      updateData.Last_Firebase_Sync = new Date().toISOString();
    }

    console.log('📦 Update data:', JSON.stringify(updateData, null, 2));

    // Update contact using Zoho client
    const result = await zohoClient.updateRecord('Contacts', contactId, updateData);

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Update failed - no result returned' },
        { status: 500 }
      );
    }

    console.log('✅ Contact updated successfully');

    return NextResponse.json({
      success: true,
      result,
      message: 'Contact updated successfully',
    });

  } catch (error) {
    console.error('❌ Error updating Zoho contact:', error);
    
    // Extract detailed error information
    const zohoError = error.response?.data || error.details;
    const statusCode = error.status || error.response?.status || 500;
    const errorCode = error.code || zohoError?.code;
    const errorMessage = error.message || zohoError?.message || 'Failed to update contact';
    
    // Handle specific Zoho error codes
    let userFriendlyMessage = errorMessage;
    if (errorCode === 'INACTIVE_USER') {
      userFriendlyMessage = 'The Zoho user account associated with this access token is inactive. Please activate the account in Zoho CRM or use a different access token.';
    } else if (errorCode === 'INVALID_TOKEN') {
      userFriendlyMessage = 'The Zoho access token is invalid or expired. Please check your token configuration.';
    } else if (statusCode === 403) {
      userFriendlyMessage = 'Access forbidden. This may be due to insufficient permissions or an inactive user account.';
    } else if (statusCode === 401) {
      userFriendlyMessage = 'Authentication failed. Please check your Zoho access token.';
    }
    
    return NextResponse.json(
      {
        success: false,
        error: userFriendlyMessage,
        errorCode: errorCode,
        statusCode: statusCode,
        details: zohoError || null,
      },
      { status: statusCode >= 400 && statusCode < 600 ? statusCode : 500 }
    );
  }
}

