import { NextResponse } from 'next/server';
import { ZohoCRMClient } from '@/lib/zohoClient';

// Firebase REST API helper - uses the web API key with user's ID token for authentication
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

// Store for ID token (passed from client)
let currentIdToken = null;

function setIdToken(token) {
  currentIdToken = token;
}

function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (currentIdToken) {
    headers['Authorization'] = `Bearer ${currentIdToken}`;
  }
  return headers;
}

// Convert Firestore document to plain object
function firestoreDocToObject(doc) {
  const fields = doc.fields || {};
  const result = {};
  
  for (const [key, value] of Object.entries(fields)) {
    if (value.stringValue !== undefined) result[key] = value.stringValue;
    else if (value.integerValue !== undefined) result[key] = parseInt(value.integerValue);
    else if (value.doubleValue !== undefined) result[key] = value.doubleValue;
    else if (value.booleanValue !== undefined) result[key] = value.booleanValue;
    else if (value.timestampValue !== undefined) result[key] = value.timestampValue;
    else if (value.nullValue !== undefined) result[key] = null;
    else if (value.arrayValue !== undefined) result[key] = (value.arrayValue.values || []).map(v => firestoreDocToObject({ fields: { _: v } })._);
    else if (value.mapValue !== undefined) result[key] = firestoreDocToObject(value.mapValue);
  }
  
  return result;
}

// Convert plain object to Firestore document format
function objectToFirestoreDoc(obj) {
  const fields = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      fields[key] = { nullValue: null };
    } else if (typeof value === 'string') {
      fields[key] = { stringValue: value };
    } else if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        fields[key] = { integerValue: value.toString() };
      } else {
        fields[key] = { doubleValue: value };
      }
    } else if (typeof value === 'boolean') {
      fields[key] = { booleanValue: value };
    } else if (Array.isArray(value)) {
      fields[key] = { arrayValue: { values: value.map(v => objectToFirestoreDoc({ _: v }).fields._) } };
    } else if (typeof value === 'object') {
      fields[key] = { mapValue: { fields: objectToFirestoreDoc(value).fields } };
    }
  }
  
  return { fields };
}

// Load applications from Firestore via REST API
async function loadApplicationsServer(userId) {
  try {
    // Use structured query to filter by userId
    const queryUrl = `${FIRESTORE_BASE_URL}:runQuery`;
    const response = await fetch(queryUrl, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'applications' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'userId' },
              op: 'EQUAL',
              value: { stringValue: userId }
            }
          }
        }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Firestore query failed:', errorText);
      return [];
    }
    
    const results = await response.json();
    
    // Filter out empty results (Firestore returns array with one empty object if no results)
    const applications = results
      .filter(r => r.document)
      .map(r => {
        const docPath = r.document.name;
        const id = docPath.split('/').pop();
        return {
          id,
          ...firestoreDocToObject(r.document)
        };
      });
    
    return applications;
  } catch (error) {
    console.error('❌ Error loading applications:', error.message);
    return [];
  }
}

// Create application in Firestore via REST API
async function createApplicationServer(app, userId) {
  try {
    const docUrl = `${FIRESTORE_BASE_URL}/applications/${app.id}`;
    const now = new Date().toISOString();
    
    const appData = {
      ...app,
      userId: userId,
      createdAt: now,
      updatedAt: now
    };
    
    const response = await fetch(docUrl, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(objectToFirestoreDoc(appData))
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Firestore create failed:', errorText);
      return { success: false, error: errorText };
    }
    
    console.log(`✅ Application ${app.id} created successfully`);
    return { success: true, application: appData };
  } catch (error) {
    console.error('❌ Error creating application:', error.message);
    return { success: false, error: error.message };
  }
}

