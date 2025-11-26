import { NextResponse } from 'next/server';
import { ZohoCRMClient } from '@/lib/zohoClient';

const MODULE_NAME = 'Client_Messages';
const DEFAULT_LIMIT = 30;

const sanitizeValue = (value) =>
  String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const normalizeMessage = (record = {}) => {
  const senderType = record.Message_from_Client ? 'client' : 'agent';
  const contactName =
    record.Contact?.name ||
    [record.Contact?.first_name, record.Contact?.last_name].filter(Boolean).join(' ').trim();
  const ownerName =
    record.Owner?.name ||
    [record.Owner?.first_name, record.Owner?.last_name].filter(Boolean).join(' ').trim();

  return {
    id: record.id,
    senderType,
    senderName: senderType === 'client' ? contactName || 'You' : ownerName || 'Ply Legal',
    body: record.Message_from_Client || record.Reply_Message || '',
    createdTime: record.Created_Time || record.created_time || new Date().toISOString(),
    status: record.Message_Status || 'Sent',
    recordImageUrl: record.Record_Image || null,
    attachments: [],
  };
};

async function fetchMessages({ matterId, limit, before, after }) {
  const zohoClient = new ZohoCRMClient();
  
  // Try COQL first with proper lookup field syntax
  // In Zoho COQL, lookup fields are referenced by their API name
  let allRecords = [];
  
  try {
    // Build COQL query - use Matter field directly (not Matter.id)
    const selectFields = [
      'id',
      'Message_from_Client',
      'Reply_Message',
      'Message_Status',
      'Created_Time',
      'Record_Image',
      'Owner',
      'Contact',
    ].join(', ');
    
    const whereClause = `Matter = '${sanitizeValue(matterId)}'`;
    const query = `select ${selectFields} from ${MODULE_NAME} where ${whereClause} order by Created_Time asc limit 200`;
    
    allRecords = await zohoClient.coqlQuery(query);
    console.log(`✅ COQL query returned ${allRecords?.length || 0} records`);
  } catch (coqlError) {
    console.warn('COQL query failed, trying search API:', coqlError.message);
    try {
      // Fallback to search API
      const criteria = `(Matter:equals:${sanitizeValue(matterId)})`;
      allRecords = await zohoClient.searchRecords(MODULE_NAME, criteria);
      console.log(`✅ Search API returned ${allRecords?.length || 0} records`);
    } catch (searchError) {
      console.error('Both COQL and Search API failed:', searchError.message);
      // Return empty result if both fail
      return {
        messages: [],
        hasMore: false,
        olderCursor: null,
        newestCursor: null,
      };
    }
  }
  
  if (!allRecords || allRecords.length === 0) {
    return {
      messages: [],
      hasMore: false,
      olderCursor: null,
      newestCursor: null,
    };
  }
  
  // Filter by date if needed
  let filtered = allRecords;
  if (before) {
    const beforeDate = new Date(before);
    filtered = filtered.filter(r => {
      const created = new Date(r.Created_Time || r.created_time || 0);
      return created < beforeDate;
    });
  }
  if (after) {
    const afterDate = new Date(after);
    filtered = filtered.filter(r => {
      const created = new Date(r.Created_Time || r.created_time || 0);
      return created > afterDate;
    });
  }
  
  // Sort by Created_Time (ascending for chronological order)
  filtered.sort((a, b) => {
    const timeA = new Date(a.Created_Time || a.created_time || 0).getTime();
    const timeB = new Date(b.Created_Time || b.created_time || 0).getTime();
    return timeA - timeB; // Always ascending for proper chronological order
  });
  
  // Apply limit and reverse if needed for pagination
  const direction = after ? 'asc' : 'desc';
  const limited = filtered.slice(0, limit);
  const orderedRecords = direction === 'desc' ? [...limited].reverse() : limited;

  const normalized = orderedRecords.map((record) => normalizeMessage(record));

  const hasMore = !after && records.length === limit;
  const olderCursor = normalized.length > 0 ? normalized[0].createdTime : null;
  const newestCursor =
    normalized.length > 0 ? normalized[normalized.length - 1].createdTime : null;

  return {
    messages: normalized,
    hasMore,
    olderCursor,
    newestCursor,
  };
}

