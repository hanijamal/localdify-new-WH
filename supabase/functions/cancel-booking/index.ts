// This edge function is called by the frontend when a user clicks their cancellation link.
// It securely validates a unique booking token and updates the booking status from
// "pending" or "approved" to "canceled".

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

declare const Deno: {
  env: { get(key: string): string | undefined; };
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
      throw new Error('Cancellation token is required.');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // Find the booking by the unique cancellation token
    const { data: booking, error: findError } = await supabaseAdmin
      .from('bookings')
      .select('id, status')
      .eq('cancellation_token', token)
      .single();

    if (findError || !booking) {
      return new Response(JSON.stringify({ error: 'This cancellation link is invalid or has expired.' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (booking.status === LocalBookingStatus.Canceled) {
      return new Response(JSON.stringify({ message: 'This booking has already been canceled.' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Update the status to 'canceled'
    const { error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({ status: LocalBookingStatus.Canceled })
      .eq('id', booking.id);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ success: true, message: 'Your booking has been successfully canceled.' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});