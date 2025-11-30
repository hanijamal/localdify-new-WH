import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

// This helper function maps the snake_case columns from the database
// to the camelCase properties expected by the frontend application.
const mapBusinessFromDb = (dbBusiness: any): any | null => {
    if (!dbBusiness) return null;
    return {
        id: dbBusiness.id,
        userId: dbBusiness.user_id,
        name: dbBusiness.name,
        slug: dbBusiness.slug,
        description: dbBusiness.description,
        imageUrl: dbBusiness.image_url,
        galleryImages: dbBusiness.gallery_images,
        currency: dbBusiness.currency,
        calendarSettings: dbBusiness.calendar_settings,
        htmlContent: dbBusiness.html_content,
        cssContent: dbBusiness.css_content,
        themeSettings: dbBusiness.theme_settings,
        enabledEmailLanguages: dbBusiness.enabled_email_languages,
        google_access_token: dbBusiness.google_access_token,
        google_refresh_token: dbBusiness.google_refresh_token,
        google_integration_active: dbBusiness.google_integration_active,
        whatsapp_access_token: dbBusiness.whatsapp_access_token,
        whatsapp_phone_number_id: dbBusiness.whatsapp_phone_number_id,
        whatsapp_integration_active: dbBusiness.whatsapp_integration_active,
        customDomain: dbBusiness.custom_domain,
        customDomainStatus: dbBusiness.custom_domain_status,
        socials: dbBusiness.socials,
    };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('Auth error in edge function:', userError?.message);
      return new Response(JSON.stringify({ error: 'User not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Instead of using an RPC, we perform a direct SELECT query.
    // The client is authenticated as the user, so Row Level Security (RLS) policies apply,
    // ensuring the user can only access their own business data.
    const { data, error } = await supabaseClient
      .from('businesses')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      // The `.single()` method returns an error if no row is found.
      // This is expected if a user hasn't created a business yet.
      // We catch this specific error and return `null` as the data.
      if (error.code === 'PGRST116') {
        return new Response(JSON.stringify(null), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      // For any other database errors, we throw them to be caught by the main error handler.
      console.error('Direct select error in edge function:', error.message);
      throw error;
    }

    // Map the snake_case database response to camelCase for the client.
    const businessData = mapBusinessFromDb(data);

    return new Response(JSON.stringify(businessData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Caught error in edge function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});