// This edge function sends reminder emails for upcoming appointments.
// It is designed to be triggered by a Supabase Cron Job (e.g., daily).
// It queries for approved bookings scheduled for the next day, and for each one,
// it fetches the business's details and system-wide Brevo credentials, 
// templates the reminder email, and sends it via the Brevo SMTP API.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

enum LocalBookingStatus {
    Approved = "approved",
}

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

// --- Environment Variables ---
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const CRON_SECRET = Deno.env.get('CRON_SECRET');
const APP_URL = Deno.env.get('APP_URL');

// --- Type Definitions ---
interface BrevoPayload {
  sender: { name: string; email: string };
  to: { email: string; name: string }[];
  replyTo?: { email: string; name: string };
  subject: string;
  htmlContent: string;
}

interface BusinessForReminder {
  id: string;
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

interface UserForReminder {
  id: string;
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
            body: "<div dir=\"rtl\" style=\"text-align: right; font-family: 'Amiri', serif;\"><p>مرحباً {{customerName}}،</p><p>هذا تذكير ودي بموعدك القادم:</p><ul style='list-style: none; padding: 0; margin-right: 0;'><li><strong>الخدمة:</strong> {{serviceName}}</li><li><strong>السعر:</strong> {{price}}</li><li><strong>التاريخ والوقت:</strong> {{date}} الساعة {{time}}</li><li><strong>مقدم الخدمة:</strong> {{staffMemberName}}</li><li><strong>الفرع:</strong> {{locationName}}</li><li><strong>العنوان:</strong> {{locationAddress}}</li></ul><p>إذا كنت بحاجة إلى إعادة الجدولة، يرجى الاتصال بنا.</p><p>نراك قريباً،<br/>{{businessName}}</p><p style=\"text-align:center;margin-top:20px;font-size:14px;color:#999999;\">{{socialsLinks}}</p><p style=\"text-align:center;font-size:12px;color:#999999;margin-top:20px;\">بدعم من <a href=\"{{appLink}}\" style=\"color:#644a40;text-decoration:none;\">localDify</a></p></div>"
        }
    },
    fr: {
        reminder: {
            subject: "Rappel : Votre rendez-vous demain chez {{businessName}}",
            body: "<p>Bonjour {{customerName}},</p><p>Ceci est un rappel amical de votre prochain rendez-vous :</p><ul style='list-style: none; padding: 0; margin-left: 0;'><li><strong>Service :</strong> {{serviceName}}</li><li><strong>Prix :</strong> {{price}}</li><li><strong>Date et Heure :</strong> {{date}} à {{time}}</li><li><strong>Prestataire :</strong> {{staffMemberName}}</li><li><strong>Lieu :</strong> {{locationName}}</li><li><strong>Adresse :</strong> {{locationAddress}}</li></ul><p>Si vous avez besoin de reporter, veuillez nous contacter.</p><p>À bientôt,<br/>{{businessName}}</p><p style=\"text-align:center;margin-top:20px;font-size:14px;color:#999999;\">{{socialsLinks}}</p><p style=\"text-align:center;font-size:12px;color:#999999;margin-top:20px;\">Propulsé par <a href=\"{{appLink}}\" style=\"color:#644a40;text-decoration:none;\">localDify</a></p>"
        }
    }
};

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


