import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { Image } from 'https://deno.land/x/imagescript@1.2.16/mod.ts';

// FIX: Add a type declaration for the Deno namespace.
// This satisfies the TypeScript compiler in non-Deno environments (like a local editor)
// for type-checking purposes. The original triple-slash directive pointed to a
// broken URL, causing a type definition error. This declaration resolves all
// related errors by providing a minimal definition for the used APIs.
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

// --- Configuration ---
const TARGET_SIZE_KB = 100;
const MAX_RESIZE_WIDTH = 1280; // Max width for larger images before compression
const JPEG_QUALITY_START = 90; // Starting quality for JPEG
const JPEG_QUALITY_MIN = 50;   // Minimum quality to attempt
const JPEG_QUALITY_STEP = 10;  // Step to reduce quality by
const ALLOWED_BUCKETS = ['avatars', 'business-images', 'service-images'];
// ---

console.log('Image Optimizer (JPEG) Edge Function is running!');

serve(async (req) => {
  try {
    const payload = await req.json();
    const record = payload.record;

    if (!record || !record.bucket_id || !record.name) {
      throw new Error('Invalid webhook payload: missing record, bucket_id, or name');
    }

    const { bucket_id: bucketId, name: path, metadata } = record;
    const mimetype = metadata?.mimetype;
    const size = metadata?.size;

    console.log(`Processing: ${bucketId}/${path}`);

    // --- Early Exit Conditions ---
    // 1. Skip if bucket is not in the allowed list
    if (!ALLOWED_BUCKETS.includes(bucketId)) {
      console.log(`Skipping bucket '${bucketId}'.`);
      return new Response(JSON.stringify({ message: `Skipped: Bucket '${bucketId}' is not on the allowed list.` }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Skip if the file is already an optimized JPEG, to prevent loops
    if (mimetype === 'image/jpeg' && size < TARGET_SIZE_KB * 1024) {
      console.log('Skipping: Image is already an optimized JPEG.');
      return new Response(JSON.stringify({ message: 'Skipped: Image is already an optimized JPEG.' }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Skip SVG files as they are vector-based and shouldn't be rasterized/compressed.
    if (mimetype === 'image/svg+xml') {
        console.log('Skipping: SVG files are not processed.');
        return new Response(JSON.stringify({ message: 'Skipped: SVG files are not processed.' }), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        });
    }
    
    // --- Image Processing ---
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // 1. Download original image
    const { data: originalImageBlob, error: downloadError } = await supabaseAdmin.storage
      .from(bucketId)
      .download(path);

    if (downloadError) throw new Error(`Failed to download image: ${downloadError.message}`);
    console.log(`Image downloaded (${(originalImageBlob.size / 1024).toFixed(2)} KB).`);
    
    // 2. Decode the image
    const imageBuffer = await originalImageBlob.arrayBuffer();
    const image = await Image.decode(imageBuffer);

    // 3. Apply dimensional resize if the image is wider than our max width
    if (image.width > MAX_RESIZE_WIDTH) {
      image.resize(MAX_RESIZE_WIDTH, Image.RESIZE_AUTO);
      console.log(`Resized dimensions to ${image.width}px width.`);
    }

    // 4. Iteratively encode to JPEG to meet file size target
    let quality = JPEG_QUALITY_START;
    let encodedImage: Uint8Array | null = null;

    while (quality >= JPEG_QUALITY_MIN) {
      const buffer = await image.encodeJPEG(quality);
      console.log(`Attempting JPEG compression with quality ${quality}... Size: ${(buffer.length / 1024).toFixed(2)} KB`);
      if (buffer.length <= TARGET_SIZE_KB * 1024) {
        encodedImage = buffer;
        break;
      }
      quality -= JPEG_QUALITY_STEP;
    }

    // If it's still too large, use the result from the minimum quality attempt
    if (!encodedImage) {
      encodedImage = await image.encodeJPEG(JPEG_QUALITY_MIN);
      console.log(`Compression target not met. Using fallback quality ${JPEG_QUALITY_MIN}. Final size: ${(encodedImage.length / 1024).toFixed(2)} KB`);
    }

    // 5. Upload the new JPEG image
    const lastDotIndex = path.lastIndexOf('.');
    const pathWithoutExtension = lastDotIndex === -1 ? path : path.substring(0, lastDotIndex);
    const newPath = `${pathWithoutExtension}.jpg`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucketId)
      .upload(newPath, encodedImage, {
        contentType: 'image/jpeg',
        upsert: true, // Overwrite if it already exists
      });

    if (uploadError) throw new Error(`Failed to upload optimized image: ${uploadError.message}`);
    console.log(`Optimized image uploaded to: ${newPath}`);

    // 6. Delete the original file (if its path is different from the new one)
    if (newPath !== path) {
        const { error: deleteError } = await supabaseAdmin.storage
            .from(bucketId)
            .remove([path]);
        if (deleteError) {
            console.warn(`Failed to delete original file at ${path}: ${deleteError.message}`);
        } else {
            console.log(`Successfully deleted original file: ${path}`);
        }
    }

    return new Response(JSON.stringify({ success: true, newPath, size: encodedImage.length }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing image:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
