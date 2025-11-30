// This edge function sends a reminder email for a booking made for the next day,
// particularly for bookings created *after* the daily cron job has already run.
// It is triggered by a Supabase Database Webhook on the 'bookings' table for INSERT and UPDATE events.

// Required environment variables:
// - GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
// - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// - BOOKING_WEBHOOK_SECRET: A secret string to secure the endpoint.

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

enum LocalBookingStatus {
    Approved = "approved"
}

const defaultReminderTemplate = {
    subject: "Reminder: Your appointment tomorrow with {{businessName}}",
    body: "<p>Hi {{customerName}},</p><p>This is a friendly reminder of your upcoming appointment for <strong>{{serviceName}}</strong> tomorrow, <strong>{{date}}</strong>, at <strong>{{time}}</strong>.</p><p>If you need to reschedule, please contact us.</p><p>See you soon,<br/>{{businessName}}</p>"
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
    const booking = payload.record;

    if (!booking) {
      return new Response(JSON.stringify({ message: 'Skipped: No record in payload.' }), { status: 200 });
    }

    // --- Logic Checks ---
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // 1. Is the booking for tomorrow?
    // 2. Is it approved?
    // 3. Has a reminder NOT been sent yet?
    if (booking.date !== tomorrowStr || booking.status !== LocalBookingStatus.Approved || booking.reminder_sent_at !== null) {
      return new Response(JSON.stringify({ message: 'Skipped: Conditions for immediate reminder not met.' }), { status: 200 });
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
      console.log(`Gmail integration not active for business ${business.name}. Skipping immediate reminder.`);
      return new Response(JSON.stringify({ message: 'Skipped: Integration not active.' }), { status: 200 });
    }
    
    // --- Send Email ---
    const template = business.email_templates?.reminder || defaultReminderTemplate;
    let subject = template.subject;
    let body = template.body;

    const placeholders = {
        '{{customerName}}': booking.customer_name,
        '{{serviceName}}': booking.service_name,
        '{{date}}': new Date(booking.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        '{{time}}': booking.time,
        '{{businessName}}': business.name,
        '{{notes}}': booking.notes || '',
    };

    for (const [key, value] of Object.entries(placeholders)) {
        const regex = new RegExp(key.replace(/([{}])/g, '\\$1'), 'g');
        subject = subject.replace(regex, value);
        body = body.replace(regex, value);
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
    
    // --- Mark as Sent ---
    const { error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq('id', booking.id);
    
    if (updateError) {
        console.warn(`Failed to mark reminder as sent for booking ${booking.id}: ${updateError.message}`);
    }

    console.log(`Immediate reminder sent successfully to ${booking.customer_email} for business ${business.name}.`);

    return new Response(JSON.stringify({ success: true, message: 'Immediate reminder processed.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in booking update processor:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});