import { NextResponse } from 'next/server';
import { ZohoCRMClient } from '@/lib/zohoClient';

/**
 * POST /api/uploads/matter-documents/comment
 * 
 * Add or update a comment on a Matter Document
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { documentId, comment } = body;

    if (!documentId || !comment) {
      return NextResponse.json(
        { success: false, error: 'documentId and comment are required' },
        { status: 400 }
      );
    }

    console.log(`💬 Updating comment for Matter Document ${documentId}...`);
    const zohoClient = new ZohoCRMClient();
    
    // Update the Matter Document with the comment
    const updated = await zohoClient.updateRecord('Matter_Documents', documentId, {
      Comments: comment
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Failed to update comment' },
        { status: 500 }
      );
    }

    console.log(`✅ Comment updated for Matter Document ${documentId}`);

    return NextResponse.json({
      success: true,
      message: 'Comment updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating comment:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update comment' },
      { status: 500 }
    );
  }
}
