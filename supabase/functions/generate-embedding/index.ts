import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Pipeline } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();

    if (!text || typeof text !== 'string') {
      throw new Error('Input text is required and must be a string');
    }

    console.log('Received text for embedding:', text.substring(0, 100) + '...');

    // Initialize the pipeline
    const pipe = await Pipeline.getInstance('feature-extraction', 'Supabase/gte-small');
    
    // Generate embedding
    const output = await pipe(text, {
      pooling: 'mean',
      normalize: true,
    });

    // Convert to regular array
    const embedding = Array.from(output.data);

    console.log('Successfully generated embedding');

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
        details: 'Failed to generate embedding'
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