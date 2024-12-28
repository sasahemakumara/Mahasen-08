import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

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

    console.log('Sending request to Ollama with text:', text);
    console.log('Using Ollama base URL:', Deno.env.get('OLLAMA_BASE_URL'));

    // Get embedding from Ollama
    const ollamaResponse = await fetch(`${Deno.env.get('OLLAMA_BASE_URL')}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "snowflake-arctic-embed2",
        prompt: text
      })
    });

    if (!ollamaResponse.ok) {
      const errorText = await ollamaResponse.text();
      console.error('Ollama API error response:', {
        status: ollamaResponse.status,
        statusText: ollamaResponse.statusText,
        body: errorText
      });
      throw new Error(`Ollama API responded with status: ${ollamaResponse.status}. Body: ${errorText}`);
    }

    const data = await ollamaResponse.json();
    console.log('Ollama response:', data);

    if (!data.embedding) {
      console.error('Unexpected Ollama response format:', data);
      throw new Error('Invalid response format from Ollama');
    }

    return new Response(
      JSON.stringify({ embedding: data.embedding }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});