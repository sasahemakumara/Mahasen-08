import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    // Call Hugging Face API to generate embeddings
    const response = await fetch(
      "https://api-inference.huggingface.co/pipeline/feature-extraction/Supabase/gte-small",
      {
        headers: { 
          Authorization: `Bearer ${Deno.env.get('HUGGINGFACE_API_KEY')}`,
          "Content-Type": "application/json"
        },
        method: "POST",
        body: JSON.stringify({
          inputs: text,
          options: {
            wait_for_model: true,
            use_cache: true
          }
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Hugging Face API error: ${response.statusText}`);
    }

    const embedding = await response.json();
    console.log('Successfully generated embedding');

    return new Response(
      JSON.stringify({ embedding: embedding[0] }),
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