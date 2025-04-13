import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Return empty credentials since we'll handle this on the client side
    return NextResponse.json({
      accountSid: '',
      authToken: ''
    });
  } catch (error) {
    console.error('Error reading credentials:', error);
    return NextResponse.json(
      { error: 'Failed to read credentials' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { accountSid, authToken } = await request.json();

    if (!accountSid || !authToken) {
      return NextResponse.json(
        { error: 'Account SID and Auth Token are required' },
        { status: 400 }
      );
    }

    // Return success - actual storage will be handled on the client side
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving credentials:', error);
    return NextResponse.json(
      { error: 'Failed to save credentials' },
      { status: 500 }
    );
  }
} 