import { NextResponse } from 'next/server';
import { verifyAuth, requireClient } from '@/lib/serverAuth';
import { getDb } from '@/lib/firebase-admin';

/** Questionnaire doc only counts if it has at least one field other than updatedAt */
function questionnaireHasMeaningfulFields(data) {
  if (!data || typeof data !== 'object') return false;
  return Object.keys(data).some((key) => key !== 'updatedAt');
}

export async function GET(request) {
  try {
    const dbResult = getDb();
    if (!dbResult.ok) {
      return NextResponse.json({ success: false, error: dbResult.error }, { status: 500 });
    }
    const db = dbResult.db;

    const auth = await verifyAuth(request);
    const clientCheck = requireClient(auth);
    if (!clientCheck.authorized) {
      return NextResponse.json({ success: false, error: clientCheck.error }, { status: clientCheck.status });
    }

    const appsSnap = await db.collection('applications').where('userId', '==', auth.uid).get();

    let count = 0;
    for (const appDoc of appsSnap.docs) {
      const qRef = appDoc.ref.collection('data').doc('questionnaire');
      const qSnap = await qRef.get();
      if (!qSnap.exists) continue;
      const payload = qSnap.data();
      if (questionnaireHasMeaningfulFields(payload)) {
        count += 1;
      }
    }

    return NextResponse.json({
      success: true,
      count,
      email: auth.email ?? null,
    });
  } catch (error) {
    console.error('Error counting questionnaires:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to count questionnaires' },
      { status: 500 }
    );
  }
}
