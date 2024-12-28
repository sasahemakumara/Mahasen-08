import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { text } = await req.json()
    
    if (!text) {
      throw new Error('No text provided')
    }

    // Get embedding from Ollama
    const ollamaResponse = await fetch(`${Deno.env.get('OLLAMA_BASE_URL')}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "snowflake-arctic-embed2",
        prompt: text
      })
    })

    if (!ollamaResponse.ok) {
      throw new Error(`Ollama API error: ${ollamaResponse.statusText}`)
    }

    const { embedding } = await ollamaResponse.json()

    return new Response(
      JSON.stringify({ embedding }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})