import axios from 'axios';

class ZohoCRMClient {
  constructor() {
    this.baseURL = 'https://www.zohoapis.com.au/crm/v7';
    this.accessToken = null;
    this.tokenExpiry = null;
    this.tokenCacheDuration = 50 * 60 * 1000; // 50 minutes (tokens typically last 1 hour)
  }

  async getAccessToken(forceRefresh = false) {
    try {
      // Return cached token if still valid
      if (!forceRefresh && this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        console.log('🔑 Using cached Zoho access token');
        return this.accessToken;
      }

      const tokenUrl = process.env.ZOHO_ACCESS_TOKEN_URL;
      if (!tokenUrl) {
        throw new Error('ZOHO_ACCESS_TOKEN_URL environment variable not set');
      }

      console.log('🔑 Fetching fresh Zoho access token from:', tokenUrl);
      const response = await axios.get(tokenUrl);
      
      // Log the full response to see its structure
      console.log('📦 Token response data:', JSON.stringify(response.data, null, 2));
      
      // Handle different response formats
      let token = null;
      
      // Format 1: { details: { output: "token" } }
      if (response.data?.details?.output) {
        token = response.data.details.output;
      }
      // Format 2: { access_token: "token" }
      else if (response.data?.access_token) {
        token = response.data.access_token;
      }
      // Format 3: Direct string
      else if (typeof response.data === 'string') {
        token = response.data;
      }
      // Format 4: { output: "token" } (no details wrapper)
      else if (response.data?.output) {
        token = response.data.output;
      }
      
      if (!token) {
        console.error('❌ Could not extract token from response:', response.data);
        throw new Error('Invalid token response format');
      }
      
      // Strip "Zoho-oauthtoken" prefix if it exists (we'll add it back when making requests)
      token = token.replace(/^Zoho-oauthtoken\s+/, '');
      
      this.accessToken = token;
      this.tokenExpiry = Date.now() + this.tokenCacheDuration;
      console.log('✅ Zoho access token cached until:', new Date(this.tokenExpiry).toISOString());
      
      return this.accessToken;
    } catch (error) {
      console.error('Failed to get Zoho access token:', error.message);
      console.error('Error details:', error.response?.data || error);
      throw new Error(`Failed to get access token: ${error.message}`);
    }
  }

  async makeRequest(method, endpoint, data = null, params = null, retryCount = 0) {
    const token = await this.getAccessToken();
    
    const config = {
      method,
      url: `${this.baseURL}${endpoint}`,
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json',
      },
    };

    if (params) {
      config.params = params;
    }

    if (data && (method === 'post' || method === 'put')) {
      config.data = data;
    }

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      // Retry once with fresh token if we get 401 Unauthorized
      if (error.response?.status === 401 && retryCount === 0) {
        console.log('⚠️  Got 401 from Zoho, refreshing token and retrying...');
        const freshToken = await this.getAccessToken(true); // Force refresh
        config.headers.Authorization = `Zoho-oauthtoken ${freshToken}`;
        
        try {
          const retryResponse = await axios(config);
          return retryResponse.data;
        } catch (retryError) {
          console.error('Zoho API Error after retry:', retryError.response?.data || retryError.message);
          throw retryError;
        }
      }
      
      console.error('Zoho API Error:', error.response?.data || error.message);
      throw error;
    }
  }

  async searchRecords(moduleName, criteria) {
    try {
      const response = await this.makeRequest(
        'get',
        `/${moduleName}/search`,
        null,
        { criteria }
      );
      return response.data || [];
    } catch (error) {
      if (error.response?.status === 204 || error.response?.data?.code === 'NO_DATA') {
        return [];
      }
      throw error;
    }
  }

  async getRecord(moduleName, recordId) {
    try {
      const response = await this.makeRequest('get', `/${moduleName}/${recordId}`);
      return response.data?.[0] || null;
    } catch (error) {
      console.error(`Error fetching ${moduleName} record ${recordId}:`, error.message);
      return null;
    }
  }

  async createRecord(moduleName, recordData) {
    try {
      const response = await this.makeRequest('post', `/${moduleName}`, {
        data: [recordData],
      });
      return response.data?.[0] || null;
    } catch (error) {
      console.error(`Error creating ${moduleName} record:`, error.message);
      throw error;
    }
  }

  async updateRecord(moduleName, recordId, updateData) {
    try {
      const response = await this.makeRequest('put', `/${moduleName}`, {
        data: [{
          id: recordId,
          ...updateData,
        }],
      });
      return response.data?.[0] || null;
    } catch (error) {
      console.error(`Error updating ${moduleName} record ${recordId}:`, error.message);
      throw error;
    }
  }

  async findContactByEmail(email) {
    try {
      const contacts = await this.searchRecords('Contacts', `(Email:equals:${email})`);
      return contacts.length > 0 ? contacts[0] : null;
    } catch (error) {
      console.error(`Error finding contact by email ${email}:`, error.message);
      return null;
    }
  }

  async coqlQuery(selectQuery) {
    try {
      const response = await this.makeRequest('post', '/coql', {
        select_query: selectQuery,
      });
      return response.data || [];
    } catch (error) {
      if (error.response?.status === 204 || error.response?.data?.code === 'NO_DATA') {
        return [];
      }
      console.error('COQL query error:', error.message);
      throw error;
    }
  }
}

// Export both the class and a singleton instance
export { ZohoCRMClient };
export default new ZohoCRMClient();
