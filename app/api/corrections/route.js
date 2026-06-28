import { NextResponse } from 'next/server';
import { ZohoCRMClient } from '@/lib/zohoClient';

const MODULE = 'Corrections';

function escapeCoql(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function getRecordId(result) {
  return result?.details?.id || result?.id || null;
}

function normalizeCorrection(record = {}) {
  return {
    id: record.id || getRecordId(record),
    name: record.Name || '',
    fieldName: record.Field_Name || '',
    issueDescription: record.Issue_description || '',
    status: record.Status || '',
    matterId: record.Matter?.id || record.Matter || '',
    createdTime: record.Created_Time || '',
    modifiedTime: record.Modified_Time || '',
  };
}

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

    const zohoClient = new ZohoCRMClient();
    const records = await zohoClient.coqlQuery(
      `SELECT id,Name,Field_Name,Issue_description,Status,Matter,Created_Time,Modified_Time FROM ${MODULE} WHERE Matter = '${escapeCoql(dealId)}'`
    );

    return NextResponse.json({
      success: true,
      corrections: (records || []).map(normalizeCorrection),
    });
  } catch (error) {
    console.error('Error fetching corrections:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch corrections' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { dealId, corrections } = await request.json();
    const validCorrections = (Array.isArray(corrections) ? corrections : [])
      .map((correction) => ({
        fieldName: String(correction?.fieldName || '').trim(),
        issueDescription: String(correction?.details || correction?.issueDescription || '').trim(),
      }))
      .filter((correction) => correction.fieldName && correction.issueDescription);

    if (!dealId) {
      return NextResponse.json(
        { success: false, error: 'dealId is required' },
        { status: 400 }
      );
    }

    if (validCorrections.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one correction is required' },
        { status: 400 }
      );
    }

    const zohoClient = new ZohoCRMClient();
    const created = [];

    for (const correction of validCorrections) {
      const result = await zohoClient.createRecord(MODULE, {
        Name: correction.fieldName,
        Field_Name: correction.fieldName,
        Issue_description: correction.issueDescription,
        Matter: { id: dealId },
      });

      created.push(normalizeCorrection({
        id: getRecordId(result),
        Name: correction.fieldName,
        Field_Name: correction.fieldName,
        Issue_description: correction.issueDescription,
        Matter: { id: dealId },
        Status: result?.details?.Status || result?.Status || '',
      }));
    }

    return NextResponse.json({
      success: true,
      corrections: created,
    });
  } catch (error) {
    console.error('Error creating corrections:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create corrections' },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const { correctionId, issueDescription } = await request.json();
    const description = String(issueDescription || '').trim();

    if (!correctionId) {
      return NextResponse.json(
        { success: false, error: 'correctionId is required' },
        { status: 400 }
      );
    }

    if (!description) {
      return NextResponse.json(
        { success: false, error: 'Issue description is required' },
        { status: 400 }
      );
    }

    const zohoClient = new ZohoCRMClient();
    const result = await zohoClient.updateRecord(MODULE, correctionId, {
      Issue_description: description,
    });

    return NextResponse.json({
      success: true,
      correction: normalizeCorrection({
        id: getRecordId(result) || correctionId,
        Issue_description: description,
      }),
    });
  } catch (error) {
    console.error('Error updating correction:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update correction' },
      { status: 500 }
    );
  }
}
