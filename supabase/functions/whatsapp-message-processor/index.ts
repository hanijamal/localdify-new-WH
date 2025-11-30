// This edge function sends a WhatsApp confirmation when a new booking is created.
// It is triggered by a Supabase Database Webhook on the 'bookings' table for INSERT events.
// It checks if the business has enabled WhatsApp notifications and then uses platform-wide
// credentials to send a confirmation message via the WhatsApp Cloud API.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

declare const Deno: {
  env: { get(key: string): string | undefined; };
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const WEBHOOK_SECRET = Deno.env.get('WHATSAPP_WEBHOOK_SECRET');

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
                // Self-heal: Save the discovered ID for future use
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
            return null; // Fallback on any error
        }
    }
    // Only use the phoneId from settings if Account ID discovery wasn't attempted
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
    
    if (!booking.customer_phone) {
        console.log('Booking is missing a customer phone number. Skipping WhatsApp message.');
        return new Response(JSON.stringify({ message: 'Skipped: No phone number.' }), { status: 200 });
    }

    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });

    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .eq('id', booking.business_id)
      .single();

    if (businessError) throw new Error(`Failed to fetch business: ${businessError.message}`);
    if (!business) throw new Error(`Business with ID ${booking.business_id} not found.`);

    if (!business.whatsapp_notifications_enabled) {
      console.log(`WhatsApp notifications are disabled for business ${business.name}. Skipping message.`);
      return new Response(JSON.stringify({ message: 'Skipped: WhatsApp disabled for this business.' }), { status: 200 });
    }
    
    // Fetch platform-wide WhatsApp credentials & templates from system_settings
    const [
        tokenRes, 
        phoneIdRes,
        accountIdRes,
        confEnRes, 
        confArRes, 
        confFrRes
    ] = await Promise.all([
        supabaseAdmin.from('system_settings').select('value').eq('key', 'whatsapp_access_token').single(),
        supabaseAdmin.from('system_settings').select('value').eq('key', 'whatsapp_phone_number_id').single(),
        supabaseAdmin.from('system_settings').select('value').eq('key', 'whatsapp_business_account_id').single(),
        supabaseAdmin.from('system_settings').select('value').eq('key', 'whatsapp_template_confirmation_en').single(),
        supabaseAdmin.from('system_settings').select('value').eq('key', 'whatsapp_template_confirmation_ar').single(),
        supabaseAdmin.from('system_settings').select('value').eq('key', 'whatsapp_template_confirmation_fr').single(),
    ]);

    const platformToken = tokenRes.data?.value as (string | null);
    const platformPhoneId = phoneIdRes.data?.value as (string | null);
    const platformAccountId = accountIdRes.data?.value as (string | null);

    if (!platformToken || platformToken === 'null') {
        console.error('CRITICAL: Platform WhatsApp Access Token is not configured in system_settings.');
        return new Response(JSON.stringify({ message: 'Skipped: Platform WhatsApp credentials not configured.' }), { status: 200 });
    }

    const effectivePhoneId = await getPhoneNumberId(supabaseAdmin, platformToken, platformPhoneId, platformAccountId);

    if (!effectivePhoneId) {
        console.error('CRITICAL: Could not determine a valid WhatsApp Phone Number ID. Check your Phone Number ID and Business Account ID in Admin Settings. The API request will likely fail.');
        return new Response(JSON.stringify({ message: 'Skipped: WhatsApp Phone Number ID not configured or discoverable.' }), { status: 200 });
    }

    if (booking.status === 'approved') {
        const lang = booking.language || 'en';
        let templateConfig: TemplateConfig | null = null;

        switch (lang) {
            case 'ar':
                templateConfig = safeParseTemplate(confArRes.data?.value);
                break;
            case 'fr':
                templateConfig = safeParseTemplate(confFrRes.data?.value);
                break;
            default:
                templateConfig = safeParseTemplate(confEnRes.data?.value);
        }

        if (!templateConfig?.name) {
            console.log(`WhatsApp confirmation template for language '${lang}' is not configured in system_settings. Skipping message.`);
            return new Response(JSON.stringify({ message: `Skipped: Template for language '${lang}' not configured.` }), { status: 200 });
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
            platformToken as string,
            effectivePhoneId,
            booking.customer_phone,
            { template: templatePayload }
        );
    
        console.log(`WhatsApp confirmation template sent successfully to ${booking.customer_phone} for business ${business.name}.`);

        const { error: incrementError } = await supabaseAdmin.rpc('increment_business_counter', {
            p_business_id: booking.business_id,
            p_counter_column: 'whatsapp_messages_sent',
            p_increment_by: 1
        });
        if (incrementError) {
            console.warn(`[WhatsApp Confirmation] Failed to increment WhatsApp counter for business ${booking.business_id}:`, incrementError.message);
        }
    } else {
        console.log(`Booking ${booking.id} is not 'approved'. Skipping WhatsApp confirmation.`);
    }

    return new Response(JSON.stringify({ success: true, message: 'WhatsApp message processed.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in WhatsApp message processor:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});