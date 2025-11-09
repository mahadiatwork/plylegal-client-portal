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

    console.log(`🔍 Fetching Matter_Documents for Deal ${dealId}...`);
    const zohoClient = new ZohoCRMClient();
    
    // Fetch Matter_Documents from Deal's related list
    // Try multiple field name variations to ensure we get the document name
    // Include Comments, Rejection_Comments, and Decline_Reason fields for comment functionality
    const fields = 'id,Matter_Document_Name,Document_Name,Name,Document_Status,Created_Time,File_Name,File_Size,Modified_Time,Owner,Parent_Id,document_Serial,Comments,Rejection_Comments,Decline_Reason';
    const documents = await zohoClient.getRelatedRecords('Deals', dealId, 'Matter_Documents', fields);

    console.log(`✅ Found ${documents?.length || 0} Matter_Documents`);
    
    // Log first document structure for debugging
    if (documents && documents.length > 0) {
      console.log('📋 First Matter Document structure:', JSON.stringify(documents[0], null, 2));
    }

    // Sort documents by document_Serial (ascending: 1, 2, 3, ...)
    // Documents without serial numbers will be placed at the end
    const sortedDocuments = (documents || []).sort((a, b) => {
      const serialA = a.document_Serial || a.Document_Serial;
      const serialB = b.document_Serial || b.Document_Serial;
      
      // If both have serials, sort by serial number
      if (serialA !== null && serialA !== undefined && serialB !== null && serialB !== undefined) {
        return Number(serialA) - Number(serialB);
      }
      
      // If only A has serial, A comes first
      if (serialA !== null && serialA !== undefined) {
        return -1;
      }
      
      // If only B has serial, B comes first
      if (serialB !== null && serialB !== undefined) {
        return 1;
      }
      
      // If neither has serial, maintain original order
      return 0;
    });

    return NextResponse.json({
      success: true,
      documents: sortedDocuments
    });
  } catch (error) {
    console.error('❌ Error fetching Matter Documents:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

