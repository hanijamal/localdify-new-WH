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

const sendWhatsAppMessage = async (token: string, fromId: string, to: string, text: string) => {
    const url = `https://graph.facebook.com/v19.0/${fromId}/messages`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: to.replace(/\D/g, ''), // Sanitize phone number
            type: 'text',
            text: {
                preview_url: false,
                body: text
            }
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error('WhatsApp API Error:', errorData);
        throw new Error(`Failed to send message: ${errorData.error.message}`);
    }
    
    return await response.json();
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // Rate Limiting (10 test messages per hour)
    await checkRateLimit(supabaseAdmin, user.id, 10, 3600);

    const { to, body } = await req.json();
    if (!to || !body) {
        throw new Error("Missing 'to' or 'body' in request.");
    }
    
    const { data: business, error: businessError } = await supabaseAdmin
        .from('businesses')
        .select('whatsapp_access_token, whatsapp_phone_number_id, whatsapp_integration_active')
        .eq('user_id', user.id)
        .single();
    
    if (businessError) throw businessError;
    if (!business) throw new Error('Business not found for user.');
    if (!business.whatsapp_integration_active || !business.whatsapp_access_token || !business.whatsapp_phone_number_id) {
        throw new Error('WhatsApp integration is not active or configured correctly.');
    }

    await sendWhatsAppMessage(
        business.whatsapp_access_token,
        business.whatsapp_phone_number_id,
        to,
        body
    );
    
    return new Response(JSON.stringify({ success: true, message: 'Test message sent successfully!' }), {
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
    console.error('Error sending test WhatsApp message:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
