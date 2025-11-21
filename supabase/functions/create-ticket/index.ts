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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Get user from auth token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error('User not authenticated');

    // 2. Use admin client for DB operations and rate limiting
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );
    
    // 3. Rate Limiting (5 tickets per hour)
    await checkRateLimit(supabaseAdmin, user.id, 5, 3600);

    // 4. Get request body
    const { subject, message } = await req.json();
    if (!subject || !message) throw new Error('Subject and message are required.');


    // 5. Fetch user details (name, email), with self-healing for missing profiles
    let { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('name, email')
      .eq('id', user.id)
      .single();
      
    if (profileError && profileError.code === 'PGRST116') {
        console.warn(`User profile for ${user.id} not found while creating ticket. Creating one now.`);
        const { data: newProfile, error: createProfileError } = await supabaseAdmin
            .from('users')
            .insert({
                id: user.id,
                name: user.user_metadata?.name || 'New User',
                email: user.email,
            })
            .select('name, email')
            .single();

        if (createProfileError) {
            throw new Error(`Failed to create user profile on-the-fly: ${createProfileError.message}`);
        }
        userProfile = newProfile;
    } else if (profileError) {
        throw new Error(`Could not fetch user profile: ${profileError.message}`);
    }
    
    if (!userProfile) {
        throw new Error("Could not find or create a user profile to create ticket.");
    }


    // 6. Create the ticket
    const { data: newTicket, error: ticketError } = await supabaseAdmin
      .from('support_tickets')
      .insert({
        user_id: user.id,
        user_email: userProfile.email,
        user_name: userProfile.name,
        subject: subject,
      })
      .select()
      .single();

    if (ticketError) throw ticketError;

    // 7. Create the initial message
    const { data: newMessage, error: messageError } = await supabaseAdmin
      .from('support_ticket_messages')
      .insert({
        ticket_id: newTicket.id,
        user_id: user.id,
        user_name: userProfile.name,
        content: message,
      })
      .select()
      .single();

    if (messageError) {
      // Attempt to roll back by deleting the ticket if message creation fails
      await supabaseAdmin.from('support_tickets').delete().eq('id', newTicket.id);
      throw messageError;
    }
    
    // 8. Return the full ticket object with the first message
    const responseTicket = {
        ...newTicket,
        messages: [newMessage]
    };

    return new Response(JSON.stringify({ ticket: responseTicket }), {
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
    console.error('Error in create-ticket function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
