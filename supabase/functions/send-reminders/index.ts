// This edge function sends reminder emails for upcoming appointments.
// It is designed to be triggered by a Supabase Cron Job (e.g., daily).
// It queries for approved bookings scheduled for the next day, and for each one,
// it fetches the business's details and sends a reminder via the owner's
// connected Gmail account.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';

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

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const CRON_SECRET = Deno.env.get('CRON_SECRET');


interface TemplateConfig {
  name: string;
  code: string;
}

interface TemplatePayload {
    name: string;
    language: { code: string };
    components: {
        type: 'body';
        parameters: { type: 'text'; text: string }[];
    }[];
}

const sendWhatsAppMessage = async (
    token: string, 
    fromId: string, 
    to: string, 
    payload: { template: TemplatePayload }
) => {
    const url = `https://graph.facebook.com/v19.0/${fromId}/messages`;
    
    const body = {
        messaging_product: 'whatsapp',
        to: to.replace(/\D/g, ''), // Sanitize phone number
        type: 'template',
        template: payload.template
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error('WhatsApp API Error:', JSON.stringify(errorData, null, 2));

        // Log the exact request body that failed for easier debugging
        console.log('Failed Request Body for debugging:', body);
        
        if (errorData.error?.code === 190) {
            throw new Error(`PLATFORM-WIDE WhatsApp token is invalid or expired. Please check admin settings. Subcode: ${errorData.error.error_subcode}`);
        }

        let detailedMessage = `Failed to send message: ${errorData.error.message}`;
        if (errorData.error?.code === 132001) { // Template name does not exist in the translation
            detailedMessage = `Template name does not exist in the translation. ` +
                              `Please check that the template name ('${body.template.name}') and language code ('${body.template.language.code}') in your Admin Settings exactly match an approved template in your Meta Business Manager. ` +
                              `Note: Language codes can be specific (e.g., 'en_US' instead of just 'en'). Original error: ${errorData.error.message}`;
        }
        
        throw new Error(detailedMessage);
    }
    
    return await response.json();
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

async function getPhoneNumberId(supabaseAdmin: SupabaseClient, token: string, phoneId: string | null, accountId: string | null): Promise<string | null> {
    if (accountId && accountId !== 'null') {
        console.log(`WhatsApp Business Account ID provided. Discovering Phone Number ID for account: ${accountId}`);
        const url = `https://graph.facebook.com/v20.0/${accountId}/phone_numbers`;
        try {
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                const errorData = await response.json();
                let friendlyError = `Failed to get phone numbers for WABA ${accountId}: ${errorData.error.message}`;
                if (errorData.error?.code === 190) { // OAuthException
                    friendlyError = `Failed to get phone numbers for WABA ${accountId} because the Access Token is invalid or has expired. Please generate a new one in the Meta App Dashboard and update it in the Admin Settings.`;
                } else if (errorData.error?.code === 100) { // Invalid parameter
                    friendlyError = `Failed to get phone numbers for WABA ${accountId}. The Business Account ID appears to be incorrect. Please verify it in the Admin Settings.`;
                }
                console.error(friendlyError, JSON.stringify(errorData, null, 2));
                return null;
            }
            const { data } = await response.json();
            if (data && data.length > 0) {
                const discoveredPhoneId = data[0].id;
                console.log(`Successfully discovered Phone Number ID: ${discoveredPhoneId}`);
                await supabaseAdmin
                    .from('system_settings')
                    .upsert({ key: 'whatsapp_phone_number_id', value: discoveredPhoneId });
                return discoveredPhoneId;
            } else {
                console.warn(`No phone numbers found for WABA ${accountId}. This Business Account might not have a number, or permissions are missing.`);
                return null;
            }
        } catch (e) {
            console.error('Error during phone number discovery:', e.message);
            return null;
        }
    }
    return phoneId && phoneId !== 'null' ? phoneId : null;
}

