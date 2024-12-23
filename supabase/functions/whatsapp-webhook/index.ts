import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const WHATSAPP_ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN')!;
const WHATSAPP_VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN')!;
const WHATSAPP_PHONE_ID = Deno.env.get('WHATSAPP_PHONE_ID')!;
const OLLAMA_BASE_URL = Deno.env.get('OLLAMA_BASE_URL')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WhatsAppMessage {
  entry: [{
    changes: [{
      value: {
        contacts: [{
          wa_id: string;
          profile: { name: string; }
        }];
        messages: [{
          text: { body: string; }
        }];
      }
    }]
  }]
}

async function getOllamaResponse(prompt: string): Promise<string> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "llama2",
        prompt: prompt,
        stream: false
      })
    });

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('Error getting Ollama response:', error);
    return "I apologize, but I'm having trouble processing your request right now.";
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
    console.log('WhatsApp API response:', data);
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
      const message: WhatsAppMessage = await req.json();
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
      
      // Send response back via WhatsApp
      await sendWhatsAppMessage(userId, aiResponse);

      // Store the conversation in Supabase
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('contact_number', userId)
        .single();

      let conversationId;
      if (!conversation) {
        const { data: newConversation } = await supabase
          .from('conversations')
          .insert({
            contact_number: userId,
            contact_name: userName,
            platform: 'whatsapp'
          })
          .select()
          .single();
        conversationId = newConversation?.id;
      } else {
        conversationId = conversation.id;
      }

      // Store the messages
      await supabase.from('messages').insert([
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