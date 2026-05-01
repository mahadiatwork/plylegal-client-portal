import { NextResponse } from 'next/server';
import { ZohoCRMClient } from '@/lib/zohoClient';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const dealId = searchParams.get('dealId');

    if (!dealId) {
      return NextResponse.json(
        { success: false, error: 'dealId is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Fetching Client_Messages for Deal ${dealId}...`);
    const zohoClient = new ZohoCRMClient();

    // Query the single Client_Messages record linked to this Deal via the Matter lookup
    const records = await zohoClient.coqlQuery(
      `SELECT id, Message_Log, Unread_for_Client, Last_Message_At
       FROM Client_Messages
       WHERE Matter = '${dealId}' LIMIT 1`
    );

    const chatRecord = records?.[0] || null;

    if (!chatRecord) {
      console.log('ℹ️ No chat record found for this deal');
      return NextResponse.json({ success: true, messages: [], chatRecordId: null, unread: 0 });
    }

    const messageLog = chatRecord.Message_Log || [];
    console.log(`✅ Found chat record ${chatRecord.id} with ${messageLog.length} message(s)`);

    // Sort chronologically (oldest first)
    const sortedMessages = [...messageLog].sort(
      (a, b) => new Date(a.Timestamp || 0) - new Date(b.Timestamp || 0)
    );

    // Mark all admin messages as read by client and reset the unread counter
    if (chatRecord.Unread_for_Client > 0) {
      const markedMessages = sortedMessages.map((row) =>
        row.Sender === 'Admin' ? { ...row, Read_By_Client: true } : row
      );

      try {
        await zohoClient.updateRecord('Client_Messages', chatRecord.id, {
          Message_Log: markedMessages,
          Unread_for_Client: 0,
        });
        console.log('✅ Marked admin messages as read by client');
      } catch (markErr) {
        // Non-fatal — still return messages even if the mark-read update fails
        console.warn('⚠️ Failed to mark messages as read:', markErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      messages: sortedMessages,
      chatRecordId: chatRecord.id,
      unread: chatRecord.Unread_for_Client || 0,
    });
  } catch (error) {
    console.error('❌ Error fetching messages:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch messages',
        messages: [],
      },
      { status: 500 }
    );
  }
}
