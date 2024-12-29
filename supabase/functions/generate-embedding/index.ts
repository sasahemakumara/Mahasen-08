import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Initialize the AI session once for reuse
const session = new Supabase.ai.Session('gte-small');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse and validate request body
    const requestData = await req.text();
    console.log('Raw request data:', requestData);

    if (!requestData) {
      console.error('Empty request data received');
      throw new Error('Request body is empty');
    }

    let body;
    try {
      body = JSON.parse(requestData);
    } catch (error) {
      console.error('JSON parsing error:', error);
      throw new Error('Invalid JSON in request body');
    }

    console.log('Parsed request body:', body);

    // Validate text field
    if (!body?.text) {
      console.error('Invalid or missing text field:', body);
      throw new Error('Request must contain a text field');
    }

    // Clean and prepare the text
    const text = body.text.trim();
    if (!text) {
      throw new Error('Text field is empty after trimming');
    }

    console.log('Processing text length:', text.length);
    console.log('Text sample:', text.substring(0, 100));

    // Generate embedding using the AI session
    console.log('Generating embedding...');
    const embedding = await session.run(text, {
      mean_pool: true,
      normalize: true,
    });

    if (!embedding) {
      throw new Error('Failed to generate embedding');
    }

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
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: 'Please ensure the input is valid text and try again.'
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