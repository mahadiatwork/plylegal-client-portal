import { NextResponse } from 'next/server';
import { ZohoCRMClient } from '@/lib/zohoClient';

const HEADER_KEY = 'x-zoho-api-key';

/**
 * Validates that the incoming request includes the configured Zoho API key.
 * Accepts the key via the `x-zoho-api-key` header or `Authorization: Bearer <key>`.
 *
 * @param {Request} request
 * @returns {{ ok: true } | { ok: false, response: NextResponse }}
 */
export function enforceZohoApiKey(request) {
  const configuredKey = process.env.ZOHO_API_KEY;

  if (!configuredKey) {
    console.warn('⚠️ ZOHO_API_KEY is not configured. Rejecting Zoho API request.');
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          error: 'Server misconfiguration: ZOHO_API_KEY is not set.',
        },
        { status: 500 },
      ),
    };
  }

  const headerKey = request.headers.get(HEADER_KEY);
  const authHeader = request.headers.get('authorization') || '';
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  const providedKey = headerKey || (bearerMatch ? bearerMatch[1] : null);

  if (!providedKey || providedKey !== configuredKey) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: invalid or missing Zoho API key.',
        },
        { status: 401 },
      ),
    };
  }

  return { ok: true };
}

/**
 * Verifies that the requester has access to a Zoho Contact or Deal.
 * This ensures that only agents with access to the Contact/Deal in Zoho CRM
 * can access the user's data, preventing unauthorized access by email enumeration.
 *
 * @param {string} email - User's email address
 * @param {string} zohoContactId - Zoho Contact ID (optional if zohoDealId provided)
 * @param {string} zohoDealId - Zoho Deal ID (optional if zohoContactId provided)
 * @returns {Promise<{ ok: true, contactId: string } | { ok: false, response: NextResponse }>}
 */
export async function verifyZohoAccess(email, zohoContactId, zohoDealId) {
  // Require at least one of contactId or dealId
  if (!zohoContactId && !zohoDealId) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          error:
            'Security: zohoContactId or zohoDealId is required. This ensures only authorized agents can access user data.',
        },
        { status: 400 },
      ),
    };
  }

  const zohoClient = new ZohoCRMClient();

  try {
    // If Contact ID provided, verify the contact exists and email matches
    if (zohoContactId) {
      const contact = await zohoClient.getRecord('Contacts', zohoContactId);
      
      if (!contact) {
        return {
          ok: false,
          response: NextResponse.json(
            {
              success: false,
              error: 'Access denied: Contact not found or you do not have access to this contact.',
            },
            { status: 403 },
          ),
        };
      }

      // Verify email matches (case-insensitive)
      const contactEmail = (contact.Email || contact.email || '').toLowerCase().trim();
      const providedEmail = email.toLowerCase().trim();

      if (contactEmail !== providedEmail) {
        console.warn(
          `⚠️ Email mismatch: Contact ${zohoContactId} has email "${contactEmail}", but request provided "${providedEmail}"`,
        );
        return {
          ok: false,
          response: NextResponse.json(
            {
              success: false,
              error: 'Access denied: Email does not match the provided Contact.',
            },
            { status: 403 },
          ),
        };
      }

      return { ok: true, contactId: zohoContactId };
    }

    // If Deal ID provided, verify the deal exists and get associated contact
    if (zohoDealId) {
      const deal = await zohoClient.getRecord('Deals', zohoDealId);
      
      if (!deal) {
        return {
          ok: false,
          response: NextResponse.json(
            {
              success: false,
              error: 'Access denied: Deal not found or you do not have access to this deal.',
            },
            { status: 403 },
          ),
        };
      }

      // Get the Contact associated with this Deal
      const contactId = deal.Contact_Name?.id || deal.Contact?.id || deal.Contact_Name || deal.Contact;
      
      if (!contactId) {
        return {
          ok: false,
          response: NextResponse.json(
            {
              success: false,
              error: 'Access denied: Deal is not associated with a Contact.',
            },
            { status: 403 },
          ),
        };
      }

      // Verify the contact's email matches
      const contact = await zohoClient.getRecord('Contacts', contactId);
      
      if (!contact) {
        return {
          ok: false,
          response: NextResponse.json(
            {
              success: false,
              error: 'Access denied: Contact associated with Deal not found.',
            },
            { status: 403 },
          ),
        };
      }

      const contactEmail = (contact.Email || contact.email || '').toLowerCase().trim();
      const providedEmail = email.toLowerCase().trim();

      if (contactEmail !== providedEmail) {
        console.warn(
          `⚠️ Email mismatch: Contact ${contactId} (from Deal ${zohoDealId}) has email "${contactEmail}", but request provided "${providedEmail}"`,
        );
        return {
          ok: false,
          response: NextResponse.json(
            {
              success: false,
              error: 'Access denied: Email does not match the Contact associated with this Deal.',
            },
            { status: 403 },
          ),
        };
      }

      return { ok: true, contactId };
    }
  } catch (error) {
    console.error('❌ Error verifying Zoho access:', error);
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          error: 'Failed to verify access. Please try again or contact support.',
        },
        { status: 500 },
      ),
    };
  }

  // Should never reach here, but just in case
  return {
    ok: false,
    response: NextResponse.json(
      {
        success: false,
        error: 'Unable to verify access.',
      },
      { status: 500 },
    ),
  };
}
