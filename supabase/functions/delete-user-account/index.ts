import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

declare const Deno: {
  env: { get(key: string): string | undefined; };
};

serve(async (req) => {
  // Explicitly handle preflight requests with all required headers to resolve stubborn CORS issues.
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
        console.error('CRITICAL: Missing required Supabase environment variables for delete-user-account function.');
        throw new Error('Server configuration error: Supabase environment variables are not set.');
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const authorization = req.headers.get('Authorization');
    if (!authorization) {
      throw new Error('Authorization header is missing.');
    }

    const userAuthClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authorization } },
    });
    
    const { data: { user }, error: userError } = await userAuthClient.auth.getUser();
    if (userError || !user) {
      console.error('Authentication error:', userError?.message);
      throw new Error('User not authenticated or token is invalid.');
    }
    console.log(`Authenticated user: ${user.id} for deletion request.`);

    const { data: userProfile } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single();
    if (userProfile?.role === 'admin') {
      console.warn(`Admin user ${user.id} attempted self-deletion.`);
      throw new Error("Admins cannot delete their own account through this feature.");
    }
    
    console.log(`Starting storage cleanup for user ${user.id}...`);
    const imageBuckets = ['avatars', 'business-images', 'service-images'];
    for (const bucketId of imageBuckets) {
        console.log(`Listing files for user ${user.id} in bucket: ${bucketId}...`);
        const { data: files, error: listError } = await supabaseAdmin.storage
            .from(bucketId)
            .list(user.id);

        if (listError) {
            console.warn(`Could not list files in bucket ${bucketId} for user ${user.id}:`, listError.message);
            continue; 
        }

        if (files && files.length > 0) {
            const filePaths = files.map(file => `${user.id}/${file.name}`);
            console.log(`Deleting ${filePaths.length} files from bucket ${bucketId}...`);
            const { error: removeError } = await supabaseAdmin.storage
                .from(bucketId)
                .remove(filePaths);
            
            if (removeError) {
                console.warn(`Failed to delete files from bucket ${bucketId}:`, removeError.message);
            } else {
                console.log(`Successfully deleted files from bucket ${bucketId}.`);
            }
        } else {
           console.log(`No files found for user in bucket ${bucketId}.`);
        }
    }
    console.log('Storage cleanup complete.');

    console.log(`Deleting auth user ${user.id}. This will cascade to all related database records.`);
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteUserError) {
      console.error('Failed to delete user from auth system:', deleteUserError.message);
      throw deleteUserError;
    }
    console.log(`User ${user.id} and all associated data deleted successfully.`);

    return new Response(JSON.stringify({ success: true, message: 'Account deleted successfully.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('CRITICAL ERROR in delete-user-account function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});