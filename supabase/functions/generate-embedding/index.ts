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
    // Initialize pipeline on first request if not already initialized
    if (!pipe) {
      pipe = await initPipeline();
    }

    console.log('Received embedding request');
    const { text } = await req.json();

    if (!text) {
      throw new Error('No text provided');
    }

    // Truncate input text if too long
    const truncatedText = text.slice(0, 1000); // Limit text length
    console.log('Generating embedding for text:', truncatedText.substring(0, 100) + '...');

    // Generate the embedding with specific options to reduce memory usage
    const output = await pipe(truncatedText, {
      pooling: 'mean',
      normalize: true,
      max_length: 512,
    });

    // Extract the embedding output and clean up
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
        details: 'Function failed due to resource constraints. Please try with shorter text.'
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