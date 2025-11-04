import { NextResponse } from 'next/server';
import { ZohoCRMClient } from '@/lib/zohoClient';
import { getAdapter } from '@/lib/adapters';

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
    const db = getAdapter();
    const applicationsFromZoho = [];

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

        // Map deal stage to application status
        // StatusBadge expects: "Draft", "Submitted", "In progress", "Approved", "Rejected"
        // Based on the deals: "Needs Analysis", "Value Proposition" are early stages -> "Draft"
        const mapDealStageToStatus = (stage) => {
          if (!stage) return 'Draft';
          const stageLower = stage.toLowerCase();
          if (stageLower.includes('won') || stageLower.includes('closed') || stageLower.includes('approved')) return 'Approved';
          if (stageLower.includes('lost') || stageLower.includes('cancelled') || stageLower.includes('rejected')) return 'Rejected';
          if (stageLower.includes('submitted') || stageLower.includes('lodged')) return 'Submitted';
          // Early stages (Needs Analysis, Value Proposition, Qualification) -> Draft
          if (stageLower.includes('needs analysis') || stageLower.includes('value proposition') || stageLower.includes('qualification')) return 'Draft';
          // Other active stages -> In progress
          return 'In progress';
        };

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
          status: mapDealStageToStatus(deal.Stage || deal.Deal_Stage || 'draft'),
          closingDate: deal.Closing_Date || '',
          updated: formatDate(deal.Modified_Time || deal.Last_Activity_Time),
          lastUpdated: deal.Modified_Time || deal.Last_Activity_Time || now.toISOString(),
          zohoId: deal.id,
          userId: userId,
        };

        // Check if application already exists in Firebase by zohoId
        const existingApps = await db.loadApplications(userId);
        const existingApp = existingApps?.find(app => app.zohoId === deal.id);

        let appId;
        let isNew = false;

        if (existingApp) {
          // Application exists - keep the existing Firebase id
          appId = existingApp.id;
          console.log(`🔄 Application already exists in Firebase with id ${appId}, updating...`);

          // Update with Zoho data (keep existing Firebase id)
          await db.updateApplication(appId, {
            ...applicationData,
            id: appId,
          });

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

          await db.createApplication(newApp);

          applicationData.id = appId;
          applicationData.createdAt = now.toISOString();
        }

        applicationsFromZoho.push(applicationData);
        console.log(`✅ ${isNew ? 'Created' : 'Updated'} application ${appId} from Deal ${deal.id}`);
      } catch (dealError) {
        console.error(`⚠️ Failed to process Deal ${deal.id}:`, dealError.message);
        // Continue with other deals even if one fails
      }
    }

    console.log(`✅ Processed ${applicationsFromZoho.length} applications from Zoho CRM`);
    console.log(`📋 Applications saved to Firebase:`, applicationsFromZoho.map(app => ({ id: app.id, reference: app.reference, type: app.type })));

    return NextResponse.json({
      success: true,
      deals: applicationsFromZoho,
      rawDealsData: deals, // Return raw deals JSON for display
      applicationsCount: applicationsFromZoho.length,
      message: `Fetched ${deals.length} deals from Zoho CRM and saved ${applicationsFromZoho.length} applications to Firebase`
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

