
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
  logger.info({ salonId, phoneNumber }, 'Requesting pairing code - forcing fresh session');

  // CRITICAL FIX: Force a completely fresh session for pairing
  // Reusing old sessions causes WhatsApp to reject pairing attempts
  const session = await ensureSession(salonId, true); // force = true

  if (!session || !session.sock) {
    throw new Error('Failed to initialize session for pairing');
  }

  // Ensure we're not already connected
  if (session.connected) {
    throw new Error('Session already connected. Disconnect first to pair a new device.');
  }

  // Wait for socket to be in proper state for pairing
  // We need to wait for at least one connection.update event
  logger.info({ salonId }, 'Waiting for socket to be ready for pairing...');

  const waitForSocketReady = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout waiting for socket to initialize'));
    }, 15000); // 15 second timeout

    // Listen for connection update to know socket is ready
    const connectionHandler = (update) => {
      const { connection } = update;
      logger.debug({ salonId, connection }, 'Connection update during pairing prep');

      // Once we see a connection event, socket is ready
      if (connection === 'connecting' || connection === 'open') {
        clearTimeout(timeout);
        session.sock.ev.off('connection.update', connectionHandler);
        resolve();
      } else if (connection === 'close') {
        clearTimeout(timeout);
        session.sock.ev.off('connection.update', connectionHandler);
        reject(new Error('Connection closed unexpectedly during pairing setup'));
      }
    };

    session.sock.ev.on('connection.update', connectionHandler);

    // Also add a small initial delay to let socket initialize
    setTimeout(() => {
      // If no connection event after 2 seconds, check if socket is at least open
      if (session.sock && session.sock.ws && !session.sock.ws.isClosed) {
        clearTimeout(timeout);
        session.sock.ev.off('connection.update', connectionHandler);
        resolve();
      }
    }, 2000);
  });

  try {
    await waitForSocketReady;
    logger.info({ salonId }, 'Socket ready, requesting pairing code from WhatsApp');

    const code = await session.sock.requestPairingCode(phoneNumber);
    logger.info({ salonId, codeLength: code?.length }, 'Pairing code generated successfully');

    return code;
  } catch (error) {
    logger.error({ salonId, err: error.message }, 'Failed to request pairing code');

    // Clean up failed session
    try {
      session.sock.end(undefined);
    } catch (e) {
      // Ignore cleanup errors
    }
    sessions.delete(salonId);

    throw new Error(`Pairing failed: ${error.message}`);
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

    if (qr) {
      try {
        const session = sessions.get(salonId);
        if (session) session.lastQr = qr; // Store raw QR string
        await supabaseAdmin.from('whatsapp_sessions').upsert({
          salon_id: salonId, status: 'pending', qr_data_url: qr, updated_at: new Date().toISOString()
        }, { onConflict: 'salon_id' });
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
      const session = sessions.get(salonId);
      if (session) session.connected = false;

      logger.warn({ salonId, reason: code }, 'Connection closed');

      const isUnrecoverable = code === DisconnectReason.loggedOut || code === DisconnectReason.connectionFailure;

      if (isUnrecoverable) {
        logger.warn({ salonId, reason: code }, 'Unrecoverable error detected. Deleting session data permanently.');
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
