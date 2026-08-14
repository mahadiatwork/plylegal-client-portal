import { NextResponse } from 'next/server';
import { ZohoCRMClient } from '@/lib/zohoClient';
import {
  buildCorrectionRecord,
  CORRECTION_REQUESTED,
} from '@/lib/correctionPayload';

const MODULE = 'Corrections';
const RECORD_FIELDS = 'Name,Status,Matter,Correction_Details,Created_Time,Modified_Time';

function escapeCoql(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function getRecordId(result) {
  return result?.details?.id || result?.id || null;
}

function normalizeCorrection(record = {}, detail = {}) {
  const correctionId = record.id || getRecordId(record);
  const fieldNameFromName = String(record.Name || '').replace(/^\d{3}\s+-\s+/, '');

  return {
    id: detail.id || correctionId,
    correctionId,
    detailId: detail.id || '',
    name: record.Name || '',
    fieldName: record.Field_Name || fieldNameFromName,
    issueDescription: detail.Details_of_Correction || record.Issue_description || '',
    status: record.Status || '',
    detailStatus: detail.Status || '',
    correctionNumber: detail.Correction_No ?? '',
    pageNumber: detail.Page_No || '',
    questionNumber: detail.Question_No || '',
    matterId: record.Matter?.id || record.Matter || '',
    createdTime: record.Created_Time || '',
    modifiedTime: record.Modified_Time || '',
  };
}

function normalizeCorrections(record = {}) {
  const details = Array.isArray(record.Correction_Details)
    ? record.Correction_Details
    : [];

  return details.length
    ? details.map((detail) => normalizeCorrection(record, detail))
    : [normalizeCorrection(record)];
}

async function loadCorrectionDetails(zohoClient, record) {
  const response = await zohoClient.makeRequest(
    'get',
    `/${MODULE}/${record.id}`,
    null,
    { fields: RECORD_FIELDS }
  );
  return response.data?.[0] || record;
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
      `SELECT id,Name,Status,Matter,Created_Time,Modified_Time FROM ${MODULE} WHERE Matter = '${escapeCoql(dealId)}'`
    );
    const corrections = await Promise.all(
      (records || []).map((record) => loadCorrectionDetails(zohoClient, record))
    );

    return NextResponse.json({
      success: true,
      corrections: corrections.flatMap(normalizeCorrections),
    });
  } catch (error) {
    console.error('Error fetching corrections:', error.message);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch corrections' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { dealId, subclass, corrections } = await request.json();
    const subclassNumber = String(subclass || '').match(/\b\d{3}\b/)?.[0] || '';
    const validCorrections = (Array.isArray(corrections) ? corrections : [])
      .map((correction) => ({
        fieldName: String(correction?.fieldName || '').trim(),
        pageNumber: String(correction?.pageNumber || '').trim(),
        questionNumber: String(correction?.questionNumber || '').trim(),
        issueDescription: String(correction?.details || correction?.issueDescription || '').trim(),
      }))
      .filter((correction) => correction.fieldName && correction.issueDescription);

    if (!dealId) {
      return NextResponse.json(
        { success: false, error: 'dealId is required' },
        { status: 400 }
      );
    }

    if (!subclassNumber) {
      return NextResponse.json(
        { success: false, error: 'A valid visa subclass is required' },
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
    const record = buildCorrectionRecord({
      dealId,
      subclass: subclassNumber,
      corrections: validCorrections,
    });
    const result = await zohoClient.createRecord(MODULE, record);
    const created = normalizeCorrections({
      id: getRecordId(result),
      ...record,
      Status: CORRECTION_REQUESTED,
    });

    return NextResponse.json({
      success: true,
      corrections: created,
    });
  } catch (error) {
    console.error('Error creating corrections:', error.message);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create corrections' },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const { correctionId, detailId, issueDescription } = await request.json();
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

    if (!detailId) {
      return NextResponse.json(
        { success: false, error: 'Correction detail row is required' },
        { status: 400 }
      );
    }

    const zohoClient = new ZohoCRMClient();
    const result = await zohoClient.updateRecord(MODULE, correctionId, {
      Correction_Details: [{
        id: detailId,
        Details_of_Correction: description,
      }],
    });

    return NextResponse.json({
      success: true,
      correction: normalizeCorrection({
        id: getRecordId(result) || correctionId,
      }, {
        id: detailId,
        Details_of_Correction: description,
      }),
    });
  } catch (error) {
    console.error('Error updating correction:', error.message);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update correction' },
      { status: 500 }
    );
  }
}
