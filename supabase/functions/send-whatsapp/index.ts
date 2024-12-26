import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { sendWhatsAppMessage } from "../whatsapp-webhook/whatsapp.ts";
import { generateResponse } from "../whatsapp-webhook/ollama.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204,
    });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    // Validate environment variables
    const WHATSAPP_ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    const WHATSAPP_PHONE_ID = Deno.env.get('WHATSAPP_PHONE_ID');
    const OLLAMA_BASE_URL = Deno.env.get('OLLAMA_BASE_URL');

    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_ID || !OLLAMA_BASE_URL) {
      console.error('Missing required environment variables');
      throw new Error('Server configuration error');
    }

    // Parse and validate request body
    const { to, message, type, useAI } = await req.json();
    
    if (!to || !message || !type) {
      throw new Error('Missing required fields: to, message, or type');
    }

    console.log('Processing request:', { to, message, type, useAI });

    // Send agent's message
    try {
      await sendWhatsAppMessage(to, message, WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_ID);
      console.log('Agent message sent successfully');
    } catch (error) {
      console.error('Error sending agent message:', error);
      throw new Error('Failed to send agent message');
    }

    // Handle AI response if enabled
    if (useAI === true) {
      console.log('AI is enabled, generating response...');
      try {
        const aiResponse = await generateResponse(message, OLLAMA_BASE_URL);
        if (aiResponse) {
          console.log('Sending AI response:', aiResponse);
          await sendWhatsAppMessage(to, aiResponse, WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_ID);
        }
      } catch (error) {
        console.error('Error with AI response:', error);
        // Don't throw here, as the main message was already sent
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Error in send-whatsapp function:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const statusCode = errorMessage.includes('configuration') ? 500 : 400;

    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});