import { supabaseAdmin } from './utils/supabase.js';
import { sendMessageForSalon } from './whatsappService.js';
import logger from './utils/logger.js';

const POLL_INTERVAL = Number(process.env.WORKER_POLL_MS || 5000);
const MAX_RETRIES = 3;

async function processJob(job) {
  const { id, salon_id, type, payload } = job;
  logger.info({ jobId: id, type }, 'Processing job');

  try {
    await supabaseAdmin.from('whatsapp_jobs').update({ status: 'processing', updated_at: new Date().toISOString() }).eq('id', id);
    
    const phone = payload.phone || payload.customerPhone;
    if (!phone) throw new Error('Phone number missing in payload');

    let text = '';
    if (type === 'confirmation') {
      text = `✨ Hello ${payload.name || payload.customerName}! \n\nYour appointment at ${payload.salonName || 'the salon'} is confirmed.\n\n📅 Date: ${payload.date}\n⏰ Time: ${payload.time}\n\nThank you!`;
    } else if (type === 'reminder') {
      text = `👋 Hi ${payload.name || payload.customerName}! Just a reminder for your appointment tomorrow at ${payload.time}. See you soon!`;
    } else {
      text = payload.message || 'Message from LocalDify';
    }

    await sendMessageForSalon(salon_id, phone, text);

    await supabaseAdmin.from('whatsapp_jobs').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', id);
    logger.info({ jobId: id }, 'Job completed');

  } catch (err) {
    logger.error({ jobId: id, err: err.message }, 'Job failed');
    const attempts = (job.attempts || 0) + 1;
    const status = attempts >= MAX_RETRIES ? 'failed' : 'pending';
    const nextRun = new Date(Date.now() + (attempts * 60000)).toISOString();

    await supabaseAdmin.from('whatsapp_jobs').update({ 
        attempts, 
        updated_at: new Date().toISOString(), 
        error: err.message, 
        status,
        scheduled_at: status === 'pending' ? nextRun : job.scheduled_at
    }).eq('id', id);
  }
}

export async function startWorker() {
  logger.info('Starting worker loop...');
  setInterval(async () => {
    try {
      const { data: jobs, error } = await supabaseAdmin
        .from('whatsapp_jobs')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(5);

      if (error) {
          logger.error({ error: error.message }, 'Error fetching jobs');
          return;
      }

      if (!jobs || jobs.length === 0) return;
      
      for (const job of jobs) {
        await processJob(job);
      }
    } catch (err) {
      logger.error(err, 'Worker loop error');
    }
  }, POLL_INTERVAL);
}