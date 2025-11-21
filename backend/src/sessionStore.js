import { BufferJSON } from '@whiskeysockets/baileys';
import { supabasePublic } from './utils/supabase.js';
import logger from './utils/logger.js';

const BUCKET = process.env.SUPABASE_SESSION_BUCKET || 'whatsapp-sessions';
const BIGINT_TOKEN = '__baileys_bigint__';

const replacer = (key, value) => {
  const safeValue = BufferJSON.replacer(key, value);
  if (typeof safeValue === 'bigint') {
    return { [BIGINT_TOKEN]: safeValue.toString() };
  }
  return safeValue;
};

const reviver = (key, value) => {
  if (value && typeof value === 'object' && BIGINT_TOKEN in value) {
    return BigInt(value[BIGINT_TOKEN]);
  }
  return BufferJSON.reviver(key, value);
};

export async function saveSessionToSupabase(salonId, authState) {
  if (!salonId || !authState) return;
  const key = `${salonId}/session.json`;
  const body = JSON.stringify(authState, replacer, 2);

  try {
    const { error } = await supabasePublic.storage
      .from(BUCKET)
      .upload(key, body, { contentType: 'application/json', upsert: true });

    if (error) throw error;
    logger.info({ salonId }, 'SESSION SAVED');
  } catch (err) {
    logger.error({ salonId, err: err.message }, 'Failed to save session');
  }
}

export async function loadSessionFromSupabase(salonId) {
  if (!salonId) return null;
  const key = `${salonId}/session.json`;

  try {
    const { data, error } = await supabasePublic.storage.from(BUCKET).download(key);
    if (error) {
      if (error.message && (error.message.toLowerCase().includes('not found') || error.statusCode === '404')) {
        logger.info({ salonId }, 'No session file found, starting fresh.');
        return null;
      }
      throw error;
    }
    const text = await data.text();
    const parsed = JSON.parse(text, reviver);
    logger.info({ salonId }, 'SESSION LOADED');
    return parsed;
  } catch (err) {
    logger.error({ salonId, err: err.message }, 'Failed to load session');
    return null;
  }
}

export async function deleteSessionFromSupabase(salonId) {
  if (!salonId) return;
  const key = `${salonId}/session.json`;
  try {
    const { error } = await supabasePublic.storage.from(BUCKET).remove([key]);
    if (error) throw error;
    logger.info({ salonId }, 'Deleted session from storage');
  } catch (err) {
    logger.error({ salonId, err: err.message }, 'Failed to delete session');
  }
}