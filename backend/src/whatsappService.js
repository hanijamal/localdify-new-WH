
import makeWASocket, { DisconnectReason, initAuthCreds, BufferJSON, isJidBroadcast, delay } from '@whiskeysockets/baileys';
import logger from './utils/logger.js';
import { saveSessionToSupabase, loadSessionFromSupabase, deleteSessionFromSupabase } from './sessionStore.js';
import { supabaseAdmin } from './utils/supabase.js';

const sessions = new Map(); // salonId -> { sock, connected, lastQr }

export async function initManager() {
  logger.info('WhatsApp manager initialized');
}

export async function closeSession(salonId) {
  if (sessions.has(salonId)) {
    logger.info({ salonId }, 'Closing session and clearing data.');
    const s = sessions.get(salonId);
    try {
      // Logout will trigger 'connection.close' with 'loggedOut' reason, which handles cleanup.
      await s.sock.logout();
    } catch (e) {
      logger.warn({ salonId, err: e.message }, 'Logout failed, session might have already been closed. Forcing manual cleanup.');
      // Manually run cleanup if logout fails, as the event won't fire.
      await deleteSessionFromSupabase(salonId);
      await supabaseAdmin.from('whatsapp_sessions').delete().eq('salon_id', salonId);
      sessions.delete(salonId);
    }
  } else {
    // If the session is not in memory (e.g., after a server restart), we still ensure
    // the persisted data is cleared to prevent a zombie session on next connect.
    logger.info({ salonId }, 'Session not in memory, ensuring DB/Storage is clean for this salon.');
    await deleteSessionFromSupabase(salonId);
    await supabaseAdmin.from('whatsapp_sessions').delete().eq('salon_id', salonId);
  }
}

export async function requestPairingCode(salonId, phoneNumber) {
  const session = await ensureSession(salonId);
  if (!session || !session.sock) {
    throw new Error('Failed to initialize session');
  }

  // Ensure socket is ready for pairing
  if (session.connected) {
    throw new Error('Session already connected');
  }

  // Wait a bit for the socket to be ready if it was just created
  await delay(3000);

  try {
    const code = await session.sock.requestPairingCode(phoneNumber);
    return code;
  } catch (error) {
    logger.error({ salonId, err: error.message }, 'Failed to request pairing code');
    throw error;
  }
}

