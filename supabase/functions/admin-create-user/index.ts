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
    // 1. Create a Supabase client with the user's auth token
    const supabaseUserClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // 2. Check if the calling user is an admin
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

    // 3. Create an admin client to perform the user creation
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // 4. Rate Limiting (10 creations per hour)
    await checkRateLimit(supabaseAdmin, callingUser.id, 10, 3600);

    // 5. Get request body
    const { email, password, name, role, subscriptionStatus, trialEndsAt, subscriptionPlan } = await req.json();
    if (!email || !password || !name || !role) {
      throw new Error('Missing required fields: email, password, name, role.');
    }

    // 6. Create the new user in auth.users
    const { data: { user: newUser }, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email since admin is creating it
      user_metadata: { name },
    });

    if (createError) throw createError;
    if (!newUser) throw new Error('User creation failed.');

    // The handle_new_user trigger has already created a profile with default trial settings.
    // Now, we UPDATE it with the specific values provided by the admin.
    const profileUpdates: any = {
        role: role,
        subscription_status: subscriptionStatus,
        trial_ends_at: trialEndsAt,
        subscription_plan: subscriptionPlan
    };

    // Remove undefined properties so they don't overwrite db defaults with null
    Object.keys(profileUpdates).forEach(key => profileUpdates[key] === undefined && delete profileUpdates[key]);

    if (Object.keys(profileUpdates).length > 0) {
        const { error: updateError } = await supabaseAdmin
            .from('users')
            .update(profileUpdates)
            .eq('id', newUser.id);
        
        if (updateError) throw new Error(`User created, but failed to set profile details: ${updateError.message}`);
    }


    return new Response(JSON.stringify({ success: true, userId: newUser.id }), {
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
    console.error('Error in admin-create-user:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});