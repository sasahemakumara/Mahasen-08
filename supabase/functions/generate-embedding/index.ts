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

    console.log('Generating embedding for text:', text.substring(0, 100) + '...');

    // Function to make the API call with retries
    const generateEmbedding = async (retries = 3) => {
      for (let i = 0; i < retries; i++) {
        try {
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
            const errorText = await response.text();
            console.error(`Attempt ${i + 1} failed:`, {
              status: response.status,
              statusText: response.statusText,
              error: errorText
            });
            
            if (i === retries - 1) {
              throw new Error(`Hugging Face API error: ${response.statusText}\n${errorText}`);
            }
            
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
            continue;
          }

          const embedding = await response.json();
          
          if (!Array.isArray(embedding) || embedding.length === 0) {
            throw new Error('Invalid embedding format received from API');
          }

          console.log('Successfully generated embedding with dimensions:', embedding[0].length);
          return embedding[0];
        } catch (error) {
          if (i === retries - 1) throw error;
          console.error(`Attempt ${i + 1} failed:`, error);
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
      }
    };

    const embedding = await generateEmbedding();

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