
import cron from 'node-cron';
import { supabase } from './utils/supabase.js';
import logger from './utils/logger.js';

// Cron job to run every hour at the 5-minute mark (e.g., 1:05, 2:05)
// This adds reminder jobs to the queue.
cron.schedule('5 * * * *', async () => {
    logger.info('Running cron job to queue appointment reminders...');

    try {
        const now = new Date();
        const startOfTomorrow = new Date(now);
        startOfTomorrow.setDate(now.getDate() + 1);
        startOfTomorrow.setHours(0, 0, 0, 0);

        const endOfTomorrow = new Date(startOfTomorrow);
        endOfTomorrow.setHours(23, 59, 59, 999);

        // Fetch bookings for tomorrow that haven't had a reminder job created for them yet
        const { data: bookings, error } = await supabase
            .rpc('get_bookings_for_reminder_jobs', {
                start_date: startOfTomorrow.toISOString().split('T')[0],
                end_date: endOfTomorrow.toISOString().split('T')[0]
            });
            
        if (error) {
            throw new Error(`RPC 'get_bookings_for_reminder_jobs' failed: ${error.message}`);
        }

        if (!bookings || bookings.length === 0) {
            logger.info('No new upcoming bookings found for tomorrow that need a reminder job.');
            return;
        }

        logger.info(`Found ${bookings.length} bookings for tomorrow. Queuing reminder jobs.`);
        
        const newJobs = bookings.map(booking => ({
            salon_id: booking.business_id,
            type: 'reminder',
            payload: {
                customerName: booking.customer_name,
                customerPhone: booking.customer_phone,
                date: booking.date,
                time: booking.time,
                salonName: booking.business_name
            },
        }));

        const { error: insertError } = await supabase.from('whatsapp_jobs').insert(newJobs);
        if (insertError) {
             throw new Error(`Failed to insert reminder jobs: ${insertError.message}`);
        }
        
        logger.info(`Successfully queued ${newJobs.length} reminder jobs.`);
    } catch (error) {
        logger.error({ error: error.message }, 'Cron job for reminders failed.');
    }
});

logger.info('Appointment reminder cron job scheduled.');