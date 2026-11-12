import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase-admin';

/**
 * API Route: Find Application by Zoho Deal ID (Matter ID)
 *
 * GET /api/review-pdf/application/[matterId]
 *
 * Reads through the Admin SDK so Firestore rules never need to expose
 * applications to unauthenticated clients.
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

    const snapshot = await dbResult.db
      .collection('applications')
      .where('zohoId', '==', String(matterId))
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      );
    }

    const doc = snapshot.docs[0];
    return NextResponse.json({
      success: true,
      application: { id: doc.id, ...doc.data() },
    });
  } catch (error) {
    console.error('❌ Error fetching application:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch application' },
      { status: 500 }
    );
  }
}
