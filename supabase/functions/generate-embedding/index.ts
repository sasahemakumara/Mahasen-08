import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { env, pipeline } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.5.0'

// Configuration for Deno runtime
env.useBrowserCache = false;
env.allowLocalModels = false;
env.cacheDir = '/tmp/transformers_cache'; // Use temporary directory for caching
env.localModelPath = undefined; // Disable local model loading

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Initialize the pipeline with specific configuration to reduce memory usage
const initPipeline = async () => {
  try {
    console.log('Initializing feature extraction pipeline...');
    return await pipeline('feature-extraction', 'Supabase/gte-small', {
      revision: 'main',
      quantized: true, // Use quantized model if available
      maxLength: 512, // Limit input length
    });
  } catch (error) {
    console.error('Error initializing pipeline:', error);
    throw error;
  }
};

let pipe: any = null;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body safely
    let body;
    try {
      body = await req.json();
    } catch (error) {
      throw new Error('Invalid JSON in request body');
    }

    // Validate text input with detailed logging
    console.log('Received request body:', JSON.stringify(body));
    
    if (!body || typeof body.text === 'undefined') {
      throw new Error('Request body must contain a text field');
    }

    const inputText = String(body.text); // Convert to string explicitly
    console.log('Input text type:', typeof inputText);
    
    // Clean the text
    const cleanText = inputText.trim();
    console.log('Cleaned text length:', cleanText.length);

    if (cleanText.length === 0) {
      throw new Error('Text is empty after cleaning');
    }

    // Truncate input text if too long
    const truncatedText = cleanText.slice(0, 1000);
    console.log('Processing text (truncated):', truncatedText.substring(0, 100) + '...');

    // Initialize pipeline on first request if not already initialized
    if (!pipe) {
      pipe = await initPipeline();
    }

    // Generate the embedding with specific options
    console.log('Generating embedding...');
    const output = await pipe(truncatedText, {
      pooling: 'mean',
      normalize: true,
      max_length: 512,
    });

    // Validate output
    if (!output || !output.data) {
      throw new Error('Failed to generate embedding: No output data');
    }

    // Extract the embedding and clean up
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
        error: error.message,
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