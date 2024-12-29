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
          console.log('Generating embedding for question:', newMessage);
          const { data: questionEmbedding, error: embeddingError } = await supabase.functions.invoke(
            'generate-embedding',
            {
              body: { text: newMessage }
            }
          );

          if (embeddingError) {
            console.error('Question embedding error:', embeddingError);
            throw embeddingError;
          }

          console.log('Successfully generated question embedding:', questionEmbedding);

          // Search knowledge base with the question embedding
          console.log('Searching knowledge base with question embedding...');
          const { data: matches, error: searchError } = await supabase.rpc(
            'match_knowledge_base',
            {
              query_embedding: questionEmbedding.embedding,
              match_threshold: 0.5,
              match_count: 5
            }
          );

          if (searchError) {
            console.error('Knowledge base search error:', searchError);
            throw searchError;
          }

          console.log('Found knowledge base matches:', matches);

          // Prepare context from knowledge base matches
          if (matches && matches.length > 0) {
            context = `Here is the relevant information from our knowledge base:\n\n${matches
              .map((match, index) => `[Similarity: ${(match.similarity * 100).toFixed(2)}%]\n${match.content}\n`)
              .join('\n')}`;
            
            context += '\n\nPlease use this information to answer the following question. If the information provided is not relevant to the question, you may provide a general response.';
          } else {
            context = 'No relevant information found in the knowledge base. Please provide a general response.';
          }

          console.log('Prepared context:', context);
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

      console.log('Sending message with payload:', messagePayload);

      const { data, error: whatsappError } = await supabase.functions.invoke(
        'send-whatsapp',
        {
          body: messagePayload,
        }
      );

      if (whatsappError) {
        console.error('WhatsApp sending error:', whatsappError);
        throw whatsappError;
      }

      console.log('WhatsApp response:', data);

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