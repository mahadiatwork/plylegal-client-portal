import axios from 'axios';
import FormData from 'form-data';

class ZohoCRMClient {
  constructor() {
    // Use v7 API with .com.au datacenter (Australia) as per requirements
    // Support datacenter configuration via environment variable
    const datacenter = process.env.ZOHO_DATACENTER || 'com.au';
    this.baseURL = `https://www.zohoapis.${datacenter}/crm/v7`;
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

      // Support both ACCESSTOKEN_URL (working project) and ZOHO_ACCESS_TOKEN_URL (backward compatibility)
      const tokenUrl = process.env.ACCESSTOKEN_URL || process.env.ZOHO_ACCESS_TOKEN_URL;
      if (!tokenUrl) {
        console.warn('⚠️ ACCESSTOKEN_URL or ZOHO_ACCESS_TOKEN_URL environment variable not set - Zoho CRM features will be disabled');
        // Return null instead of throwing to prevent app breaking
        return null;
      }

      console.log('🔑 Fetching fresh Zoho access token from:', tokenUrl);
      const response = await axios.get(tokenUrl, {
        timeout: 30000, // 30 second timeout
        // Add retry for network issues
        validateStatus: (status) => status < 500, // Don't throw on 4xx/5xx
      });
      
      // Log response for debugging
      console.log('📦 Token response structure:', JSON.stringify(response.data, null, 2));
      
      // Handle different response formats:
      // 1. Simple format: { access_token: "..." }
      // 2. Zoho Functions format: { details: { output: "token" } }
      // 3. Zoho Functions format: { output: "token" }
      let token = null;
      
      if (response.data.access_token) {
        token = response.data.access_token;
      } else if (response.data.details?.output) {
        token = response.data.details.output;
      } else if (response.data.output) {
        token = response.data.output;
      } else if (typeof response.data === 'string') {
        token = response.data;
      }
      
      // Strip "Zoho-oauthtoken" prefix if present (we'll add it back when making requests)
      // This ensures we don't double-prefix the token
      if (token && typeof token === 'string') {
        token = token.replace(/^Zoho-oauthtoken\s+/, '');
      }
      
      if (!token) {
        console.error('❌ Access token not found in response:', response.data);
        throw new Error('Access token not found in response');
      }
      
      // Store token (without prefix, we'll add it when making requests)
      this.accessToken = token;
      this.tokenExpiry = Date.now() + this.tokenCacheDuration;
      console.log('✅ Zoho access token cached until:', new Date(this.tokenExpiry).toISOString());
      
      return this.accessToken;
    } catch (error) {
      console.error('⚠️ Failed to get Zoho access token:', error.message);
      console.error('Error details:', error.response?.data || error);
      // Return null instead of throwing to prevent app breaking
      // This allows the app to continue even if Zoho is unavailable
      return null;
    }
  }

  async makeRequest(method, endpoint, data = null, params = null, retryCount = 0) {
    const token = await this.getAccessToken();
    
    // If token is null, return empty result instead of making request
    if (!token) {
      console.warn('⚠️ No Zoho access token available - skipping API request');
      return { data: [] };
    }
    
    const config = {
      method,
      url: `${this.baseURL}${endpoint}`, // baseURL already includes /v7
      headers: {
        // Use exact format: Authorization: Zoho-oauthtoken <token>
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
      
      // Extract detailed error information
      const zohoBody = error.response?.data;
      const statusCode = error.response?.status;
      
      // Zoho bulk API returns: { data: [{ code, message, details, status: 'error' }] }
      const zohoError = zohoBody?.data?.[0] || zohoBody;
      
      // Log detailed error information
      console.error('Zoho API Error:', JSON.stringify({
        status: statusCode,
        code: zohoError?.code,
        message: zohoError?.message || error.message,
        details: zohoError?.details || zohoBody,
      }, null, 2));
      
      // Create a more informative error
      if (zohoError) {
        const errorMessage = zohoError.message || `Zoho API error: ${zohoError.code || statusCode}`;
        const enhancedError = new Error(errorMessage);
        enhancedError.code = zohoError.code;
        enhancedError.status = statusCode;
        enhancedError.details = zohoError.details || zohoBody;
        throw enhancedError;
      }
      
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
      // v7 API search returns { data: [...] }
      // makeRequest returns response.data, so response here is the axios response.data
      // v7 API structure: { data: [...] }
      return response.data || [];
    } catch (error) {
      if (error.response?.status === 204 || error.response?.data?.code === 'NO_DATA') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Search records by email using query parameter
   * @param {string} moduleName - Module name (e.g., 'Contacts')
   * @param {string} email - Email address to search for
   * @returns {Promise<Array>} Array of matching records
   */
  async searchByEmail(moduleName, email) {
    try {
      const response = await this.makeRequest(
        'get',
        `/${moduleName}/search`,
        null,
        { email }
      );
      // v7 API search returns { data: [...] }
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
      
      // Log response structure for debugging
      console.log(`📦 Response structure for ${moduleName}/${recordId}:`, JSON.stringify(response, null, 2));
      
      // v7 API returns { data: [{...}] } - get first element
      const record = response.data?.[0] || null;
      
      if (!record) {
        console.warn(`⚠️ No record found at response.data[0] for ${moduleName}/${recordId}`);
        console.warn('Response structure:', JSON.stringify(response, null, 2));
      }
      
      return record;
    } catch (error) {
      console.error(`Error fetching ${moduleName} record ${recordId}:`, error.message);
      console.error('Error details:', error.response?.data || error);
      return null;
    }
  }

  async createRecord(moduleName, recordData) {
    try {
      const response = await this.makeRequest('post', `/${moduleName}`, {
        data: [recordData],
      });
      // v7 API returns { data: [{...}] } - get first element
      const created = response.data?.[0] || null;

      if (created?.status === 'error') {
        console.error(`Zoho ${moduleName} create failed:`, JSON.stringify(created, null, 2));
        const errorMessage = created.message || `Zoho ${moduleName} create failed`;
        const enhancedError = new Error(errorMessage);
        enhancedError.code = created.code;
        enhancedError.status = 400;
        enhancedError.details = created.details || created;
        throw enhancedError;
      }

      console.log(`Zoho ${moduleName} create response:`, JSON.stringify(created, null, 2));
      return created;
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
      // v7 API returns { data: [{...}] } - get first element
      return response.data?.[0] || null;
    } catch (error) {
      console.error(`Error updating ${moduleName} record ${recordId}:`, error.message);
      throw error;
    }
  }

  async deleteRecord(moduleName, recordId) {
    try {
      const response = await this.makeRequest('delete', `/${moduleName}/${recordId}`);
      return response.data?.[0] || response || null;
    } catch (error) {
      console.error(`Error deleting ${moduleName} record ${recordId}:`, error.message);
      throw error;
    }
  }

  async findContactByEmail(email) {
    try {
      // Use email as query parameter: GET /Contacts/search?email={{email}}
      console.log(`🔍 Searching for contact with email: ${email}`);
      const contacts = await this.searchByEmail('Contacts', email);
      console.log(`📋 Search returned ${contacts.length} contact(s)`);
      
      if (contacts.length > 0) {
        console.log('✅ Contact found:', contacts[0].id);
        console.log('📦 Contact data:', JSON.stringify(contacts[0], null, 2));
        return contacts[0];
      }
      
      console.log('📭 No contacts found');
      return null;
    } catch (error) {
      console.error(`❌ Error finding contact by email ${email}:`, error.message);
      console.error('Error details:', error.response?.data || error);
      return null;
    }
  }

  async coqlQuery(selectQuery) {
    try {
      // COQL uses v7 endpoint
      const token = await this.getAccessToken();
      const config = {
        method: 'post',
        url: `${this.baseURL}/coql`,
        headers: {
          Authorization: `Zoho-oauthtoken ${token}`,
          'Content-Type': 'application/json',
        },
        data: {
          select_query: selectQuery,
        },
      };
      const response = await axios(config);
      // v7 COQL returns { data: [...] }
      return response.data.data || [];
    } catch (error) {
      if (error.response?.status === 204 || error.response?.data?.code === 'NO_DATA') {
        return [];
      }
      console.error('COQL query error:', error.message);
      if (error.response?.data) {
        console.error('COQL error details:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

  /**
   * Get related records from a related list
   * Format: GET /{module_api_name}/{record_id}/{related_list_api_name}?fields={fields}
   * Examples:
   *   - Contacts/{recordId}/Deals?fields=Deal_Name,Stage,Amount
   *   - Contacts/{recordId}/Partner_Dependents?fields=First_Name,Last_Name,Relationship_to_Applicant,Date_of_Birth,Citizenship
   * @param {string} moduleName - Module name (e.g., 'Contacts')
   * @param {string} recordId - Record ID
   * @param {string} relatedListName - Related list API name (e.g., 'Partner_Dependents', 'Deals')
   * @param {string} fields - Optional comma-separated list of fields to retrieve. If not provided, will use default fields based on related list type.
   * @returns {Promise<Array>} Array of related records
   */
  async getRelatedRecords(moduleName, recordId, relatedListName, fields = null) {
    try {
      // Determine fields based on related list type if not provided
      // Based on actual Zoho API response structure
      if (!fields) {
        if (relatedListName === 'Partner_Dependents') {
          // Fields we actually need from the response
          fields = 'id,First_Name,Name,Last_Name,Relationship_to_Applicant,Date_of_Birth,Gender,Email,Citizenship,Is_Applicant,Is_Non_Migrating,Non_Migrating';
        } else if (relatedListName === 'Deals') {
          // Fields for Deals/Applications
          fields = 'id,Deal_Name,DealName,Visa_Type,Deal_Stage,Stage,Amount,Closing_Date,Probability,Account_Name,Contact_Name,Owner,Modified_Time,Last_Activity_Time';
        } else if (relatedListName === 'Matter_Documents') {
          // Fields for Matter_Documents - include multiple name field variations, document_Serial for sorting, and Comments/Decline_Reason fields
          fields = 'id,Matter_Document_Name,Document_Name,Name,Document_Status,Created_Time,File_Name,File_Size,Modified_Time,Owner,Parent_Id,document_Serial,Comments,Rejection_Comments,Decline_Reason';
        } else if (relatedListName === 'Client_Messages') {
          // Fields for Client_Messages
          fields = 'id,Name,Message_from_Client,Reply_Message,Time_Sent,Time_Replied,Created_Time,Modified_Time';
        } else {
          // Default: get id and basic fields
          fields = 'id';
        }
      }
      
      console.log(`🔍 Fetching related records: GET /${moduleName}/${recordId}/${relatedListName}?fields=${fields}`);
      
      const response = await this.makeRequest(
        'get',
        `/${moduleName}/${recordId}/${relatedListName}`,
        null,
        { fields } // Pass fields as query parameter
      );
      
      // Log raw response structure for debugging
      console.log(`📦 Raw response for ${moduleName}/${recordId}/${relatedListName}:`, JSON.stringify(response, null, 2));
      
      // Handle different possible response structures:
      // 1. { data: [...] } - v7 API standard format
      // 2. [...] - direct array (sometimes returned)
      // 3. { data: { data: [...] } } - nested structure
      let records = [];
      
      if (Array.isArray(response)) {
        // Response is already an array
        records = response;
      } else if (response?.data) {
        // Response has a data property
        if (Array.isArray(response.data)) {
          records = response.data;
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          // Nested data structure
          records = response.data.data;
        }
      }
      
      console.log(`✅ Found ${records.length} related records in ${relatedListName}`);
      
      if (records.length > 0) {
        console.log(`📋 First record sample:`, JSON.stringify(records[0], null, 2));
      }
      
      return records;
    } catch (error) {
      // Handle different error cases
      if (error.response?.status === 204 || error.response?.data?.code === 'NO_DATA') {
        console.log(`📭 No related records found for ${relatedListName} (204 or NO_DATA)`);
        return [];
      }
      if (error.status === 204 || error.code === 'NO_DATA') {
        console.log(`📭 No related records found for ${relatedListName}`);
        return [];
      }
      console.error(`❌ Error fetching related records from ${relatedListName}:`, error.message);
      console.error('Error details:', error.response?.data || error.details || error);
      // Return empty array instead of throwing to prevent blocking the flow
      return [];
    }
  }

  /**
   * Create a related record in a related list
   * @param {string} moduleName - Module name (e.g., 'Contacts')
   * @param {string} recordId - Record ID
   * @param {string} relatedListName - Related list API name (e.g., 'Partner_Dependents')
   * @param {Object} relatedData - Data for the related record
   * @returns {Promise<Object>} Created record
   */
  async createRelatedRecord(moduleName, recordId, relatedListName, relatedData) {
    try {
      const response = await this.makeRequest(
        'post',
        `/${moduleName}/${recordId}/${relatedListName}`,
        {
          data: [relatedData],
        }
      );
      // v7 API returns { data: [{...}] } - get first element
      return response.data?.[0] || null;
    } catch (error) {
      console.error(`Error creating related record in ${relatedListName}:`, error.message);
      throw error;
    }
  }

  /**
   * Update a related record in a related list
   * @param {string} moduleName - Module name (e.g., 'Contacts')
   * @param {string} recordId - Record ID
   * @param {string} relatedListName - Related list API name (e.g., 'Partner_Dependents')
   * @param {string} relatedRecordId - Related record ID to update
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated record
   */
  async updateRelatedRecord(moduleName, recordId, relatedListName, relatedRecordId, updateData) {
    try {
      const response = await this.makeRequest(
        'put',
        `/${moduleName}/${recordId}/${relatedListName}`,
        {
          data: [{
            id: relatedRecordId,
            ...updateData,
          }],
        }
      );
      // v7 API returns { data: [{...}] } - get first element
      return response.data?.[0] || null;
    } catch (error) {
      console.error(`Error updating related record in ${relatedListName}:`, error.message);
      throw error;
    }
  }

  /**
   * Delete a related record from a related list
   * @param {string} moduleName - Module name (e.g., 'Contacts')
   * @param {string} recordId - Record ID
   * @param {string} relatedListName - Related list API name (e.g., 'Partner_Dependents')
   * @param {string} relatedRecordId - Related record ID to delete
   * @returns {Promise<boolean>} Success status
   */
  async deleteRelatedRecord(moduleName, recordId, relatedListName, relatedRecordId) {
    try {
      await this.makeRequest(
        'delete',
        `/${moduleName}/${recordId}/${relatedListName}/${relatedRecordId}`
      );
      return true;
    } catch (error) {
      console.error(`Error deleting related record from ${relatedListName}:`, error.message);
      throw error;
    }
  }

  normalizeDependentText(value) {
    return String(value || '').trim().toLowerCase();
  }

  normalizeDependentDate(value) {
    return String(value || '').trim();
  }

  buildDependentMatchKey(dependent) {
    const firstName = this.normalizeDependentText(dependent?.firstName || dependent?.First_Name);
    const lastName = this.normalizeDependentText(dependent?.lastName || dependent?.Last_Name || dependent?.Name);
    const relationship = this.normalizeDependentText(
      dependent?.relationship || dependent?.Relationship_to_Applicant || dependent?.Relationship
    );
    const dateOfBirth = this.normalizeDependentDate(dependent?.dateOfBirth || dependent?.Date_of_Birth);
    return `${firstName}|${lastName}|${dateOfBirth}|${relationship}`;
  }

  mapDependentToZohoFields(dep) {
    return {
      First_Name: dep.firstName || '',
      Last_Name: dep.lastName || '',
      Relationship: dep.relationship || '',
      Date_of_Birth: dep.dateOfBirth || '',
      Citizenship: dep.citizenship || '',
      Is_Applicant: dep.isApplicant || false,
      Non_Migrating: dep.isNonMigrating || false,
    };
  }

  mapIntakeProfileToPartnerDependentFields(profile, contactId) {
    const monthMap = {
      january: '01',
      february: '02',
      march: '03',
      april: '04',
      may: '05',
      june: '06',
      july: '07',
      august: '08',
      september: '09',
      october: '10',
      november: '11',
      december: '12',
    };
    const relationshipMap = {
      spouse: 'Spouse',
      child: 'Children',
    };

    const fields = {
      Contact_Name: contactId ? { id: contactId } : undefined,
      First_Name: profile?.given_names,
      Name: profile?.family_name,
      Relationship_to_Applicant: relationshipMap[profile?.relationship] || (profile?.relationship === 'other' ? 'Other' : undefined),
      Gender: ['Male', 'Female'].includes(profile?.gender) ? profile.gender : undefined,
      Is_Applicant: profile?.isApplicant === true,
    };

    // Only set Non_Migrating if explicitly true (for non-migrating members)
    if (profile?.isNonMigrating === true) {
      fields.Non_Migrating = true;
    }

    const year = String(profile?.birth_year || '').trim();
    const day = String(profile?.birth_day || '').trim().padStart(2, '0');
    const rawMonth = String(profile?.birth_month || '').trim();
    const month = monthMap[rawMonth.toLowerCase()] || rawMonth.padStart(2, '0');
    if (year && month && day) {
      fields.Date_of_Birth = `${year}-${month}-${day}`;
    }

    return Object.fromEntries(
      Object.entries(fields).filter(([, value]) => {
        if (value === undefined || value === null) return false;
        if (typeof value === 'string' && value.trim() === '') return false;
        return true;
      })
    );
  }

  hasDependentFieldChanges(existingDep, mappedIncomingDep) {
    const normalize = (v) => String(v || '').trim();
    return (
      normalize(existingDep.First_Name) !== normalize(mappedIncomingDep.First_Name) ||
      normalize(existingDep.Last_Name) !== normalize(mappedIncomingDep.Last_Name) ||
      normalize(existingDep.Relationship_to_Applicant || existingDep.Relationship) !== normalize(mappedIncomingDep.Relationship) ||
      normalize(existingDep.Date_of_Birth) !== normalize(mappedIncomingDep.Date_of_Birth) ||
      normalize(existingDep.Citizenship) !== normalize(mappedIncomingDep.Citizenship) ||
      Boolean(existingDep.Is_Applicant) !== Boolean(mappedIncomingDep.Is_Applicant) ||
      Boolean(existingDep.Non_Migrating ?? existingDep.Is_Non_Migrating) !==
        Boolean(mappedIncomingDep.Non_Migrating ?? mappedIncomingDep.Is_Non_Migrating)
    );
  }

  /**
   * Reverse-map a Zoho Partner_Dependents record to application-friendly format.
   * Used by the GET /api/intake/dependents endpoint.
   * @param {Object} zohoRecord — raw CRM record from getRelatedRecords
   * @returns {Object} Application-friendly dependent object
   */
  mapZohoDependentToAppFields(zohoRecord) {
    const relationshipReverseMap = {
      'spouse': 'spouse',
      'children': 'child',
      'child': 'child',
      'other': 'other',
    };
    const dobParts = (zohoRecord.Date_of_Birth || '').split('-');
    const relationship = relationshipReverseMap[
      String(zohoRecord.Relationship_to_Applicant || '').trim().toLowerCase()
    ] || 'other';

    return {
      zohoDependentId: zohoRecord.id,
      given_names: zohoRecord.First_Name || '',
      family_name: zohoRecord.Last_Name || zohoRecord.Name || '',
      relationship,
      birth_year: dobParts[0] || '',
      birth_month: dobParts[1] || '',
      birth_day: dobParts[2] || '',
      gender: zohoRecord.Gender || '',
      citizenship: zohoRecord.Citizenship || '',
      email: zohoRecord.Email || '',
      isApplicant: zohoRecord.Is_Applicant === true || zohoRecord.Is_Applicant === 'true',
      isNonMigrating:
        zohoRecord.Non_Migrating === true ||
        zohoRecord.Non_Migrating === 'true' ||
        zohoRecord.Is_Non_Migrating === true ||
        zohoRecord.Is_Non_Migrating === 'true',
    };
  }

  /**
   * Sync dependencies to Partner_Dependents related list
   * This reuses existing dependents and only creates/updates when needed
   * @param {string} contactId - Contact ID
   * @param {Array} dependencies - Array of dependency objects
   * @returns {Promise<Object>} Sync summary and processed records
   */
  async syncDependencies(contactId, dependencies) {
    try {
      const relatedListName = 'Partner_Dependents';
      const incomingDependencies = Array.isArray(dependencies) ? dependencies : [];
      const existingDependents = await this.getRelatedRecords('Contacts', contactId, relatedListName);
      console.log(`📋 Found ${existingDependents.length} existing dependents`);

      const summary = {
        created: 0,
        updated: 0,
        skipped: 0,
        existingCount: existingDependents.length,
        incomingCount: incomingDependencies.length,
      };

      const processedDependents = [];
      const existingByKey = new Map();
      for (const existing of existingDependents) {
        const existingKey = this.buildDependentMatchKey(existing);
        if (existingKey && !existingByKey.has(existingKey)) {
          existingByKey.set(existingKey, existing);
        }
      }

      const seenIncomingKeys = new Set();
      for (const dep of incomingDependencies) {
        const depKey = this.buildDependentMatchKey(dep);
        if (!depKey || depKey === '|||') {
          summary.skipped += 1;
          console.warn('⚠️ Skipping dependent with empty identity key');
          continue;
        }
        if (seenIncomingKeys.has(depKey)) {
          summary.skipped += 1;
          console.log(`↩️ Skipping duplicate dependent in payload: ${dep.firstName || ''} ${dep.lastName || ''}`);
          continue;
        }
        seenIncomingKeys.add(depKey);

        const mappedIncomingDep = this.mapDependentToZohoFields(dep);
        const existingMatch = existingByKey.get(depKey);
        if (!existingMatch) {
          try {
            const created = await this.createRelatedRecord('Contacts', contactId, relatedListName, mappedIncomingDep);
            if (created) {
              processedDependents.push(created);
              summary.created += 1;
              console.log(`✅ Created dependent: ${dep.firstName || ''} ${dep.lastName || ''}`);
            }
          } catch (error) {
            console.error(`❌ Failed to create dependent ${dep.firstName || ''} ${dep.lastName || ''}:`, error.message);
          }
          continue;
        }

        if (existingMatch.id && this.hasDependentFieldChanges(existingMatch, mappedIncomingDep)) {
          try {
            const updated = await this.updateRelatedRecord(
              'Contacts',
              contactId,
              relatedListName,
              existingMatch.id,
              mappedIncomingDep
            );
            if (updated) {
              processedDependents.push(updated);
            }
            summary.updated += 1;
            console.log(`♻️ Updated existing dependent: ${dep.firstName || ''} ${dep.lastName || ''}`);
          } catch (error) {
            console.error(`❌ Failed to update dependent ${dep.firstName || ''} ${dep.lastName || ''}:`, error.message);
          }
        } else {
          summary.skipped += 1;
          processedDependents.push(existingMatch);
          console.log(`✅ Reused existing dependent: ${dep.firstName || ''} ${dep.lastName || ''}`);
        }
      }

      console.log('✅ Dependent sync summary:', summary);
      return {
        ...summary,
        records: processedDependents,
      };
    } catch (error) {
      console.error('❌ Error syncing dependencies:', error.message);
      throw error;
    }
  }

  /**
   * Upload a file as an attachment to a Zoho CRM record
   * @param {string} moduleName - Module name (e.g., 'Deals', 'Contacts')
   * @param {string} recordId - Record ID (e.g., Deal ID)
   * @param {Buffer|Stream} fileBuffer - File buffer to upload
   * @param {string} fileName - File name (must include extension)
   * @param {string} contentType - Content type (e.g., 'image/jpeg', 'application/pdf')
   * @returns {Promise<Object>} Upload response from Zoho
   */
  async uploadAttachment(moduleName, recordId, fileBuffer, fileName, contentType = null) {
    try {
      const token = await this.getAccessToken();
      
      if (!token) {
        throw new Error('No Zoho access token available');
      }

      // Use v8 API for attachments as per Zoho documentation
      const datacenter = process.env.ZOHO_DATACENTER || 'com.au';
      const baseURL = `https://www.zohoapis.${datacenter}/crm/v8`;
      
      // Create FormData for file upload (server-side only)
      // Match curl format: -F "file=@filename"
      const formData = new FormData();
      
      // Append file buffer - form-data accepts Buffer directly
      // Third parameter is filename (required for file uploads)
      formData.append('file', fileBuffer, fileName);

      // Get headers from form-data (includes Content-Type with boundary)
      // Don't override Content-Type - let form-data set it with boundary
      const formHeaders = formData.getHeaders();

      console.log(`📤 Uploading attachment to ${baseURL}/${moduleName}/${recordId}/Attachments`);
      console.log(`📄 File: ${fileName}, Size: ${fileBuffer.length} bytes`);

      const response = await axios.post(
        `${baseURL}/${moduleName}/${recordId}/Attachments`,
        formData,
        {
          headers: {
            ...formHeaders,
            Authorization: `Zoho-oauthtoken ${token}`,
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }
      );

      console.log(`✅ File uploaded successfully to ${moduleName}/${recordId}`);
      console.log(`📦 Upload response:`, JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.error(`❌ Error uploading attachment to ${moduleName}/${recordId}:`, error.message);
      console.error('Error details:', error.response?.data || error);
      console.error('Error status:', error.response?.status);
      console.error('Error headers:', error.response?.headers);
      throw error;
    }
  }
}

// Export both the class and a singleton instance
export { ZohoCRMClient };
export default new ZohoCRMClient();
