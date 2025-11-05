import { NextResponse } from 'next/server';
import { ZohoCRMClient } from '@/lib/zohoClient';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const dealId = formData.get('dealId');
    const documentName = formData.get('documentName');

    if (!file || !dealId) {
      return NextResponse.json(
        { success: false, error: 'File and dealId are required' },
        { status: 400 }
      );
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 5MB limit' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Please upload PDF, JPG, PNG, DOC, or TXT files only.' },
        { status: 400 }
      );
    }

    console.log(`📤 Uploading file ${file.name} to Zoho Deal ${dealId}...`);

    // Convert File to Buffer for server-side handling
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Preserve original file extension when using document name
    const originalFileName = file.name;
    const fileExtension = originalFileName.substring(originalFileName.lastIndexOf('.'));
    
    // Use the document name if provided, but append the original file extension
    // Otherwise use the original file name
    const fileName = documentName 
      ? `${documentName}${fileExtension}` 
      : originalFileName;

    // Get file type for proper content-type header
    const fileType = file.type;

    // Upload to Zoho CRM
    const zohoClient = new ZohoCRMClient();
    const uploadResult = await zohoClient.uploadAttachment('Deals', dealId, buffer, fileName, fileType);

    console.log(`✅ File uploaded successfully to Zoho Deal ${dealId}`);

    return NextResponse.json({
      success: true,
      data: uploadResult,
      message: 'File uploaded successfully to Zoho CRM',
    });
  } catch (error) {
    console.error('❌ Error uploading file to Zoho CRM:', error);
    
    const errorMessage = error.response?.data?.message || error.message || 'Failed to upload file to Zoho CRM';
    const errorCode = error.response?.data?.code || error.code;
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        code: errorCode,
        details: error.response?.data || error.details,
      },
      { status: error.response?.status || 500 }
    );
  }
}

