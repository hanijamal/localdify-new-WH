# localDify: Local Business Booking System

localDify is a feature-rich, open-source SaaS MVP designed to empower local businesses like salons, restaurants, and clinics to effortlessly manage their customer bookings. It provides a customizable public-facing booking page for clients and a comprehensive dashboard for business owners to manage appointments, services, and business settings.

![Dashboard Preview](https://i.imgur.com/WlP6MAb.png)

## ✨ Key Features

- **Owner Dashboard:** A central hub to view key metrics like revenue, upcoming appointments, and new clients at a glance.
- **Service Management:** Easily add, delete, and manage the services you offer, including details like name, duration, price, and a descriptive image.
- **Client/Booking Management:** View all bookings with filtering options. Approve pending appointments or cancel them directly from the dashboard.
- **Customizable Public Page:** Every business gets a unique, shareable URL for their public booking page.
- **Live Theme Editor:** Customize the appearance of your public booking page in real-time, including colors, fonts, and layout, with a live preview.
- **Automation:** Send automated booking confirmations and reminders via Brevo. Connect your WhatsApp Business account for automated messaging.
- **Secure Authentication:** A complete authentication system for business owners, including registration, login, and password recovery.
- **Automated Image Optimization:** All uploaded images (logos, gallery, service photos) are automatically compressed and converted to JPEG format for fast loading times.

## 💻 Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS, React Router
- **Backend:** Supabase
  - **Database:** PostgreSQL with Row Level Security (RLS) and `pg_cron` for scheduling.
  - **Authentication:** Supabase Auth
  - **Storage:** Supabase Storage for image uploads
  - **Edge Functions:** Deno-based serverless functions for backend logic (e.g., sending emails, handling OAuth)
- **Integrations:** Brevo (for email), Meta APIs (WhatsApp Cloud API)

## 🚀 Getting Started

Follow these instructions to set up and run the project locally.

### 1. Supabase Backend Setup

#### A. Initialize Supabase Project

```bash
# Log in to the Supabase CLI
supabase login

# Link the local repository to your Supabase project
supabase link --project-ref <your-project-id>

# IMPORTANT: Enable the pg_cron extension
supabase extensions enable pg_cron --schema extensions
```

#### B. Set Function Secrets (Environment Variables)

This is a critical step. Create a file named `.env.local` in the `supabase/functions` directory and add your secrets.

```bash
# Then run:
supabase secrets set --env-file ./supabase/functions/.env.local
```
Your `.env.local` file should be structured like this:
```env
# Brevo Credentials
BREVO_API_KEY=<Your-Brevo-API-Key>
BREVO_SENDER_NAME="Your Sender Name"
BREVO_SENDER_EMAIL=<your-sender@email.com> # IMPORTANT: This email must be a validated sender in your Brevo account.

# Meta (Facebook/WhatsApp) Credentials
META_APP_ID=<Your-Meta-App-ID>
META_APP_SECRET=<Your-Meta-App-Secret>

# PayPal Credentials (for server-side order creation)
PAYPAL_CLIENT_ID=<Your-PayPal-Client-ID>
PAYPAL_CLIENT_SECRET=<Your-PayPal-Client-Secret>

# Application URL
APP_URL=<URL_of_your_hosted_app_e.g._http://localhost:3000>

# Webhook & Cron Secrets (generate your own secure random strings)
BOOKING_WEBHOOK_SECRET=<A-secure-random-string-you-generate>
WHATSAPP_WEBHOOK_SECRET=<A-secure-random-string-you-generate>
CRON_SECRET=<Another-secure-random-string-you-generate>
```

#### C. Deploy Edge Functions

Deploy all the serverless functions located in the `supabase/functions` directory.

```bash
supabase functions deploy --all
```

#### D. Database Schema

1.  Navigate to the **SQL Editor** in your Supabase dashboard.
2.  Click **New query**.
3.  Copy the entire content of the `file.txt` in the root of this project.
4.  Paste the SQL script into the editor and click **Run**. This will create all necessary tables, policies, and database triggers.

#### E. Storage Buckets

1.  Navigate to the **Storage** section in your Supabase dashboard.
2.  Create three **public** buckets with the following names:
    -   `avatars`
    -   `business-images`
    -   `service-images`

---

### 🚨 CRITICAL: Setting Up Webhooks with the Supabase CLI (Recommended Method)

The Supabase Dashboard UI can sometimes be unreliable for saving webhook secrets. The following method uses the CLI to create the webhooks programmatically, which is **much more reliable** and the recommended approach.

#### Step 1: Delete Old Webhooks from the UI

To avoid conflicts, you **must** delete any existing webhooks on the `bookings` table.

1.  Go to your Supabase Dashboard: **Database** > **Webhooks**.
2.  Find any webhooks related to the `bookings` table.
3.  Click the three dots (...) next to each one and select **Delete**.

#### Step 2: Create a New Migration File

In your terminal, run the following command. This creates a new SQL file in the `supabase/migrations` directory.

```bash
supabase migration new create_booking_webhooks
```

#### Step 3: Add SQL to the Migration File

Open the new file created by the command (it will be named something like `supabase/migrations/<timestamp>_create_booking_webhooks.sql`). Paste the following SQL code into it and save the file.

This code securely creates the webhooks and tells them to use the secrets you already set.

```sql
-- Safely drop existing HTTP request hooks if they exist from previous attempts
-- This ensures a clean slate before creating new ones.
DO $$
DECLARE
    hook_url_1 text := 'https://' || split_part(show(current_setting('app.supabase.url')),'//',2) || '/functions/v1/brevo-booking-confirmation';
    hook_url_2 text := 'https://' || split_part(show(current_setting('app.supabase.url')),'//',2) || '/functions/v1/brevo-booking-update-processor';
BEGIN
    IF EXISTS (SELECT 1 FROM pg_net.http_request_queue WHERE url::text = hook_url_1) THEN PERFORM net.http_delete(url := hook_url_1::URI); END IF;
    IF EXISTS (SELECT 1 FROM pg_net.http_request_queue WHERE url::text = hook_url_2) THEN PERFORM net.http_delete(url := hook_url_2::URI); END IF;
END;
$$;

-- Drop existing database triggers to prevent duplicates
DROP TRIGGER IF EXISTS on_booking_insert ON public.bookings;
DROP TRIGGER IF EXISTS on_booking_change_for_reminder ON public.bookings;
-- NOTE: The incorrect whatsapp trigger has been removed from this script.
-- The correct webhook for WhatsApp is configured separately to point to your deployed backend service.

-- Create the webhook for email booking confirmations (INSERT only)
CREATE TRIGGER on_booking_insert
AFTER INSERT ON public.bookings
FOR EACH ROW EXECUTE PROCEDURE supabase_functions.http_request(
  'https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/brevo-booking-confirmation',
  'POST',
  '{"Content-Type": "application/json", "Authorization": "Bearer @supa-secrets.BOOKING_WEBHOOK_SECRET"}',
  '{}',
  '1000'
);

-- Create the webhook for real-time email reminders (INSERT and UPDATE)
CREATE TRIGGER on_booking_change_for_reminder
AFTER INSERT OR UPDATE ON public.bookings
FOR EACH ROW EXECUTE PROCEDURE supabase_functions.http_request(
  'https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/brevo-booking-update-processor',
  'POST',
  '{"Content-Type": "application/json", "Authorization": "Bearer @supa-secrets.BOOKING_WEBHOOK_SECRET"}',
  '{}',
  '1000'
);
```

**IMPORTANT:** In the SQL code above, replace `<YOUR_PROJECT_REF>` with your actual Supabase project reference ID (the part of your Supabase URL like `azsxmtbkxrgqadlcjgst`).

#### Step 4: Apply the Migration

Run the following command in your terminal. This will execute the SQL script against your live Supabase database.

```bash
supabase db push
```
#### Step 5: Create the WhatsApp Webhook (Manual Step)

The webhook for the WhatsApp service must point to your deployed backend (e.g., on Railway). This cannot be done with a database trigger and must be created in the Supabase dashboard.

1. Go to your Supabase Dashboard: **Database** > **Webhooks**.
2. Click **Create a new webhook**.
3. Give it a name, like `Send to WhatsApp Backend`.
4. For **Table**, select `bookings`.
5. For **Events**, check `INSERT`.
6. For **HTTP Request**, set the **URL** to your deployed backend's booking endpoint (e.g., `https://your-app-name.up.railway.app/api/bookings`).
7. Under **HTTP Headers**, add a new header:
    - **Name:** `Authorization`
    - **Value:** `Bearer <your-booking-webhook-secret>` (use the same secret you set in your Railway variables).
8. Click **Create webhook**.

Your webhooks are now correctly configured.

---

### 🚨 CRITICAL: Setting Up the Cron Job with the Supabase CLI (Recommended)

Just like webhooks, the Supabase Dashboard UI for creating cron jobs can be unreliable. Using the CLI and a migration file is the **best practice** to ensure your reminders are scheduled correctly.

#### Step 1: Delete the Old Cron Job from the UI

1.  Go to your Supabase Dashboard: **Edge Functions** > **send-reminders** (or `brevo-send-reminders`).
2.  Under the "Cron Jobs" section, find your existing cron job.
3.  Click the three dots (...) and select **Delete**.

#### Step 2: Create a New Cron Job Migration File

In your terminal, run this command:

```bash
supabase migration new create_reminder_cron_job
```

#### Step 3: Add SQL to the Cron Job Migration File

Open the new file created by the command (it will be named `supabase/migrations/<timestamp>_create_reminder_cron_job.sql`). Paste the following SQL code into it and save the file.

```sql
-- First, unschedule any existing jobs for this function to prevent duplicates
SELECT cron.unschedule(jobname)
FROM cron.job
WHERE command LIKE '%/functions/v1/brevo-send-reminders%';

-- Schedule the cron job to run daily at 9 AM UTC
SELECT cron.schedule(
  'daily-email-reminders', -- A unique name for the job
  '0 9 * * *',             -- Cron expression for 9 AM UTC every day
  $$
  SELECT
    net.http_post(
      url:='https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/brevo-send-reminders',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer @supa-secrets.CRON_SECRET"}'::jsonb,
      body:='{}'::jsonb
    )
  AS request_id;
  $$
);
```

**IMPORTANT:** In the SQL code above, replace `<YOUR_PROJECT_REF>` with your actual Supabase project reference ID.

#### Step 4: Apply the Migration

Run the following command in your terminal to apply the new cron job schedule.

```bash
supabase db push
```

Your daily reminder cron job is now correctly and reliably scheduled.

## 🔧 Troubleshooting

### ⚠️ **ISSUE: Emails or Reminders Still Not Sending**

If automated emails are still not working after using the CLI methods, the function logs will tell us exactly why.

1.  **To test confirmations:** Make a new booking in your application.
2.  **To test reminders:** You can manually trigger the cron job. Go to **Edge Functions** > **brevo-send-reminders** > **Cron Jobs**, click the three dots (...) on your job, and select **Trigger now**.
3.  Go to your Supabase Dashboard: **Edge Functions** > (either `brevo-booking-confirmation` or `brevo-send-reminders`).
4.  Click on the **Logs** tab.
5.  Look at the most recent log entry. If there is an "Unauthorized" error, it will now show you a secure hint of what `Authorization` header it received versus what it expected.
    *   **Compare this to your secrets**. There might be a typo in your `.env.local` file.
    *   If you update a secret, you **must** run `supabase secrets set --env-file ./supabase/functions/.env.local` again.

### Other Common Issues

-   **Is your `BREVO_SENDER_EMAIL` a validated sender in your Brevo account?** You must prove you own the email address in your Brevo dashboard before you can send from it.
-   **Did you enable `pg_cron`?** Run `supabase extensions list` to check. If it's not enabled, run `supabase extensions enable pg_cron --schema extensions`.