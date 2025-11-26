import { NextResponse } from 'next/server';
import { ZohoCRMClient } from '@/lib/zohoClient';
import {
  loadApplicationsAdmin,
  createApplicationAdmin,
  updateApplicationAdmin,
  deleteApplicationAdmin
} from '@/lib/firebase-admin-helpers';
import { isAdminSDKInitialized } from '@/lib/firebase-admin';

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, zohoContactId } = body;

    if (!userId || !zohoContactId) {
      return NextResponse.json(
        { success: false, error: 'userId and zohoContactId are required' },
        { status: 400 }
      );
    }

    // Check if Admin SDK is properly initialized
    if (!isAdminSDKInitialized()) {
      console.warn('⚠️ Firebase Admin SDK is not initialized - Zoho sync unavailable');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Zoho sync unavailable: Firebase Admin SDK is not configured. Applications can still be loaded from Firestore.',
          requiresSetup: true,
          message: 'To enable Zoho sync, set FIREBASE_SERVICE_ACCOUNT_KEY environment variable with your Firebase service account JSON.'
        },
        { status: 200 } // Return 200 instead of 500 since this is expected behavior
      );
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

    // Save deals to Firebase as applications using Admin SDK
    const applicationsFromZoho = [];

    // Load all existing applications ONCE before the loop to avoid duplicates
    console.log('📋 Loading existing applications from Firebase (Admin SDK)...');
    let existingApps = [];
    try {
      existingApps = await loadApplicationsAdmin(userId);
      console.log(`📋 Found ${existingApps?.length || 0} existing applications in Firebase`);
    } catch (adminError) {
      console.error('❌ Failed to load applications with Admin SDK:', adminError.message);
      console.error('💡 This usually means FIREBASE_SERVICE_ACCOUNT_KEY is not set');
      console.error('💡 Returning empty array - applications will be created but may not sync properly');
      // Continue with empty array - we'll still try to create/update applications
      existingApps = [];
    }

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
          console.log(`💾 Updating existing application in Firebase (Admin SDK):`, appId);
          const updateResult = await updateApplicationAdmin(appId, {
            ...applicationData,
            id: appId,
            // Preserve any existing questionnaire data or other Firebase-only fields
            // The updateApplicationAdmin method will merge these updates with existing data
          }, userId);
          console.log(`💾 Update result:`, updateResult);
          
          if (!updateResult.success) {
            console.error(`❌ Failed to update application ${appId}:`, updateResult.error);
            // Continue with next deal instead of throwing - we'll log the error but not fail the entire sync
            continue;
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

          console.log(`💾 Saving new application to Firebase (Admin SDK):`, JSON.stringify(newApp, null, 2));
          const createResult = await createApplicationAdmin(newApp, userId);
          console.log(`💾 Create result:`, createResult);
          
          if (!createResult.success) {
            console.error(`❌ Failed to create application ${appId}:`, createResult.error);
            // Continue with next deal instead of throwing - we'll log the error but not fail the entire sync
            continue;
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
    let finalApps = [];
    try {
      finalApps = await loadApplicationsAdmin(userId);
      console.log(`📊 Final count in Firebase before cleanup: ${finalApps?.length || 0} applications`);
    } catch (adminError) {
      console.error('❌ Failed to load final applications count:', adminError.message);
      finalApps = applicationsFromZoho; // Use the apps we just processed
    }
    
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
          const deleteResult = await deleteApplicationAdmin(duplicate.id);
          if (deleteResult.success) {
            removedCount++;
          } else {
            console.error(`❌ Failed to delete duplicate ${duplicate.id}:`, deleteResult.error);
          }
        } catch (deleteError) {
          console.error(`❌ Failed to delete duplicate ${duplicate.id}:`, deleteError.message);
        }
      }
      
      console.log(`✅ Removed ${removedCount} duplicate applications`);
    }
    
    // Reload to get final count after cleanup
    let finalAppsAfterCleanup = [];
    try {
      finalAppsAfterCleanup = await loadApplicationsAdmin(userId);
      console.log(`📊 Final count in Firebase after cleanup: ${finalAppsAfterCleanup?.length || 0} applications`);
    } catch (adminError) {
      console.error('❌ Failed to load final applications count after cleanup:', adminError.message);
      finalAppsAfterCleanup = finalApps; // Use previous count
    }

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

