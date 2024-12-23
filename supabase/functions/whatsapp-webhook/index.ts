import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const WHATSAPP_ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN')!;
const WHATSAPP_VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN')!;
const WHATSAPP_PHONE_ID = Deno.env.get('WHATSAPP_PHONE_ID')!;
const OLLAMA_BASE_URL = Deno.env.get('OLLAMA_BASE_URL')!;

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getOllamaResponse(prompt: string): Promise<string> {
  try {
    console.log('Sending request to Ollama with prompt:', prompt);
    console.log('Using Ollama base URL:', OLLAMA_BASE_URL);
    
    // Ensure we're using the correct port (11434)
    const ollamaUrl = `${OLLAMA_BASE_URL}/api/generate`;
    console.log('Full Ollama URL:', ollamaUrl);

    const response = await fetch(ollamaUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "llama2",
        prompt: prompt,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Ollama API error response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`Ollama API responded with status: ${response.status}. Body: ${errorText}`);
    }

    const text = await response.text();
    console.log('Raw Ollama response:', text);

    try {
      const data = JSON.parse(text);
      if (!data.response) {
        console.error('Unexpected Ollama response format:', data);
        throw new Error('Invalid response format from Ollama');
      }
      return data.response;
    } catch (parseError) {
      console.error('Error parsing Ollama response:', parseError);
      throw new Error('Invalid JSON response from Ollama');
    }
  } catch (error) {
    console.error('Error getting Ollama response:', error);
    return "I apologize, but I'm having trouble processing your request right now. Please try again later.";
  }
}

async function sendWhatsAppMessage(to: string, text: string) {
  try {
    const response = await fetch(`https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "text",
        text: {
          preview_url: false,
          body: text
        }
      })
    });

    const data = await response.json();
    console.log('WhatsApp API response:', JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Handle webhook verification
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
      console.log('Webhook verified successfully');
      return new Response(challenge, { 
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' } 
      });
    }

    return new Response('Verification failed', { 
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' } 
    });
  }

  // Handle incoming messages
  if (req.method === 'POST') {
    try {
      const message = await req.json();
      const changes = message.entry[0].changes[0].value;
      
      if (!changes.messages || changes.messages.length === 0) {
        return new Response('No messages in webhook', { 
          status: 200,
          headers: corsHeaders 
        });
      }

      const userMessage = changes.messages[0].text.body;
      const userId = changes.contacts[0].wa_id;
      const userName = changes.contacts[0].profile.name;

      console.log(`Received message from ${userName} (${userId}): ${userMessage}`);

      // Get AI response
      const aiResponse = await getOllamaResponse(userMessage);
      console.log('AI Response:', aiResponse);
      
      // Send response back via WhatsApp
      await sendWhatsAppMessage(userId, aiResponse);

      // Store the conversation in Supabase
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('id')
        .eq('contact_number', userId)
        .single();

      if (convError && convError.code !== 'PGRST116') {
        throw convError;
      }

      let conversationId;
      if (!conversation) {
        const { data: newConversation, error: createError } = await supabase
          .from('conversations')
          .insert({
            contact_number: userId,
            contact_name: userName,
            platform: 'whatsapp'
          })
          .select()
          .single();

        if (createError) throw createError;
        conversationId = newConversation?.id;
      } else {
        conversationId = conversation.id;
      }

      // Store the messages
      const { error: msgError } = await supabase.from('messages').insert([
        {
          conversation_id: conversationId,
          content: userMessage,
          status: 'received',
          sender_name: userName,
          sender_number: userId
        },
        {
          conversation_id: conversationId,
          content: aiResponse,
          status: 'sent',
          sender_name: 'AI Assistant',
          sender_number: 'system'
        }
      ]);

      if (msgError) throw msgError;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error processing webhook:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response('Method not allowed', { 
    status: 405,
    headers: corsHeaders 
  });
});
