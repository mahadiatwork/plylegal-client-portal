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

    const zohoClient = new ZohoCRMClient();

    // First, find or create Matter Document
    let matterDocumentId = null;
    if (documentName) {
      try {
        // Get all Matter Documents for this Deal
        const fields = 'id,Name,Matter_Document_Name,Document_Name,Document_Status';
        const matterDocuments = await zohoClient.getRelatedRecords('Deals', dealId, 'Matter_Documents', fields);
        
        // Try to find Matter Document by name (check multiple name fields)
        const matchingDoc = matterDocuments?.find(doc => {
          const docName = doc.Name || doc.Matter_Document_Name || doc.Document_Name || '';
          return docName.toLowerCase().trim() === documentName.toLowerCase().trim();
        });

        if (matchingDoc) {
          matterDocumentId = matchingDoc.id;
          console.log(`✅ Found existing Matter Document ${matterDocumentId}`);
        } else {
          // Create new Matter Document
          const newMatterDoc = await zohoClient.createRelatedRecord('Deals', dealId, 'Matter_Documents', {
            Name: documentName,
            Matter_Document_Name: documentName,
            Document_Status: 'Awaiting Approval'
          });
          if (newMatterDoc) {
            matterDocumentId = newMatterDoc.id;
            console.log(`✅ Created new Matter Document ${matterDocumentId}`);
          }
        }
      } catch (error) {
        console.error('⚠️ Error finding/creating Matter Document:', error.message);
        throw new Error(`Failed to find or create Matter Document: ${error.message}`);
      }
    } else {
      throw new Error('Document name is required to upload to Matter_Documents');
    }

    if (!matterDocumentId) {
      throw new Error('Failed to get Matter Document ID');
    }

    // Upload file to Matter_Documents module (not Deals)
    console.log(`📤 Uploading file to Matter_Documents/${matterDocumentId}/Attachments...`);
    const uploadResult = await zohoClient.uploadAttachment('Matter_Documents', matterDocumentId, buffer, fileName, fileType);

    console.log(`✅ File uploaded successfully to Matter_Documents/${matterDocumentId}`);

    // Update Matter Document status to "Awaiting Approval"
    try {
      await zohoClient.updateRecord('Matter_Documents', matterDocumentId, {
        Document_Status: 'Awaiting Approval'
      });
      console.log(`✅ Updated Matter Document ${matterDocumentId} status to "Awaiting Approval"`);
    } catch (error) {
      console.error('⚠️ Error updating Matter Document status:', error.message);
      // Don't fail the upload if status update fails
    }

    return NextResponse.json({
      success: true,
      data: uploadResult,
      matterDocumentId,
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

