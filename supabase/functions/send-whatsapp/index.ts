import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { sendWhatsAppMessage } from "../whatsapp-webhook/whatsapp.ts";
import { generateResponse } from "../whatsapp-webhook/ollama.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  const WHATSAPP_ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN')!;
  const WHATSAPP_PHONE_ID = Deno.env.get('WHATSAPP_PHONE_ID')!;
  const OLLAMA_BASE_URL = Deno.env.get('OLLAMA_BASE_URL')!;

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, message, type, useAI } = await req.json();
    console.log('Received request with AI state:', { to, message, type, useAI });

    // First, send the agent's message
    await sendWhatsAppMessage(to, message, WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_ID);

    // Strict check for useAI being explicitly true
    if (useAI === true) {
      console.log('AI is explicitly enabled, generating response...');
      const aiResponse = await generateResponse(message, OLLAMA_BASE_URL);
      
      if (aiResponse) {
        console.log('Sending AI response:', aiResponse);
        await sendWhatsAppMessage(to, aiResponse, WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_ID);
      }
    } else {
      console.log('AI is disabled (useAI:', useAI, '), skipping AI response');
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('Error in send-whatsapp function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})