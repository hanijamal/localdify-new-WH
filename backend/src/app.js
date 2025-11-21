
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initManager, ensureSession, getSessionStatus, sendMessageForSalon, closeSession, requestPairingCode } from './whatsappService.js';
import { startWorker } from './sendWorker.js';
import { bookingWebhookHandler } from './bookingWebhook.js';
import logger from './utils/logger.js';

const app = express();

app.set('etag', false);
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

app.use(cors());
app.use(express.json({ limit: '1mb' }));

const PORT = process.env.PORT || 3001;

app.post('/api/whatsapp/connect', async (req, res) => {
  const { salon_id, force_reconnect } = req.body;
  if (!salon_id) return res.status(400).json({ error: 'salon_id is required' });

  try {
    await ensureSession(salon_id, force_reconnect);

    const startTime = Date.now();
    while (Date.now() - startTime < 20000) { // Increased timeout
        const { connected, qr } = await getSessionStatus(salon_id);
        if (connected) return res.json({ status: 'connected', message: 'Connected successfully' });
        if (qr) return res.json({ status: 'pending', qr, message: 'Scan QR Code' });
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return res.json({ status: 'loading', message: 'Initializing session...' });

  } catch (err) {
    logger.error({ salon_id, err: err.message }, 'Connect error');
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/whatsapp/status', async (req, res) => {
  const { salon_id } = req.query;
  if (!salon_id) return res.status(400).json({ error: 'salon_id is required' });

  try {
    const { connected, qr, initializing } = await getSessionStatus(salon_id);
    if (connected) return res.json({ status: 'connected' });
    if (qr) return res.json({ status: 'pending', qr });
    if (initializing) return res.json({ status: 'loading' }); // Inform frontend to wait
    return res.json({ status: 'disconnected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/whatsapp/disconnect', async (req, res) => {
    const { salon_id } = req.body;
    if (!salon_id) return res.status(400).json({ error: 'salon_id is required' });
    try {
        await closeSession(salon_id);
        res.json({ success: true, message: 'Session disconnected and cleared.' });
    } catch (err) {
        logger.error({ salon_id, err: err.message }, 'Disconnect error');
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/whatsapp/pair-with-phone', async (req, res) => {
    const { salon_id, phone_number } = req.body;
    if (!salon_id || !phone_number) {
        return res.status(400).json({ error: 'salon_id and phone_number are required' });
    }

    try {
        // Clean phone number: remove non-digits
        const cleanPhone = phone_number.replace(/\D/g, '');
        
        // Request pairing code
        const code = await requestPairingCode(salon_id, cleanPhone);
        
        res.json({ success: true, pairingCode: code });
    } catch (err) {
        logger.error({ salon_id, err: err.message }, 'Pairing code error');
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/bookings', bookingWebhookHandler);

app.post('/api/whatsapp/send-test', async (req, res) => {
  const { salon_id, number, message } = req.body;
  try {
    await sendMessageForSalon(salon_id, number, message || 'Test message from LocalDify');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => res.send('WhatsApp Backend Service v3.6 Running'));

const startServer = async () => {
    try {
        await initManager();
        startWorker();
        app.listen(PORT, () => {
            logger.info(`Server listening on port ${PORT}`);
        });
    } catch (err) {
        logger.fatal(err, 'Failed to start server');
        process.exit(1);
    }
};

startServer();
