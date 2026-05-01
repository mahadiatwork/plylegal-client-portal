import { NextResponse } from 'next/server';
import { ZohoCRMClient } from '@/lib/zohoClient';
import { getAdapter } from '@/lib/adapters';

const DEPENDENT_MODULE = 'Partner_Dependents';
// Syncable relationships for migrating dependents (spouse, child, other)
// Non-migrating members are also synced with relationship mapped to 'child' or 'other'
const SYNCABLE_RELATIONSHIPS = new Set(['spouse', 'child', 'other']);

function getRecordId(result) {
  return result?.details?.id || result?.id || null;
}

export async function POST(request) {
  try {
    const { userId, applicationId, profile, action, zohoContactId: body_zohoContactId } = await request.json();

    if (!userId || !profile || !action) {
      return NextResponse.json(
        { success: false, error: 'userId, profile, and action are required' },
        { status: 400 }
      );
    }

    // Allow syncing if relationship is syncable OR if it's a non-migrating member
    // (non-migrating relationships like parent/sibling are mapped to 'other')
    const isSyncable = SYNCABLE_RELATIONSHIPS.has(profile.relationship) || profile.isNonMigrating === true;
    if (!isSyncable) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'profile_relationship_not_synced',
      });
    }

    // Prefer zohoContactId passed directly from the client (avoids server-side Firestore auth issues)
    let zohoContactId = body_zohoContactId || null;

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
        success: false,
        skipped: true,
        reason: 'no_zoho_contact',
      });
    }

    const zohoClient = new ZohoCRMClient();

    if (action === 'delete') {
      if (!profile.zohoDependentId) {
        return NextResponse.json({
          success: true,
          skipped: true,
          reason: 'no_zoho_dependent_id',
        });
      }

      await zohoClient.deleteRecord(DEPENDENT_MODULE, profile.zohoDependentId);
      return NextResponse.json({
        success: true,
        action,
        applicationId,
        zohoDependentId: profile.zohoDependentId,
      });
    }

    const mapped = zohoClient.mapIntakeProfileToPartnerDependentFields(profile, zohoContactId);

    if (action === 'update' && profile.zohoDependentId) {
      const updated = await zohoClient.updateRecord(DEPENDENT_MODULE, profile.zohoDependentId, mapped);
      return NextResponse.json({
        success: true,
        action,
        applicationId,
        zohoDependentId: getRecordId(updated) || profile.zohoDependentId,
        result: updated,
      });
    }

    if (action === 'create' || action === 'update') {
      const created = await zohoClient.createRecord(DEPENDENT_MODULE, mapped);
      return NextResponse.json({
        success: true,
        action: 'create',
        applicationId,
        zohoDependentId: getRecordId(created),
        result: created,
      });
    }

    return NextResponse.json(
      { success: false, error: `Unsupported action: ${action}` },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error syncing intake dependent to Zoho:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to sync dependent to Zoho',
        details: error.response?.data || null,
      },
      { status: 500 }
    );
  }
}
