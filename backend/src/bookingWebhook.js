import { supabaseAdmin } from './utils/supabase.js';
import logger from './utils/logger.js';

const WEBHOOK_SECRET = process.env.BOOKING_WEBHOOK_SECRET;

export async function bookingWebhookHandler(req, res) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { type, record } = req.body;
    if (type !== 'INSERT' || !record) {
        return res.status(200).json({ message: 'Skipped: Not an INSERT event' });
    }

    const { business_id, customer_name, customer_phone, date, time, service_name } = record;

    if (!business_id || !customer_phone) {
        return res.status(400).json({ error: 'Missing business_id or customer_phone' });
    }

    const { data: salon } = await supabaseAdmin.from('businesses').select('name').eq('id', business_id).single();
    const salonName = salon ? salon.name : 'Our Salon';

    const { error: jobError } = await supabaseAdmin.from('whatsapp_jobs').insert([{
      salon_id: business_id,
      type: 'confirmation',
      payload: { 
          customerName: customer_name, 
          customerPhone: customer_phone, 
          date, 
          time, 
          serviceName: service_name,
          salonName 
      },
      status: 'pending',
      attempts: 0,
      scheduled_at: new Date().toISOString()
    }]);

    if (jobError) {
        logger.error({ err: jobError.message }, 'Failed to queue job');
        return res.status(500).json({ error: 'Failed to queue WhatsApp job' });
    }

    logger.info({ bookingId: record.id }, 'Queued confirmation message');
    res.status(200).json({ ok: true });

  } catch (err) {
    logger.error(err, 'Webhook error');
    res.status(500).json({ error: err.message });
  }
}