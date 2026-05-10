import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: 'This endpoint is deprecated. Use GET /api/chat/messages?applicationId=... instead.',
    },
    { status: 410 }
  );
}
