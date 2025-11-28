
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

interface PayPalPurchaseProps {
    clientId: string;
    amount: string;
    description: string;
    onSuccess: () => void;
}

export default function PayPalPurchase({ clientId, amount, description, onSuccess }: PayPalPurchaseProps) {
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const buttonContainerId = `paypal-button-container-${description.replace(/\s+/g, '-')}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const isTwa = await checkTwa();
      const browserMode = !isTwa; // Only disable for TWA
      if (cancelled) return;
      setEnabled(browserMode);
      if (!browserMode) return;

      if (!document.querySelector('script[src*="paypal.com"]')) {
        const script = document.createElement('script');
        script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;
        script.onload = () => {
          if (!cancelled) setReady(true);
        };
        script.onerror = () => {
          if (!cancelled) setReady(false);
        };
        document.head.appendChild(script);
      } else {
        setReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, [clientId]);

  useEffect(() => {
    if (!ready || !enabled) return;
    
    // Ensure the PayPal Buttons SDK is loaded and ready
    if (!window.paypal || typeof window.paypal.Buttons !== 'function') {
      return;
    }

    // Ensure the container is clean before rendering a new button
    const container = document.getElementById(buttonContainerId);
    if (container) {
        container.innerHTML = '';
    } else {
        console.error(`PayPal button container #${buttonContainerId} not found.`);
        return;
    }

    try {
      window.paypal.Buttons({
        createOrder: async (_: any, actions: any) => {
          const r = await fetch('/createPaypalOrder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount, description })
          });
          const j = await r.json();
          if (!r.ok) throw new Error(j.error || 'create failed');
          return j.id;
        },
        onApprove: async (data: any) => {
          try {
            const r = await fetch('/capturePaypalOrder', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderID: data.orderID })
            });
            const j = await r.json();
            if (!r.ok) { 
                alert(`Payment failed: ${j.error || 'Unknown error'}`); 
                return; 
            }
            onSuccess();
          } catch(err: any) {
             console.error("Capture order error:", err);
             alert(`An error occurred while finalizing your payment: ${err.message}`);
          }
        },
        onError: (err: any) => {
          console.error("PayPal button error:", err);
          alert("An error occurred with the PayPal payment. Please try again or check the console for details.");
        }
      }).render(`#${buttonContainerId}`);
    } catch (error) {
      console.error("Failed to render PayPal Buttons:", error);
    }
  }, [ready, enabled, buttonContainerId, amount, description, onSuccess]);

  if (!enabled) return <div className="text-center text-sm text-muted-foreground">Purchases are available only in the web browser.</div>;
  if (!ready) return <div className="text-center text-sm text-muted-foreground">Loading payment button...</div>;

  return (
    <div className="relative z-0">
      <div id={buttonContainerId}></div>
    </div>
  );
}
