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

      // Send the message through WhatsApp using the Edge Function
      const messagePayload: WhatsAppMessage = {
        to: contactNumber,
        message: newMessage,
        type: "text",
        useAI: false // Always set to false since this is an agent message
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