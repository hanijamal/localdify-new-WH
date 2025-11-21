import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    // Check if user is admin
    const { data: adminProfile } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (adminProfile?.role !== 'admin') throw new Error('Permission denied.');

    const { token, accountId } = await req.json();
    if (!token || !accountId) {
      throw new Error("Access Token and Business Account ID are required.");
    }

    // A simple, harmless API call to check if the credentials are valid
    const url = `https://graph.facebook.com/v20.0/${accountId}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('WhatsApp Test API Error:', errorData);
      
      const errorCode = errorData.error?.code;
      const errorMessage = errorData.error?.message || 'An unknown error occurred.';

      if (errorCode === 190) { // OAuthException, token invalid/expired
         return new Response(JSON.stringify({ success: false, reason: 'token_expired', message: `Token is invalid or has expired. ${errorMessage}` }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
         });
      }
      if (errorCode === 100) { // Invalid parameter, likely wrong ID
         return new Response(JSON.stringify({ success: false, reason: 'invalid_id', message: `The Business Account ID seems to be incorrect. ${errorMessage}` }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
         });
      }
       return new Response(JSON.stringify({ success: false, reason: 'unknown', message: `Connection failed: ${errorMessage}` }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
         });
    }

    // If we get here, the call was successful
    const responseData = await response.json();
    return new Response(JSON.stringify({ success: true, data: { name: responseData.name, id: responseData.id } }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in test-whatsapp-connection function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
