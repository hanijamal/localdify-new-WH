# localDify WhatsApp Backend Service

This Node.js service provides WhatsApp Web automation for the LocalDify SaaS platform, allowing salons to connect their own WhatsApp accounts via QR code to send automated appointment messages. It uses the [Baileys](https://github.com/WhiskeySockets/Baileys) library.

**Disclaimer:** This service relies on reverse-engineering WhatsApp Web. It is not an official API and may break at any time due to updates from WhatsApp. For production use, the official Meta API is strongly recommended for stability.

## Features

-   **QR Code Login:** Connect individual WhatsApp accounts like on WhatsApp Web.
-   **Persistent Sessions:** Authentication sessions are saved to Supabase Storage, allowing the service to reconnect after restarts without needing a new QR scan every time.
-   **Durable Job Queue:** A database-backed job queue (`whatsapp_jobs`) ensures messages are not lost if the service is down or a session is disconnected.
-   **Background Worker:** A dedicated worker process sends messages from the queue, with automatic retries and exponential backoff.
-   **Cron-based Reminders:** A cron job scans for upcoming appointments and queues reminder messages.
-   **REST API:** Simple endpoints for the frontend to manage connections and status.

---

## 1. Local Setup & Development

### Prerequisites

-   Node.js v18 or later
-   A Supabase project (use the same one as your LocalDify frontend)
-   Supabase CLI installed and logged in (`supabase login`)

### Setup Instructions

1.  **Navigate to the Backend Directory:**
    ```bash
    cd backend
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Set Up Environment Variables:**
    Create a `.env` file in the `backend/` directory and populate it with your Supabase credentials. You can find these in your Supabase project's dashboard under `Settings > API`.

    ```env
    # .env
    
    # Supabase credentials
    SUPABASE_URL=https://<your-project-ref>.supabase.co
    SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

    # Server Configuration
    PORT=3001
    
    # Webhook secret (must match the one for your Supabase webhook)
    BOOKING_WEBHOOK_SECRET=<generate-a-strong-random-string> 
    ```

4.  **Database Schema:**
    The required SQL schema is provided in the Supabase migration file. Link your Supabase project and apply the migration from the project root:
    ```bash
    # Run from the root of your entire project (not the backend folder)
    supabase link --project-ref <your-project-ref>
    supabase db push
    ```
    This will create the `whatsapp_sessions` and `whatsapp_jobs` tables.

5.  **Supabase Storage Bucket:**
    Go to your Supabase Dashboard > Storage and create a **private** bucket named `whatsapp-sessions`. This is where encrypted session files will be stored.

6.  **Run the Backend:**
    ```bash
    # From the backend/ directory
    npm run dev
    ```
    The server will start, along with the cron job for reminders and the worker for sending messages.

---

## 2. API Endpoints

The server runs on `http://localhost:3001` by default.

#### `POST /api/whatsapp/connect`

Initiates a connection for a salon. If a valid session exists, it reconnects. Otherwise, it generates a new QR code.

-   **Body:**
    ```json
    {
      "salon_id": "uuid-of-the-business"
    }
    ```
-   **Success Response (New Session):**
    ```json
    {
      "message": "QR code generated. Please scan.",
      "qr": "2@eY...==" 
    }
    ```
-   **Success Response (Existing Session):**
    ```json
    {
      "message": "Already connected.",
      "status": "connected"
    }
    ```

#### `GET /api/whatsapp/status?salon_id=<uuid>`

Checks the current connection status for a salon.

-   **Query Parameters:**
    -   `salon_id` (required): The UUID of the business.
-   **Success Response:**
    ```json
    {
      "status": "connected" // or "pending", "disconnected", "error"
    }
    ```

#### `POST /api/bookings` (Webhook)

This endpoint is intended to be called by a Supabase Database Webhook when a new row is inserted into the `bookings` table.

-   **Security:** This endpoint should be secured with a secret key (`BOOKING_WEBHOOK_SECRET`).
-   **Action:** When it receives a new booking record, it creates a `confirmation` job in the `whatsapp_jobs` table.

---

## 3. Deployment on Railway

Railway is a good platform for hosting this kind of stateful Node.js service.

### Step-by-Step Guide

1.  **Create a New Project on Railway:**
    -   Log in to your Railway account.
    -   Click "New Project" and select "Deploy from GitHub repo".
    -   Choose your repository. When prompted, select "Use `backend` as root directory".

2.  **Configure Environment Variables:**
    -   In your Railway project, go to the "Variables" tab.
    -   Add all the variables from your local `.env` file (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PORT`, `BOOKING_WEBHOOK_SECRET`).
    -   Railway will automatically provide a `PORT` variable, but it's good practice to set it explicitly if your app needs it on start.

3.  **Configure Start Command:**
    -   Go to the "Settings" tab for your service.
    -   Under the "Deploy" section, find the "Start Command".
    -   Set it to: `npm start`

4.  **Generate a Public Domain:**
    -   In the "Settings" tab, under "Networking", click "Generate Domain" to get a public URL for your backend service (e.g., `https://my-whatsapp-backend.up.railway.app`).
    -   **Important:** Take this new URL and update your frontend code (`src/components/dashboard/WhatsappConnector.tsx`) to point to it instead of `http://localhost:3001`.

5.  **Configure Supabase Webhook:**
    -   Go to your Supabase Dashboard > Database > Webhooks.
    -   Create a new webhook on the `bookings` table for `INSERT` events.
    -   Set the **HTTP URL** to your new Railway URL: `https://<your-railway-app-url>/api/bookings`.
    -   Under **HTTP Headers**, add an `Authorization` header. The value should be `Bearer <your-booking-webhook-secret>`.

---

## 4. Frontend Integration into LocalDify

### A. Update Integrations Page

Modify `pages/dashboard/Integrations.tsx` to include the new `WhatsappConnector` component.

```tsx
// ... existing imports
import WhatsappConnector from '../../components/dashboard/WhatsappConnector';

// ... inside the Integrations component ...
<Card className="flex flex-col">
    <CardHeader>
        {/* ... */}
    </CardHeader>
    <CardContent className="flex-grow">
        {/* ADD THIS LINE */}
        {business && <WhatsappConnector salonId={business.id} />}
    </CardContent>
</Card>
```

### B. Add the New Component

Add the file `src/components/dashboard/WhatsappConnector.tsx` to your frontend project with the provided code.

### C. Update Backend URL in Frontend

In `src/components/dashboard/WhatsappConnector.tsx`, find the `BACKEND_URL` constant and change it from the localhost placeholder to your deployed Railway URL for production.
