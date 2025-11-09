import { NextResponse } from 'next/server';
import { db } from '@/lib/review-pdf/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

/**
 * API Route: Find Application by Zoho Deal ID (Matter ID)
 * 
 * GET /api/review-pdf/application/[matterId]
 * 
 * Returns the application document from Firebase that matches the given Zoho Deal ID.
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

    console.log(`🔍 Searching for application with zohoId: ${matterId}`);

    // Query Firestore for application with matching zohoId
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

    // Get the first matching application
    const doc = querySnapshot.docs[0];
    const application = {
      id: doc.id,
      ...doc.data()
    };

    console.log(`✅ Found application: ${application.id}`);

    return NextResponse.json({
      success: true,
      application
    });
  } catch (error) {
    console.error('❌ Error fetching application:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch application' },
      { status: 500 }
    );
  }
}

