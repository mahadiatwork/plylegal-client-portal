import { NextResponse } from 'next/server';
import { ZohoCRMClient } from '@/lib/zohoClient';
import { getAdapter } from '@/lib/adapters';

const DEPENDENT_MODULE = 'Partner_Dependents';
const SYNCABLE_RELATIONSHIPS = new Set(['spouse', 'child', 'other']);

function getRecordId(result) {
  return result?.details?.id || result?.id || null;
}

export async function POST(request) {
  try {
    const { userId, applicationId, profile, action } = await request.json();

    if (!userId || !profile || !action) {
      return NextResponse.json(
        { success: false, error: 'userId, profile, and action are required' },
        { status: 400 }
      );
    }

    if (!SYNCABLE_RELATIONSHIPS.has(profile.relationship)) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'profile_relationship_not_synced',
      });
    }

    const db = getAdapter();
    const userProfile = await db.getUserProfile(userId);
    const zohoContactId = userProfile?.zohoContactId;

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
