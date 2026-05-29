import { NextResponse } from 'next/server';
import { ZohoCRMClient } from '@/lib/zohoClient';
import { getAdapter } from '@/lib/adapters';

function summarizeZohoContact(contact) {
  if (!contact) return null;
  return {
    id: contact.id,
    First_Name: contact.First_Name,
    Last_Name: contact.Last_Name,
    Email: contact.Email,
    Phone: contact.Phone,
    Mobile: contact.Mobile,
    Mailing_Street: contact.Mailing_Street,
    Mailing_Suburb: contact.Mailing_Suburb,
    Mailing_State: contact.Mailing_State,
    Pick_List_1: contact.Pick_List_1,
    Mailing_Zip: contact.Mailing_Zip,
    Mailing_Country: contact.Mailing_Country,
  };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const userId = searchParams.get('userId');

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    const db = getAdapter();
    let profile = null;
    
    if (userId) {
      profile = await db.getUserProfile(userId);
    }

    // Check Zoho CRM for contact
    const zohoClient = new ZohoCRMClient();
    let zohoContact = null;
    let zohoContacts = [];
    let zohoError = null;
    
    try {
      console.log('🔍 Debug: Searching Zoho for email:', email);
      zohoContacts = await zohoClient.findContactsByEmail(email);
      zohoContact = zohoContacts[0] || null;
      console.log(`📋 Debug: Zoho contact match count for ${email}: ${zohoContacts.length}`);
      
      if (zohoContact) {
        console.log('✅ Debug: Zoho contact found:', zohoContact.id);
        console.log('📦 Debug: Raw Zoho contact data:', JSON.stringify(zohoContact, null, 2));
      } else {
        console.log('📭 Debug: No Zoho contact found');
      }
    } catch (error) {
      console.error('❌ Debug: Zoho search error:', error);
      zohoError = {
        message: error.message,
        code: error.code,
        details: error.response?.data || error.details,
      };
    }

    // Map what the profile data should look like
    let mappedData = null;
    if (zohoContact) {
      mappedData = {
        firstName: zohoContact.First_Name || '',
        lastName: zohoContact.Last_Name || '',
        phone: zohoContact.Phone || zohoContact.Mobile || '',
        mobile: zohoContact.Mobile || '',
        streetAddress: zohoContact.Mailing_Street || '',
        suburb: zohoContact.Mailing_Suburb || '',
        // Mailing_State might be null, check Pick_List_1 as fallback (custom field for state)
        state: zohoContact.Mailing_State || zohoContact.Pick_List_1 || '',
        postcode: zohoContact.Mailing_Zip || '',
        country: zohoContact.Mailing_Country || '',
        zohoContactId: zohoContact.id,
      };
    }

    // Compare profile with mapped data
    let mappingStatus = {
      fieldsMatch: {},
      hasIssues: false,
    };

    if (zohoContact && profile) {
      mappingStatus = {
        firstName: {
          zoho: zohoContact.First_Name,
          mapped: mappedData.firstName,
          profile: profile.firstName,
          match: mappedData.firstName === profile.firstName,
        },
        lastName: {
          zoho: zohoContact.Last_Name,
          mapped: mappedData.lastName,
          profile: profile.lastName,
          match: mappedData.lastName === profile.lastName,
        },
        phone: {
          zoho: zohoContact.Phone || zohoContact.Mobile,
          mapped: mappedData.phone,
          profile: profile.phone,
          match: mappedData.phone === profile.phone,
        },
        streetAddress: {
          zoho: zohoContact.Mailing_Street,
          mapped: mappedData.streetAddress,
          profile: profile.streetAddress,
          match: mappedData.streetAddress === profile.streetAddress,
        },
        suburb: {
          zoho: zohoContact.Mailing_Suburb,
          mapped: mappedData.suburb,
          profile: profile.suburb,
          match: mappedData.suburb === profile.suburb,
        },
        state: {
          zoho: zohoContact.Mailing_State || zohoContact.Pick_List_1 || '(empty)',
          zohoFallback: zohoContact.Pick_List_1 || null,
          mapped: mappedData.state,
          profile: profile.state,
          match: mappedData.state === profile.state,
        },
        postcode: {
          zoho: zohoContact.Mailing_Zip,
          mapped: mappedData.postcode,
          profile: profile.postcode,
          match: mappedData.postcode === profile.postcode,
        },
        country: {
          zoho: zohoContact.Mailing_Country,
          mapped: mappedData.country,
          profile: profile.country,
          match: mappedData.country === profile.country,
        },
      };

      mappingStatus.hasIssues = Object.values(mappingStatus).some(
        field => field && typeof field === 'object' && 'match' in field && !field.match
      );
    }

    return NextResponse.json({
      success: true,
      email: email,
      zohoContactFound: !!zohoContact,
      zohoContactMatchCount: zohoContacts.length,
      duplicateEmailMatches: zohoContacts.length > 1,
      zohoContacts: zohoContacts.map((contact) => summarizeZohoContact(contact)),
      zohoContact: summarizeZohoContact(zohoContact),
      zohoError: zohoError,
      mappedData: mappedData,
      profile: profile ? {
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
        streetAddress: profile.streetAddress,
        suburb: profile.suburb,
        state: profile.state,
        postcode: profile.postcode,
        country: profile.country,
        zohoContactId: profile.zohoContactId,
        profileCompleted: profile.profileCompleted,
      } : null,
      mappingStatus: mappingStatus,
      rawZohoData: zohoContact, // Full raw data for debugging
      rawZohoContacts: zohoContacts,
    });
  } catch (error) {
    console.error('❌ Error checking Zoho population status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to check status',
      },
      { status: 500 }
    );
  }
}