export async function ensureSession(salonId, force = false) {
  if (!salonId) throw new Error('salonId required');

  if (force && sessions.has(salonId)) {
    logger.info({ salonId }, 'Forcing new session, closing existing...');
    const s = sessions.get(salonId);
    try { s.sock.end(undefined); } catch (e) { }
    sessions.delete(salonId);
    // Also clear from storage to guarantee a fresh QR
    await deleteSessionFromSupabase(salonId);
    await supabaseAdmin.from('whatsapp_sessions').delete().eq('salon_id', salonId);
  }

  if (sessions.has(salonId)) {
    const s = sessions.get(salonId);
    if (s && s.sock && !s.sock.ws.isClosed) return s;
  }

  // Custom Auth State Implementation using Supabase single JSON file
  const storedData = await loadSessionFromSupabase(salonId);
  let creds = storedData?.creds || initAuthCreds();
  let keys = storedData?.keys || {};

  // --- DEBOUNCE LOGIC START ---
  // We use a timer to prevent saving to Supabase 100 times per second during handshake
  let saveTimeout = null;
  const saveState = async () => {
    if (saveTimeout) return; // Already scheduled
    saveTimeout = setTimeout(async () => {
      try {
        await saveSessionToSupabase(salonId, { creds, keys });
      } catch (err) {
        logger.error({ salonId }, "Failed to save session state");
      } finally {
        saveTimeout = null;
      }
    }, 2000); // Save at most once every 2 seconds
  };
  // --- DEBOUNCE LOGIC END ---

  const authState = {
    state: {
      creds,
      keys: {
        get: (type, ids) => {
          const data = {};
          for (const id of ids) {
            let value = keys[type]?.[id];
            if (type === 'app-state-sync-key' && value) {
              value = BufferJSON.reviver(null, value);
            }
            if (value) data[id] = value;
          }
          return data;
        },
        set: (data) => {
          for (const type in data) {
            keys[type] = keys[type] || {};
            for (const id in data[type]) {
              keys[type][id] = data[type][id];
            }
          }
          saveState();
        }
      }
    },
    saveCreds: saveState
  };

  const socketConfig = {
    auth: authState.state,
    printQRInTerminal: false,
    logger: logger.child({ salonId }),
    browser: ['LocalDify', 'Chrome', '1.0.0'], // Critical for Railway
    connectTimeoutMs: 60000,
    syncFullHistory: false,
    shouldIgnoreJid: (jid) => isJidBroadcast(jid),
    keepAliveIntervalMs: 30000, // Ping every 30s
    mobile: false, // Explicitly disable mobile mode to ensure QR generation
    generateHighQualityLinkPreview: false,
    markOnlineOnConnect: false,
  };

  const sock = makeWASocket.default ? makeWASocket.default(socketConfig) : makeWASocket(socketConfig);
  sessions.set(salonId, { sock, connected: false, lastQr: null });

  // Keep-Alive Loop to prevent process death on free tier
  const keepAliveInterval = setInterval(() => {
    if (sock.ws.isOpen) {
      logger.debug({ salonId }, 'Keep-alive ping');
    } else {
      clearInterval(keepAliveInterval);
    }
  }, 60000);


  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    logger.info({ salonId, connection, hasQr: !!qr, hasDisconnect: !!lastDisconnect }, 'Connection update received');

    if (qr) {
      try {
        logger.info({ salonId, qrLength: qr.length }, 'QR code received from WhatsApp');
        const session = sessions.get(salonId);
        if (session) session.lastQr = qr; // Store raw QR string
        await supabaseAdmin.from('whatsapp_sessions').upsert({
          salon_id: salonId, status: 'pending', qr_data_url: qr, updated_at: new Date().toISOString()
        }, { onConflict: 'salon_id' });
        logger.info({ salonId }, 'QR code stored in database successfully');
      } catch (e) {
        logger.error({ salonId, err: e.message }, 'Failed to process QR');
      }
    }

    if (connection === 'open') {
      const session = sessions.get(salonId);
      if (session) { session.connected = true; session.lastQr = null; }
      await supabaseAdmin.from('whatsapp_sessions').upsert({
        salon_id: salonId, status: 'connected', qr_data_url: null, connected_at: new Date().toISOString()
      }, { onConflict: 'salon_id' });
      logger.info({ salonId }, 'Connected to WhatsApp');
    }

    if (connection === 'close') {
      clearInterval(keepAliveInterval); // Stop pinging
      const code = (lastDisconnect?.error)?.output?.statusCode || (lastDisconnect?.error)?.statusCode;
      const errorMessage = lastDisconnect?.error?.message || 'Unknown error';
      const session = sessions.get(salonId);
      if (session) session.connected = false;

      logger.warn({ salonId, reason: code, errorMessage }, 'Connection closed');

      // Only loggedOut is truly unrecoverable - user explicitly logged out
      const isUnrecoverable = code === DisconnectReason.loggedOut;

      // Connection failures can be due to corrupted state or network issues
      // Clear the session to allow fresh reconnection, but don't mark as unrecoverable
      const isConnectionFailure = code === DisconnectReason.connectionFailure;

      if (isUnrecoverable) {
        logger.warn({ salonId, reason: code }, 'User logged out. Deleting session data permanently.');
        await deleteSessionFromSupabase(salonId);
        await supabaseAdmin.from('whatsapp_sessions').delete().eq('salon_id', salonId);
        sessions.delete(salonId);
      } else if (isConnectionFailure) {
        logger.warn({ salonId }, 'Connection failure detected. Clearing potentially corrupted session to allow fresh reconnect.');
        // Clear session from memory and storage to force fresh connection on next attempt
        await deleteSessionFromSupabase(salonId);
        await supabaseAdmin.from('whatsapp_sessions').delete().eq('salon_id', salonId);
        sessions.delete(salonId);
      } else {
        logger.info({ salonId }, 'Connection lost. Will attempt to reconnect on next action.');
      }
    }
  });

  sock.ev.on('creds.update', authState.saveCreds);
  return sessions.get(salonId);
}

export async function getSessionStatus(salonId) {
  const s = sessions.get(salonId);
  if (s) {
    if (s.connected) return { connected: true, qr: null };
    if (s.lastQr) return { connected: false, qr: s.lastQr };
    // New condition: If socket is open but no QR yet, return initializing
    if (s.sock && !s.sock.ws.isClosed) {
      return { connected: false, qr: null, initializing: true };
    }
  }

  // Fallback to DB in case of server restart
  const { data } = await supabaseAdmin.from('whatsapp_sessions').select('status, qr_data_url').eq('salon_id', salonId).single();
  if (data) return { connected: data.status === 'connected', qr: data.status === 'pending' ? data.qr_data_url : null };

  return { connected: false, qr: null };
}

export async function sendMessageForSalon(salonId, toPhone, messageText) {
  const session = await ensureSession(salonId);
  if (!session || !session.sock || !session.connected) {
    throw new Error('Session not connected. Message cannot be sent.');
  }
  const jid = toPhone.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
  return session.sock.sendMessage(jid, { text: messageText });
}
