// This edge function is called by the frontend when a user clicks their confirmation link.
// It securely validates a unique booking token and updates the booking status from
// "pending" to "approved". It contains checks to prevent misuse, such as attempting
// to confirm a booking that is already approved or canceled.

// Required environment variables in your Supabase project:
// - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// FIX: Add a type declaration for the Deno namespace.
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

enum LocalBookingStatus {
    Pending = "pending",
    Approved = "approved",
    Canceled = "canceled"
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();
    if (!token) {
      throw new Error('Confirmation token is required.');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // Find the booking by the unique confirmation token
    const { data: booking, error: findError } = await supabaseAdmin
      .from('bookings')
      .select('id, status')
      .eq('confirmation_token', token)
      .single();

    if (findError || !booking) {
      return new Response(JSON.stringify({ error: 'This confirmation link is invalid or has expired.' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check status to prevent re-confirmation
    if (booking.status === LocalBookingStatus.Approved) {
      return new Response(JSON.stringify({ message: 'This booking has already been confirmed.' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    if (booking.status !== LocalBookingStatus.Pending) {
      return new Response(JSON.stringify({ error: 'This booking cannot be confirmed as it is not pending.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Update the status to 'approved'
    const { error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({ status: LocalBookingStatus.Approved })
      .eq('id', booking.id);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ success: true, message: 'Booking confirmed! Your appointment is now scheduled.' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});