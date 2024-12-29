import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getOllamaResponse } from './ollama.ts';
import { sendWhatsAppMessage } from './whatsapp.ts';
import { storeConversation } from './database.ts';

const WHATSAPP_ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN')!;
const WHATSAPP_VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN')!;
const WHATSAPP_PHONE_ID = Deno.env.get('WHATSAPP_PHONE_ID')!;
const OLLAMA_BASE_URL = Deno.env.get('OLLAMA_BASE_URL')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, message, type, useAI = true, context = '' } = await req.json();

    if (!to || !message) {
      throw new Error('Missing required parameters');
    }

    console.log('Received request:', { to, message, type, useAI, context });

    let finalMessage = message;

    if (useAI) {
      // Construct a more explicit prompt that instructs the AI how to use the context
      const prompt = `You are a helpful AI assistant with access to a knowledge base. 
${context}

User Question: ${message}

Instructions:
1. If the context contains relevant information, use it to provide a detailed and accurate response.
2. If the context is not relevant to the question, provide a general response and mention that the specific information is not in your knowledge base.
3. Always maintain a helpful and professional tone.
4. Be direct and concise in your response.

Please provide your response:`;

      console.log('Sending prompt to Ollama:', prompt);

      finalMessage = await getOllamaResponse(prompt, OLLAMA_BASE_URL);
      console.log('AI Response:', finalMessage);
    }

    // Send message to WhatsApp
    const whatsappData = await sendWhatsAppMessage(to, finalMessage, WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_ID);
    console.log('WhatsApp API response:', whatsappData);

    return new Response(
      JSON.stringify({ success: true, data: whatsappData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-whatsapp function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});