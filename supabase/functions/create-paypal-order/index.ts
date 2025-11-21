import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { encode } from 'https://deno.land/std@0.177.0/encoding/base64.ts';
import { checkRateLimit, RateLimitError } from '../_shared/rate-limiter.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

declare const Deno: {
  env: { get(key: string): string | undefined; };
};

const PAYPAL_CLIENT_ID = Deno.env.get('PAYPAL_CLIENT_ID');
const PAYPAL_CLIENT_SECRET = Deno.env.get('PAYPAL_CLIENT_SECRET');
const PAYPAL_API_URL = Deno.env.get('PAYPAL_ENVIRONMENT') === 'production' 
    ? 'https://api-m.paypal.com' 
    : 'https://api-m.sandbox.paypal.com';

async function getPayPalAccessToken() {
  const authString = `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`;
  const auth = encode(authString);
  const response = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to get PayPal access token: ${errorBody}`);
  }
  const data = await response.json();
  return data.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET || !Deno.env.get('SUPABASE_URL') || !Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
        console.error('Missing one or more required environment variables: PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
        throw new Error('Payment provider credentials are not set on the server.');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );
    
    await checkRateLimit(supabaseAdmin, user.id, 5, 3600);

    const { planId } = await req.json();
    if (!planId) {
        throw new Error("A valid plan ID must be provided.");
    }
    
    const accessToken = await getPayPalAccessToken();

    // 1. Check for existing subscription to determine if this is an upgrade/downgrade.
    const { data: userProfile, error: userProfileError } = await supabaseAdmin
      .from('users')
      .select('subscription_status, paypal_subscription_id, subscription_plan')
      .eq('id', user.id)
      .single();

    if (userProfileError) throw new Error(`Could not fetch user profile: ${userProfileError.message}`);

    const { data: targetPlan, error: targetPlanError } = await supabaseAdmin
        .from('plans')
        .select('name')
        .eq('id', planId)
        .single();
    
    if (targetPlanError || !targetPlan) throw new Error('Target plan not found.');
    
    if (userProfile.subscription_status === 'active' && userProfile.subscription_plan === targetPlan.name) {
        throw new Error("You are already subscribed to this plan. To manage your subscription, please visit PayPal.");
    }
    
    if (userProfile.subscription_status === 'active' && userProfile.paypal_subscription_id) {
      console.log(`User has active subscription ${userProfile.paypal_subscription_id}. Cancelling before creating new one.`);
      const cancelUrl = `${PAYPAL_API_URL}/v1/billing/subscriptions/${userProfile.paypal_subscription_id}/cancel`;
      const cancelResponse = await fetch(cancelUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: 'User initiated plan upgrade/downgrade.' })
      });

      if (!cancelResponse.ok && cancelResponse.status !== 404) {
        const errorBody = await cancelResponse.json();
        console.error('Failed to cancel existing PayPal subscription:', errorBody);
        throw new Error('Could not update your subscription. Please cancel your existing subscription on PayPal and try again.');
      }
      console.log(`Successfully cancelled existing subscription ${userProfile.paypal_subscription_id}.`);
    }

    // 2. Fetch our plan details from the DB
    const { data: plan, error: planError } = await supabaseAdmin
        .from('plans')
        .select('id, name, price, paypal_plan_id')
        .eq('id', planId)
        .eq('is_active', true)
        .single();

    if (planError || !plan) {
        throw new Error(`Plan with ID '${planId}' not found or is not active.`);
    }

    let paypalPlanId = plan.paypal_plan_id;

    if (!paypalPlanId) {
        console.log(`No PayPal plan ID found for plan "${plan.name}". Creating one...`);
        let { data: productSetting } = await supabaseAdmin.from('system_settings').select('value').eq('key', 'paypal_product_id').single();
        let productId = productSetting?.value as (string | null);

        if (!productId || productId === 'null') {
          const productResponse = await fetch(`${PAYPAL_API_URL}/v1/catalogs/products`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'localDify Subscription Service', type: 'SERVICE', category: 'SOFTWARE' }),
          });
          if (!productResponse.ok) throw new Error('Failed to create PayPal product.');
          const newProduct = await productResponse.json();
          productId = newProduct.id;
          await supabaseAdmin.from('system_settings').upsert({ key: 'paypal_product_id', value: productId });
        }

        const planResponse = await fetch(`${PAYPAL_API_URL}/v1/billing/plans`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_id: productId,
            name: `${plan.name} Plan - ${plan.id}`,
            status: 'ACTIVE',
            billing_cycles: [{
              frequency: { interval_unit: 'MONTH', interval_count: 1 },
              tenure_type: 'REGULAR',
              sequence: 1,
              total_cycles: 0,
              pricing_scheme: { fixed_price: { value: String(plan.price), currency_code: 'USD' } },
            }],
            payment_preferences: { auto_bill_outstanding: true, payment_failure_threshold: 2 },
          }),
        });
        if (!planResponse.ok) {
          const errorBody = await planResponse.json();
          console.error("PayPal Plan Creation Error:", JSON.stringify(errorBody, null, 2));
          throw new Error(`Failed to create PayPal plan: ${errorBody.details?.[0]?.description || errorBody.message}`);
        }
        const newPayPalPlan = await planResponse.json();
        paypalPlanId = newPayPalPlan.id;

        const { error: updateError } = await supabaseAdmin
            .from('plans')
            .update({ paypal_plan_id: paypalPlanId })
            .eq('id', plan.id);
        
        if (updateError) {
            console.error(`CRITICAL: Failed to save new PayPal plan ID ${paypalPlanId} for plan ${plan.id}.`, updateError);
        }
    }
    
    // 3. Create PayPal Subscription
    const subResponse = await fetch(`${PAYPAL_API_URL}/v1/billing/subscriptions`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: paypalPlanId }),
    });
     if (!subResponse.ok) {
        const errorBody = await subResponse.json();
        throw new Error(`Failed to create PayPal subscription: ${errorBody.message}`);
    }
    const subscription = await subResponse.json();
    
    return new Response(JSON.stringify({ id: subscription.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    if (error instanceof RateLimitError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.error('CRITICAL ERROR in create-paypal-order function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});