'use client';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

declare global {
    interface Window {
        paypal?: any;
    }
}

interface PayPalPurchaseProps {
    clientId: string;
    amount: string;
    description: string;
    onSuccess: () => void;
}

export default function PayPalPurchase({ clientId, amount, description, onSuccess }: PayPalPurchaseProps) {
  const [ready, setReady] = useState(false);
  const [browserMode, setBrowserMode] = useState(true); // Default to true, TWA not supported for this
  const { toast } = useToast();
  const buttonContainerId = `paypal-button-container-${description.replace(/\s+/g, '-')}`;

  useEffect(() => {
    if (!document.querySelector('script[src*="paypal.com"]')) {
      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;
      script.onload = () => setReady(true);
      script.onerror = () => {
        toast({
          variant: 'destructive',
          title: 'Payment Error',
          description: 'Could not load the PayPal script. Please try refreshing the page.',
        });
        setReady(false);
      };
      document.head.appendChild(script);
    } else {
      setReady(true);
    }
  }, [clientId, toast]);

  useEffect(() => {
    if (!ready || !browserMode) return;
    
    if (!window.paypal || typeof window.paypal.Buttons !== 'function') {
      return;
    }

    const container = document.getElementById(buttonContainerId);
    if (container) {
        container.innerHTML = '';
    } else {
        console.error(`PayPal button container #${buttonContainerId} not found.`);
        return;
    }

    try {
      window.paypal.Buttons({
        async createOrder() {
          try {
            const response = await fetch('/api/create-paypal-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ amount, description }),
            });
            const order = await response.json();
            if (order.id) {
              return order.id;
            } else {
              throw new Error(order.error || 'Failed to create order.');
            }
          } catch (err: any) {
            console.error('Create order error:', err);
            toast({ variant: 'destructive', title: 'Payment Error', description: err.message });
            throw err;
          }
        },
        async onApprove(data: any) {
          try {
            const response = await fetch('/api/capture-paypal-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderID: data.orderID }),
            });
            const details = await response.json();
            if (details.error) {
              throw new Error(details.error);
            }
            if (details.status === 'COMPLETED') {
              onSuccess();
            } else {
              toast({
                variant: 'destructive',
                title: 'Payment Incomplete',
                description: `Payment status: ${details.status}. Please contact support.`
              });
            }
          } catch(err: any) {
             console.error("Capture order error:", err);
             toast({ variant: 'destructive', title: 'Payment Finalization Error', description: err.message });
          }
        },
        onError: (err: any) => {
          console.error("PayPal button error:", err);
          toast({
            variant: 'destructive',
            title: 'PayPal Error',
            description: 'An unexpected error occurred with PayPal. Please try again.',
          });
        }
      }).render(`#${buttonContainerId}`);
    } catch (error) {
      console.error("Failed to render PayPal Buttons:", error);
    }
  }, [ready, browserMode, buttonContainerId, amount, description, onSuccess, toast]);

  if (!browserMode) return null;
  if (!ready) return <div className="text-center text-sm text-muted-foreground h-10">Loading payment button...</div>;

  return (
    <div className="relative z-0 min-h-[40px]">
      <div id={buttonContainerId}></div>
    </div>
  );
}
