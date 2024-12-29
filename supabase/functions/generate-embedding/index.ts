import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { env, pipeline } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.5.0'

// Configuration for Deno runtime
env.useBrowserCache = false;
env.allowLocalModels = false;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Initialize the pipeline outside the request handler
const initPipeline = async () => {
  try {
    console.log('Initializing feature extraction pipeline...');
    return await pipeline(
      'feature-extraction',
      'Supabase/gte-small',
    );
  } catch (error) {
    console.error('Error initializing pipeline:', error);
    throw error;
  }
};

// Initialize the pipeline
const pipe = await initPipeline();

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Received embedding request');
    const { text } = await req.json();

    if (!text) {
      throw new Error('No text provided');
    }

    console.log('Generating embedding for text:', text.substring(0, 100) + '...');

    // Generate the embedding
    const output = await pipe(text, {
      pooling: 'mean',
      normalize: true,
    });

    // Extract the embedding output
    const embedding = Array.from(output.data);

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
      JSON.stringify({ error: error.message }),
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