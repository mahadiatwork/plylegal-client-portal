import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'This endpoint is deprecated. Use POST /api/chat/send instead.',
    },
    { status: 410 }
  );
}
