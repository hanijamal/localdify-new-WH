import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

declare const Deno: {
  env: { get(key: string): string | undefined; };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    const userAuthClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: userError } = await userAuthClient.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated.');
    }

    const { domain } = await req.json();
    if (!domain) {
      throw new Error('Domain is required.');
    }

    // Find the user's business
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('id, custom_domain')
      .eq('user_id', user.id)
      .single();

    if (businessError || !business) {
      throw new Error('Business not found for the current user.');
    }

    if (business.custom_domain !== domain) {
      throw new Error('The provided domain does not match the saved domain for your business.');
    }

    // SIMULATE DNS CHECK
    await new Promise(resolve => setTimeout(resolve, 2000));
    // In a real application, you would perform a DNS lookup here
    // for a CNAME record pointing to your service's domain.
    const isVerified = true; // Simulation always succeeds.

    const newStatus = isVerified ? 'active' : 'error';
    const message = isVerified ? 'Domain verified and active!' : 'Verification failed. Please double-check your CNAME record.';

    const { error: updateError } = await supabaseAdmin
      .from('businesses')
      .update({ custom_domain_status: newStatus })
      .eq('id', business.id);

    if (updateError) {
      throw updateError;
    }

    return new Response(JSON.stringify({ success: isVerified, message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in verify-custom-domain function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});