
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
  const { toast } = useToast();
  const buttonContainerId = `paypal-button-container-${description.replace(/\s+/g, '-')}`;

  useEffect(() => {
    if (window.paypal) {
      setReady(true);
      return;
    }

    if (!document.querySelector('script[src*="paypal.com"]')) {
      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD&intent=capture`;
      script.async = true;
      script.onload = () => setReady(true);
      script.onerror = () => {
        toast({
          variant: 'destructive',
          title: 'Payment Error',
          description: 'Could not load the PayPal script. Please try refreshing the page.',
        });
      };
      document.head.appendChild(script);
    }
  }, [clientId, toast]);

  useEffect(() => {
    if (ready && window.paypal) {
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
              }
              throw new Error(order.error || 'Failed to create order.');
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
                  description: `Payment status: ${details.status}. Please contact support.`,
                });
              }
            } catch (err: any) {
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
        }).render(`#${buttonContainerId}`).catch((err: any) => {
            console.error('Failed to render PayPal Buttons:', err);
        });
      } catch (error) {
        console.error("PayPal Buttons initialization error:", error);
      }
    }
  }, [ready, amount, description, onSuccess, toast, buttonContainerId]);


  return (
    <div className="relative z-0 min-h-[40px]">
      {!ready && <div className="text-center text-sm text-muted-foreground h-10">Loading payment button...</div>}
      <div id={buttonContainerId} style={{ display: ready ? 'block' : 'none' }}></div>
    </div>
  );
}
