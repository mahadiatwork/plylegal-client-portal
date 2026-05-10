import { NextResponse } from 'next/server';
import { verifyAuth, requireAdmin } from '@/lib/serverAuth';
import { getDb } from '@/lib/firebase-admin';

export async function GET(request) {
  try {
    const dbResult = getDb();
    if (!dbResult.ok) {
      return NextResponse.json({ success: false, error: dbResult.error }, { status: 500 });
    }
    const db = dbResult.db;

    const auth = await verifyAuth(request);
    const adminCheck = requireAdmin(auth);
    if (!adminCheck.authorized) {
      return NextResponse.json({ success: false, error: adminCheck.error }, { status: adminCheck.status });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';

    let query = db.collection('conversations').orderBy('latestMessageAt', 'desc').limit(100);

    if (filter === 'unread') {
      query = query.where('unreadForAdmin', '==', true);
    }

    const snapshot = await query.get();

    const conversations = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      conversations.push({
        conversationId: doc.id,
        applicationId: data.applicationId,
        zohoDealId: data.zohoDealId,
        clientUid: data.clientUid,
        clientName: data.clientName,
        applicationType: data.applicationType,
        latestMessagePreview: data.latestMessagePreview,
        latestMessageAt: data.latestMessageAt ? data.latestMessageAt.toDate().toISOString() : null,
        latestSenderRole: data.latestSenderRole,
        unreadForAdmin: data.unreadForAdmin || false,
        unreadForClient: data.unreadForClient || false,
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
        updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null,
      });
    });

    return NextResponse.json({
      success: true,
      conversations,
    });
  } catch (error) {
    console.error('Error fetching admin conversations:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch conversations' }, { status: 500 });
  }
}
