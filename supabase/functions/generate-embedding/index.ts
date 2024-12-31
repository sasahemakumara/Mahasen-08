import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize the Supabase AI session
const session = new Supabase.ai.Session('gte-small');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Received request to generate embedding');
    
    // Extract input from request body
    const { input } = await req.json();
    
    if (!input || typeof input !== 'string') {
      throw new Error('Input text is required and must be a string');
    }

    console.log('Generating embedding for input:', input);

    // Generate embedding using Supabase AI session
    const embedding = await session.run(input, {
      mean_pool: true,  // Use mean pooling for sentence embeddings
      normalize: true,  // Normalize the embedding vector
    });

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