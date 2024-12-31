import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { pipeline } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.15.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { input } = await req.json()
    
    if (!input || typeof input !== 'string') {
      throw new Error('Input text is required')
    }

    // Initialize the pipeline with remote model loading
    const pipe = await pipeline('feature-extraction', 'Supabase/gte-small', {
      revision: 'main',
      quantized: false
    })
    
    // Generate embedding
    const output = await pipe(input, {
      pooling: 'mean',
      normalize: true,
    })

    // Get the embedding from the output
    const embedding = Array.from(output.data)

    return new Response(
      JSON.stringify({ embedding }),
      { 
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    )
  } catch (error) {
    console.error('Error generating embedding:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    )
  }
})