// Safely parse template settings from the database
const safeParseTemplate = (dbValue: any): TemplateConfig | null => {
    if (!dbValue) return null;
    if (typeof dbValue === 'object' && dbValue.name && dbValue.code) return dbValue;
    if (typeof dbValue === 'string') {
        try {
            const parsed = JSON.parse(dbValue);
            if (parsed.name && parsed.code) return parsed;
        } catch (e) {
            console.warn('Could not parse template config string:', dbValue);
        }
    }
    return null;
};


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authorization = req.headers.get('Authorization');
    if (!CRON_SECRET || authorization !== `Bearer ${CRON_SECRET}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });

    const [
        whatsappTokenRes, 
        whatsappPhoneIdRes,
        whatsappAccountIdRes,
        remEnRes, 
        remArRes, 
        remFrRes
    ] = await Promise.all([
        supabaseAdmin.from('system_settings').select('value').eq('key', 'whatsapp_access_token').single(),
        supabaseAdmin.from('system_settings').select('value').eq('key', 'whatsapp_phone_number_id').single(),
        supabaseAdmin.from('system_settings').select('value').eq('key', 'whatsapp_business_account_id').single(),
        supabaseAdmin.from('system_settings').select('value').eq('key', 'whatsapp_template_reminder_en').single(),
        supabaseAdmin.from('system_settings').select('value').eq('key', 'whatsapp_template_reminder_ar').single(),
        supabaseAdmin.from('system_settings').select('value').eq('key', 'whatsapp_template_reminder_fr').single(),
    ]);
    const platformWhatsappToken = whatsappTokenRes.data?.value as (string | null);
    const platformWhatsappPhoneId = whatsappPhoneIdRes.data?.value as (string | null);
    const platformWhatsappAccountId = whatsappAccountIdRes.data?.value as (string | null);
    
    const isWhatsappConfigured = platformWhatsappToken && platformWhatsappToken !== 'null';

    const platformTemplates = {
        en: safeParseTemplate(remEnRes.data?.value),
        ar: safeParseTemplate(remArRes.data?.value),
        fr: safeParseTemplate(remFrRes.data?.value),
    };

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    const { data: upcomingBookings, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select('*, businesses!inner(*)')
      .eq('date', tomorrowStr)
      .eq('status', LocalBookingStatus.Approved)
      .is('reminder_sent_at', null);

    if (bookingsError) throw bookingsError;
    if (!upcomingBookings || upcomingBookings.length === 0) {
      return new Response(JSON.stringify({ message: 'No bookings to process.' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let effectivePhoneId: string | null = null;
    if (isWhatsappConfigured) {
        effectivePhoneId = await getPhoneNumberId(supabaseAdmin, platformWhatsappToken!, platformWhatsappPhoneId, platformWhatsappAccountId);
    }

    let whatsappSent = 0;
    const processingPromises = upcomingBookings.map(async (booking) => {
      const business = booking.businesses;

      if (!business) {
        console.warn(`Skipping booking ${booking.id}: Business data is missing.`);
        return;
      }
      
      let notificationSent = false;

      // --- WhatsApp Logic ---
      if (isWhatsappConfigured && effectivePhoneId && business.whatsapp_notifications_enabled && booking.customer_phone) {
          try {
              const lang = booking.language || 'en';
              let templateConfig: TemplateConfig | null = null;

              switch (lang) {
                  case 'ar':
                      templateConfig = platformTemplates.ar;
                      break;
                  case 'fr':
                      templateConfig = platformTemplates.fr;
                      break;
                  default:
                      templateConfig = platformTemplates.en;
              }

              if (!templateConfig?.name) {
                  console.log(`WhatsApp reminder template for language '${lang}' is not configured in system_settings. Skipping message.`);
                  return;
              }

              const { name: templateName, code: finalLangCode } = templateConfig;
      
              // Fetch related data for placeholders
              const [staffRes, locationRes] = await Promise.all([
                  booking.staff_member_id ? supabaseAdmin.from('staff_members').select('name').eq('id', booking.staff_member_id).single() : Promise.resolve({ data: null }),
                  booking.location_id ? supabaseAdmin.from('locations').select('name, address').eq('id', booking.location_id).single() : Promise.resolve({ data: null })
              ]);
      
              const staffMemberName = staffRes.data?.name || 'Any available';
              const locationName = locationRes.data?.name || '';
              const locationAddress = locationRes.data?.address || '';
              const businessWhatsapp = (business.socials as any)?.whatsapp?.replace(/\D/g, '') || '';
              
              const formattedPrice = formatPriceInFunction(booking.price_at_booking, business.currency || 'USD');
              const localeForDate = lang === 'en' ? 'en-US' : lang === 'fr' ? 'fr-FR' : 'ar-SA';
              const dateOptions: Intl.DateTimeFormatOptions = { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' };
              if (lang === 'ar') {
                dateOptions.calendar = 'gregory';
                dateOptions.numberingSystem = 'latn';
              }
              const formattedDate = new Date(`${booking.date}T00:00:00`).toLocaleDateString(localeForDate, dateOptions);
      
              const params: { type: 'text', text: string }[] = [
                  { type: 'text', text: booking.customer_name }, // {{1}}
                  { type: 'text', text: business.name }, // {{2}}
                  { type: 'text', text: booking.service_name }, // {{3}}
                  { type: 'text', text: formattedPrice }, // {{4}}
                  { type: 'text', text: formattedDate }, // {{5}}
                  { type: 'text', text: booking.time }, // {{6}}
                  { type: 'text', text: staffMemberName }, // {{7}}
                  { type: 'text', text: locationName }, // {{8}}
                  { type: 'text', text: locationAddress }, // {{9}}
                  { type: 'text', text: businessWhatsapp }, // {{10}}
              ];
      
              const templatePayload: TemplatePayload = {
                  name: templateName,
                  language: { code: finalLangCode },
                  components: [{ type: 'body', parameters: params }]
              };
              
              await sendWhatsAppMessage(
                  platformWhatsappToken as string,
                  effectivePhoneId,
                  booking.customer_phone,
                  { template: templatePayload }
              );
              whatsappSent++;
              notificationSent = true;

              const { error: whatsappIncrementError } = await supabaseAdmin.rpc('increment_business_counter', {
                p_business_id: business.id,
                p_counter_column: 'whatsapp_messages_sent',
                p_increment_by: 1
              });
              if (whatsappIncrementError) {
                  console.warn(`[Cron Reminder] Failed to increment whatsapp counter for business ${business.id}:`, whatsappIncrementError.message);
              }
          } catch(whatsappError) {
              console.error(`Failed to send WhatsApp reminder for booking ${booking.id}:`, whatsappError.message);
          }
      }

      if (notificationSent) {
          const { error: updateError } = await supabaseAdmin
            .from('bookings')
            .update({ reminder_sent_at: new Date().toISOString() })
            .eq('id', booking.id);
        
          if (updateError) {
              console.warn(`Failed to mark reminder as sent for booking ${booking.id}: ${updateError.message}`);
          }
      }
    });

    await Promise.all(processingPromises);

    return new Response(JSON.stringify({ success: true, message: `Processed ${upcomingBookings.length} bookings, sent 0 reminders and ${whatsappSent} WhatsApp messages.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in send-reminders function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});