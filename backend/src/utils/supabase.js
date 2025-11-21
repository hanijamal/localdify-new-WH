import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import logger from './logger.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  logger.fatal('Missing Supabase env vars. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export const supabasePublic = createClient(SUPABASE_URL, process.env.SUPABASE_ANON_KEY || '', {
  auth: { persistSession: false }
});

logger.info('Supabase clients initialized.');