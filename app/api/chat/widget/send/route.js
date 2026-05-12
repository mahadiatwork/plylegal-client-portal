import { NextResponse } from 'next/server';
import { verifyAdminKey } from '@/lib/serverAuth';
import { getDb } from '@/lib/firebase-admin';
import { ZohoCRMClient } from '@/lib/zohoClient';

// Handle CORS preflight from Zoho widget iframe
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
    },
  });
}

/**
 * POST /api/chat/widget/send
 *
 * Widget-specific send endpoint authenticated via X-Admin-Key header.
 * Body: { zohoDealId: string, body: string }
 *
 * Looks up the conversation by zohoDealId and writes the admin reply to Firestore.
 * Also updates the Zoho Client_Messages reference record (unread flags, preview).
 */
export async function POST(request) {
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

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const { zohoDealId, body: messageBody } = body;

    if (!zohoDealId) {
      return NextResponse.json({ success: false, error: 'zohoDealId is required' }, { status: 400 });
    }
    if (!messageBody || !messageBody.trim()) {
      return NextResponse.json({ success: false, error: 'Message body is required' }, { status: 400 });
    }

    const trimmedBody = messageBody.trim();
    const now = new Date();

    // Find conversation by zohoDealId
    const convQuery = await db.collection('conversations')
      .where('zohoDealId', '==', zohoDealId)
      .limit(1)
      .get();

    let conversationId;
    let isNew = false;

    if (!convQuery.empty) {
      conversationId = convQuery.docs[0].id;
    } else {
      // No conversation exists yet — create one. Use applicationId = zohoDealId as fallback key
      // so it aligns with the client portal's convention when the client eventually writes.
      conversationId = `zoho-${zohoDealId}`;
      isNew = true;
    }

    const convRef = db.collection('conversations').doc(conversationId);

    // Write message
    const messageRef = convRef.collection('messages').doc();
    await messageRef.set({
      senderRole: 'admin',
      senderUid: 'widget-admin',
      body: trimmedBody,
      createdAt: now,
    });

    // Update / create conversation metadata
    const preview = trimmedBody.length > 100 ? trimmedBody.substring(0, 97) + '...' : trimmedBody;
    const convData = {
      zohoDealId,
      latestMessagePreview: preview,
      latestMessageAt: now,
      latestSenderRole: 'admin',
      unreadForAdmin: false,
      unreadForClient: true,
      updatedAt: now,
    };
    if (isNew) {
      convData.createdAt = now;
      convData.conversationId = conversationId;
    }
    await convRef.set(convData, { merge: true });

    // Update Zoho reference record in background (Zoho API is slow)
    updateZohoReference(zohoDealId, conversationId, preview, now, request)
      .catch(zohoError => {
        console.warn('[widget/send] Zoho reference update failed in background:', zohoError.message);
      });

    return NextResponse.json({
      success: true,
      message: {
        id: messageRef.id,
        senderRole: 'admin',
        senderUid: 'widget-admin',
        body: trimmedBody,
        createdAt: now.toISOString(),
      },
    });
  } catch (error) {
    console.error('[widget/send] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send message' },
      { status: 500 }
    );
  }
}

async function updateZohoReference(zohoDealId, conversationId, preview, now, request) {
  const zohoClient = new ZohoCRMClient();

  let existingRecords = [];
  try {
    existingRecords = await zohoClient.coqlQuery(
      `SELECT id FROM Client_Messages WHERE Matter = '${zohoDealId}' LIMIT 1`
    );
  } catch {
    // COQL may fail on some orgs; fall through to create
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin;
  const fields = {
    Last_Message_At: formatZohoDateTime(now),
    Latest_Message_Preview: preview,
    Firebase_Conversation_Id: conversationId,
    Unread_for_Admin: 0,
    Unread_for_Client: 1,
    Portal_Chat_Link: `${baseUrl}/admin/messages/${conversationId}`,
  };

  if (existingRecords && existingRecords.length > 0) {
    await zohoClient.updateRecord('Client_Messages', existingRecords[0].id, fields);
  } else {
    await zohoClient.createRecord('Client_Messages', {
      Name: `Chat ${conversationId}`,
      Matter: { id: zohoDealId },
      Message_Status: 'Active',
      ...fields,
    });
  }
}

function formatZohoDateTime(d) {
  const pad = (n) => String(n).padStart(2, '0');
  const tz = -d.getTimezoneOffset();
  const sign = tz >= 0 ? '+' : '-';
  const absTz = Math.abs(tz);
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
    `${sign}${pad(Math.floor(absTz / 60))}:${pad(absTz % 60)}`
  );
}
