// This edge function sends a reminder email for a booking made for the next day,
// particularly for bookings created *after* the daily cron job has already run.
// It is triggered by a Supabase Database Webhook on the 'bookings' table for INSERT and UPDATE events.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

declare const Deno: {
  env: { get(key: string): string | undefined; };
};

// --- Environment Variables ---
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const WEBHOOK_SECRET = Deno.env.get('BOOKING_WEBHOOK_SECRET');
const APP_URL = Deno.env.get('APP_URL');

enum LocalBookingStatus {
  Approved = "approved"
}

// --- Type Definitions ---
interface BrevoPayload {
  sender: { name: string; email: string };
  to: { email: string; name: string }[];
  replyTo?: { email: string; name: string };
  subject: string;
  htmlContent: string;
}

interface BusinessForEmail {
  name: string;
  user_id: string;
  currency: string;
  socials: {
    website?: string;
    instagram?: string;
    facebook?: string;
    whatsapp?: string;
  } | null;
}

interface OwnerForEmail {
  email: string | null;
}

const templatesByLang = {
  en: {
    reminder: {
      subject: "Reminder: Your appointment tomorrow with {{businessName}}",
      body: "<p>Hi {{customerName}},</p><p>This is a friendly reminder of your upcoming appointment:</p><ul style='list-style: none; padding: 0; margin-left: 0;'><li><strong>Service:</strong> {{serviceName}}</li><li><strong>Price:</strong> {{price}}</li><li><strong>Date & Time:</strong> {{date}} at {{time}}</li><li><strong>Provider:</strong> {{staffMemberName}}</li><li><strong>Location:</strong> {{locationName}}</li><li><strong>Address:</strong> {{locationAddress}}</li></ul><p>If you need to reschedule, please contact us.</p><p>See you soon,<br/>{{businessName}}</p><p style=\"text-align:center;margin-top:20px;font-size:14px;color:#999999;\">{{socialsLinks}}</p><p style=\"text-align:center;font-size:12px;color:#999999;margin-top:20px;\">Powered by <a href=\"{{appLink}}\" style=\"color:#644a40;text-decoration:none;\">localDify</a></p>"
    }
  },
  'pt-BR': {
    reminder: {
      subject: "Lembrete: Seu agendamento amanhã com {{businessName}}",
      body: "<p>Olá {{customerName}},</p><p>Este é um lembrete amigável do seu próximo agendamento:</p><ul style='list-style: none; padding: 0; margin-left: 0;'><li><strong>Serviço:</strong> {{serviceName}}</li><li><strong>Preço:</strong> {{price}}</li><li><strong>Data e Hora:</strong> {{date}} às {{time}}</li><li><strong>Profissional:</strong> {{staffMemberName}}</li><li><strong>Local:</strong> {{locationName}}</li><li><strong>Endereço:</strong> {{locationAddress}}</li></ul><p>Se precisar reagendar, por favor, entre em contato conosco.</p><p>Até breve,<br/>{{businessName}}</p><p style=\"text-align:center;margin-top:20px;font-size:14px;color:#999999;\">{{socialsLinks}}</p><p style=\"text-align:center;font-size:12px;color:#999999;margin-top:20px;\">Desenvolvido por <a href=\"{{appLink}}\" style=\"color:#644a40;text-decoration:none;\">localDify</a></p>"
    }
  },
  ar: {
    reminder: {
      subject: "{{businessName}} | تذكير بموعدك غداً لخدمة {{serviceName}}",
      body: "<div dir=\"rtl\" style=\"text-align: right; font-family: 'IBM Plex Sans Arabic', sans-serif;\"><p>مرحباً {{customerName}}،</p><p>هذا تذكير ودي بموعدك القادم:</p><ul style='list-style: none; padding: 0; margin-right: 0;'><li><strong>الخدمة:</strong> {{serviceName}}</li><li><strong>السعر:</strong> {{price}}</li><li><strong>التاريخ والوقت:</strong> {{date}} الساعة {{time}}</li><li><strong>مقدم الخدمة:</strong> {{staffMemberName}}</li><li><strong>الفرع:</strong> {{locationName}}</li><li><strong>العنوان:</strong> {{locationAddress}}</li></ul><p>إذا كنت بحاجة إلى إعادة الجدولة، يرجى الاتصال بنا.</p><p>نراك قريباً،<br/>{{businessName}}</p><p style=\"text-align:center;margin-top:20px;font-size:14px;color:#999999;\">{{socialsLinks}}</p><p style=\"text-align:center;font-size:12px;color:#999999;margin-top:20px;\">بدعم من <a href=\"{{appLink}}\" style=\"color:#644a40;text-decoration:none;\">localDify</a></p></div>"
    }
  },
  fr: {
    reminder: {
      subject: "Rappel : Votre rendez-vous demain chez {{businessName}}",
      body: "<p>Bonjour {{customerName}},</p><p>Ceci est un rappel amical de votre prochain rendez-vous :</p><ul style='list-style: none; padding: 0; margin-left: 0;'><li><strong>Service :</strong> {{serviceName}}</li><li><strong>Prix :</strong> {{price}}</li><li><strong>Date et Heure :</strong> {{date}} à {{time}}</li><li><strong>Prestataire :</strong> {{staffMemberName}}</li><li><strong>Lieu :</strong> {{locationName}}</li><li><strong>Adresse :</strong> {{locationAddress}}</li></ul><p>Si vous avez besoin de reporter, veuillez nous contacter.</p><p>À bientôt,<br/>{{businessName}}</p><p style=\"text-align:center;margin-top:20px;font-size:14px;color:#999999;\">{{socialsLinks}}</p><p style=\"text-align:center;font-size:12px;color:#999999;margin-top:20px;\">Propulsé par <a href=\"{{appLink}}\" style=\"color:#644a40;text-decoration:none;\">localDify</a></p>"
    }
  }
};

