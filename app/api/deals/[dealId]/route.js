import { NextResponse } from 'next/server';
import { ZohoCRMClient } from '@/lib/zohoClient';

export async function GET(request, { params }) {
  try {
    const { dealId } = params;

    if (!dealId) {
      return NextResponse.json(
        { success: false, error: 'Deal ID is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Fetching Deal ${dealId} with documents_json...`);
    const zohoClient = new ZohoCRMClient();
    
    // Fetch Deal record with documents_json field
    // Specify fields to include documents_json
    const deal = await zohoClient.getRecord('Deals', dealId, 'id,documents_json,Documents_JSON');
    
    if (!deal) {
      return NextResponse.json(
        { success: false, error: 'Deal not found' },
        { status: 404 }
      );
    }

    // Extract documents_json field
    const documentsJson = deal.documents_json || deal.Documents_JSON || null;
    
    console.log(`✅ Found Deal ${dealId}`);
    console.log('📋 documents_json:', documentsJson ? 'Present' : 'Not found');

    return NextResponse.json({
      success: true,
      deal: {
        id: deal.id,
        documents_json: documentsJson
      }
    });
  } catch (error) {
    console.error('❌ Error fetching Deal:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch deal' },
      { status: 500 }
    );
  }
}

