import { NextResponse } from 'next/server';
import { ZohoCRMClient } from '@/lib/zohoClient';

const QUESTIONNAIRE_STATUSES = new Set(['Not Started', 'In Progress', 'Submitted']);

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

export async function PATCH(request, { params }) {
  try {
    const { dealId } = params;
    const { status } = await request.json();

    if (!dealId) {
      return NextResponse.json(
        { success: false, error: 'Deal ID is required' },
        { status: 400 }
      );
    }

    if (!QUESTIONNAIRE_STATUSES.has(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid questionnaire status' },
        { status: 400 }
      );
    }

    const zohoClient = new ZohoCRMClient();
    const result = await zohoClient.updateRecord('Deals', dealId, {
      Questionnaires_Status: status,
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('Error updating Deal questionnaire status:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update questionnaire status' },
      { status: 500 }
    );
  }
}
