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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUserClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user: callingUser } } = await supabaseUserClient.auth.getUser();
    if (!callingUser) throw new Error('Not authenticated.');

    const { data: adminProfile, error: adminError } = await supabaseUserClient
      .from('users')
      .select('role')
      .eq('id', callingUser.id)
      .single();
    
    if (adminError || adminProfile?.role !== 'admin') {
      throw new Error('Permission denied: Not an admin.');
    }
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Rate Limiting (20 updates per hour)
    await checkRateLimit(supabaseAdmin, callingUser.id, 20, 3600);

    const { userId, updates } = await req.json();
    if (!userId || !updates) {
      throw new Error('Missing required fields: userId, updates.');
    }

    const userDbUpdates: { [key: string]: any } = {};
    if (updates.name !== undefined) userDbUpdates.name = updates.name;
    if (updates.role !== undefined) userDbUpdates.role = updates.role;
    if (updates.status !== undefined) userDbUpdates.status = updates.status;
    if (updates.subscriptionStatus !== undefined) userDbUpdates.subscription_status = updates.subscriptionStatus;
    if (updates.trialEndsAt !== undefined) userDbUpdates.trial_ends_at = updates.trialEndsAt;
    if (updates.subscriptionPlan !== undefined) userDbUpdates.subscription_plan = updates.subscriptionPlan;

    if (Object.keys(userDbUpdates).length > 0) {
        const { error: updateError } = await supabaseAdmin
            .from('users')
            .update(userDbUpdates)
            .eq('id', userId);
        if (updateError) throw updateError;
    }
    
    const businessDbUpdates: { [key: string]: any } = {};

    if (Object.keys(businessDbUpdates).length > 0) {
      const { error: businessUpdateError } = await supabaseAdmin
        .from('businesses')
        .update(businessDbUpdates)
        .eq('user_id', userId);
      
      if (businessUpdateError) {
        console.warn(`User profile updated, but failed to update business settings for user ${userId}: ${businessUpdateError.message}`);
      }
    }


    return new Response(JSON.stringify({ success: true }), {
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
    console.error('Error in admin-update-user:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});