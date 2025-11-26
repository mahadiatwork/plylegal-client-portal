import { NextResponse } from 'next/server';

const HEADER_KEY = 'x-admin-key';

/**
 * Validates that the incoming request includes the configured Portal Admin Key.
 * Used for Zoho CRM Deluge function authentication.
 *
 * @param {Request} request
 * @returns {{ ok: true } | { ok: false, response: NextResponse }}
 */
export function enforceAdminKey(request) {
  const configuredKey = process.env.PORTAL_ADMIN_KEY;

  if (!configuredKey) {
    // Don't log the key, just indicate misconfiguration
    console.error('❌ PORTAL_ADMIN_KEY is not configured. Rejecting admin request.');
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          error: 'Server misconfiguration: Portal admin key is not set.',
        },
        { status: 500 },
      ),
    };
  }

  const providedKey = request.headers.get(HEADER_KEY);

  if (!providedKey) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Missing x-admin-key header.',
        },
        { status: 401 },
      ),
    };
  }

  // Use constant-time comparison to prevent timing attacks
  if (!constantTimeEquals(providedKey, configuredKey)) {
    // Don't log the provided key or configured key
    console.warn('⚠️ Unauthorized admin API access attempt');
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Invalid admin key.',
        },
        { status: 401 },
      ),
    };
  }

  return { ok: true };
}

/**
 * Constant-time string comparison to prevent timing attacks
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function constantTimeEquals(a, b) {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