// --- Helper Functions for Debugging ---
const getSecretHint = (secret: string | undefined | null): string => {
  if (!secret || secret.length < 4) {
    return 'is not set or is too short';
  }
  return `starts with "${secret.substring(0, 2)}" and ends with "${secret.slice(-2)}"`;
}

const getReceivedSecret = (authHeader: string | null): string | null => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

const formatPriceInFunction = (amount: number, currency = "USD") => {
  const localeMap: { [key: string]: string } = { 'USD': 'en-US', 'EUR': 'de-DE', 'SAR': 'ar-SA', 'MAD': 'fr-MA', 'BRL': 'pt-BR' };
  const locale = localeMap[currency] || 'en-US';
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, numberingSystem: 'latn' } as any).format(amount);
  } catch (error) {
    console.warn(`Failed to format price for currency ${currency}. Defaulting to USD format.`, error);
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", numberingSystem: 'latn' } as any).format(amount);
  }
};


// --- Main Handler ---
serve(async (req) => {
  console.log('brevo-booking-update-processor function invoked.');
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

  try {
    // 1. Authenticate the webhook request
    const authorization = req.headers.get('Authorization');
    if (!WEBHOOK_SECRET || authorization !== `Bearer ${WEBHOOK_SECRET}`) {
      const receivedSecret = getReceivedSecret(authorization);
      const detailedError =
        `AUTHORIZATION FAILED. The secret sent by the webhook does not match the secret set for the function.` +
        `\n\nTROUBLESHOOTING:` +
        `\n1. Secret loaded by the function: ${getSecretHint(WEBHOOK_SECRET)}` +
        `\n2. Secret received from the webhook: ${getSecretHint(receivedSecret)}` +
        `\n\nCompare these two hints. If they do not match, you must re-set your secrets to be identical.` +
        `\nReceived full header: "${authorization}"`;

      console.error(detailedError);
      return new Response(JSON.stringify({ error: 'Unauthorized. The webhook secret is incorrect. Check the function logs for detailed troubleshooting steps.' }), { status: 401 });
    }
    console.log('Webhook authorized successfully.');

    // 2. Parse the payload and get the booking record
    const payload = await req.json();
    const booking = payload.record;

    if (!booking) {
      console.log('Skipped: No record in payload.');
      return new Response(JSON.stringify({ message: 'Skipped: No record in payload.' }), { status: 200 });
    }
    console.log(`Processing event for booking ID: ${booking.id}`);

    // --- Logic Checks ---
    // Prevent sending a reminder right after a booking is created, as the confirmation email should be sent instead.
    if (payload.type === 'INSERT') {
      const createdAt = new Date(booking.created_at);
      const now = new Date();
      const twoMinutes = 2 * 60 * 1000;
      if ((now.getTime() - createdAt.getTime()) < twoMinutes) {
        console.log(`Skipped immediate reminder for new booking ${booking.id} to allow confirmation email to be sent first.`);
        return new Response(JSON.stringify({ message: 'Skipped: Booking recently created. Waiting for confirmation email to process.' }), { status: 200 });
      }
    }

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // 3. Check if the conditions for sending an immediate reminder are met
    if (booking.date !== tomorrowStr || booking.status !== LocalBookingStatus.Approved || booking.reminder_sent_at !== null) {
      console.log('Skipped: Conditions for immediate reminder not met.');
      return new Response(JSON.stringify({ message: 'Skipped: Conditions for immediate reminder not met.' }), { status: 200 });
    }
    console.log('Conditions met for immediate reminder.');

    // 4. Fetch Brevo settings
    console.log('Fetching Brevo settings from database...');
    const [
      apiKeyRes,
      senderNameRes,
      senderEmailRes,
    ] = await Promise.all([
      supabaseAdmin.from('system_settings').select('value').eq('key', 'brevo_api_key').single(),
      supabaseAdmin.from('system_settings').select('value').eq('key', 'brevo_sender_name').single(),
      supabaseAdmin.from('system_settings').select('value').eq('key', 'brevo_sender_email').single(),
    ]);

    const brevoApiKey = apiKeyRes.data?.value;
    const brevoSenderName = senderNameRes.data?.value || 'localDify';
    const brevoSenderEmail = senderEmailRes.data?.value;

    if (!brevoApiKey || brevoApiKey === 'null' || !brevoSenderEmail || brevoSenderEmail === 'null') {
      console.error('CRITICAL: Brevo credentials not found or are null in system_settings. Aborting.');
      return new Response(JSON.stringify({ message: 'Skipped: Email provider not configured.' }), { status: 200 });
    }
    console.log('Successfully fetched Brevo credentials.');

    // 5. Fetch business and owner details
    console.log(`Fetching business data for business_id: ${booking.business_id}`);
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('name, user_id, socials, currency')
      .eq('id', booking.business_id)
      .single<BusinessForEmail>();

    if (businessError) throw new Error(`DB Error: Failed to fetch business: ${businessError.message}`);
    if (!business) throw new Error(`DB Error: Business with ID ${booking.business_id} not found.`);
    console.log(`Found business: "${business.name}" (User ID: ${business.user_id})`);

    console.log(`Fetching owner email for user_id: ${business.user_id}`);
    const { data: owner, error: ownerError } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('id', business.user_id)
      .single<OwnerForEmail>();

    if (ownerError) throw new Error(`DB Error: Failed to fetch business owner: ${ownerError.message}`);
    const ownerEmail = owner?.email;
    console.log(`Owner email found: ${ownerEmail ? 'Yes' : 'No'}`);

    // Fetch Staff Member Name
    let staffMemberName = 'Any available staff';
    if (booking.staff_member_id) {
      const { data: staffMember, error: staffError } = await supabaseAdmin
        .from('staff_members')
        .select('name')
        .eq('id', booking.staff_member_id)
        .single();
      if (staffError) {
        console.warn(`Could not fetch staff member ${booking.staff_member_id}: ${staffError.message}`);
      } else if (staffMember) {
        staffMemberName = staffMember.name;
      }
    }

    // Fetch location details
    let locationName = '';
    let locationAddress = '';
    if (booking.location_id) {
      const { data: location, error: locationError } = await supabaseAdmin
        .from('locations')
        .select('name, address')
        .eq('id', booking.location_id)
        .single();
      if (locationError) {
        console.warn(`Could not fetch location ${booking.location_id}: ${locationError.message}`);
      } else if (location) {
        locationName = location.name;
        locationAddress = location.address || '';
      }
    }


    // 6. Prepare email content
    console.log('Preparing email content...');
    const lang = booking.language || 'en';
    const template = (templatesByLang as any)[lang]?.reminder || templatesByLang['en'].reminder;

    let subject = template.subject;
    let body = template.body;

    let socialsHtml = '';
    if (business.socials && Object.values(business.socials).some(v => v)) {
      const links = [];
      if (business.socials.website) links.push(`<a href="${business.socials.website}" style="color:#644a40;text-decoration:none;">Website</a>`);
      if (business.socials.instagram) links.push(`<a href="${business.socials.instagram}" style="color:#644a40;text-decoration:none;">Instagram</a>`);
      if (business.socials.facebook) links.push(`<a href="${business.socials.facebook}" style="color:#644a40;text-decoration:none;">Facebook</a>`);
      if (business.socials.whatsapp) {
        const cleanPhone = business.socials.whatsapp.replace(/\D/g, '');
        links.push(`<a href="https://wa.me/${cleanPhone}" style="color:#644a40;text-decoration:none;">WhatsApp</a>`);
      }
      socialsHtml = links.join(' &bull; ');
    }

    const localeForDate = lang === 'en' ? 'en-US' : lang === 'pt-BR' ? 'pt-BR' : lang === 'fr' ? 'fr-FR' : 'ar-SA';
    const dateOptions: Intl.DateTimeFormatOptions = {
      timeZone: 'UTC',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    if (lang === 'ar') {
      dateOptions.calendar = 'gregory';
      dateOptions.numberingSystem = 'latn';
    }

    const placeholders = {
      '{{customerName}}': booking.customer_name,
      '{{serviceName}}': booking.service_name,
      '{{price}}': formatPriceInFunction(booking.price_at_booking, business.currency || 'USD'),
      '{{date}}': new Date(`${booking.date}T00:00:00`).toLocaleDateString(localeForDate, dateOptions),
      '{{time}}': booking.time,
      '{{businessName}}': business.name,
      '{{notes}}': booking.notes || '',
      '{{staffMemberName}}': staffMemberName,
      '{{locationName}}': locationName,
      '{{locationAddress}}': locationAddress,
      '{{socialsLinks}}': socialsHtml,
      '{{appLink}}': APP_URL,
    };

    for (const [key, value] of Object.entries(placeholders)) {
      const regex = new RegExp(key.replace(/([{}])/g, '\\$1'), 'g');
      subject = subject.replace(regex, value || '');
      body = body.replace(regex, value || '');
    }

    const fromName = `${business.name} via ${brevoSenderName}`;
    const replyToName = business.name;

    console.log('Email content prepared. Constructing Brevo payload...');
    const brevoPayload: BrevoPayload = {
      sender: { name: fromName, email: brevoSenderEmail },
      to: [{ email: booking.customer_email, name: booking.customer_name }],
      subject: subject,
      htmlContent: body,
    };

    if (ownerEmail) {
      brevoPayload.replyTo = { email: ownerEmail, name: replyToName };
    }
    console.log('Payload constructed. Sending email...');

    // 7. Send email via Brevo API
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': brevoApiKey, 'content-type': 'application/json', 'accept': 'application/json' },
      body: JSON.stringify(brevoPayload),
    });
    console.log(`Brevo API response status: ${response.status}`);

    if (!response.ok) {
      const errorBody = await response.json();
      console.error('Brevo API returned an error:', JSON.stringify(errorBody, null, 2));
      throw new Error(errorBody.message || 'Failed to send immediate reminder email via Brevo.');
    }

    const { error: incrementError } = await supabaseAdmin.rpc('increment_business_counter', {
      p_business_id: booking.business_id,
      p_counter_column: 'email_messages_sent',
      p_increment_by: 1
    });
    if (incrementError) {
      console.warn(`[Booking Update Reminder] Failed to increment email counter for business ${booking.business_id}:`, incrementError.message);
    }

    // 8. Mark the reminder as sent in the database
    console.log('Email sent. Updating booking record...');
    const { error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq('id', booking.id);

    if (updateError) {
      console.warn(`Failed to mark reminder as sent for booking ${booking.id}: ${updateError.message}`);
    } else {
      console.log('Successfully marked reminder as sent.');
    }

    console.log(`Immediate reminder sent successfully to ${booking.customer_email}.`);

    return new Response(JSON.stringify({ success: true, message: 'Immediate reminder processed.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('CRITICAL ERROR in brevo-booking-update-processor function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});