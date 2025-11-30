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
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

async function getPhoneNumberId(supabaseAdmin: SupabaseClient, token: string, phoneId: string | null, accountId: string | null): Promise<string | null> {
    if (accountId && accountId !== 'null') {
        console.log(`WhatsApp Business Account ID provided. Discovering Phone Number ID for account: ${accountId}`);
        const url = `https://graph.facebook.com/v20.0/${accountId}/phone_numbers`;
        try {
            const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) {
                const errorData = await response.json();
                let friendlyError = `Failed to get phone numbers: ${errorData.error.message}`;
                if (errorData.error?.code === 190) {
                    friendlyError = `Failed to get phone numbers because the Access Token is invalid or has expired. Please update it in the Admin Settings.`;
                } else if (errorData.error?.code === 100) {
                    friendlyError = `Failed to get phone numbers. The Business Account ID appears to be incorrect. Please verify it.`;
                }
                console.error(friendlyError, JSON.stringify(errorData, null, 2));
                return null;
            }
            const { data } = await response.json();
            if (data && data.length > 0) {
                const discoveredPhoneId = data[0].id;
                console.log(`Successfully discovered Phone Number ID: ${discoveredPhoneId}`);
                await supabaseAdmin.from('system_settings').upsert({ key: 'whatsapp_phone_number_id', value: discoveredPhoneId });
                return discoveredPhoneId;
            } else {
                console.warn(`No phone numbers found for WABA ${accountId}.`);
                return null;
            }
        } catch (e) {
            console.error('Error during phone number discovery:', e.message);
            return null;
        }
    }
    return phoneId && phoneId !== 'null' ? phoneId : null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } }
    });

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });

    const { data: adminProfile } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single();
    if (adminProfile?.role !== 'admin') throw new Error('Permission denied.');

    const { to } = await req.json();
    if (!to) throw new Error("Recipient phone number ('to') is required.");

    const [tokenRes, phoneIdRes, accountIdRes] = await Promise.all([
        supabaseAdmin.from('system_settings').select('value').eq('key', 'whatsapp_access_token').single(),
        supabaseAdmin.from('system_settings').select('value').eq('key', 'whatsapp_phone_number_id').single(),
        supabaseAdmin.from('system_settings').select('value').eq('key', 'whatsapp_business_account_id').single(),
    ]);

    const platformToken = tokenRes.data?.value as string | null;
    const platformPhoneId = phoneIdRes.data?.value as string | null;
    const platformAccountId = accountIdRes.data?.value as string | null;

    if (!platformToken || platformToken === 'null') {
      throw new Error('Platform WhatsApp Access Token is not configured in admin settings.');
    }

    const effectivePhoneId = await getPhoneNumberId(supabaseAdmin, platformToken, platformPhoneId, platformAccountId);

    if (!effectivePhoneId) {
        throw new Error('Could not determine a valid WhatsApp Phone Number ID. Check your Phone Number ID and Business Account ID in Admin Settings.');
    }

    const url = `https://graph.facebook.com/v19.0/${effectivePhoneId}/messages`;
    const body = {
        messaging_product: 'whatsapp',
        to: to.replace(/\D/g, ''),
        type: 'template',
        template: {
            name: 'hello_world',
            language: { code: 'en_US' }
        }
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${platformToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error('WhatsApp API Error:', JSON.stringify(errorData, null, 2));
        throw new Error(`Failed to send test message: ${errorData.error.message}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in test-whatsapp-message function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});