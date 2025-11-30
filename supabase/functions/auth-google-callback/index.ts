// This edge function is the redirect URI for the Google OAuth flow.
// Google redirects the user here after they grant consent. The function
// receives an authorization code, exchanges it for an access token and a
// refresh token with Google's servers, and securely stores these tokens
// in the corresponding business's row in the Supabase database.
// Finally, it redirects the user back to the integrations page in the app.

// Required environment variables in your Supabase project:
// - GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
// - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// - APP_URL: The base URL of your frontend application (e.g., http://localhost:5173 or your AI Studio URL)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { OAuth2Client } from 'npm:google-auth-library@9.1.0';

// FIX: Add a type declaration for the Deno namespace to resolve type errors in non-Deno environments.
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const CALLBACK_URL = `${SUPABASE_URL}/functions/v1/auth-google-callback`;
const APP_URL = Deno.env.get('APP_URL') || '';
const INTEGRATIONS_PAGE_URL = `${APP_URL}/#/dashboard/integrations`;

serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code) {
    return Response.redirect(`${INTEGRATIONS_PAGE_URL}?error=${encodeURIComponent('No code returned from Google')}`, 302);
  }
  
  if (!state) {
    return Response.redirect(`${INTEGRATIONS_PAGE_URL}?error=${encodeURIComponent('No state returned from Google')}`, 302);
  }
  
  try {
    const { business_id } = JSON.parse(state);
    if (!business_id) throw new Error('Invalid state: business_id missing');

    const oauth2Client = new OAuth2Client(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      CALLBACK_URL
    );

    const { tokens } = await oauth2Client.getToken(code);
    
    const { access_token, refresh_token } = tokens;
    
    if (!refresh_token) {
        // A refresh token is only returned on the first consent.
        // If the user disconnects and reconnects, they might not get a new one.
        // The app will update the access token, and if there's no new refresh token,
        // it will keep the old one if it exists.
        console.log("No refresh token returned. This can happen on re-authentication if the user has previously granted consent.");
    }

    const supabaseAdmin = createClient(
      SUPABASE_URL ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );
    
    // We only update the fields related to Google integration.
    // If a refresh token isn't provided, we don't nullify the existing one.
    const updateData = {
        google_access_token: access_token,
        google_integration_active: true,
        ...(refresh_token && { google_refresh_token: refresh_token }),
    };

    const { error } = await supabaseAdmin
      .from('businesses')
      .update(updateData)
      .eq('id', business_id);

    if (error) throw error;

    return Response.redirect(`${INTEGRATIONS_PAGE_URL}?status=success&source=google`, 302);

  } catch (e) {
    console.error('Error in Google callback:', e);
    return Response.redirect(`${INTEGRATIONS_PAGE_URL}?error=${encodeURIComponent(e.message)}`, 302);
  }
});