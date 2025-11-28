
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

    if (!clientId) {
      throw new Error('PayPal client ID is not configured in environment variables.');
    }

    return NextResponse.json({ clientId });
  } catch (error) {
    console.error('PayPal Client ID API Error:', error);
    return new NextResponse(
      'Could not fetch PayPal client ID. Please check server configuration.',
      { status: 500 }
    );
  }
}
