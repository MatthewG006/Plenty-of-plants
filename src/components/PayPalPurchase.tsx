
'use client';
import { useEffect, useState } from 'react';

declare global {
    interface Window {
        paypal?: any;
    }
}

async function checkTwa() {
  try {
    const r = await fetch('/detectTwa', { cache: 'no-store' });
    if (!r.ok) return false;
    const j = await r.json();
    return j.isTwa;
  } catch (e) {
    console.warn('TWA check failed', e);
    return false;
  }
}

function isInstalledPwa() {
  try {
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
    if ((window.navigator as any).standalone === true) return true;
  } catch (e) {}
  return false;
}

export default function PayPalPurchase({ clientId }: { clientId: string }) {
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const twa = await checkTwa();
      const installed = isInstalledPwa();
      const browserMode = !twa && !installed;
      if (cancelled) return;
      setEnabled(browserMode);
      if (!browserMode) return;

      // Dynamically add PayPal SDK
      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;
      script.onload = () => setReady(true);
      script.onerror = () => setReady(false);
      document.head.appendChild(script);
    })();
    return () => { cancelled = true; };
  }, [clientId]);

  useEffect(() => {
    if (!ready) return;
    if (!window.paypal) return;
    window.paypal.Buttons({
      createOrder: async (_: any, actions: any) => {
        const r = await fetch('/createPaypalOrder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: '1.00', description: 'Gacha pack' })
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'create failed');
        return j.id;
      },
      onApprove: async (data: any) => {
        const r = await fetch('/capturePaypalOrder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderID: data.orderID })
        });
        const j = await r.json();
        if (!r.ok) { alert('Payment failed'); return; }
        alert('Payment success');
      }
    }).render('#paypal-button-container');
  }, [ready]);

  if (!enabled) return <div>Purchases are available only in the browser.</div>;
  return <div id="paypal-area"><div id="paypal-button-container"></div></div>;
}
