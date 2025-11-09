import { NextResponse } from 'next/server';
import { db } from '@/lib/review-pdf/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

/**
 * API Route: Fetch Draft/Questionnaire Data by Matter ID
 * 
 * GET /api/review-pdf/application/[matterId]/draft
 * 
 * First finds the application by zohoId (matterId), then loads the draft/questionnaire
 * data from the application's subcollection.
 */
export async function GET(request, { params }) {
  try {
    const { matterId } = params;

    if (!matterId) {
      return NextResponse.json(
        { success: false, error: 'Matter ID is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Fetching draft for matterId: ${matterId}`);

    // Step 1: Find application by zohoId
    const applicationsRef = collection(db, 'applications');
    const q = query(applicationsRef, where('zohoId', '==', matterId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log(`❌ No application found with zohoId: ${matterId}`);
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      );
    }

    const appDoc = querySnapshot.docs[0];
    const appId = appDoc.id;

    console.log(`✅ Found application: ${appId}, fetching draft data...`);

    // Step 2: Load draft from applications/{appId}/data/questionnaire
    const draftRef = doc(db, 'applications', appId, 'data', 'questionnaire');
    const draftSnap = await getDoc(draftRef);

    if (!draftSnap.exists()) {
      console.log(`⚠️ No draft data found for application: ${appId}`);
      return NextResponse.json({
        success: true,
        draft: {},
        message: 'No questionnaire data available'
      });
    }

    const draftData = draftSnap.data();
    // Remove Firebase metadata
    const { updatedAt, ...draft } = draftData;

    console.log(`✅ Draft data loaded successfully`);

    return NextResponse.json({
      success: true,
      draft
    });
  } catch (error) {
    console.error('❌ Error fetching draft:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch draft data' },
      { status: 500 }
    );
  }
}

