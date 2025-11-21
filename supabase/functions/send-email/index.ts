// This edge function handles sending emails, designed to be invoked from the frontend.
// It securely authenticates the user, retrieves their stored Google OAuth tokens,
// and uses the Gmail API to send an email on their behalf.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { OAuth2Client } from 'npm:google-auth-library@9.1.0';
import { google } from 'npm:googleapis@126.0.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};


declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to, subject, body } = await req.json();
    if (!to || !subject || !body) {
        throw new Error("Missing 'to', 'subject', or 'body' in request.");
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('google_access_token, google_refresh_token, google_integration_active')
        .eq('user_id', user.id)
        .single();
    
    if (businessError) throw businessError;
    if (!business) throw new Error('Business not found for user.');
    if (!business.google_integration_active || !business.google_refresh_token) {
        throw new Error('Gmail integration is not active or configured correctly.');
    }
    
    const oauth2Client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
    oauth2Client.setCredentials({
      access_token: business.google_access_token,
      refresh_token: business.google_refresh_token,
    });
    
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
    const messageParts = [
      `To: <${to}>`,
      `Subject: ${utf8Subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      body,
    ];
    const message = messageParts.join('\n');
    const encodedMessage = btoa(message).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });
    
    return new Response(JSON.stringify({ success: true, message: 'Test email sent successfully!' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error sending test email:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});