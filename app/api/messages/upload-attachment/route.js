import { NextResponse } from 'next/server';
import { ZohoCRMClient } from '@/lib/zohoClient';

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json(
        { success: false, error: 'messageId is required' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || file.size === 0) {
      return NextResponse.json(
        { success: false, error: 'File is required' },
        { status: 400 }
      );
    }

    console.log(`📎 Uploading attachment to message ${messageId}: ${file.name} (${file.size} bytes)`);
    const zohoClient = new ZohoCRMClient();
    
    // Convert File to Buffer for server-side upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const uploadResult = await zohoClient.uploadAttachment(
      'Client_Messages',
      messageId,
      buffer,
      file.name,
      file.type
    );

    console.log(`✅ Attachment uploaded successfully`);

    return NextResponse.json({
      success: true,
      attachment: {
        name: file.name,
        size: file.size,
        type: file.type,
      },
      uploadResult,
    });
  } catch (error) {
    console.error('❌ Error uploading attachment:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to upload attachment'
      },
      { status: 500 }
    );
  }
}




