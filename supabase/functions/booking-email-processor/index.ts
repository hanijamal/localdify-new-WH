// This edge function sends a confirmation email when a new booking is created.
// It is triggered by a Supabase Database Webhook on the 'bookings' table for INSERT events.
// It securely handles fetching business credentials, templating the email, 
// and sending it via the business owner's connected Gmail account.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { OAuth2Client } from 'npm:google-auth-library@9.1.0';
import { google } from 'npm:googleapis@126.0.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

declare const Deno: {
  env: { get(key: string): string | undefined; };
};

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const WEBHOOK_SECRET = Deno.env.get('BOOKING_WEBHOOK_SECRET'); 
const APP_URL = Deno.env.get('APP_URL');

const defaultConfirmationTemplate = {
    subject: "Your Booking is Confirmed: {{serviceName}} with {{businessName}}",
    body: "<p>Hi {{customerName}},</p><p>This is to confirm your booking for <strong>{{serviceName}}</strong> on <strong>{{date}}</strong> at <strong>{{time}}</strong>.</p><p>If you need to cancel or reschedule, please use the link below to cancel your booking:</p><p><a href=\"{{cancellationLink}}\" style=\"display:inline-block;padding:10px 20px;font-size:16px;color:#ffffff;background-color:#644a40;border-radius:5px;text-decoration:none;\">Cancel Booking</a></p><p>We look forward to seeing you!</p><p>Sincerely,<br/>The team at {{businessName}}</p><p style=\"text-align:center;font-size:12px;color:#999999;margin-top:20px;\">Powered by <a href=\"{{appLink}}\" style=\"color:#644a40;text-decoration:none;\">localDify</a></p>"
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authorization = req.headers.get('Authorization');
    if (!WEBHOOK_SECRET || authorization !== `Bearer ${WEBHOOK_SECRET}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const payload = await req.json();
    if (payload.type !== 'INSERT' || !payload.record) {
      return new Response(JSON.stringify({ message: 'Skipped: Not an insert event.' }), { status: 200 });
    }
    const booking = payload.record;
    
    if (!APP_URL) {
      throw new Error("APP_URL environment variable is not set.");
    }

    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });

    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('name, google_integration_active, google_access_token, google_refresh_token, email_templates')
      .eq('id', booking.business_id)
      .single();

    if (businessError) throw new Error(`Failed to fetch business: ${businessError.message}`);
    if (!business) throw new Error(`Business with ID ${booking.business_id} not found.`);

    if (!business.google_integration_active || !business.google_refresh_token) {
      console.log(`Gmail integration not active for business ${business.name}. Skipping email.`);
      return new Response(JSON.stringify({ message: 'Skipped: Integration not active.' }), { status: 200 });
    }
    
    const template = business.email_templates?.confirmation || defaultConfirmationTemplate;
    let subject = template.subject;
    let body = template.body;

    const cancellationLink = `${APP_URL}/#/cancel-booking?token=${booking.cancellation_token}`;

    const placeholders = {
        '{{customerName}}': booking.customer_name,
        '{{serviceName}}': booking.service_name,
        '{{date}}': new Date(booking.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        '{{time}}': booking.time,
        '{{businessName}}': business.name,
        '{{notes}}': booking.notes || '',
        '{{cancellationLink}}': cancellationLink,
        '{{appLink}}': APP_URL
    };
    
    for (const [key, value] of Object.entries(placeholders)) {
        const regex = new RegExp(key.replace(/([{}])/g, '\\$1'), 'g');
        subject = subject.replace(regex, value || '');
        body = body.replace(regex, value || '');
    }

    const oauth2Client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
    oauth2Client.setCredentials({
      access_token: business.google_access_token,
      refresh_token: business.google_refresh_token,
    });
    
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
    const messageParts = [`To: <${booking.customer_email}>`, `Subject: ${utf8Subject}`, 'MIME-Version: 1.0', 'Content-Type: text/html; charset=utf-8', '', body];
    const message = messageParts.join('\n');
    const encodedMessage = btoa(message).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encodedMessage },
    });
    
    console.log(`Booking confirmation email sent successfully to ${booking.customer_email} for business ${business.name}.`);

    return new Response(JSON.stringify({ success: true, message: 'Email processed.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in booking email processor:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});