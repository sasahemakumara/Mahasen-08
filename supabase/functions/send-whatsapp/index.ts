import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

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
      console.log('AI is enabled, generating response with context:', context);

      // Prepare the prompt with context
      const prompt = context 
        ? `Based on the following context:\n${context}\n\nUser question: ${message}\n\nPlease provide a response:`
        : message;

      console.log('Sending request to Ollama with prompt:', prompt);

      const ollamaResponse = await fetch(`${Deno.env.get('OLLAMA_BASE_URL')}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "llama2:latest",
          prompt: prompt,
          stream: false
        })
      });

      if (!ollamaResponse.ok) {
        throw new Error(`Ollama API error: ${ollamaResponse.statusText}`);
      }

      const aiData = await ollamaResponse.json();
      console.log('Raw Ollama response:', aiData);

      finalMessage = aiData.response;
      console.log('AI Response:', finalMessage);
    }

    // Send message to WhatsApp
    const whatsappResponse = await fetch(
      `https://graph.facebook.com/v17.0/${Deno.env.get('WHATSAPP_PHONE_ID')}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('WHATSAPP_ACCESS_TOKEN')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to,
          type: 'text',
          text: { body: finalMessage }
        }),
      }
    );

    if (!whatsappResponse.ok) {
      throw new Error(`WhatsApp API error: ${whatsappResponse.statusText}`);
    }

    const whatsappData = await whatsappResponse.json();
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