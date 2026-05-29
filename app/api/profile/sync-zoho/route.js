import { NextResponse } from 'next/server';
import { ZohoCRMClient } from '@/lib/zohoClient';
import { getAdapter } from '@/lib/adapters';

const hasField = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

function normalizeMonthValue(monthInput) {
  const monthMap = {
    january: '01',
    february: '02',
    march: '03',
    april: '04',
    may: '05',
    june: '06',
    july: '07',
    august: '08',
    september: '09',
    october: '10',
    november: '11',
    december: '12',
  };

  const monthText = String(monthInput || '').trim();
  if (!monthText) return '';
  if (monthMap[monthText.toLowerCase()]) return monthMap[monthText.toLowerCase()];
  if (Number.isFinite(Number(monthText))) return String(Number(monthText)).padStart(2, '0');
  return '';
}

function normalizeDateFromParts(dayInput, monthInput, yearInput) {
  const year = String(yearInput || '').trim();
  const day = String(dayInput || '').trim();
  const month = normalizeMonthValue(monthInput);
  if (!year || !month || !day || !Number.isFinite(Number(day))) return '';
  return `${year}-${month}-${String(Number(day)).padStart(2, '0')}`;
}

function normalizeDateOfBirth(value) {
  if (value === null || value === undefined) return '';
  const raw = typeof value?.toDate === 'function' ? value.toDate() : value;

  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return normalizeDateFromParts(raw.getDate(), raw.getMonth() + 1, raw.getFullYear());
  }

  const text = String(raw).trim();
  if (!text) return '';

  const isoMatch = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    return normalizeDateFromParts(isoMatch[3], isoMatch[2], isoMatch[1]);
  }

  const shortDateMatch = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (shortDateMatch) {
    const first = Number(shortDateMatch[1]);
    const second = Number(shortDateMatch[2]);
    const day = first > 12 ? shortDateMatch[1] : (second > 12 ? shortDateMatch[2] : shortDateMatch[1]);
    const month = first > 12 ? shortDateMatch[2] : (second > 12 ? shortDateMatch[1] : shortDateMatch[2]);
    return normalizeDateFromParts(day, month, shortDateMatch[3]);
  }

  return '';
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      userId,
      contactId,
      email, 
      firstName, 
      lastName, 
      phone, 
      streetAddress, 
      suburb, 
      state, 
      postcode, 
      country, 
      gender,
      dateOfBirth,
      birthDay,
      birthMonth,
      birthYear,
      dependencies,
      syncSource // Track where the update came from to prevent loops
    } = body;

    if (!email && !contactId) {
      return NextResponse.json(
        { success: false, error: 'Email or contactId is required' },
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

    // Search for existing contact by contactId first, then fallback to email
    let existingContact = null;
    if (contactId) {
      console.log('🔍 Fetching contact by ID:', contactId);
      existingContact = await zohoClient.getRecord('Contacts', contactId);
    }
    if (!existingContact && email) {
      console.log('🔍 Searching for contact with email:', email);
      existingContact = await zohoClient.findContactByEmail(email);
    }

    let normalizedDob;
    if (hasField(body, 'dateOfBirth')) {
      normalizedDob = normalizeDateOfBirth(dateOfBirth);
    } else if (hasField(body, 'birthDay') || hasField(body, 'birthMonth') || hasField(body, 'birthYear')) {
      normalizedDob = normalizeDateFromParts(birthDay, birthMonth, birthYear);
    }

    // Prepare contact data for Zoho CRM as a safe partial update
    // (only fields provided in request payload are sent)
    const contactData = {};
    if (hasField(body, 'firstName')) contactData.First_Name = firstName || '';
    if (hasField(body, 'lastName')) contactData.Last_Name = lastName || '';
    if (hasField(body, 'phone')) contactData.Phone = phone || '';
    if (hasField(body, 'streetAddress')) contactData.Mailing_Street = streetAddress || '';
    if (hasField(body, 'suburb')) contactData.Mailing_Suburb = suburb || '';
    if (hasField(body, 'state')) contactData.Mailing_State = state || '';
    if (hasField(body, 'postcode')) contactData.Mailing_Zip = postcode || '';
    if (hasField(body, 'country')) contactData.Mailing_Country = country || '';
    if (hasField(body, 'email') && email) contactData.Email = email;
    if (hasField(body, 'gender')) contactData.Gender = gender || '';
    if (normalizedDob !== undefined) contactData.Date_of_Birth = normalizedDob;

    // Store Firebase sync timestamp for conflict resolution
    contactData.Last_Firebase_Sync = new Date().toISOString();
    
    // Log the data being sent for debugging
    console.log('📦 Contact data being sent to Zoho:', JSON.stringify(contactData, null, 2));
    console.log('📍 State value:', state, '→ Mailing_State:', contactData.Mailing_State);

    let syncedContactId;
    let action;
    
    if (existingContact) {
      // Update existing contact
      console.log('📝 Updating existing contact:', existingContact.id);
      await zohoClient.updateRecord('Contacts', existingContact.id, contactData);
      syncedContactId = existingContact.id;
      action = 'updated';
    } else {
      if (!email) {
        return NextResponse.json(
          { success: false, error: 'Email is required to create a new contact' },
          { status: 400 }
        );
      }

      // Create new contact
      console.log('➕ Creating new contact');
      const result = await zohoClient.createRecord('Contacts', contactData);
      
      // Extract contact ID from result (v7 API returns { data: [{ id: "...", ... }] })
      if (result?.id) {
        syncedContactId = result.id;
      } else if (result?.details?.id) {
        syncedContactId = result.details.id;
      } else {
        throw new Error('Failed to create contact - no ID returned');
      }
      action = 'created';
    }

    // Sync dependencies to Partner_Dependents related list
    let dependencySyncSummary = null;
    if (syncedContactId && Array.isArray(dependencies)) {
      try {
        console.log(`🔄 Syncing ${dependencies.length} dependencies to Partner_Dependents related list`);
        dependencySyncSummary = await zohoClient.syncDependencies(syncedContactId, dependencies);
        console.log('✅ Dependencies synced successfully:', dependencySyncSummary);
      } catch (depError) {
        console.error('⚠️ Failed to sync dependencies to related list (non-critical):', depError.message);
        // Don't fail the whole sync if dependencies fail - log and continue
      }
    } else if (syncedContactId) {
      console.log('ℹ️ Dependencies not provided in payload; keeping existing Zoho dependents unchanged');
    }

    // Store contactId in Firebase profile if userId is provided
    if (userId && syncedContactId) {
      try {
        const db = getAdapter();
        const profilePatch = {
          zohoContactId: syncedContactId,
          zohoLastSyncedAt: new Date().toISOString(),
        };
        if (hasField(body, 'firstName')) profilePatch.firstName = firstName || '';
        if (hasField(body, 'lastName')) profilePatch.lastName = lastName || '';
        if (hasField(body, 'phone')) profilePatch.phone = phone || '';
        if (hasField(body, 'streetAddress')) profilePatch.streetAddress = streetAddress || '';
        if (hasField(body, 'suburb')) profilePatch.suburb = suburb || '';
        if (hasField(body, 'state')) profilePatch.state = state || '';
        if (hasField(body, 'postcode')) profilePatch.postcode = postcode || '';
        if (hasField(body, 'country')) profilePatch.country = country || '';
        if (hasField(body, 'gender')) profilePatch.gender = gender || '';
        if (normalizedDob !== undefined) profilePatch.dateOfBirth = normalizedDob;
        if (hasField(body, 'email') && email) profilePatch.email = email;

        await db.updateUserProfile(userId, {
          ...profilePatch,
        });
        console.log('✅ Stored zohoContactId in Firebase profile:', syncedContactId);
      } catch (profileError) {
        console.error('⚠️ Failed to store zohoContactId in profile (non-critical):', profileError);
        // Don't fail the whole sync if profile update fails
      }
    }
    
    return NextResponse.json({
      success: true,
      action: action,
      contactId: syncedContactId,
      dependenciesSync: dependencySyncSummary,
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
