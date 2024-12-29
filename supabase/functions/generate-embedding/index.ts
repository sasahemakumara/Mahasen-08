import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { pipeline } from "npm:@huggingface/transformers";

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
    
    if (!text) {
      throw new Error('No text provided');
    }

    console.log('Generating embedding for text:', text);

    // Create a feature-extraction pipeline
    const extractor = await pipeline(
      "feature-extraction",
      "Supabase/gte-small",
      { revision: "main" }
    );

    // Generate embeddings
    const output = await extractor(text, {
      pooling: "mean",
      normalize: true
    });

    // Convert to array
    const embedding = Array.from(await output.tolist());

    console.log('Successfully generated embedding');

    return new Response(
      JSON.stringify({ embedding }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating embedding:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});