import { NextResponse } from 'next/server';
import { ZohoCRMClient } from '@/lib/zohoClient';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const dealId = formData.get('dealId');
    const message = formData.get('message');
    const attachments = formData.getAll('attachments'); // Get all attachment files

    if (!dealId || !message) {
      return NextResponse.json(
        { success: false, error: 'dealId and message are required' },
        { status: 400 }
      );
    }

    console.log(`📤 Creating message for Deal ${dealId}...`);
    const zohoClient = new ZohoCRMClient();
    
    // First, get the Deal to get the matter name
    const deal = await zohoClient.getRecord('Deals', dealId);
    if (!deal) {
      return NextResponse.json(
        { success: false, error: 'Deal not found' },
        { status: 404 }
      );
    }

    // Generate record name: {matter_name} - {date_time}
    const matterName = deal.Deal_Name || deal.DealName || 'Unknown Matter';
    const now = new Date();
    const dateTime = now.toISOString().replace('T', ' ').substring(0, 19);
    const recordName = `${matterName} - ${dateTime}`;

    // Prepare message data - create directly in Client_Messages module
    // Link to Matter using {id: dealId}
    const messageData = {
      Name: recordName,
      Matter: {
        id: dealId
      },
      Message_from_Client: message,
      Time_Sent: now.toISOString(),
      Reply_Message: '',
      Time_Replied: null,
    };

    console.log('📝 Creating message record in Client_Messages module:', recordName);
    const created = await zohoClient.createRecord('Client_Messages', messageData);

    if (!created) {
      return NextResponse.json(
        { success: false, error: 'Failed to create message record' },
        { status: 500 }
      );
    }

    console.log(`✅ Message created with ID: ${created.id}`);

    // Upload attachments if provided
    const uploadedAttachments = [];
    if (attachments && attachments.length > 0) {
      for (const file of attachments) {
        if (file && file.size > 0) {
          try {
            // Convert File to Buffer for server-side upload
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            
            console.log(`📎 Uploading attachment: ${file.name} (${file.size} bytes)`);
            const uploadResult = await zohoClient.uploadAttachment(
              'Client_Messages',
              created.id,
              buffer,
              file.name,
              file.type
            );
            uploadedAttachments.push({
              name: file.name,
              size: file.size,
              type: file.type,
            });
            console.log(`✅ Attachment uploaded: ${file.name}`);
          } catch (error) {
            console.error(`❌ Failed to upload attachment ${file.name}:`, error);
            // Continue with other attachments even if one fails
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: created,
      attachments: uploadedAttachments,
    });
  } catch (error) {
    console.error('❌ Error creating message:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to create message'
      },
      { status: 500 }
    );
  }
}

