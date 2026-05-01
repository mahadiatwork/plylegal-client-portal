import { NextResponse } from 'next/server';
import { ZohoCRMClient } from '@/lib/zohoClient';
import { getAdapter } from '@/lib/adapters';

const DEPENDENT_MODULE = 'Partner_Dependents';

/**
 * GET /api/intake/dependents?userId=xxx
 * Fetches all dependents from the Partner_Dependents related list on the contact in Zoho CRM.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    // Prefer zohoContactId passed directly from the client (avoids server-side Firestore auth issues)
    let zohoContactId = searchParams.get('zohoContactId') || null;

    if (!zohoContactId) {
      // Fallback: try to read from Firestore (may fail in server context without Admin SDK)
      try {
        const db = getAdapter();
        const userProfile = await db.getUserProfile(userId);
        zohoContactId = userProfile?.zohoContactId || null;
      } catch {
        // Firestore read failed server-side — zohoContactId remains null
      }
    }

    if (!zohoContactId) {
      return NextResponse.json({
        success: true,
        dependents: [],
        reason: 'no_zoho_contact',
      });
    }

    const zohoClient = new ZohoCRMClient();
    const fields = 'id,First_Name,Last_Name,Name,Relationship_to_Applicant,Date_of_Birth,Gender,Email,Citizenship,Is_Applicant,Is_Non_Migrating,Non_Migrating';
    const records = await zohoClient.getRelatedRecords('Contacts', zohoContactId, DEPENDENT_MODULE, fields);

    // Map CRM fields to application-friendly format using centralized method
    const dependents = (records || []).map((rec) => zohoClient.mapZohoDependentToAppFields(rec));

    return NextResponse.json({
      success: true,
      dependents,
      contactId: zohoContactId,
    });
  } catch (error) {
    console.error('Error fetching dependents from Zoho:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch dependents',
        dependents: [],
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/intake/dependents
 * Saves dependent selection/exclusion for the current application draft.
 * Body: { userId, applicationId, selectedDependentIds[], excludedDependentIds[] }
 */
export async function POST(request) {
  try {
    const { userId, applicationId, selectedDependentIds, excludedDependentIds } = await request.json();

    if (!userId || !applicationId) {
      return NextResponse.json(
        { success: false, error: 'userId and applicationId are required' },
        { status: 400 }
      );
    }

    const selectedIds = Array.isArray(selectedDependentIds) ? selectedDependentIds : [];
    const excludedIds = Array.isArray(excludedDependentIds) ? excludedDependentIds : [];

    // Save selection to the application draft
    const db = getAdapter();
    const existingDraft = await db.loadDraft(applicationId);

    const updatedDraft = {
      ...(existingDraft || {}),
      selectedDependentIds: selectedIds,
      excludedDependentIds: excludedIds,
    };

    const result = await db.saveDraft(updatedDraft, applicationId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to save dependent selection' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      selectedDependentIds: selectedIds,
      excludedDependentIds: excludedIds,
    });
  } catch (error) {
    console.error('Error saving dependent selection:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to save dependent selection',
      },
      { status: 500 }
    );
  }
}
