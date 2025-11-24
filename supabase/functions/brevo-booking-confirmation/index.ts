// This edge function sends a confirmation email when a new booking is created.
// It is triggered by a Supabase Database Webhook on the 'bookings' table for INSERT events.
// It securely handles fetching business credentials, templating the email, 
// and sending it via the business owner's connected Gmail account.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

declare const Deno: {
  env: { get(key: string): string | undefined; };
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const WEBHOOK_SECRET = Deno.env.get('BOOKING_WEBHOOK_SECRET');
const APP_URL = Deno.env.get('APP_URL');

const templatesByLang = {
  en: {
    confirmation: {
      subject: "Your Booking is Confirmed: {{serviceName}} with {{businessName}}",
      body: "<p>Hi {{customerName}},</p><p>This is to confirm your booking details:</p><ul style='list-style: none; padding: 0; margin-left: 0;'><li><strong>Service:</strong> {{serviceName}}</li><li><strong>Price:</strong> {{price}}</li><li><strong>Date & Time:</strong> {{date}} at {{time}}</li><li><strong>Provider:</strong> {{staffMemberName}}</li><li><strong>Location:</strong> {{locationName}}</li><li><strong>Address:</strong> {{locationAddress}}</li></ul><p>We look forward to seeing you!<br/>{{businessName}}</p><p style=\"text-align:center;margin-top:20px;font-size:14px;color:#999999;\">{{socialsLinks}}</p><p style=\"text-align:center;font-size:12px;color:#999999;margin-top:20px;\">Powered by <a href=\"{{appLink}}\" style=\"color:#644a40;text-decoration:none;\">localDify</a></p>"
    }
  },
  'pt-BR': {
    confirmation: {
      subject: "Seu Agendamento está Confirmado: {{serviceName}} com {{businessName}}",
      body: "<p>Olá {{customerName}},</p><p>Este é um e-mail para confirmar os detalhes do seu agendamento:</p><ul style='list-style: none; padding: 0; margin-left: 0;'><li><strong>Serviço:</strong> {{serviceName}}</li><li><strong>Preço:</strong> {{price}}</li><li><strong>Data e Hora:</strong> {{date}} às {{time}}</li><li><strong>Profissional:</strong> {{staffMemberName}}</li><li><strong>Local:</strong> {{locationName}}</li><li><strong>Endereço:</strong> {{locationAddress}}</li></ul><p>Estamos ansiosos para vê-lo(a)!<br/>{{businessName}}</p><p style=\"text-align:center;margin-top:20px;font-size:14px;color:#999999;\">{{socialsLinks}}</p><p style=\"text-align:center;font-size:12px;color:#999999;margin-top:20px;\">Desenvolvido por <a href=\"{{appLink}}\" style=\"color:#644a40;text-decoration:none;\">localDify</a></p>"
    }
  },
  ar: {
    confirmation: {
      subject: "{{businessName}} | تم تأكيد حجزك لخدمة {{serviceName}}",
      body: "<div dir=\"rtl\" style=\"text-align: right; font-family: 'IBM Plex Sans Arabic', sans-serif;\"><p>مرحباً {{customerName}}،</p><p>هذه رسالة لتأكيد تفاصيل حجزك:</p><ul style='list-style: none; padding: 0; margin-right: 0;'><li><strong>الخدمة:</strong> {{serviceName}}</li><li><strong>السعر:</strong> {{price}}</li><li><strong>التاريخ والوقت:</strong> {{date}} الساعة {{time}}</li><li><strong>مقدم الخدمة:</strong> {{staffMemberName}}</li><li><strong>الفرع:</strong> {{locationName}}</li><li><strong>العنوان:</strong> {{locationAddress}}</li></ul><p>نتطلع لرؤيتك قريباً!<br/>{{businessName}}</p><p style=\"text-align:center;margin-top:20px;font-size:14px;color:#999999;\">{{socialsLinks}}</p><p style=\"text-align:center;font-size:12px;color:#999999;margin-top:20px;\">بدعم من <a href=\"{{appLink}}\" style=\"color:#644a40;text-decoration:none;\">localDify</a></p></div>"
    }
  },
  fr: {
    confirmation: {
      subject: "Votre réservation est confirmée : {{serviceName}} chez {{businessName}}",
      body: "<p>Bonjour {{customerName}},</p><p>Ceci est pour confirmer les détails de votre réservation :</p><ul style='list-style: none; padding: 0; margin-left: 0;'><li><strong>Service :</strong> {{serviceName}}</li><li><strong>Prix :</strong> {{price}}</li><li><strong>Date et Heure :</strong> {{date}} à {{time}}</li><li><strong>Prestataire :</strong> {{staffMemberName}}</li><li><strong>Lieu :</strong> {{locationName}}</li><li><strong>Adresse :</strong> {{locationAddress}}</li></ul><p>Nous avons hâte de vous voir !<br/>{{businessName}}</p><p style=\"text-align:center;margin-top:20px;font-size:14px;color:#999999;\">{{socialsLinks}}</p><p style=\"text-align:center;font-size:12px;color:#999999;margin-top:20px;\">Propulsé par <a href=\"{{appLink}}\" style=\"color:#644a40;text-decoration:none;\">localDify</a></p>"
    }
  }
};

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


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
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

    const payload = await req.json();
    if (payload.type !== 'INSERT' || !payload.record) {
      return new Response(JSON.stringify({ message: 'Skipped: Not an insert event.' }), { status: 200 });
    }
    const booking = payload.record;

    if (!APP_URL) {
      throw new Error("APP_URL environment variable is not set.");
    }
    const lang = booking.language || 'en'; // Default to English if language not set on booking

    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });

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

    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('name, user_id, socials, currency')
      .eq('id', booking.business_id)
      .single();

    if (businessError) throw new Error(`Failed to fetch business: ${businessError.message}`);
    if (!business) throw new Error(`Business with ID ${booking.business_id} not found.`);

    const { data: owner, error: ownerError } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('id', business.user_id)
      .single();

    if (ownerError) throw new Error(`Failed to fetch business owner: ${ownerError.message}`);
    const ownerEmail = owner?.email;

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


    const template = (templatesByLang as any)[lang]?.confirmation || templatesByLang['en'].confirmation;
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
      '{{price}}': formatPriceInFunction(booking.price_at_booking, (business as any).currency || 'USD'),
      '{{date}}': new Date(`${booking.date}T00:00:00`).toLocaleDateString(localeForDate, dateOptions),
      '{{time}}': booking.time,
      '{{businessName}}': business.name,
      '{{notes}}': booking.notes || '',
      '{{staffMemberName}}': staffMemberName,
      '{{locationName}}': locationName,
      '{{locationAddress}}': locationAddress,
      '{{socialsLinks}}': socialsHtml,
      '{{appLink}}': APP_URL
    };

    for (const [key, value] of Object.entries(placeholders)) {
      const regex = new RegExp(key.replace(/([{}])/g, '\\$1'), 'g');
      subject = subject.replace(regex, value || '');
      body = body.replace(regex, value || '');
    }

    const fromName = `${business.name} via ${brevoSenderName}`;
    const replyToName = business.name;

    const brevoPayload: any = {
      sender: { name: fromName, email: brevoSenderEmail },
      to: [{ email: booking.customer_email, name: booking.customer_name }],
      subject: subject,
      htmlContent: body,
    };

    if (ownerEmail) {
      brevoPayload.replyTo = { email: ownerEmail, name: replyToName };
    }

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
      throw new Error(errorBody.message || 'Failed to send confirmation email via Brevo.');
    }

    console.log(`Booking confirmation email sent successfully to ${booking.customer_email} for business ${business.name}.`);

    const { error: incrementError } = await supabaseAdmin.rpc('increment_business_counter', {
      p_business_id: booking.business_id,
      p_counter_column: 'email_messages_sent',
      p_increment_by: 1
    });
    if (incrementError) {
      console.warn(`[Booking Confirmation] Failed to increment email counter for business ${booking.business_id}:`, incrementError.message);
    }

    return new Response(JSON.stringify({ success: true, message: 'Email processed.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in brevo-booking-confirmation function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});