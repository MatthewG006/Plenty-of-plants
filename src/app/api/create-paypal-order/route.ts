import { NextResponse } from 'next/server';

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!;
const PAYPAL_APP_SECRET = process.env.PAYPAL_APP_SECRET!;
const PAYPAL_API_BASE = 'https://api-m.sandbox.paypal.com';

async function getAccessToken() {
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_APP_SECRET}`).toString('base64');
    const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error('Failed to get PayPal access token:', errorBody);
        throw new Error('Failed to get PayPal access token');
    }
    
    const data = await response.json();
    return data.access_token;
}

export async function POST(request: Request) {
    try {
        const { amount, description } = await request.json();
        const accessToken = await getAccessToken();

        const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                intent: 'CAPTURE',
                purchase_units: [{
                    amount: {
                        currency_code: 'USD',
                        value: amount
                    },
                    description: description
                }],
                application_context: {
                    shipping_preference: 'NO_SHIPPING'
                }
            })
        });

        const order = await response.json();

        if (!response.ok) {
            console.error('PayPal API Error (Create Order):', order);
            return NextResponse.json({ error: order.message || 'Failed to create order' }, { status: response.status });
        }

        return NextResponse.json({ id: order.id });

    } catch (error: any) {
        console.error('Internal Server Error (Create Order):', error);
        return NextResponse.json({ error: error.message || 'An internal error occurred' }, { status: 500 });
    }
}
