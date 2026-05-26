import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { ZohoCRMClient } from '@/lib/zohoClient';
import {
  mapZohoDealToVisaTypeCode,
  normalizeSkillsInDemandTypeLabel,
} from '@/lib/visaDisplay';

// Firebase REST API helper - uses the web API key with user's ID token for authentication
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

const inFlightSyncs = new Map();

function getAuthHeaders(idToken) {
  const headers = { 'Content-Type': 'application/json' };
  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`;
  }
  return headers;
}

function buildRequestMeta({ userId, zohoContactId, source }) {
  return {
    requestId: randomUUID().slice(0, 8),
    requestKey: `${userId}:${zohoContactId}`,
    source: source || 'unknown',
    userId,
    zohoContactId,
  };
}

function logSync(meta, message, ...args) {
  console.log(
    `[fetch-zoho-deals:${meta.requestId}] [source:${meta.source}] [key:${meta.requestKey}] ${message}`,
    ...args
  );
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
async function loadApplicationsServer(userId, idToken, requestMeta = null) {
  try {
    // Use structured query to filter by userId
    const queryUrl = `${FIRESTORE_BASE_URL}:runQuery`;
    const response = await fetch(queryUrl, {
      method: 'POST',
      headers: getAuthHeaders(idToken),
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

async function loadApplicationByZohoIdServer(userId, zohoId, idToken, requestMeta = null) {
  try {
    const queryUrl = `${FIRESTORE_BASE_URL}:runQuery`;
    const response = await fetch(queryUrl, {
      method: 'POST',
      headers: getAuthHeaders(idToken),
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'applications' }],
          where: {
            compositeFilter: {
              op: 'AND',
              filters: [
                {
                  fieldFilter: {
                    field: { fieldPath: 'userId' },
                    op: 'EQUAL',
                    value: { stringValue: userId },
                  },
                },
                {
                  fieldFilter: {
                    field: { fieldPath: 'zohoId' },
                    op: 'EQUAL',
                    value: { stringValue: zohoId },
                  },
                },
              ],
            },
          },
          limit: 1,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Firestore zohoId query failed:', errorText);
      if (requestMeta) {
        logSync(requestMeta, `Falling back to local scan for zohoId ${zohoId}`);
      }
      const fallbackApps = await loadApplicationsServer(userId, idToken, requestMeta);
      return fallbackApps.find((app) => app.zohoId === zohoId) || null;
    }

    const results = await response.json();
    const match = results.find((r) => r.document);
    if (!match?.document) return null;

    const docPath = match.document.name;
    const id = docPath.split('/').pop();
    return {
      id,
      ...firestoreDocToObject(match.document),
    };
  } catch (error) {
    console.error('❌ Error loading application by zohoId:', error.message);
    if (requestMeta) {
      logSync(requestMeta, `Falling back to local scan after zohoId query error for ${zohoId}`);
    }
    const fallbackApps = await loadApplicationsServer(userId, idToken, requestMeta);
    return fallbackApps.find((app) => app.zohoId === zohoId) || null;
  }
}

// Create application in Firestore via REST API
async function createApplicationServer(app, userId, idToken) {
  try {
    const docUrl = `${FIRESTORE_BASE_URL}/applications/${app.id}`;
    const now = new Date().toISOString();
    
    const appData = {
      ...app,
      userId: userId,
      publicReviewAccess: true,
      createdAt: now,
      updatedAt: now
    };
    
    const response = await fetch(docUrl, {
      method: 'PATCH',
      headers: getAuthHeaders(idToken),
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
async function updateApplicationServer(id, updates, userId, idToken) {
  try {
    const docUrl = `${FIRESTORE_BASE_URL}/applications/${id}`;
    const now = new Date().toISOString();
    
    const { id: _, ...updateData } = updates;
    const appData = {
      ...updateData,
      userId: userId,
      publicReviewAccess: true,
      updatedAt: now
    };
    
    // Use updateMask to only update specific fields
    const updateMask = Object.keys(appData).map(k => `updateMask.fieldPaths=${k}`).join('&');
    
    const response = await fetch(`${docUrl}?${updateMask}`, {
      method: 'PATCH',
      headers: getAuthHeaders(idToken),
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
async function deleteApplicationServer(id, idToken) {
  try {
    const docUrl = `${FIRESTORE_BASE_URL}/applications/${id}`;
    
    const response = await fetch(docUrl, {
      method: 'DELETE',
      headers: getAuthHeaders(idToken)
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

function buildLegacyApplicationKey(reference, type) {
  return `${reference || ''}::${type || ''}`;
}

function formatApplicationDate(dateString, fallbackDate) {
  if (!dateString) {
    return fallbackDate.toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }
    return date.toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (error) {
    console.warn('Failed to parse date:', dateString, error);
    return fallbackDate.toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}

async function runDealSync({ userId, zohoContactId, idToken, source, requestMeta }) {
  logSync(requestMeta, `Executing sync for contact ${zohoContactId}`);
  const zohoClient = new ZohoCRMClient();
  const deals = await zohoClient.getRelatedRecords('Contacts', zohoContactId, 'Deals');

  if (!deals || deals.length === 0) {
    logSync(requestMeta, 'No deals found in related list; pruning stale CRM-linked applications');
    const existingWhenEmpty = await loadApplicationsServer(userId, idToken, requestMeta);
    let staleRemoved = 0;
    for (const app of existingWhenEmpty || []) {
      if (!app.zohoId) continue;
      try {
        logSync(requestMeta, `Deleting stale CRM application ${app.id} (zohoId: ${app.zohoId})`);
        const del = await deleteApplicationServer(app.id, idToken);
        if (del.success) staleRemoved++;
      } catch (error) {
        console.error(`❌ Failed to remove stale app ${app.id}:`, error.message);
      }
    }

    return {
      success: true,
      deals: [],
      rawDealsData: [],
      message: 'No deals found',
      staleRemoved,
      source,
      requestId: requestMeta.requestId,
      coalesced: false,
    };
  }

  logSync(requestMeta, `Found ${deals.length} deals in related list`);
  console.log('📦 Raw deals JSON data:', JSON.stringify(deals, null, 2));

  const applicationsFromZoho = [];
  logSync(requestMeta, 'Loading existing applications from Firebase');
  const existingApps = await loadApplicationsServer(userId, idToken, requestMeta);
  logSync(requestMeta, `Found ${existingApps?.length || 0} existing applications in Firebase`);

  const existingById = new Map();
  const existingByZohoId = new Map();
  const legacyByReferenceType = new Map();

  const cacheApplication = (app) => {
    if (!app?.id) return;
    existingById.set(app.id, app);
    if (app.zohoId) {
      existingByZohoId.set(app.zohoId, app);
    } else {
      legacyByReferenceType.set(buildLegacyApplicationKey(app.reference, app.type), app);
    }
  };

  for (const app of existingApps) {
    cacheApplication(app);
  }

  for (const deal of deals) {
    try {
      const dealName = deal.Deal_Name || deal.DealName || '';
      const extractVisaType = (name) => {
        if (!name) return null;
        const match = name.match(/-\s*([^-]+?)\s*\(/i) || name.match(/-\s*([^-]+?)$/i);
        return match && match[1] ? match[1].trim() : null;
      };

      let visaType = deal.Visa_Type || extractVisaType(dealName) || 'Visa Application';
      visaType = normalizeSkillsInDemandTypeLabel(visaType);
      const visaTypeCode = mapZohoDealToVisaTypeCode(deal);
      const now = new Date();
      const stage = deal.Stage || deal.Deal_Stage || 'Draft';
      const dealId = String(deal.id);

      const applicationData = {
        reference: dealName,
        type: visaType,
        visaTypeCode,
        status: stage,
        closingDate: deal.Closing_Date || '',
        updated: formatApplicationDate(deal.Modified_Time || deal.Last_Activity_Time, now),
        lastUpdated: deal.Modified_Time || deal.Last_Activity_Time || now.toISOString(),
        zohoId: dealId,
        userId,
      };

      let existingApp = existingByZohoId.get(dealId) || null;
      if (!existingApp) {
        existingApp = await loadApplicationByZohoIdServer(userId, dealId, idToken, requestMeta);
        if (existingApp) {
          logSync(requestMeta, `Found live existing application by zohoId ${dealId}: ${existingApp.id}`);
          cacheApplication(existingApp);
        }
      }

      if (!existingApp) {
        const legacyKey = buildLegacyApplicationKey(dealName, visaType);
        existingApp = legacyByReferenceType.get(legacyKey) || null;
        if (existingApp) {
          logSync(requestMeta, `Found legacy application by reference/type match: ${existingApp.id}`);
        }
      }

      let appId;
      let isNew = false;
      let syncedApp;

      if (existingApp) {
        appId = existingApp.id;
        logSync(
          requestMeta,
          `Updating existing application ${appId} for deal ${dealId} (zohoId: ${existingApp.zohoId || 'none'})`
        );
        const updateResult = await updateApplicationServer(
          appId,
          { ...applicationData, id: appId },
          userId,
          idToken
        );
        console.log('💾 Update result:', updateResult);

        if (!updateResult.success) {
          throw new Error(`Failed to update application: ${updateResult.error}`);
        }

        syncedApp = {
          ...existingApp,
          ...applicationData,
          id: appId,
          createdAt: existingApp.createdAt || now.toISOString(),
          updatedAt: updateResult.application?.updatedAt || now.toISOString(),
        };
      } else {
        const liveApp = await loadApplicationByZohoIdServer(userId, dealId, idToken, requestMeta);
        if (liveApp) {
          logSync(requestMeta, `Detected application created concurrently for zohoId ${dealId}; updating ${liveApp.id}`);
          const updateResult = await updateApplicationServer(
            liveApp.id,
            { ...applicationData, id: liveApp.id },
            userId,
            idToken
          );
          console.log('💾 Update result:', updateResult);

          if (!updateResult.success) {
            throw new Error(`Failed to update application: ${updateResult.error}`);
          }

          appId = liveApp.id;
          syncedApp = {
            ...liveApp,
            ...applicationData,
            id: appId,
            createdAt: liveApp.createdAt || now.toISOString(),
            updatedAt: updateResult.application?.updatedAt || now.toISOString(),
          };
        } else {
          const { nanoid } = await import('nanoid');
          appId = nanoid(12);
          isNew = true;
          logSync(requestMeta, `Creating new application ${appId} from deal ${dealId}`);

          const newApp = {
            id: appId,
            ...applicationData,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
          };

          console.log('💾 Saving new application to Firebase:', JSON.stringify(newApp, null, 2));
          const createResult = await createApplicationServer(newApp, userId, idToken);
          console.log('💾 Create result:', createResult);

          if (!createResult.success) {
            throw new Error(`Failed to create application: ${createResult.error}`);
          }

          syncedApp = {
            ...newApp,
            publicReviewAccess: true,
          };
        }
      }

      cacheApplication(syncedApp);
      applicationsFromZoho.push({
        id: syncedApp.id,
        reference: syncedApp.reference,
        type: syncedApp.type,
        visaTypeCode: syncedApp.visaTypeCode,
        status: syncedApp.status,
        closingDate: syncedApp.closingDate,
        updated: syncedApp.updated,
        lastUpdated: syncedApp.lastUpdated,
        zohoId: syncedApp.zohoId,
        userId: syncedApp.userId,
        createdAt: syncedApp.createdAt,
        updatedAt: syncedApp.updatedAt,
      });
      logSync(
        requestMeta,
        `${isNew ? 'Created' : 'Updated'} application ${syncedApp.id} from deal ${dealId} (zohoId: ${dealId})`
      );
    } catch (dealError) {
      console.error(`❌ Failed to process Deal ${deal.id}:`, dealError);
      console.error(`❌ Error stack:`, dealError.stack);
    }
  }

  logSync(requestMeta, `Processed ${applicationsFromZoho.length} applications from Zoho CRM`);
  console.log(
    '📋 Applications saved to Firebase:',
    applicationsFromZoho.map((app) => ({
      id: app.id,
      reference: app.reference,
      type: app.type,
      zohoId: app.zohoId,
    }))
  );

  const finalApps = await loadApplicationsServer(userId, idToken, requestMeta);
  logSync(requestMeta, `Final count in Firebase before cleanup: ${finalApps?.length || 0} applications`);

  const duplicatesByZohoId = [];
  const seenZohoIds = new Map();
  for (const app of finalApps || []) {
    if (!app.zohoId) continue;
    if (seenZohoIds.has(app.zohoId)) {
      duplicatesByZohoId.push(app);
    } else {
      seenZohoIds.set(app.zohoId, app);
    }
  }

  let removedCount = 0;
  if (duplicatesByZohoId.length > 0) {
    logSync(requestMeta, `Found ${duplicatesByZohoId.length} duplicate applications by zohoId. Removing duplicates...`);
    for (const duplicate of duplicatesByZohoId) {
      try {
        logSync(
          requestMeta,
          `Deleting duplicate application ${duplicate.id} (zohoId: ${duplicate.zohoId}, reference: ${duplicate.reference})`
        );
        const deleteResult = await deleteApplicationServer(duplicate.id, idToken);
        if (deleteResult.success) removedCount++;
      } catch (deleteError) {
        console.error(`❌ Failed to delete duplicate ${duplicate.id}:`, deleteError.message);
      }
    }
    logSync(requestMeta, `Removed ${removedCount} duplicate applications`);
  }

  const currentDealZohoIds = new Set(deals.map((deal) => String(deal.id)));
  let orphansRemoved = 0;
  const appsAfterDupes = await loadApplicationsServer(userId, idToken, requestMeta);
  for (const app of appsAfterDupes || []) {
    if (!app.zohoId || currentDealZohoIds.has(app.zohoId)) continue;
    try {
      logSync(
        requestMeta,
        `Removing application not in current Zoho CRM deal list: ${app.id} (zohoId: ${app.zohoId}, reference: ${app.reference || ''})`
      );
      const deleteResult = await deleteApplicationServer(app.id, idToken);
      if (deleteResult.success) orphansRemoved++;
    } catch (error) {
      console.error(`❌ Failed to remove orphan application ${app.id}:`, error.message);
    }
  }

  if (orphansRemoved > 0) {
    logSync(requestMeta, `Removed ${orphansRemoved} application(s) not present in current CRM deals`);
  }

  const finalAppsAfterCleanup = await loadApplicationsServer(userId, idToken, requestMeta);
  logSync(requestMeta, `Final count in Firebase after cleanup: ${finalAppsAfterCleanup?.length || 0} applications`);

  return {
    success: true,
    deals: applicationsFromZoho,
    rawDealsData: deals,
    applicationsCount: applicationsFromZoho.length,
    finalCount: finalAppsAfterCleanup?.length || 0,
    duplicatesFound: duplicatesByZohoId.length,
    duplicatesRemoved: removedCount,
    orphansRemoved,
    source,
    requestId: requestMeta.requestId,
    coalesced: false,
    message: `Fetched ${deals.length} deals from Zoho CRM, synced ${applicationsFromZoho.length} applications, removed ${removedCount} duplicate(s) and ${orphansRemoved} stale application(s) (final count: ${finalAppsAfterCleanup?.length || 0})`,
  };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, zohoContactId, idToken, source = 'unknown' } = body;

    if (!userId || !zohoContactId) {
      return NextResponse.json(
        { success: false, error: 'userId and zohoContactId are required' },
        { status: 400 }
      );
    }

    const requestMeta = buildRequestMeta({ userId, zohoContactId, source });
    const inFlight = inFlightSyncs.get(requestMeta.requestKey);
    if (inFlight) {
      logSync(requestMeta, 'Coalescing onto existing in-flight sync');
      const sharedResult = await inFlight;
      return NextResponse.json({
        ...sharedResult,
        coalesced: true,
        requestId: requestMeta.requestId,
      });
    }

    const syncPromise = runDealSync({ userId, zohoContactId, idToken, source, requestMeta });
    inFlightSyncs.set(requestMeta.requestKey, syncPromise);

    try {
      const result = await syncPromise;
      return NextResponse.json(result);
    } finally {
      if (inFlightSyncs.get(requestMeta.requestKey) === syncPromise) {
        inFlightSyncs.delete(requestMeta.requestKey);
      }
    }
  } catch (error) {
    console.error('❌ Error fetching deals from Zoho CRM:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch deals from Zoho CRM',
        rawDealsData: null,
      },
      { status: 500 }
    );
  }
}
