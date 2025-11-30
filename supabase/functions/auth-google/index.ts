// This edge function starts the Google OAuth 2.0 flow.
// It is invoked securely from the frontend via supabase.functions.invoke(), which
// includes the user's authentication token. The function constructs the
// Google OAuth URL and returns it to the frontend, which then performs the redirect.

// Required environment variables in your Supabase project:
// - GOOGLE_CLIENT_ID: Your Google Cloud project's OAuth 2.0 Client ID.
// - SUPABASE_URL: Your project's URL.
// - SUPABASE_ANON_KEY: Your project's anonymous key.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// FIX: Add a type declaration for the Deno namespace to resolve type errors in non-Deno environments.
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const CALLBACK_URL = `${Deno.env.get('SUPABASE_URL')}/functions/v1/auth-google-callback`;

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.warn('Authentication error:', userError?.message);
      return new Response(
        JSON.stringify({ error: 'User not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (businessError || !business) {
      console.error('Business not found for user:', user.id, businessError?.message);
      return new Response(
        JSON.stringify({ error: 'Business not found for user.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const state = JSON.stringify({ business_id: business.id });
    
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID!);
    authUrl.searchParams.set('redirect_uri', CALLBACK_URL);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/gmail.send');
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', state);

    // Instead of redirecting, return the URL in a JSON response
    return new Response(
        JSON.stringify({ redirectUrl: authUrl.toString() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in auth-google function:', error);
    return new Response(
        JSON.stringify({ error: `Internal Server Error: ${error.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});