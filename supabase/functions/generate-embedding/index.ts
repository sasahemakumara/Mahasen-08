import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { env, pipeline } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.5.0'

// Configuration for Deno runtime
env.useBrowserCache = false;
env.allowLocalModels = false;
env.cacheDir = '/tmp/transformers_cache';
env.localModelPath = undefined;

let pipe: any = null;

const initPipeline = async () => {
  try {
    console.log('Initializing feature extraction pipeline...');
    return await pipeline('feature-extraction', 'Supabase/gte-small', {
      revision: 'main',
      quantized: true,
      maxLength: 512,
    });
  } catch (error) {
    console.error('Error initializing pipeline:', error);
    throw error;
  }
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse and validate request body
    let body;
    try {
      const text = await req.text();
      body = JSON.parse(text);
      console.log('Parsed request body:', JSON.stringify(body));
    } catch (error) {
      console.error('Error parsing request body:', error);
      throw new Error('Invalid JSON in request body');
    }

    // Validate text input
    if (!body?.text || typeof body.text !== 'string') {
      throw new Error('Request body must contain a valid text field');
    }

    // Clean and validate the input text
    const inputText = String(body.text)
      .replace(/\0/g, '')
      .replace(/[\uFFFD\uFFFE\uFFFF]/g, '')
      .trim();

    if (inputText.length === 0) {
      throw new Error('Text is empty after cleaning');
    }

    // Truncate input text if too long
    const truncatedText = inputText.slice(0, 1000);
    console.log('Processing text length:', truncatedText.length);

    // Initialize pipeline on first request
    if (!pipe) {
      pipe = await initPipeline();
    }

    // Generate embedding
    console.log('Generating embedding...');
    const output = await pipe(truncatedText, {
      pooling: 'mean',
      normalize: true,
    });

    if (!output?.data) {
      throw new Error('Failed to generate embedding: No output data');
    }

    // Extract embedding and clean up
    const embedding = Array.from(output.data);
    output.data = null; // Help garbage collection

    console.log('Successfully generated embedding with dimensions:', embedding.length);

    return new Response(
      JSON.stringify({ embedding }),
      { 
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('Error in generate-embedding function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: 'Please ensure the input is valid text and try again.'
      }),
      { 
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});