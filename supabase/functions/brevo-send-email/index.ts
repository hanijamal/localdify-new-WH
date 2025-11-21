import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { checkRateLimit, RateLimitError } from '../_shared/rate-limiter.ts';

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
    const { to, subject, body } = await req.json();
    if (!to || !subject || !body) {
        throw new Error("Missing 'to', 'subject', or 'body' in request.");
    }

    // Initialize Supabase client with user's auth token to identify the user
    const supabaseUserClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseUserClient.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Initialize Supabase admin client to fetch business and system settings
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );
    
    // Rate Limiting (10 test emails per hour)
    await checkRateLimit(supabaseAdmin, user.id, 10, 3600);

    // Fetch Brevo settings, user profile, and business details in parallel
    const [
      apiKeyRes, 
      senderNameRes, 
      senderEmailRes,
      businessRes,
      userProfileRes
    ] = await Promise.all([
      supabaseAdmin.from('system_settings').select('value').eq('key', 'brevo_api_key').single(),
      supabaseAdmin.from('system_settings').select('value').eq('key', 'brevo_sender_name').single(),
      supabaseAdmin.from('system_settings').select('value').eq('key', 'brevo_sender_email').single(),
      supabaseAdmin.from('businesses').select('name').eq('user_id', user.id).single(),
      supabaseAdmin.from('users').select('name').eq('id', user.id).single()
    ]);

    const brevoApiKey = apiKeyRes.data?.value;
    const brevoSenderName = senderNameRes.data?.value || 'localDify';
    const brevoSenderEmail = senderEmailRes.data?.value;

    if (!brevoApiKey || brevoApiKey === 'null' || !brevoSenderEmail || brevoSenderEmail === 'null') {
      throw new Error('Email service is not configured by the administrator.');
    }

    const business = businessRes.data;
    const userProfile = userProfileRes.data;

    // Construct headers with fallbacks for robustness
    const ownerName = business?.name || userProfile?.name || 'Your Business';
    const fromName = `${ownerName} via ${brevoSenderName}`;
    const replyToEmail = user.email!;
    const replyToName = ownerName;

    const brevoPayload = {
      sender: { name: fromName, email: brevoSenderEmail },
      to: [{ email: to }],
      replyTo: { email: replyToEmail, name: replyToName },
      subject: subject,
      htmlContent: body,
    };

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': brevoApiKey,
        'content-type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify(brevoPayload),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      console.error('Brevo API Error:', errorBody);
      throw new Error(errorBody.message || 'Failed to send email via Brevo.');
    }

    return new Response(JSON.stringify({ success: true, message: 'Email sent successfully!' }), {
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
    console.error('Error in brevo-send-email function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
