import { supabaseAdmin } from './utils/supabase.js';
import { sendMessageForSalon } from './whatsappService.js';
import logger from './utils/logger.js';

const POLL_INTERVAL = Number(process.env.WORKER_POLL_MS || 5000);
const MAX_RETRIES = 3;

const DEFAULT_TEMPLATES = {
  confirmation: {
    en: `✨ Hello {{customerName}}! 

Your appointment at {{businessName}} is confirmed.

📅 Date: {{bookingDate}}
⏰ Time: {{bookingTime}}
💇 Service: {{serviceName}}
💰 Price: {{servicePrice}}
👤 Staff: {{staffName}}
📍 Location: {{locationName}}

Thank you!`,
    ar: `تأكيد موعدكم
مرحباً {{customerName}}،

تم تأكيد حجزكم في {{businessName}}!

الخدمة: {{serviceName}}
السعر: {{servicePrice}}
التاريخ والوقت: {{bookingDate}} الساعة {{bookingTime}}
مع: {{staffName}}
الفرع: {{locationName}}

نتطلع لرؤيتكم قريباً!`
  },
  reminder: {
    en: `👋 Hi {{customerName}}! Just a reminder for your appointment tomorrow at {{bookingTime}}. See you soon!`,
    ar: `مرحباً {{customerName}}! تذكير بموعدك غداً الساعة {{bookingTime}}. نراك قريباً!`
  }
};

/**
 * Fetch custom template from database
 */
async function getMessageTemplate(salonId, templateType, language = 'en') {
  try {
    const columnName = `whatsapp_${templateType}_template`;

    const { data, error } = await supabaseAdmin
      .from('businesses')
      .select(columnName)
      .eq('id', salonId)
      .single();

    if (error) throw error;

    if (data && data[columnName]) {
      const customTemplate = data[columnName][language] || data[columnName]['en'] || data[columnName]['ar'];
      if (customTemplate && customTemplate.trim()) {
        return customTemplate;
      }
    }

    return DEFAULT_TEMPLATES[templateType]?.[language] || DEFAULT_TEMPLATES[templateType]?.['en'] || '';
  } catch (err) {
    logger.error({ err: err.message }, 'Error fetching template');
    return DEFAULT_TEMPLATES[templateType]?.[language] || DEFAULT_TEMPLATES[templateType]?.['en'] || '';
  }
}

/**
 * Replace placeholders in template with actual data
 */
function populateTemplate(template, data) {
  let message = template;

  const replacements = {
    '{{customerName}}': data.customerName || data.name || 'Valued Customer',
    '{{customerEmail}}': data.customerEmail || '',
    '{{customerPhone}}': data.customerPhone || data.phone || '',
    '{{serviceName}}': data.serviceName || 'Service',
    '{{servicePrice}}': data.servicePrice || data.price || '',
    '{{bookingDate}}': data.bookingDate || data.date || '',
    '{{bookingTime}}': data.bookingTime || data.time || '',
    '{{staffName}}': data.staffName || 'Our Team',
    '{{locationName}}': data.locationName || data.salonName || 'Our Location',
    '{{locationAddress}}': data.locationAddress || '',
    '{{businessName}}': data.businessName || data.salonName || 'Our Business',
    '{{businessPhone}}': data.businessPhone || '',
  };

  Object.keys(replacements).forEach(placeholder => {
    message = message.split(placeholder).join(replacements[placeholder]);
  });

  return message;
}

async function processJob(job) {
  const { id, salon_id, type, payload } = job;
  logger.info({ jobId: id, type }, 'Processing job');

  try {
    await supabaseAdmin.from('whatsapp_jobs').update({ status: 'processing', updated_at: new Date().toISOString() }).eq('id', id);

    const phone = payload.phone || payload.customerPhone;
    if (!phone) throw new Error('Phone number missing in payload');

    let text = '';

    // Try to get custom template, fallback to default
    if (type === 'confirmation' || type === 'reminder') {
      const language = payload.language || 'en';
      const template = await getMessageTemplate(salon_id, type, language);

      if (template) {
        text = populateTemplate(template, payload);
      } else {
        // Fallback to old hardcoded messages if no template
        if (type === 'confirmation') {
          text = `✨ Hello ${payload.name || payload.customerName}! \n\nYour appointment at ${payload.salonName || 'the salon'} is confirmed.\n\n📅 Date: ${payload.date}\n⏰ Time: ${payload.time}\n\nThank you!`;
        } else if (type === 'reminder') {
          text = `👋 Hi ${payload.name || payload.customerName}! Just a reminder for your appointment tomorrow at ${payload.time}. See you soon!`;
        }
      }
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