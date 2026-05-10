import { NextResponse } from 'next/server';
import { verifyAuth, requireClient } from '@/lib/serverAuth';
import { getDb } from '@/lib/firebase-admin';
import { ZohoCRMClient } from '@/lib/zohoClient';

export async function POST(request) {
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

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const { applicationId, body: messageBody } = body;

    if (!applicationId) {
      return NextResponse.json({ success: false, error: 'applicationId is required' }, { status: 400 });
    }

    if (!messageBody || !messageBody.trim()) {
      return NextResponse.json({ success: false, error: 'Message body is required' }, { status: 400 });
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
    const senderRole = auth.role === 'admin' ? 'admin' : 'client';
    const now = new Date();
    const trimmedBody = messageBody.trim();

    const convRef = db.collection('conversations').doc(conversationId);
    const convDoc = await convRef.get();

    const messageRef = convRef.collection('messages').doc();
    await messageRef.set({
      senderRole,
      senderUid: auth.uid,
      body: trimmedBody,
      createdAt: now,
    });

    const conversationData = {
      conversationId,
      applicationId,
      zohoDealId: appData.zohoId || null,
      clientUid: appData.userId,
      clientName: auth.profile?.firstName
        ? `${auth.profile.firstName} ${auth.profile.lastName || ''}`.trim()
        : auth.email,
      applicationType: appData.type || '',
      latestMessagePreview: trimmedBody.length > 100 ? trimmedBody.substring(0, 97) + '...' : trimmedBody,
      latestMessageAt: now,
      latestSenderRole: senderRole,
      updatedAt: now,
    };

    if (senderRole === 'client') {
      conversationData.unreadForAdmin = true;
      conversationData.unreadForClient = false;
    } else {
      conversationData.unreadForAdmin = false;
      conversationData.unreadForClient = true;
    }

    if (!convDoc.exists) {
      conversationData.createdAt = now;
    }

    await convRef.set(conversationData, { merge: true });

    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin;
      await upsertZohoReference(
        appData.zohoId,
        conversationId,
        trimmedBody,
        senderRole,
        now,
        auth.profile?.zohoContactId || null,
        baseUrl
      );
    } catch (zohoError) {
      console.warn('Zoho reference update failed (non-critical):', zohoError.message);
    }

    return NextResponse.json({
      success: true,
      message: {
        id: messageRef.id,
        senderRole,
        senderUid: auth.uid,
        body: trimmedBody,
        createdAt: now.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error sending chat message:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to send message' }, { status: 500 });
  }
}

async function upsertZohoReference(
  zohoDealId,
  conversationId,
  messageBody,
  senderRole,
  now,
  zohoContactId,
  baseUrl
) {
  if (!zohoDealId) {
    console.warn('No zohoDealId available, skipping Zoho reference update');
    return;
  }

  const zohoClient = new ZohoCRMClient();

  let existingRecords = [];
  try {
    existingRecords = await zohoClient.coqlQuery(
      `SELECT id, Unread_for_Admin, Unread_for_Client FROM Client_Messages WHERE Matter = '${zohoDealId}' LIMIT 1`
    );
  } catch (err) {
    console.warn('COQL search for Client_Messages failed:', err.message);
  }

  const preview = messageBody.length > 100 ? messageBody.substring(0, 97) + '...' : messageBody;
  const zohoDateTime = formatZohoDateTime(now);

  const updateFields = {
    Last_Message_At: zohoDateTime,
    Latest_Message_Preview: preview,
    Firebase_Conversation_Id: conversationId,
  };

  if (senderRole === 'client') {
    updateFields.Unread_for_Admin = 1;
    updateFields.Unread_for_Client = 0;
  } else {
    updateFields.Unread_for_Admin = 0;
    updateFields.Unread_for_Client = 1;
  }

  if (zohoContactId) {
    updateFields.Related_Contact = { id: zohoContactId };
  }

  if (baseUrl) {
    updateFields.Portal_Chat_Link = `${baseUrl}/admin/messages/${conversationId}`;
  }

  if (existingRecords && existingRecords.length > 0) {
    const recordId = existingRecords[0].id;
    await zohoClient.updateRecord('Client_Messages', recordId, updateFields);
    console.log(`Updated Zoho Client_Messages record ${recordId}`);
  } else {
    try {
      await zohoClient.createRecord('Client_Messages', {
        Name: `Chat ${conversationId}`,
        Matter: { id: zohoDealId },
        Message_Status: 'Active',
        ...updateFields,
      });
      console.log(`Created Zoho Client_Messages record for Deal ${zohoDealId}`);
    } catch (createErr) {
      console.warn('Failed to create Zoho Client_Messages record:', createErr.message);
    }
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
