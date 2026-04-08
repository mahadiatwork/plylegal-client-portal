import { NextResponse } from 'next/server';
import { ZohoCRMClient } from '@/lib/zohoClient';
import { getAdapter } from '@/lib/adapters';

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, email, contactId, skipSave = false } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const zohoClient = new ZohoCRMClient();
    let contact = null;

    // Try to fetch by contactId first (if available), then by email
    if (contactId) {
      console.log('🔍 Fetching contact by ID:', contactId);
      contact = await zohoClient.getRecord('Contacts', contactId);
    }

    // If not found by ID, try by email
    if (!contact && email) {
      console.log('🔍 Contact not found by ID, searching by email:', email);
      contact = await zohoClient.findContactByEmail(email);
    }

    if (!contact) {
      return NextResponse.json({
        success: false,
        error: 'Contact not found in Zoho CRM',
      }, { status: 404 });
    }

    // Map Zoho contact fields to Firebase profile structure
    // Note: Zoho uses exact field names like First_Name, Last_Name, Mailing_State, etc.
    const profileData = {
      firstName: contact.First_Name || '',
      lastName: contact.Last_Name || '',
      phone: contact.Phone || contact.Mobile || '',
      mobile: contact.Mobile || '',
      streetAddress: contact.Mailing_Street || '',
      suburb: contact.Mailing_Suburb || '',
      // Mailing_State might be null, check Pick_List_1 as fallback (custom field for state)
      state: contact.Mailing_State || contact.Pick_List_1 || '',
      postcode: contact.Mailing_Zip || '',
      country: contact.Mailing_Country || '',
      
      // Zoho-specific fields
      zohoContactId: contact.id || contactId,
      zohoAccountName: contact.Account_Name?.name || '',
      zohoAccountId: contact.Account_Name?.id || '',
      zohoOwner: contact.Owner?.name || '',
      zohoOwnerId: contact.Owner?.id || '',
      
      // Additional Zoho fields
      mailingStreet: contact.Mailing_Street || '',
      mailingCity: contact.Mailing_Suburb || '', // Zoho uses Mailing_Suburb, store as mailingCity for compatibility
      mailingState: contact.Mailing_State || contact.Pick_List_1 || '',
      mailingZip: contact.Mailing_Zip || '',
      mailingCountry: contact.Mailing_Country || '',
      
      // Metadata
      zohoLastSyncedAt: new Date().toISOString(),
      syncSource: 'zoho', // Prevent sync back to Zoho
    };

    // Fetch dependencies from Partner_Dependents related list
    try {
      const relatedListName = 'Partner_Dependents';
      const dependents = await zohoClient.getRelatedRecords('Contacts', contact.id || contactId, relatedListName);
      
      if (dependents && dependents.length > 0) {
        console.log(`📋 Found ${dependents.length} dependents in Partner_Dependents related list`);
        const dependencies = dependents.map(dep => {
          // Parse Name field to get lastName if Last_Name is not available
          // Name format might be "First Last" or just "Last"
          const fullName = dep.Name || '';
          const nameParts = fullName.split(' ');
          const lastName = dep.Last_Name || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0] || '');
          
          return {
            firstName: dep.First_Name || '',
            lastName: lastName,
            relationship: dep.Relationship_to_Applicant || dep.Relationship || dep.relationship || '',
            dateOfBirth: dep.Date_of_Birth || dep.dateOfBirth || '',
            citizenship: dep.Citizenship || dep.citizenship || '',
            gender: dep.Gender || '',
            email: dep.Email || '',
          };
        });
        
        if (dependencies.length > 0) {
          profileData.dependencies = dependencies;
          console.log('✅ Loaded dependencies from Partner_Dependents related list');
          console.log('📋 Dependencies array:', JSON.stringify(dependencies, null, 2));
        } else {
          console.log('📋 No dependencies to save (empty array)');
        }
      } else {
        console.log('📋 No dependents found in Partner_Dependents related list');
        profileData.dependencies = [];
      }
    } catch (depError) {
      console.error('⚠️ Failed to fetch dependencies from related list:', depError.message);
      // Fallback: Try parsing from Description field (backward compatibility)
      if (contact.Description) {
        const depMatch = contact.Description.match(/Dependencies:\s*(.+)/s);
        if (depMatch) {
          const depText = depMatch[1];
          const depLines = depText.split('\n').filter(line => line.trim());
          const dependencies = depLines.map(line => {
            // Parse format: "1. First Last - Relationship - DOB: YYYY-MM-DD - Citizenship: ..."
            const match = line.match(/\d+\.\s*(.+?)\s*-\s*(.+?)\s*-\s*DOB:\s*(.+?)\s*-\s*Citizenship:\s*(.+)/);
            if (match) {
              const [, name, relationship, dob, citizenship] = match;
              const nameParts = name.trim().split(' ');
              return {
                firstName: nameParts[0] || '',
                lastName: nameParts.slice(1).join(' ') || '',
                relationship: relationship.trim(),
                dateOfBirth: dob.trim(),
                citizenship: citizenship.trim(),
              };
            }
            return null;
          }).filter(Boolean);
          
          if (dependencies.length > 0) {
            profileData.dependencies = dependencies;
            console.log('✅ Loaded dependencies from Description field (fallback)');
          }
        }
      }
    }

    // Fetch Deals (Visa Applications) from related list
    let dealsProcessed = 0;
    if (!skipSave) {
      try {
        const deals = await zohoClient.getRelatedRecords('Contacts', contact.id || contactId, 'Deals');
        
        if (deals && deals.length > 0) {
          console.log(`📋 Found ${deals.length} deals in Deals related list`);
          const db = getAdapter();
          
          for (const deal of deals) {
            try {
              // Check if application already exists by zohoId
              const existingApps = await db.loadApplications(userId);
              const existingApp = existingApps?.find(app => app.zohoId === deal.id);
              
              let appId;
              let isNew = false;
              
              if (existingApp) {
                // Update existing application
                appId = existingApp.id;
                console.log(`🔄 Updating existing application ${appId} from Deal ${deal.id}`);
                
                // Extract Visa Type from Deal_Name or use Visa_Type field
                const dealName = deal.Deal_Name || deal.DealName || '';
                const extractVisaType = (name) => {
                  if (!name) return null;
                  const match = name.match(/-\s*([^-]+?)\s*\(/i) || name.match(/-\s*([^-]+?)$/i);
                  return match && match[1] ? match[1].trim() : null;
                };
                const visaType = deal.Visa_Type || extractVisaType(dealName);
                
                const updateData = {
                  status: mapDealStageToStatus(deal.Stage || deal.Deal_Stage || 'draft'), // status = Stage
                  zohoId: deal.id, // Reference to deal number
                };
                
                // Only update these fields if they exist in the deal
                if (dealName) {
                  updateData.reference = dealName; // Reference = Deal_Name
                }
                if (visaType) {
                  updateData.type = visaType; // type = Visa_Type
                }
                if (deal.Closing_Date) {
                  updateData.closingDate = deal.Closing_Date; // Closing_Date
                }
                if (deal.Modified_Time || deal.Last_Activity_Time) {
                  updateData.lastUpdated = deal.Modified_Time || deal.Last_Activity_Time; // Last updated time
                }
                
                const updateResult = await db.updateApplication(appId, updateData);
                
                if (updateResult.success) {
                  dealsProcessed++;
                }
              } else {
                // Create new application
                const { nanoid } = await import('nanoid');
                appId = nanoid(12);
                isNew = true;
                console.log(`➕ Creating new application ${appId} from Deal ${deal.id}`);
                
                const now = new Date();
                
                // Extract Visa Type from Deal_Name or use Visa_Type field
                // Deal_Name format: "Name - Visa Type (Subclass XXX)"
                const dealName = deal.Deal_Name || deal.DealName || '';
                const extractVisaType = (name) => {
                  if (!name) return null;
                  const match = name.match(/-\s*([^-]+?)\s*\(/i) || name.match(/-\s*([^-]+?)$/i);
                  return match && match[1] ? match[1].trim() : null;
                };
                const visaType = deal.Visa_Type || extractVisaType(dealName) || 'Visa Application';
                
                const newApp = {
                  id: appId,
                  userId: userId,
                  reference: dealName || `PLY-${appId.toUpperCase()}`, // Reference = Deal_Name
                  type: visaType, // type = Visa_Type
                  visaTypeCode: mapDealToVisaType(deal),
                  status: mapDealStageToStatus(deal.Stage || deal.Deal_Stage || 'draft'), // status = Stage
                  closingDate: deal.Closing_Date || '', // Closing_Date from Zoho
                  updated: now.toLocaleDateString('en-AU', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  }),
                  lastUpdated: deal.Modified_Time || deal.Last_Activity_Time || now.toISOString(), // Last updated time
                  createdAt: now.toISOString(),
                  updatedAt: now.toISOString(),
                  zohoId: deal.id, // Reference to deal number in Zoho
                };
                
                const createResult = await db.createApplication(newApp);
                if (createResult.success) {
                  dealsProcessed++;
                }
              }

              // Skills in Demand (subclass 482): ensure Zoho Deal_Name matches official product name when this deal is a 482 / TSS / Skills in Demand application.
              const dealLabel = (deal.Deal_Name || deal.DealName || '').toLowerCase();
              if (
                dealLabel.includes('482') ||
                dealLabel.includes('skills in demand') ||
                dealLabel.includes('tss')
              ) {
                try {
                  await zohoClient.updateRecord('Deals', deal.id, {
                    Deal_Name: 'Skills in Demand Visa (subclass 482)',
                  });
                } catch (zohoDealNameErr) {
                  console.warn('⚠️ Could not update Deal_Name in Zoho CRM:', zohoDealNameErr.message);
                }
              }
              
              console.log(`✅ ${isNew ? 'Created' : 'Updated'} application ${appId} from Deal ${deal.id}`);
            } catch (dealError) {
              console.error(`⚠️ Failed to process Deal ${deal.id}:`, dealError.message);
              // Continue with other deals even if one fails
            }
          }
          
          console.log(`✅ Processed ${dealsProcessed} deals from Zoho CRM`);
        } else {
          console.log('📋 No deals found in Deals related list');
        }
      } catch (dealsError) {
        console.error('⚠️ Failed to fetch deals from related list:', dealsError.message);
        // Don't fail the entire request if deals fail
      }
    }

    // Helper function to map deal stage to application status
    function mapDealStageToStatus(stage) {
      const stageLower = (stage || '').toLowerCase();
      if (stageLower.includes('submitted') || stageLower.includes('in progress')) {
        return 'submitted';
      } else if (stageLower.includes('approved') || stageLower.includes('granted')) {
        return 'approved';
      } else if (stageLower.includes('rejected') || stageLower.includes('denied')) {
        return 'rejected';
      } else if (stageLower.includes('draft')) {
        return 'draft';
      }
      return 'draft';
    }

    // Helper function to map deal to visa type
    function mapDealToVisaType(deal) {
      // Extract visa type from deal name or stage
      const dealName = (deal.Deal_Name || deal.DealName || '').toLowerCase();
      if (
        dealName.includes('work') ||
        dealName.includes('482') ||
        dealName.includes('tss') ||
        dealName.includes('skills in demand')
      ) {
        return 'tss';
      } else if (dealName.includes('partner') || dealName.includes('309') || dealName.includes('820')) {
        return 'partner';
      } else if (dealName.includes('student') || dealName.includes('500')) {
        return 'student';
      }
      return 'tss'; // Default
    }

    // Only update Firebase if skipSave is false
    if (!skipSave) {
      // Update Firebase profile
      const db = getAdapter();
      console.log('💾 Saving profile data to Firebase, including dependencies:', profileData.dependencies?.length || 0);
      const updateResult = await db.updateUserProfile(userId, profileData);

      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Failed to update profile');
      }

      console.log('✅ Profile saved to Firebase successfully');
      return NextResponse.json({
        success: true,
        contact: contact,
        profileData: profileData,
        message: 'Contact data fetched from Zoho CRM and synced to profile'
      });
    } else {
      // Just return the data without saving to Firebase
      return NextResponse.json({
        success: true,
        contact: contact,
        profileData: profileData,
        message: 'Contact data fetched from Zoho CRM (not saved to profile yet)'
      });
    }
  } catch (error) {
    console.error('❌ Error fetching from Zoho CRM:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch from Zoho CRM',
        details: error.response?.data || null
      },
      { status: 500 }
    );
  }
}

