import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { WhatsAppMessage } from "@/types/chat";
import { useToast } from "@/hooks/use-toast";

export const useMessageSending = (
  id: string | undefined,
  contactNumber: string | undefined,
  refetchMessages: () => void,
  isAIEnabled: boolean
) => {
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const sendMessage = async (newMessage: string) => {
    if (!newMessage.trim() || !id || !contactNumber) return;
    
    setIsSending(true);
    try {
      // First, store the message in our database
      const { error: dbError } = await supabase.from("messages").insert({
        conversation_id: id,
        content: newMessage,
        status: "sent",
        sender_name: "Agent",
        sender_number: "system",
      });

      if (dbError) {
        console.error('Database error:', dbError);
        throw dbError;
      }

      let context = '';
      
      if (isAIEnabled) {
        try {
          // Generate embedding for the question
          const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke(
            'generate-embedding',
            {
              body: { input: newMessage }  // Changed from 'text' to 'input' to match Edge Function expectation
            }
          );

          if (embeddingError) {
            throw embeddingError;
          }

          if (!embeddingData?.embedding) {
            throw new Error('No embedding data received');
          }

          // Search knowledge base with hybrid search
          const { data: matches, error: searchError } = await supabase.rpc(
            'match_knowledge_base',
            {
              query_text: newMessage,
              query_embedding: embeddingData.embedding,
              match_count: 5,
              full_text_weight: 1.0,
              semantic_weight: 1.0,
              match_threshold: 0.5
            }
          );

          if (searchError) {
            throw searchError;
          }

          // Format context from knowledge base matches
          if (matches && matches.length > 0) {
            context = `Here is the relevant information from our knowledge base:\n\n${matches
              .map((match, index) => `[Source ${index + 1} - Similarity: ${(match.similarity * 100).toFixed(2)}%]\n${match.content}\n`)
              .join('\n')}`;
            
            context += '\n\nPlease use this information to answer the following question. If the information provided is not relevant to the question, you may provide a general response.';
          } else {
            context = 'No relevant information found in the knowledge base. Please provide a general response.';
          }
        } catch (error) {
          console.error('Error in RAG process:', error);
          context = 'Error accessing knowledge base. Providing general response.';
        }
      }

      // Send the message through WhatsApp using the Edge Function
      const messagePayload: WhatsAppMessage = {
        to: contactNumber,
        message: newMessage,
        type: "text",
        useAI: isAIEnabled,
        context: context
      };

      const { data, error: whatsappError } = await supabase.functions.invoke(
        'send-whatsapp',
        {
          body: messagePayload,
        }
      );

      if (whatsappError) {
        throw whatsappError;
      }

      refetchMessages();
      
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully.",
      });
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        variant: "destructive",
        title: "Error sending message",
        description: error instanceof Error ? error.message : "Please try again later.",
      });
    } finally {
      setIsSending(false);
    }
  };

  return {
    sendMessage,
    isSending,
  };
};