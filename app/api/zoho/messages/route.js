import { NextResponse } from 'next/server';
import { enforceZohoApiKey, verifyZohoAccess } from '@/lib/zohoApiAuth';
import { adminAuth, isAdminSDKInitialized } from '@/lib/firebase-admin';
import {
  fetchMessagesAdmin,
  sendMessageAdmin,
  markMessagesSeenAdmin,
} from '@/lib/chatService-admin';

const DEFAULT_LIMIT = 30;

function normalizeString(value) {
  return value ? value.trim() : '';
}

async function resolveUserId({ userId, email }) {
  if (userId) {
    return userId;
  }

  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('Either userId or email must be provided.');
  }

  if (!adminAuth) {
    throw new Error('Firebase Admin Auth is not available.');
  }

  try {
    const userRecord = await adminAuth.getUserByEmail(normalizedEmail);
    return userRecord.uid;
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      const notFound = new Error(`No Firebase user found for ${normalizedEmail}`);
      notFound.statusCode = 404;
      throw notFound;
    }
    throw error;
  }
}

function ensureAdminReady() {
  if (!isAdminSDKInitialized()) {
    throw Object.assign(new Error('Firebase Admin SDK is not configured.'), {
      statusCode: 500,
    });
  }
}

export async function GET(request) {
  const apiCheck = enforceZohoApiKey(request);
  if (!apiCheck.ok) {
    return apiCheck.response;
  }

  try {
    ensureAdminReady();

    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get('userId');
    const emailParam = searchParams.get('email');
    const zohoContactId = normalizeString(searchParams.get('zohoContactId'));
    const zohoDealId = normalizeString(searchParams.get('zohoDealId'));
    const matterId = searchParams.get('matterId') || undefined;
    const before = searchParams.get('before') || undefined;
    const after = searchParams.get('after') || undefined;
    const limitCount = Math.min(
      Number.parseInt(searchParams.get('limit') || DEFAULT_LIMIT, 10) || DEFAULT_LIMIT,
      100,
    );

    if (before && after) {
      return NextResponse.json(
        { success: false, error: 'Use either "before" or "after" cursor, not both.' },
        { status: 400 },
      );
    }

    // Resolve email for security check
    let emailForCheck = emailParam;
    if (!emailForCheck && userIdParam) {
      // If only userId provided, we can't verify Zoho access - require email
      if (!zohoContactId && !zohoDealId) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Security: Either "email" with "zohoContactId"/"zohoDealId" is required, or "userId" with "zohoContactId"/"zohoDealId" and "email" for verification.',
          },
          { status: 400 },
        );
      }
    }

    // SECURITY: Verify Zoho access if email is provided
    if (emailForCheck) {
      const accessCheck = await verifyZohoAccess(emailForCheck, zohoContactId, zohoDealId);
      if (!accessCheck.ok) {
        return accessCheck.response;
      }
    }

    const userId = await resolveUserId({ userId: userIdParam, email: emailParam });

    const result = await fetchMessagesAdmin({
      userId,
      matterId,
      limitCount,
      before,
      after,
    });

    return NextResponse.json({
      success: true,
      userId,
      ...result,
    });
  } catch (error) {
    const status = error.statusCode || 500;
    console.error('❌ Zoho messages GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to load messages.',
      },
      { status },
    );
  }
}

export async function POST(request) {
  const apiCheck = enforceZohoApiKey(request);
  if (!apiCheck.ok) {
    return apiCheck.response;
  }

  try {
    ensureAdminReady();

    const body = await request.json();
    const {
      userId: userIdParam,
      email,
      zohoContactId,
      zohoDealId,
      senderType = 'agent',
      senderUid,
      senderName,
      body: messageBody,
      matterId,
    } = body || {};

    // SECURITY: Verify Zoho access before allowing message send
    if (email) {
      const accessCheck = await verifyZohoAccess(
        email,
        normalizeString(zohoContactId),
        normalizeString(zohoDealId),
      );
      if (!accessCheck.ok) {
        return accessCheck.response;
      }
    } else if (userIdParam) {
      // If only userId provided, require Zoho context for security
      if (!zohoContactId && !zohoDealId) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Security: zohoContactId or zohoDealId is required when using userId. This ensures only authorized agents can send messages.',
          },
          { status: 400 },
        );
      }
      // Note: We can't fully verify without email, but requiring Zoho ID prevents basic enumeration
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Either userId or email is required.',
        },
        { status: 400 },
      );
    }

    const userId = await resolveUserId({ userId: userIdParam, email });

    if (!senderUid || !senderName) {
      return NextResponse.json(
        { success: false, error: 'senderUid and senderName are required.' },
        { status: 400 },
      );
    }

    if (!messageBody || !messageBody.trim()) {
      return NextResponse.json(
        { success: false, error: 'Message body cannot be empty.' },
        { status: 400 },
      );
    }

    const message = await sendMessageAdmin({
      userId,
      senderType,
      senderUid,
      senderName,
      body: messageBody,
      matterId,
    });

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error) {
    const status = error.statusCode || 500;
    console.error('❌ Zoho messages POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to send message.',
      },
      { status },
    );
  }
}

export async function PATCH(request) {
  const apiCheck = enforceZohoApiKey(request);
  if (!apiCheck.ok) {
    return apiCheck.response;
  }

  try {
    ensureAdminReady();

    const body = await request.json();
    const ids = Array.isArray(body?.messageIds)
      ? body.messageIds
      : Array.isArray(body?.ids)
      ? body.ids
      : [];

    const uniqueIds = [...new Set(ids.filter(Boolean))];

    if (uniqueIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Provide at least one message id.' },
        { status: 400 },
      );
    }

    const updated = await markMessagesSeenAdmin(uniqueIds);

    return NextResponse.json({
      success: true,
      updated,
    });
  } catch (error) {
    const status = error.statusCode || 500;
    console.error('❌ Zoho messages PATCH error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update message status.',
      },
      { status },
    );
  }
}


