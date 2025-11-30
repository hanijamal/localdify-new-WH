import { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export class RateLimitError extends Error {
  constructor(message = 'Too many requests.') {
    super(message);
    this.name = 'RateLimitError';
  }
}

/**
 * Checks and enforces a rate limit for a given identifier by calling an atomic DB function.
 * @param supabaseAdmin - An admin-level Supabase client.
 * @param identifier - A unique identifier for the user/IP being rate-limited.
 * @param limit - The maximum number of requests allowed in the window.
 * @param windowSeconds - The time window in seconds.
 */
export async function checkRateLimit(
  supabaseAdmin: SupabaseClient,
  identifier: string,
  limit: number,
  windowSeconds: number
) {
  const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString();

  const { error } = await supabaseAdmin.rpc('rate_limit_check', {
    p_identifier: identifier,
    p_limit: limit,
    p_window_start: windowStart
  });

  if (error) {
    if (error.message.includes('RATE_LIMIT_EXCEEDED')) {
      throw new RateLimitError(`Rate limit of ${limit} requests per ${windowSeconds} seconds exceeded.`);
    }
    // For other errors, log them but also throw to halt execution.
    console.error('Rate limit check RPC error:', error.message);
    throw new Error('Could not verify rate limit.');
  }
}
