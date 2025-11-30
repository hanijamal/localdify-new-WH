// This edge function starts the Meta (Facebook) OAuth 2.0 flow for WhatsApp Business.
// It is invoked securely from the frontend. It constructs the OAuth URL with necessary
// scopes and returns it to the frontend, which then redirects the user.

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
    // Explicitly check for required environment variables at the start.
    // This provides clearer error messages if the function is not configured correctly.
    const metaAppId = Deno.env.get('META_APP_ID');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!metaAppId || !supabaseUrl || !supabaseAnonKey) {
        throw new Error('Server configuration error: Required environment variables (META_APP_ID, SUPABASE_URL, SUPABASE_ANON_KEY) are not set.');
    }

    const callbackUrl = `${supabaseUrl}/functions/v1/auth-whatsapp-callback`;
    
    const supabase = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'User not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (businessError || !business) {
      return new Response(JSON.stringify({ error: 'Business not found for user.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const state = JSON.stringify({ business_id: business.id });
    
    const authUrl = new URL('https://www.facebook.com/v19.0/dialog/oauth');
    authUrl.searchParams.set('client_id', metaAppId);
    authUrl.searchParams.set('redirect_uri', callbackUrl);
    authUrl.searchParams.set('scope', 'whatsapp_business_management,whatsapp_business_messaging,business_management');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('state', state);

    return new Response(
        JSON.stringify({ redirectUrl: authUrl.toString() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in auth-whatsapp function:', error.message);
    return new Response(
        JSON.stringify({ error: `Internal Server Error: ${error.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});