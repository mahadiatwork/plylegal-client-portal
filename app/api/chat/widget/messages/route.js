import { NextResponse } from 'next/server';
import { verifyAdminKey } from '@/lib/serverAuth';
import { getDb } from '@/lib/firebase-admin';

// Handle CORS preflight from Zoho widget iframe
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
    },
  });
}

/**
 * GET /api/chat/widget/messages?zohoDealId=...
 *
 * Widget-specific endpoint authenticated via X-Admin-Key header (not Firebase ID token).
 * Looks up the Firestore conversation by zohoDealId and returns messages.
 * This allows the Zoho CRM widget to read chat history from Firestore without a Firebase session.
 */
export async function GET(request) {
  try {
    const auth = verifyAdminKey(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
    }

    const dbResult = getDb();
    if (!dbResult.ok) {
      return NextResponse.json({ success: false, error: dbResult.error }, { status: 500 });
    }
    const db = dbResult.db;

    const { searchParams } = new URL(request.url);
    const zohoDealId = searchParams.get('zohoDealId');

    if (!zohoDealId) {
      return NextResponse.json({ success: false, error: 'zohoDealId is required' }, { status: 400 });
    }

    // Find the conversation for this Zoho Deal
    const convQuery = await db.collection('conversations')
      .where('zohoDealId', '==', zohoDealId)
      .limit(1)
      .get();

    if (convQuery.empty) {
      return NextResponse.json({
        success: true,
        conversation: null,
        messages: [],
        applicationId: null,
      });
    }

    const convDoc = convQuery.docs[0];
    const convData = convDoc.data();
    const conversationId = convDoc.id;

    const messagesSnap = await db
      .collection('conversations')
      .doc(conversationId)
      .collection('messages')
      .orderBy('createdAt', 'asc')
      .limit(100)
      .get();

    const messages = [];
    messagesSnap.forEach((doc) => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        senderRole: data.senderRole,
        senderUid: data.senderUid,
        body: data.body,
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
      });
    });

    // Mark as read for admin
    await db.collection('conversations').doc(conversationId).set(
      { unreadForAdmin: false },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      applicationId: conversationId,
      conversation: {
        conversationId,
        clientName: convData.clientName || null,
        applicationType: convData.applicationType || null,
        unreadForClient: convData.unreadForClient || false,
        unreadForAdmin: false,
        latestMessageAt: convData.latestMessageAt
          ? convData.latestMessageAt.toDate().toISOString()
          : null,
      },
      messages,
    });
  } catch (error) {
    console.error('[widget/messages] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
