import { createClient } from '@supabase/supabase-js';

// Hardcoded Supabase credentials. This will fix the runtime error.
// NOTE TO DEVELOPER: The anonymous key is a placeholder.
// You must replace it with your actual Supabase anonymous key.
const supabaseUrl = 'https://wxsntbclqxfgoccsnawk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4c250YmNscXhmZ29jY3NuYXdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MDkwOTAsImV4cCI6MjA3ODA4NTA5MH0.B85Ud83NPaFSmqYxRyj45RTJvpQ-3kNNVvkhUWeZsf4';

if (!supabaseUrl || !supabaseAnonKey) {
    const errorMessage = "Supabase configuration incomplete: Please provide `supabaseUrl` and `supabaseAnonKey`.";
    
    // Display a user-friendly error overlay in the application.
    const errorDiv = document.createElement('div');
    errorDiv.style.position = 'fixed';
    errorDiv.style.top = '0';
    errorDiv.style.left = '0';
    errorDiv.style.width = '100%';
    errorDiv.style.padding = '1rem';
    errorDiv.style.backgroundColor = '#ff4d4d';
    errorDiv.style.color = 'white';
    errorDiv.style.textAlign = 'center';
    errorDiv.style.zIndex = '9999';
    errorDiv.innerHTML = `<strong>Configuration Error:</strong> Supabase URL or anonymous key is missing. Please update the <code>supabaseClient.ts</code> file.`;
    document.body.prepend(errorDiv);

    console.error(errorMessage);
    throw new Error(errorMessage);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