// --- Main Handler ---
serve(async (req) => {
  console.log('brevo-send-reminders cron job invoked.');
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Authenticate the cron job request
    const authorization = req.headers.get('Authorization');
    if (!CRON_SECRET || authorization !== `Bearer ${CRON_SECRET}`) {
      const receivedSecret = getReceivedSecret(authorization);
      const detailedError =
        `AUTHORIZATION FAILED. The secret sent by the cron job does not match the secret set for the function.` +
        `\n\nTROUBLESHOOTING:` +
        `\n1. Secret loaded by the function: ${getSecretHint(CRON_SECRET)}` +
        `\n2. Secret received from the cron job: ${getSecretHint(receivedSecret)}` +
        `\n\nCompare these two hints. If they do not match, you must re-set your secrets to be identical.` +
        `\nReceived full header: "${authorization}"`;
        
      console.error(detailedError);
      return new Response(JSON.stringify({ error: 'Unauthorized. The cron secret is incorrect. Check the function logs for details.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }
    console.log('Cron job authorized successfully.');

    // 2. Initialize Supabase Admin Client
    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });

    // 3. Fetch Brevo settings once
    console.log('Fetching Brevo settings from database...');
    const [apiKeyRes, senderNameRes, senderEmailRes] = await Promise.all([
      supabaseAdmin.from('system_settings').select('value').eq('key', 'brevo_api_key').single(),
      supabaseAdmin.from('system_settings').select('value').eq('key', 'brevo_sender_name').single(),
      supabaseAdmin.from('system_settings').select('value').eq('key', 'brevo_sender_email').single()
    ]);

    const brevoApiKey = apiKeyRes.data?.value;
    const brevoSenderName = senderNameRes.data?.value || 'localDify';
    const brevoSenderEmail = senderEmailRes.data?.value;

    if (!brevoApiKey || brevoApiKey === 'null' || !brevoSenderEmail || brevoSenderEmail === 'null') {
      console.error('CRITICAL: Brevo credentials not found or are null in system_settings. Cron job cannot run.');
      throw new Error('Email provider (Brevo) is not configured by the administrator.');
    }
    console.log('Successfully fetched Brevo credentials.');
    
    // 4. Find tomorrow's date
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    console.log(`Searching for bookings on date: ${tomorrowStr}`);
    
    // 5. Fetch all approved bookings for tomorrow that need a reminder
    const { data: upcomingBookings, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select('*, staff_members(name), businesses(*)')
      .eq('date', tomorrowStr)
      .eq('status', LocalBookingStatus.Approved)
      .is('reminder_sent_at', null);

    if (bookingsError) throw new Error(`Failed to fetch upcoming bookings: ${bookingsError.message}`);
    if (!upcomingBookings || upcomingBookings.length === 0) {
      console.log(`No upcoming bookings for ${tomorrowStr} needing reminders. Job finished.`);
      return new Response(JSON.stringify({ message: 'No bookings to process.' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    console.log(`Found ${upcomingBookings.length} bookings to process.`);

    // --- Efficiently fetch related data ---
    console.log('Fetching related user data...');
    const userIds = [...new Set(upcomingBookings.map(b => b.businesses.user_id))];
    const { data: usersData, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .in('id', userIds);
    if (usersError) throw usersError;
    const users: UserForReminder[] = usersData || [];

    const userMap = new Map(users.map(u => [u.id, u]));
    console.log(`Fetched data for ${userMap.size} users.`);
    // --- End of data fetching ---

    let emailsSent = 0;
    const processingPromises = upcomingBookings.map(async (booking) => {
      const business = booking.businesses as unknown as BusinessForReminder;
      if (!business) {
        console.warn(`Data inconsistency: Business ${booking.business_id} not found for booking ${booking.id}. Skipping.`);
        return;
      }
      const owner = userMap.get(business.user_id);
      if (!owner) {
          console.warn(`Data inconsistency: Owner not found for business ${business.id}. Skipping.`);
          return;
      }

      try {
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
        const lang = booking.language || 'en';
        const template = (templatesByLang as any)[lang]?.reminder || templatesByLang['en'].reminder;

        let subject = template.subject;
        let body = template.body;

        const staffMemberName = (booking.staff_members as any)?.name || 'Any available staff';

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
        const replyToEmail = owner.email;
        const replyToName = business.name;

        const brevoPayload: BrevoPayload = {
          sender: { name: fromName, email: brevoSenderEmail },
          to: [{ email: booking.customer_email, name: booking.customer_name }],
          subject: subject,
          htmlContent: body,
        };

        if (replyToEmail) {
            brevoPayload.replyTo = { email: replyToEmail, name: replyToName };
        }
        
        console.log(`Sending reminder for booking ${booking.id} to ${booking.customer_email}...`);
        
        // 7. Send email via Brevo API
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'api-key': brevoApiKey,
                'content-type': 'application/json',
                'accept': 'application/json',
            },
            body: JSON.stringify(brevoPayload),
        });
        
        console.log(`  -> Brevo API response status for booking ${booking.id}: ${response.status}`);

        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(errorBody.message || 'Failed to send reminder email via Brevo.');
        }

        const { error: incrementError } = await supabaseAdmin.rpc('increment_business_counter', {
            p_business_id: booking.business_id,
            p_counter_column: 'email_messages_sent',
            p_increment_by: 1
        });
        if (incrementError) {
            console.warn(`[Cron Reminder] Failed to increment email counter for business ${booking.business_id}:`, incrementError.message);
        }

        // 8. Mark the reminder as sent
        const { error: updateError } = await supabaseAdmin
            .from('bookings')
            .update({ reminder_sent_at: new Date().toISOString() })
            .eq('id', booking.id);
        
        if (updateError) {
            console.warn(`Failed to mark reminder as sent for booking ${booking.id}: ${updateError.message}`);
        }

        console.log(`Reminder email sent and marked for booking ${booking.id}.`);
        emailsSent++;
      } catch(emailError) {
          console.error(`Failed to process reminder for booking ${booking.id}:`, emailError.message);
      }
    });

    await Promise.all(processingPromises);

    console.log(`Reminder job finished. Sent ${emailsSent} of ${upcomingBookings.length} possible emails.`);

    return new Response(JSON.stringify({ success: true, message: `Processed ${upcomingBookings.length} bookings, sent ${emailsSent} reminders.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('CRITICAL ERROR in brevo-send-reminders function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});