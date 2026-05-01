import { NextResponse } from 'next/server';
import { ZohoCRMClient } from '@/lib/zohoClient';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const dealId = formData.get('dealId');
    const message = formData.get('message');
    const attachments = formData.getAll('attachments');

    if (!dealId || !message) {
      return NextResponse.json(
        { success: false, error: 'dealId and message are required' },
        { status: 400 }
      );
    }

    console.log(`📤 Sending client message for Deal ${dealId}...`);
    const zohoClient = new ZohoCRMClient();

    // 1. Find the existing Client_Messages record for this Deal
    const records = await zohoClient.coqlQuery(
      `SELECT id, Message_Log, Unread_for_Admin
       FROM Client_Messages
       WHERE Matter = '${dealId}' LIMIT 1`
    );

    let chatRecord = records?.[0] || null;

    // 2. Create the chat record if one doesn't exist yet
    if (!chatRecord) {
      console.log('ℹ️ No chat record found — creating one...');
      const created = await zohoClient.createRecord('Client_Messages', {
        Matter: { id: dealId },
        Status: 'Active',
        Unread_for_Admin: 0,
        Unread_for_Client: 0,
      });

      if (!created?.id) {
        return NextResponse.json(
          { success: false, error: 'Failed to create chat record' },
          { status: 500 }
        );
      }

      chatRecord = { id: created.id, Message_Log: [], Unread_for_Admin: 0 };
      console.log(`✅ Created chat record ${chatRecord.id}`);
    }

    // 3. Build the new subform row
    const now = new Date();
    const newRow = {
      Sender: 'Client',
      Message1: message.trim(),
      Timestamp: now.toISOString(),
      Read_By_Admin: false,
      Read_By_Client: true,
    };

    const existingLog = chatRecord.Message_Log || [];
    const updatedLog = [...existingLog, newRow];

    // 4. Update the record — append the new row to Message_Log
    console.log(`📝 Appending message to Message_Log (${updatedLog.length} total rows)...`);
    await zohoClient.updateRecord('Client_Messages', chatRecord.id, {
      Message_Log: updatedLog,
      Last_Message_At: now.toISOString(),
      Unread_for_Admin: (chatRecord.Unread_for_Admin || 0) + 1,
    });

    console.log('✅ Message appended successfully');

    // 5. Upload attachments if provided (linked to the chat record)
    const uploadedAttachments = [];
    if (attachments && attachments.length > 0) {
      for (const file of attachments) {
        if (file && file.size > 0) {
          try {
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            console.log(`📎 Uploading attachment: ${file.name} (${file.size} bytes)`);
            await zohoClient.uploadAttachment(
              'Client_Messages',
              chatRecord.id,
              buffer,
              file.name,
              file.type
            );
            uploadedAttachments.push({ name: file.name, size: file.size, type: file.type });
            console.log(`✅ Attachment uploaded: ${file.name}`);
          } catch (attachErr) {
            console.error(`❌ Failed to upload attachment ${file.name}:`, attachErr);
            // Continue — don't fail the whole request for an attachment error
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      chatRecordId: chatRecord.id,
      totalMessages: updatedLog.length,
      attachments: uploadedAttachments,
    });
  } catch (error) {
    console.error('❌ Error sending message:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to send message',
      },
      { status: 500 }
    );
  }
}
