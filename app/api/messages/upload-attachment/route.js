import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'This endpoint is deprecated. Attachments are not yet supported in the Firebase-backed messaging system.',
    },
    { status: 410 }
  );
}


