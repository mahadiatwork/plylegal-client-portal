import { NextResponse } from 'next/server';
import zohoClient from '@/lib/zohoClient';

/**
 * GET /api/test/zoho-get
 * 
 * Test endpoint to fetch a Zoho CRM contact by ID
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('contactId');

    if (!contactId) {
      return NextResponse.json(
        { success: false, error: 'contactId parameter is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Fetching Zoho contact:', contactId);

    // Get contact using Zoho client
    const contact = await zohoClient.getRecord('Contacts', contactId);

    if (!contact) {
      return NextResponse.json(
        { success: false, error: 'Contact not found' },
        { status: 404 }
      );
    }

    console.log('✅ Contact fetched successfully');

    return NextResponse.json({
      success: true,
      contact,
    });

  } catch (error) {
    console.error('❌ Error fetching Zoho contact:', error);
    
    // Extract detailed error information
    const zohoError = error.response?.data || error.details;
    const statusCode = error.status || error.response?.status || 500;
    const errorCode = error.code || zohoError?.code;
    const errorMessage = error.message || zohoError?.message || 'Failed to fetch contact';
    
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

