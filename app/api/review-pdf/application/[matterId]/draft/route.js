import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase-admin';

/**
 * API Route: Fetch Draft/Questionnaire Data by Matter ID
 *
 * GET /api/review-pdf/application/[matterId]/draft
 *
 * Finds the application by zohoId (matterId), then loads its questionnaire
 * data. Uses the Admin SDK so Firestore rules stay closed to the public.
 */
export async function GET(request, { params }) {
  try {
    const { matterId } = await params;

    if (!matterId) {
      return NextResponse.json(
        { success: false, error: 'Matter ID is required' },
        { status: 400 }
      );
    }

    const dbResult = getDb();
    if (!dbResult.ok) {
      console.error('review-pdf: Firestore admin unavailable:', dbResult.error);
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }
    const db = dbResult.db;

    const appSnapshot = await db
      .collection('applications')
      .where('zohoId', '==', String(matterId))
      .limit(1)
      .get();

    if (appSnapshot.empty) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      );
    }

    const appId = appSnapshot.docs[0].id;
    const draftSnap = await db
      .collection('applications').doc(appId)
      .collection('data').doc('questionnaire')
      .get();

    if (!draftSnap.exists) {
      return NextResponse.json({
        success: true,
        draft: {},
        message: 'No questionnaire data available',
      });
    }

    // Remove Firebase metadata
    const { updatedAt, ...draft } = draftSnap.data();
    return NextResponse.json({ success: true, draft });
  } catch (error) {
    console.error('❌ Error fetching draft:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch draft data' },
      { status: 500 }
    );
  }
}
