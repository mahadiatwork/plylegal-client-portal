import { NextResponse } from 'next/server';
import { ZohoCRMClient } from '@/lib/zohoClient';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const dealId = searchParams.get('dealId');

    if (!dealId) {
      return NextResponse.json(
        { success: false, error: 'dealId is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Fetching Client_Messages for Deal ${dealId}...`);
    const zohoClient = new ZohoCRMClient();
    
    // Fetch messages from Client_Messages related list
    const fields = 'id,Name,Message_from_Client,Reply_Message,Time_Sent,Time_Replied,Created_Time,Modified_Time';
    const messages = await zohoClient.getRelatedRecords('Deals', dealId, 'Client_Messages', fields);

    console.log(`✅ Found ${messages?.length || 0} messages`);
    
    // Sort messages by Time_Sent or Created_Time (oldest first)
    const sortedMessages = (messages || []).sort((a, b) => {
      const timeA = a.Time_Sent || a.Created_Time || '';
      const timeB = b.Time_Sent || b.Created_Time || '';
      return timeA.localeCompare(timeB);
    });

    return NextResponse.json({
      success: true,
      messages: sortedMessages,
    });
  } catch (error) {
    console.error('❌ Error fetching messages:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch messages',
        messages: [] 
      },
      { status: 500 }
    );
  }
}