// Update application in Firestore via REST API
async function updateApplicationServer(id, updates, userId) {
  try {
    const docUrl = `${FIRESTORE_BASE_URL}/applications/${id}`;
    const now = new Date().toISOString();
    
    const { id: _, ...updateData } = updates;
    const appData = {
      ...updateData,
      userId: userId,
      updatedAt: now
    };
    
    // Use updateMask to only update specific fields
    const updateMask = Object.keys(appData).map(k => `updateMask.fieldPaths=${k}`).join('&');
    
    const response = await fetch(`${docUrl}?${updateMask}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(objectToFirestoreDoc(appData))
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Firestore update failed:', errorText);
      return { success: false, error: errorText };
    }
    
    console.log(`✅ Application ${id} updated successfully`);
    
    const result = await response.json();
    return { success: true, application: { id, ...firestoreDocToObject(result) } };
  } catch (error) {
    console.error('❌ Error updating application:', error.message);
    return { success: false, error: error.message };
  }
}

// Delete application from Firestore via REST API
async function deleteApplicationServer(id) {
  try {
    const docUrl = `${FIRESTORE_BASE_URL}/applications/${id}`;
    
    const response = await fetch(docUrl, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Firestore delete failed:', errorText);
      return { success: false, error: errorText };
    }
    
    console.log(`✅ Application ${id} deleted`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error deleting application:', error.message);
    return { success: false, error: error.message };
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, zohoContactId, idToken } = body;

    if (!userId || !zohoContactId) {
      return NextResponse.json(
        { success: false, error: 'userId and zohoContactId are required' },
        { status: 400 }
      );
    }

    // Set the ID token for authenticated Firestore requests
    if (idToken) {
      setIdToken(idToken);
    }

    console.log(`🔍 Fetching deals for contact ${zohoContactId} from Zoho CRM...`);
    const zohoClient = new ZohoCRMClient();
    
    // Fetch Deals from related list (same way as Partner_Dependents)
    const deals = await zohoClient.getRelatedRecords('Contacts', zohoContactId, 'Deals');
    
    if (!deals || deals.length === 0) {
      console.log('📋 No deals found in Deals related list');
      return NextResponse.json({
        success: true,
        deals: [],
        rawDealsData: [],
        message: 'No deals found'
      });
    }

    console.log(`📋 Found ${deals.length} deals in Deals related list`);
    console.log('📦 Raw deals JSON data:', JSON.stringify(deals, null, 2));

    // Save deals to Firebase as applications
    const applicationsFromZoho = [];

    // Load all existing applications ONCE before the loop to avoid duplicates
    console.log('📋 Loading existing applications from Firebase...');
    const existingApps = await loadApplicationsServer(userId);
    console.log(`📋 Found ${existingApps?.length || 0} existing applications in Firebase`);

    for (const deal of deals) {
      try {
        // Extract Visa Type from Deal_Name or use Visa_Type field
        const dealName = deal.Deal_Name || deal.DealName || '';
        const extractVisaType = (name) => {
          if (!name) return null;
          const match = name.match(/-\s*([^-]+?)\s*\(/i) || name.match(/-\s*([^-]+?)$/i);
          return match && match[1] ? match[1].trim() : null;
        };
        const visaType = deal.Visa_Type || extractVisaType(dealName) || 'Visa Application';
        const now = new Date();

        // Use Stage directly from Zoho CRM (don't map it)
        const stage = deal.Stage || deal.Deal_Stage || 'Draft';

        // Format date from Modified_Time or Last_Activity_Time (format: "26 Sep 2025")
        const formatDate = (dateString) => {
          if (!dateString) {
            return now.toLocaleDateString('en-AU', { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            });
          }
          try {
            // Parse ISO date string (e.g., "2025-09-26T19:54:20+10:00")
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
              throw new Error('Invalid date');
            }
            return date.toLocaleDateString('en-AU', { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            });
          } catch (e) {
            console.warn('Failed to parse date:', dateString, e);
            return now.toLocaleDateString('en-AU', { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            });
          }
        };

        // Convert deal to application format
        const applicationData = {
          reference: dealName,
          type: visaType,
          status: stage, // Use Stage directly from Zoho CRM
          closingDate: deal.Closing_Date || '',
          updated: formatDate(deal.Modified_Time || deal.Last_Activity_Time),
          lastUpdated: deal.Modified_Time || deal.Last_Activity_Time || now.toISOString(),
          zohoId: deal.id,
          userId: userId,
        };

        // Check if application already exists in Firebase by zohoId first, then by reference/type as fallback
        let existingApp = existingApps?.find(app => app.zohoId === deal.id);
        
        // Fallback: If no match by zohoId, try matching by reference and type (for old apps without zohoId)
        if (!existingApp) {
          existingApp = existingApps?.find(app => 
            app.reference === dealName && 
            app.type === visaType &&
            !app.zohoId // Only match old apps that don't have zohoId yet
          );
          if (existingApp) {
            console.log(`🔄 Found existing app by reference/type match (old app without zohoId), will update and add zohoId`);
          }
        }

        let appId;
        let isNew = false;

        if (existingApp) {
          // Application exists - keep the existing Firebase id and preserve Firebase-only fields
          appId = existingApp.id;
          console.log(`🔄 Application already exists in Firebase with id ${appId} (zohoId: ${existingApp.zohoId || 'none'}), updating...`);

          // Update only Zoho-related fields, preserve Firebase-only fields (questionnaire data, notes, etc.)
          // Also ensure zohoId is set (for old apps that don't have it yet)
          console.log(`💾 Updating existing application in Firebase:`, appId);
          const updateResult = await updateApplicationServer(appId, {
            ...applicationData,
            id: appId,
            // Preserve any existing questionnaire data or other Firebase-only fields
            // The updateApplication method should merge these updates with existing data
          }, userId);
          console.log(`💾 Update result:`, updateResult);
          
          if (!updateResult.success) {
            throw new Error(`Failed to update application: ${updateResult.error}`);
          }

          // Update the existing app in our local array so we don't match it again
          const existingIndex = existingApps.findIndex(app => app.id === appId);
          if (existingIndex !== -1) {
            existingApps[existingIndex] = { ...existingApp, ...applicationData, id: appId };
          }

          applicationData.id = appId;
          applicationData.createdAt = existingApp.createdAt || now.toISOString();
        } else {
          // Application doesn't exist - create new one in Firebase
          const { nanoid } = await import('nanoid');
          appId = nanoid(12);
          isNew = true;
          console.log(`➕ Creating new application in Firebase with id ${appId} from Deal ${deal.id}`);

          const newApp = {
            id: appId,
            ...applicationData,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
          };

          console.log(`💾 Saving new application to Firebase:`, JSON.stringify(newApp, null, 2));
          const createResult = await createApplicationServer(newApp, userId);
          console.log(`💾 Create result:`, createResult);
          
          if (!createResult.success) {
            throw new Error(`Failed to create application: ${createResult.error}`);
          }

          applicationData.id = appId;
          applicationData.createdAt = now.toISOString();
          
          // Add to our local array so we don't create duplicates in the same sync
          existingApps.push({
            id: appId,
            ...applicationData
          });
        }

        applicationsFromZoho.push(applicationData);
        console.log(`✅ ${isNew ? 'Created' : 'Updated'} application ${appId} from Deal ${deal.id} (zohoId: ${deal.id})`);
      } catch (dealError) {
        console.error(`❌ Failed to process Deal ${deal.id}:`, dealError);
        console.error(`❌ Error stack:`, dealError.stack);
        // Continue with other deals even if one fails
      }
    }

    console.log(`✅ Processed ${applicationsFromZoho.length} applications from Zoho CRM`);
    console.log(`📋 Applications saved to Firebase:`, applicationsFromZoho.map(app => ({ id: app.id, reference: app.reference, type: app.type, zohoId: app.zohoId })));

    // Verify final count in Firebase to ensure no duplicates
    const finalApps = await loadApplicationsServer(userId);
    console.log(`📊 Final count in Firebase before cleanup: ${finalApps?.length || 0} applications`);
    
    // Find duplicates by zohoId and remove them (keep the first one)
    const duplicatesByZohoId = [];
    const seenZohoIds = new Map();
    
    if (finalApps && finalApps.length > 0) {
      for (const app of finalApps) {
        if (app.zohoId) {
          if (seenZohoIds.has(app.zohoId)) {
            // This is a duplicate - mark for deletion
            duplicatesByZohoId.push(app);
          } else {
            // First occurrence - keep it
            seenZohoIds.set(app.zohoId, app);
          }
        }
      }
    }
    
    // Remove duplicates from Firebase
    let removedCount = 0;
    if (duplicatesByZohoId.length > 0) {
      console.warn(`⚠️ Found ${duplicatesByZohoId.length} duplicate applications by zohoId. Removing duplicates...`);
      
      for (const duplicate of duplicatesByZohoId) {
        try {
          console.log(`🗑️ Deleting duplicate application ${duplicate.id} (zohoId: ${duplicate.zohoId}, reference: ${duplicate.reference})`);
          await deleteApplicationServer(duplicate.id);
          removedCount++;
        } catch (deleteError) {
          console.error(`❌ Failed to delete duplicate ${duplicate.id}:`, deleteError.message);
        }
      }
      
      console.log(`✅ Removed ${removedCount} duplicate applications`);
    }
    
    // Reload to get final count after cleanup
    const finalAppsAfterCleanup = await loadApplicationsServer(userId);
    console.log(`📊 Final count in Firebase after cleanup: ${finalAppsAfterCleanup?.length || 0} applications`);

    return NextResponse.json({
      success: true,
      deals: applicationsFromZoho,
      rawDealsData: deals, // Return raw deals JSON for display
      applicationsCount: applicationsFromZoho.length,
      finalCount: finalAppsAfterCleanup?.length || 0,
      duplicatesFound: duplicatesByZohoId.length,
      duplicatesRemoved: removedCount,
      message: `Fetched ${deals.length} deals from Zoho CRM, synced ${applicationsFromZoho.length} applications, and removed ${removedCount} duplicates (final count: ${finalAppsAfterCleanup?.length || 0})`
    });
  } catch (error) {
    console.error('❌ Error fetching deals from Zoho CRM:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch deals from Zoho CRM',
        rawDealsData: null
      },
      { status: 500 }
    );
  }
}

