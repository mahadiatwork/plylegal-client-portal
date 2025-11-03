import { NextResponse } from 'next/server';
import zohoClient from '@/lib/zohoClient';

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if user exists in Zoho CRM
    try {
      const zohoContact = await zohoClient.findContactByEmail(email);
      
      if (!zohoContact) {
        console.log('❌ Email not found in Zoho CRM:', email);
        return NextResponse.json({
          success: false,
          error: 'Access denied: Email not found in client database',
          errorCode: 'NOT_IN_ZOHO',
        });
      }
      
      console.log('✅ User found in Zoho CRM:', zohoContact.id);
      return NextResponse.json({
        success: true,
        zohoContact,
      });
    } catch (zohoError) {
      console.error('❌ Zoho CRM check failed:', zohoError.message);
      // SECURITY: Fail closed - do not allow login if Zoho check fails
      return NextResponse.json({
        success: false,
        error: 'Unable to verify account. Please try again later or contact support.',
        errorCode: 'ZOHO_SERVICE_UNAVAILABLE',
      }, { status: 503 });
    }
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}
