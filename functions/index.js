// functions/index.js
const functions = require('firebase-functions');
const fetch = require('node-fetch'); // included by firebase functions if needed
const TWA_PACKAGE_NAME = functions.config().app.twa_package || 'com.yourcompany.yourapp';
const PAYPAL_CLIENT_ID = functions.config().paypal.client_id;
const PAYPAL_SECRET = functions.config().paypal.secret;
const PAYPAL_API = functions.config().paypal.api || 'https://api-m.sandbox.paypal.com';

function isRequestFromTwa(req) {
  const xrw = (req.get('x-requested-with') || '').toString();
  return xrw === TWA_PACKAGE_NAME;
}

async function getPayPalAccessToken() {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64');
  const r = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials'
  });
  if (!r.ok) throw new Error('PayPal token failed: ' + r.status);
  return (await r.json()).access_token;
}

// detect endpoint
exports.detectTwa = functions.https.onRequest((req, res) => {
  res.json({ isTwa: isRequestFromTwa(req) });
});

// create order
exports.createPaypalOrder = functions.https.onRequest(async (req, res) => {
  try {
    if (isRequestFromTwa(req)) return res.status(403).json({ error: 'PayPal not available in TWA/installed app' });
    // Basic auth/session checks should go here (validate user)
    const token = await getPayPalAccessToken();
    const orderReq = {
      intent: 'CAPTURE',
      purchase_units: [{
        amount: { currency_code: 'USD', value: req.body.amount || '1.00' },
        description: req.body.description || 'Purchase'
      }]
    };
    const r = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(orderReq)
    });
    const order = await r.json();
    if (!r.ok) return res.status(400).json(order);
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// capture order
exports.capturePaypalOrder = functions.https.onRequest(async (req, res) => {
  try {
    if (isRequestFromTwa(req)) return res.status(403).json({ error: 'PayPal not available in TWA/installed app' });
    const { orderID } = req.body;
    if (!orderID) return res.status(400).json({ error: 'missing orderID' });
    const token = await getPayPalAccessToken();
    const r = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderID}/capture`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    const resp = await r.json();
    if (!r.ok) return res.status(400).json(resp);
    // record order to Firestore / DB here
    res.json(resp);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
