import { NextResponse } from 'next/server';
import { enforceAdminKey } from '@/lib/adminAuth';
import { checkRateLimit } from '@/lib/rateLimiter';
import { fetchMessagesByEmail } from '@/lib/chatService-admin';
import { isAdminSDKInitialized } from '@/lib/firebase-admin';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/**
 * GET /api/admin/messages
 * 
 * Admin endpoint for Zoho CRM Deluge functions to fetch messages by email.
 * 
 * Authentication: x-admin-key header must match PORTAL_ADMIN_KEY
 * 
 * Query Parameters:
 * - email (required): User's email address
 * - limit (optional, default: 50, max: 200): Number of messages to fetch
 * - matterId (optional): Filter by matter/application ID
 * - before (optional): Cursor for pagination (ISO date string)
 * - after (optional): Cursor for pagination (ISO date string)
 * 
 * Response:
 * {
 *   "success": true,
 *   "messages": [...],
 *   "hasMore": boolean,
 *   "olderCursor": string | null,
 *   "newestCursor": string | null
 * }
 */
export async function GET(request) {
  // Rate limiting: 100 requests per minute per IP
  const rateLimit = checkRateLimit(request, {
    maxRequests: 100,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return rateLimit.response;
  }

  // Authentication: Validate admin key
  const authCheck = enforceAdminKey(request);
  if (!authCheck.ok) {
    return authCheck.response;
  }

  // Check Firebase Admin SDK initialization
  if (!isAdminSDKInitialized()) {
    return NextResponse.json(
      {
        success: false,
        error: 'Firebase Admin SDK is not configured. Please add FIREBASE_SERVICE_ACCOUNT_KEY.',
      },
      { status: 500 },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email')?.trim();

    // Validate email parameter
    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: 'Query parameter "email" is required.',
        },
        { status: 400 },
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email format.',
        },
        { status: 400 },
      );
    }

    // Parse optional parameters
    const matterId = searchParams.get('matterId')?.trim() || undefined;
    const before = searchParams.get('before')?.trim() || undefined;
    const after = searchParams.get('after')?.trim() || undefined;
    const limitCount = Math.min(
      Number.parseInt(searchParams.get('limit') || DEFAULT_LIMIT, 10) || DEFAULT_LIMIT,
      MAX_LIMIT,
    );

    // Validate pagination parameters
    if (before && after) {
      return NextResponse.json(
        {
          success: false,
          error: 'Use either "before" or "after" cursor, not both.',
        },
        { status: 400 },
      );
    }

    // Fetch messages
    const result = await fetchMessagesByEmail({
      email: email.toLowerCase(),
      matterId,
      limitCount,
      before,
      after,
    });

    // Return success response with rate limit headers
    return NextResponse.json(
      {
        success: true,
        ...result,
      },
      {
        status: 200,
        headers: {
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
        },
      },
    );
  } catch (error) {
    // Don't log sensitive information
    console.error('❌ Error in admin messages endpoint:', error.message);

    // Return generic error (don't expose internal details)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch messages. Please try again or contact support.',
      },
      { status: 500 },
    );
  }
}

