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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    const { businessData } = await req.json();
    if (!businessData) {
      throw new Error('businessData is required in the request body.');
    }

    const { id, ...updateData } = businessData;

    const toSnakeCase = (obj: any) => {
      const newObj: { [key: string]: any } = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
          newObj[snakeKey] = obj[key];
        }
      }
      return newObj;
    };
    const updatePayload = toSnakeCase(updateData);
    let businessId = id;

    if (id) { // Update existing business
      // The user_id is used by RLS policy but should not be part of the update payload itself.
      delete updatePayload.user_id;

      const { data, error } = await supabaseAdmin
        .from('businesses')
        .update(updatePayload)
        .eq('id', id)
        .select('id')
        .single();

      if (error) {
        // Check for unique constraint violation on slug
        if (error.code === '23505' && error.details?.includes('slug')) {
          throw new Error('This page link is already in use. Please choose another.');
        }
        throw error;
      }
      if (data) {
        businessId = data.id;
      }

    } else { // Create new business
      const { data, error } = await supabaseAdmin
        .from('businesses')
        .insert(updatePayload)
        .select('id')
        .single();
      if (error) throw error;
      businessId = data.id;
    }

    return new Response(JSON.stringify({ success: true, businessId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in update-business function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400, // Use 400 for client errors like duplicate slug
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});