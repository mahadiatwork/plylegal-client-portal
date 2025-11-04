import { NextResponse } from 'next/server';
import axios from 'axios';

/**
 * GET /api/test/zoho-verify-token
 * 
 * Test endpoint to verify if the Zoho access token is valid
 * by making a simple API call to Zoho
 */
export async function GET(request) {
  try {
    // Get access token URL
    const tokenUrl = process.env.ACCESSTOKEN_URL || process.env.ZOHO_ACCESS_TOKEN_URL;
    if (!tokenUrl) {
      return NextResponse.json({
        success: false,
        error: 'ACCESSTOKEN_URL or ZOHO_ACCESS_TOKEN_URL not configured',
        tokenConfigured: false,
      }, { status: 400 });
    }

    console.log('🔍 Verifying Zoho access token...');

    // Fetch access token
    let tokenResponse;
    try {
      tokenResponse = await axios.get(tokenUrl, {
        timeout: 30000,
      });
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch access token',
        errorMessage: error.message,
        errorCode: error.code,
        tokenFetched: false,
      }, { status: 500 });
    }

    // Extract token from response
    let token = null;
    const responseData = tokenResponse.data;

    if (responseData.access_token) {
      token = responseData.access_token;
    } else if (responseData.details?.output) {
      token = responseData.details.output;
    } else if (responseData.output) {
      token = responseData.output;
    } else if (typeof responseData === 'string') {
      token = responseData;
    }

    // Strip prefix if present
    if (token && typeof token === 'string') {
      token = token.replace(/^Zoho-oauthtoken\s+/, '');
    }

    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Access token not found in response',
        responseStructure: responseData,
        tokenFetched: false,
        tokenValid: false,
      }, { status: 400 });
    }

    // Verify token by making a simple API call to Zoho
    let tokenValid = false;
    let userInfo = null;
    let errorDetails = null;

    try {
      // Try to get settings/modules (simple API call to verify token)
      // Use same datacenter as configured
      const datacenter = process.env.ZOHO_DATACENTER || 'com.au';
      const verifyResponse = await axios.get(
        `https://www.zohoapis.${datacenter}/crm/v7/settings/modules/Contacts`,
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${token}`,
          },
          timeout: 10000,
        }
      );

      tokenValid = true;
      
      // Extract module info if available
      if (verifyResponse.data) {
        userInfo = {
          moduleInfo: verifyResponse.data,
          moduleName: verifyResponse.data.api_name || 'Contacts',
        };
      }

      return NextResponse.json({
        success: true,
        tokenFetched: true,
        tokenValid: true,
        tokenLength: token.length,
        tokenPreview: token.substring(0, 20) + '...',
        datacenter: datacenter,
        responseFormat: {
          hasAccessToken: !!responseData.access_token,
          hasDetailsOutput: !!responseData.details?.output,
          hasOutput: !!responseData.output,
          isString: typeof responseData === 'string',
        },
        moduleInfo: userInfo,
        message: 'Access token is valid and working',
      });

    } catch (verifyError) {
      tokenValid = false;
      const statusCode = verifyError.response?.status;
      const errorData = verifyError.response?.data;

      errorDetails = {
        status: statusCode,
        code: errorData?.code,
        message: errorData?.message || verifyError.message,
        details: errorData,
      };

      return NextResponse.json({
        success: false,
        tokenFetched: true,
        tokenValid: false,
        tokenLength: token.length,
        tokenPreview: token.substring(0, 20) + '...',
        responseFormat: {
          hasAccessToken: !!responseData.access_token,
          hasDetailsOutput: !!responseData.details?.output,
          hasOutput: !!responseData.output,
          isString: typeof responseData === 'string',
        },
        error: 'Access token is invalid or expired',
        errorDetails: errorDetails,
      }, { status: 200 }); // Return 200 so frontend can show the error
    }

  } catch (error) {
    console.error('❌ Error verifying token:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to verify token',
      errorDetails: error.response?.data || error,
    }, { status: 500 });
  }
}

