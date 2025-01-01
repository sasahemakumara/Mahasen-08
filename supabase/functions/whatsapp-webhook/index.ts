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

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

      // Generate embedding for the user's message
      const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke(
        'generate-embedding',
        {
          body: { input: userMessage }
        }
      );

      if (embeddingError) {
        console.error('Error generating embedding:', embeddingError);
        throw embeddingError;
      }

      // Search knowledge base with hybrid search
      const { data: matches, error: searchError } = await supabase.rpc(
        'match_knowledge_base',
        {
          query_text: userMessage,
          query_embedding: embeddingData.embedding,
          match_count: 5,
          full_text_weight: 1.0,
          semantic_weight: 1.0,
          match_threshold: 0.5
        }
      );

      if (searchError) {
        console.error('Error searching knowledge base:', searchError);
        throw searchError;
      }

      // Format context from knowledge base matches
      let context = '';
      if (matches && matches.length > 0) {
        context = `Here is the relevant information from our knowledge base:\n\n${matches
          .map((match, index) => `[Source ${index + 1} - Similarity: ${(match.similarity * 100).toFixed(2)}%]\n${match.content}\n`)
          .join('\n')}`;
        
        context += '\n\nYou are the official Customer support AI assitant of Bellose. Please use this information to answer the following question. If the information provided is not relevant to the question, you may provide a Professional general response.';
      } else {
        context = 'No relevant information found in the knowledge base. Please provide a general response.';
      }

      // Get AI response using context from knowledge base
      const aiResponse = await getOllamaResponse(userMessage, context, OLLAMA_BASE_URL);
      console.log('AI Response:', aiResponse);
      
      // Send response back via WhatsApp
      await sendWhatsAppMessage(userId, aiResponse, WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_ID);

      // Store the conversation in Supabase
      await storeConversation(supabase, userId, userName, userMessage, aiResponse);

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