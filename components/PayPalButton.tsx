import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';

declare global {
  interface Window {
    paypal: any;
  }
}

interface PayPalButtonProps {
  clientId: string;
  onSuccess: (details: { subscriptionID: string }) => void;
  onError: (error: any) => void;
  isProcessing: boolean;
  planId: string;
}

type ScriptStatus = 'idle' | 'loading' | 'ready' | 'error';

const PayPalButton: React.FC<PayPalButtonProps> = ({ clientId, onSuccess, onError, isProcessing, planId }) => {
  const paypalRef = useRef<HTMLDivElement>(null);
  const [scriptStatus, setScriptStatus] = useState<ScriptStatus>('idle');

  // Effect to load the PayPal script for subscriptions
  useEffect(() => {
    if (!clientId || window.paypal) {
        if (window.paypal) setScriptStatus('ready');
        return;
    }

    setScriptStatus('loading');
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&vault=true&intent=subscription&disable-funding=paylater,sepa,venmo`;
    script.async = true;
    script.onload = () => {
        console.log('PayPal SDK for Subscriptions loaded.');
        setScriptStatus('ready');
    };
    script.onerror = () => {
        console.error('PayPal SDK could not be loaded.');
        setScriptStatus('error');
        onError(new Error('PayPal SDK failed to load.'));
    };

    document.body.appendChild(script);

    return () => {
        const scriptElement = document.querySelector(`script[src*="${clientId}"]`);
        if (scriptElement) {
            document.body.removeChild(scriptElement);
        }
    };
  }, [clientId, onError]);
  
  // Effect to render the PayPal button once the script is ready
  useEffect(() => {
    if (scriptStatus !== 'ready' || isProcessing || !paypalRef.current) {
      return;
    }
    
    paypalRef.current.innerHTML = '';

    try {
        window.paypal.Buttons({
            style: {
                layout: 'vertical',
                color: 'blue',
                shape: 'rect',
                label: 'subscribe',
                height: 48
            },
            createSubscription: async () => {
              try {
                const { data, error } = await supabase.functions.invoke('create-paypal-order', {
                  body: { planId }
                });

                // This block is hit on 2xx responses. Handle errors returned in the body.
                if (error) throw error;
                if (data.error) throw new Error(data.error);
                if (!data.id) throw new Error('Could not retrieve subscription ID from server.');
                
                return data.id; // Success: return the subscription ID to PayPal
              } catch (err: any) {
                  // This block is hit for network errors AND non-2xx responses from the function.
                  console.error("Error during createSubscription:", err);
                  
                  // Extract the specific error message from the function's JSON response body.
                  // The 'err' object from a failed invoke is a FunctionsHttpError.
                  const specificError = err.context?.json?.error || err.message || 'An unknown server error occurred.';
                  
                  // Pass the clean error message to our UI.
                  onError(new Error(specificError));
                  
                  // Re-throw the original error to let the PayPal SDK know the process failed.
                  throw err;
              }
            },
            onApprove: (data: { subscriptionID: string }) => {
                onSuccess({ subscriptionID: data.subscriptionID });
            },
            onError: (err: any) => {
                onError(err);
            },
        }).render(paypalRef.current);
    } catch (renderError: any) {
        console.error("PayPal Buttons failed to render:", renderError.message);
        onError(new Error("Failed to display payment options. Check your Client ID."));
    }

  }, [scriptStatus, isProcessing, onSuccess, onError, planId]);

  return (
    <div className="w-full">
      {scriptStatus === 'loading' && <div className="text-center text-sm text-muted-foreground">Loading payment options...</div>}
      {scriptStatus === 'error' && <div className="text-center text-sm text-destructive">Could not load payment options. Please check the configuration or refresh the page.</div>}
      <div ref={paypalRef} style={{ display: scriptStatus === 'ready' && !isProcessing ? 'block' : 'none' }}></div>
    </div>
  );
};

export default PayPalButton;