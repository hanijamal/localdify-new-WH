// This edge function is the redirect URI for the Meta OAuth flow for WhatsApp.
// It receives an authorization code, exchanges it for a long-lived access token,
// retrieves the associated WhatsApp Phone Number ID, and securely stores these
// in the business's record. Finally, it redirects the user back to the app.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

declare const Deno: {
  env: { get(key: string): string | undefined; };
};

const META_APP_ID = Deno.env.get('META_APP_ID');
const META_APP_SECRET = Deno.env.get('META_APP_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const CALLBACK_URL = `${SUPABASE_URL}/functions/v1/auth-whatsapp-callback`;
const APP_URL = Deno.env.get('APP_URL') || '';
const INTEGRATIONS_PAGE_URL = `${APP_URL}/#/dashboard/integrations`;

serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const errorParam = url.searchParams.get('error_description');

  const redirectWithError = (message: string) => {
    return Response.redirect(`${INTEGRATIONS_PAGE_URL}?source=whatsapp&error=${encodeURIComponent(message)}`, 302);
  }

  if (errorParam) {
    return redirectWithError(errorParam);
  }
  if (!code) {
    return redirectWithError('No code returned from Meta');
  }
  if (!state) {
    return redirectWithError('No state returned from Meta');
  }
  
  try {
    const { business_id } = JSON.parse(state);
    if (!business_id) throw new Error('Invalid state: business_id missing');

    // 1. Exchange code for short-lived access token
    const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${META_APP_ID}&redirect_uri=${CALLBACK_URL}&client_secret=${META_APP_SECRET}&code=${code}`;
    const tokenRes = await fetch(tokenUrl);
    if (!tokenRes.ok) {
        const errorData = await tokenRes.json();
        throw new Error(`Failed to get short-lived token: ${errorData.error.message}`);
    }
    const { access_token: shortLivedToken } = await tokenRes.json();

    // 2. Exchange short-lived token for long-lived access token
    const longLivedUrl = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&fb_exchange_token=${shortLivedToken}`;
    const longLivedRes = await fetch(longLivedUrl);
     if (!longLivedRes.ok) {
        const errorData = await longLivedRes.json();
        throw new Error(`Failed to get long-lived token: ${errorData.error.message}`);
    }
    const { access_token: longLivedToken } = await longLivedRes.json();

    // 3. Get the user's WhatsApp Business Accounts and their phone numbers in one call.
    const wabaUrl = `https://graph.facebook.com/v19.0/me/whatsapp_business_accounts?fields=phone_numbers`;
    const wabaRes = await fetch(wabaUrl, { headers: { 'Authorization': `Bearer ${longLivedToken}` } });
    if (!wabaRes.ok) {
        const errorData = await wabaRes.json();
        throw new Error(`Failed to fetch WhatsApp Business Accounts: ${errorData.error.message}`);
    }
    const { data: wabas } = await wabaRes.json();
    if (!wabas || wabas.length === 0) {
        throw new Error('No WhatsApp Business Account was found. Please ensure you have granted all necessary permissions and that your Meta account is linked to a WhatsApp Business Account.');
    }
    
    // 4. Find the first phone number available from the accounts.
    const firstWabaWithNumbers = wabas.find((waba: any) => waba.phone_numbers && waba.phone_numbers.data && waba.phone_numbers.data.length > 0);

    if (!firstWabaWithNumbers) {
      throw new Error('No phone numbers are associated with your WhatsApp Business Account. Please add and verify a phone number in your Meta Business settings.');
    }
    
    const phoneNumberId = firstWabaWithNumbers.phone_numbers.data[0].id;


    // 5. Store credentials in Supabase
    const supabaseAdmin = createClient(
      SUPABASE_URL ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );
    
    const { error } = await supabaseAdmin
      .from('businesses')
      .update({
        whatsapp_access_token: longLivedToken,
        whatsapp_phone_number_id: phoneNumberId,
        whatsapp_integration_active: true,
      })
      .eq('id', business_id);

    if (error) throw error;

    return Response.redirect(`${INTEGRATIONS_PAGE_URL}?source=whatsapp&status=success`, 302);

  } catch (e) {
    console.error('Error in WhatsApp callback:', e);
    return redirectWithError(e.message);
  }
});