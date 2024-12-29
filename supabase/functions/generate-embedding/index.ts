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
    const requestData = await req.text();
    console.log('Raw request data:', requestData);

    if (!requestData) {
      console.error('Empty request data received');
      throw new Error('Request body is empty');
    }

    let body;
    try {
      body = JSON.parse(requestData);
    } catch (error) {
      console.error('JSON parsing error:', error);
      throw new Error('Invalid JSON in request body');
    }

    console.log('Parsed request body:', body);

    // Strict validation of text field
    if (!body?.text) {
      console.error('Invalid or missing text field:', body);
      throw new Error('Request must contain a text field');
    }

    // Convert to string and trim, with explicit null check
    const textInput = body.text ? String(body.text).trim() : '';
    console.log('Text input length:', textInput.length);

    if (!textInput) {
      throw new Error('Text field is empty after trimming');
    }

    // Clean the text with explicit null checks
    const cleanedText = textInput
      ?.replace(/\0/g, '')
      ?.replace(/[\uFFFD\uFFFE\uFFFF]/g, '')
      ?.trim() || '';

    if (!cleanedText) {
      throw new Error('Text contains no valid content after cleaning');
    }

    // Truncate text if too long
    const truncatedText = cleanedText.slice(0, 1000);
    console.log('Processing text length:', truncatedText.length);
    console.log('Text sample:', truncatedText.substring(0, 100));

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