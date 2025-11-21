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
    // 1. Get user from auth token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error('User not authenticated');

    // 2. Get request body
    const { ticket_id, content } = await req.json();
    if (!ticket_id || !content) throw new Error('ticket_id and content are required.');

    // 3. Use admin client for inserts and updates
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );
    
    // 4. Rate Limiting (20 messages per hour)
    await checkRateLimit(supabaseAdmin, user.id, 20, 3600);
    
    // 5. Verify the user (or an admin) is authorized to reply to the ticket.
    const { data: ticket, error: ticketError } = await supabaseAdmin
        .from('support_tickets')
        .select('id, user_id')
        .eq('id', ticket_id)
        .single();
        
    if (ticketError || !ticket) throw new Error("Ticket not found.");
    
    // 6. Fetch the user's profile to check their role and get their name.
    let { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('name, role')
      .eq('id', user.id)
      .single();

    // Self-healing: If the user profile doesn't exist, create it on-the-fly.
    if (profileError && profileError.code === 'PGRST116') {
        console.warn(`User profile for ${user.id} not found. Creating one now.`);
        const { data: newProfile, error: createProfileError } = await supabaseAdmin
            .from('users')
            .insert({
                id: user.id,
                name: user.user_metadata?.name || 'New User',
                email: user.email,
            })
            .select('name, role')
            .single();

        if (createProfileError) {
            throw new Error(`Failed to create user profile on-the-fly: ${createProfileError.message}`);
        }
        userProfile = newProfile;
    } else if (profileError) {
        // Any other error while fetching the profile is a problem.
        throw new Error(`Error fetching user profile: ${profileError.message}`);
    }

    // Add a final, robust check to ensure userProfile is valid before proceeding.
    if (!userProfile) {
        throw new Error("Could not find or create a user profile. Please try again.");
    }

    // A user can reply if they own the ticket OR if they are an admin.
    const isOwner = ticket.user_id === user.id;
    const isAdmin = userProfile.role === 'admin';

    if (!isOwner && !isAdmin) {
        throw new Error("Permission denied: You do not have access to this ticket.");
    }

    // Determine the user's name, with fallbacks for robustness.
    const userName = userProfile.name || user.user_metadata?.name || 'User';

    // 7. Insert the new message
    const { data: rawNewMessage, error: messageError } = await supabaseAdmin
      .from('support_ticket_messages')
      .insert({
        ticket_id: ticket_id,
        user_id: user.id,
        user_name: userName,
        content: content,
      })
      .select()
      .single();

    if (messageError) throw messageError;

    // 8. Manually map to camelCase to ensure a consistent API response.
    const newMessage = {
        id: rawNewMessage.id,
        ticketId: rawNewMessage.ticket_id,
        userId: rawNewMessage.user_id,
        userName: rawNewMessage.user_name,
        content: rawNewMessage.content,
        createdAt: rawNewMessage.created_at,
    };

    // 9. Update the ticket's `updated_at` timestamp to bring it to the top of the list
    await supabaseAdmin
      .from('support_tickets')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', ticket_id);

    return new Response(JSON.stringify({ message: newMessage }), {
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
    console.error('Error in add-ticket-message function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
