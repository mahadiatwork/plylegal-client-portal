import { NextResponse } from 'next/server';
import {
  sendMessageAdmin,
  fetchMessagesAdmin,
  markMessagesSeenAdmin,
} from '@/lib/chatService-admin';
import { isAdminSDKInitialized } from '@/lib/firebase-admin';

const DEFAULT_LIMIT = 30;

/**
 * GET /api/chat - Fetch messages for a user
 */
export async function GET(request) {
  try {
    if (!isAdminSDKInitialized()) {
      return NextResponse.json(
        { success: false, error: 'Firebase Admin SDK is not properly initialized' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const matterId = searchParams.get('matterId');
    const limitCount = Math.min(
      Number.parseInt(searchParams.get('limit') || DEFAULT_LIMIT, 10) || DEFAULT_LIMIT,
      100
    );
    const before = searchParams.get('before');
    const after = searchParams.get('after');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'UserId is required' },
        { status: 400 }
      );
    }

    if (before && after) {
      return NextResponse.json(
        { success: false, error: 'Use either before or after cursor, not both' },
        { status: 400 }
      );
    }

    const result = await fetchMessagesAdmin({
      userId,
      matterId: matterId || undefined,
      limitCount,
      before: before || undefined,
      after: after || undefined,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('❌ Error fetching messages:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to load messages',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/chat - Send a new message
 */
export async function POST(request) {
  try {
    if (!isAdminSDKInitialized()) {
      return NextResponse.json(
        { success: false, error: 'Firebase Admin SDK is not properly initialized' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      userId,
      senderType,
      senderUid,
      senderName,
      body: messageBody,
      matterId,
    } = body;

    if (!userId || !senderType || !senderUid || !senderName || !messageBody) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const message = await sendMessageAdmin({
      userId,
      senderType,
      senderUid,
      senderName,
      body: messageBody,
      matterId: matterId || undefined,
    });

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error) {
    console.error('❌ Error sending message:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to send message',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/chat - Mark messages as seen
 */
export async function PATCH(request) {
  try {
    if (!isAdminSDKInitialized()) {
      return NextResponse.json(
        { success: false, error: 'Firebase Admin SDK is not properly initialized' },
        { status: 500 }
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

    const updated = await markMessagesSeenAdmin(ids);

    return NextResponse.json({
      success: true,
      updated,
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