export async function GET(request, { params }) {
  try {
    const { matterId } = params || {};
    if (!matterId) {
      return NextResponse.json(
        { success: false, error: 'Matter ID is required' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      Number.parseInt(searchParams.get('limit') || DEFAULT_LIMIT, 10) || DEFAULT_LIMIT,
      100
    );
    const before = searchParams.get('before');
    const after = searchParams.get('after');

    if (before && after) {
      return NextResponse.json(
        { success: false, error: 'Use either before or after cursor, not both' },
        { status: 400 }
      );
    }

    const result = await fetchMessages({ matterId, limit, before, after });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('❌ Error fetching Client Messages:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to load messages',
      },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
  let payloadForError = null; // Store payload for error display
  
  try {
    const { matterId } = params || {};
    if (!matterId) {
      return NextResponse.json(
        { success: false, error: 'Matter ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const text = body?.text;
    const contactId = body?.contactId;
    const email = body?.email;

    if (!text) {
      return NextResponse.json(
        { success: false, error: 'Message text is required' },
        { status: 400 }
      );
    }

    if (!contactId) {
      return NextResponse.json(
        { success: false, error: 'Contact ID is required to send a message' },
        { status: 400 }
      );
    }

    const zohoClient = new ZohoCRMClient();
    
    // Build payload - only include fields that have values
    // Use field names as they appear in Zoho CRM API
    const payload = {
      Name: new Date().toISOString(),
      Matter: { id: matterId },
      Contact: { id: contactId },
      Message_from_Client: text,
      Message_Status: 'Sent',
    };
    
    // Only add Email if provided
    if (email) {
      payload.Email = email;
    }

    // Store payload as JSON string for error display
    payloadForError = JSON.stringify(payload, null, 2);

    // ========================================
    // JSON PAYLOAD BEING SENT TO ZOHO CRM:
    // ========================================
    console.log('\n📤 ========================================');
    console.log('📤 JSON PAYLOAD TO ZOHO CRM:');
    console.log('📤 ========================================');
    console.log(payloadForError);
    console.log('📤 ========================================\n');
    
    const createResult = await zohoClient.createRecord(MODULE_NAME, payload);
    console.log('✅ Create result:', JSON.stringify(createResult, null, 2));
    const messageId =
      createResult?.details?.id || createResult?.details?.recordId || createResult?.id;

    if (!messageId) {
      throw new Error('Message created but no ID returned from Zoho');
    }

    const record = await zohoClient.getRecord(MODULE_NAME, messageId);
    const message = normalizeMessage(record);

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error) {
    console.error('❌ Error sending Client Message:', error);
    console.error('Error details:', error.response?.data || error.details || error);
    
    // Extract Zoho error details if available
    const zohoError = error.response?.data || error.details;
    const errorMessage = zohoError?.message || error.message || 'Failed to send message';
    const errorCode = zohoError?.code || error.code;
    
    return NextResponse.json(
      {
        success: false,
        error: errorCode ? `Zoho API error: ${errorCode}` : errorMessage,
        details: zohoError,
        payload: payloadForError, // Include the payload in the error response
      },
      { status: error.response?.status || 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    const { matterId } = params || {};
    if (!matterId) {
      return NextResponse.json(
        { success: false, error: 'Matter ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const ids = Array.isArray(body?.ids) ? body.ids.filter(Boolean) : [];

    if (ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No message IDs provided' },
        { status: 400 }
      );
    }

    const zohoClient = new ZohoCRMClient();
    await zohoClient.updateRecords(
      MODULE_NAME,
      ids.map((id) => ({
        id,
        Message_Status: 'Seen',
      }))
    );

    return NextResponse.json({
      success: true,
      updated: ids.length,
    });
  } catch (error) {
    console.error('❌ Error updating message status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update messages',
      },
      { status: 500 }
    );
  }
}

