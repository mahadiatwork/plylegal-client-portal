import { NextResponse } from 'next/server';
import { verifyAuth, requireClient } from '@/lib/serverAuth';
import { getDb } from '@/lib/firebase-admin';

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

    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get('applicationId');

    if (!applicationId) {
      return NextResponse.json({ success: false, error: 'applicationId is required' }, { status: 400 });
    }

    const appDoc = await db.collection('applications').doc(applicationId).get();
    if (!appDoc.exists) {
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 });
    }

    const appData = appDoc.data();

    if (auth.role !== 'admin' && appData.userId !== auth.uid) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const conversationId = applicationId;
    const convRef = db.collection('conversations').doc(conversationId);
    const convDoc = await convRef.get();

    const messagesSnap = await convRef.collection('messages')
      .orderBy('createdAt', 'asc')
      .limit(50)
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

    if (auth.role === 'client' && convDoc.exists) {
      await convRef.update({ unreadForClient: false, updatedAt: new Date() });
    } else if (auth.role === 'admin' && convDoc.exists) {
      await convRef.update({ unreadForAdmin: false, updatedAt: new Date() });
    }

    const conversation = convDoc.exists ? {
      conversationId: convDoc.id,
      ...convDoc.data(),
      createdAt: convDoc.data().createdAt ? convDoc.data().createdAt.toDate().toISOString() : null,
      updatedAt: convDoc.data().updatedAt ? convDoc.data().updatedAt.toDate().toISOString() : null,
      latestMessageAt: convDoc.data().latestMessageAt ? convDoc.data().latestMessageAt.toDate().toISOString() : null,
    } : null;

    return NextResponse.json({
      success: true,
      conversation,
      messages,
    });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch messages' }, { status: 500 });
  }
}
