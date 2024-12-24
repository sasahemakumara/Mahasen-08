import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import type { WhatsAppMessage } from "@/types/chat";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { MessageInput } from "@/components/chat/MessageInput";

type Message = Database["public"]["Tables"]["messages"]["Row"];
type Conversation = Database["public"]["Tables"]["conversations"]["Row"];

const ChatConversation = () => {
  const { id } = useParams<{ id: string }>();
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isAIEnabled, setIsAIEnabled] = useState(true);
  const { toast } = useToast();

  const { data: conversation } = useQuery({
    queryKey: ["conversation", id],
    queryFn: async () => {
      if (!id) throw new Error("Conversation ID is required");

      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Conversation;
    },
    enabled: !!id,
  });

  const { data: messages, refetch: refetchMessages } = useQuery({
    queryKey: ["messages", id],
    queryFn: async () => {
      if (!id) throw new Error("Conversation ID is required");

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as Message[];
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (!id) return;

    console.log("Setting up real-time subscription for conversation:", id);

    const channel = supabase
      .channel(`messages:${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${id}`
        },
        (payload) => {
          console.log("Received real-time update:", payload);
          refetchMessages();
        }
      )
      .subscribe((status) => {
        console.log("Subscription status:", status);
      });

    return () => {
      console.log("Cleaning up subscription");
      channel.unsubscribe();
    };
  }, [id, refetchMessages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !id || !conversation) return;
    
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

      if (dbError) throw dbError;

      // Then, send the message through WhatsApp using the Edge Function
      const messagePayload: WhatsAppMessage = {
        to: conversation.contact_number,
        message: newMessage,
        type: "text",
        useAI: isAIEnabled,
      };

      const { error: whatsappError } = await supabase.functions.invoke(
        'send-whatsapp',
        {
          body: messagePayload,
        }
      );

      if (whatsappError) throw whatsappError;

      setNewMessage("");
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
        description: "Please try again later.",
      });
    } finally {
      setIsSending(false);
    }
  };

  if (!id) {
    return <div>Invalid conversation ID</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col relative">
      <ChatHeader
        contactName={conversation?.contact_name}
        platform={conversation?.platform}
        isAIEnabled={isAIEnabled}
        onAIToggle={setIsAIEnabled}
      />

      <div className="flex-1 overflow-y-auto p-4 mt-16 mb-24">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages?.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.status === "sent" ? "justify-end" : "justify-start"
              }`}
            >
              <Card
                className={`max-w-[80%] ${
                  message.status === "sent"
                    ? "bg-primary text-primary-foreground"
                    : "dark:bg-slate-800 dark:text-white"
                }`}
              >
                <CardContent className="p-3">
                  <div className="text-sm font-medium mb-1">
                    {message.sender_name}
                  </div>
                  <div className="text-sm whitespace-pre-line">
                    {message.content}
                  </div>
                  <div className="text-xs opacity-70 mt-1">
                    {new Date(message.created_at).toLocaleTimeString()}
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>

      <MessageInput
        newMessage={newMessage}
        isSending={isSending}
        onMessageChange={setNewMessage}
        onSendMessage={sendMessage}
      />
    </div>
  );
};

export default ChatConversation;