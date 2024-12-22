import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import type { Database } from "@/integrations/supabase/types";

type Message = Database["public"]["Tables"]["messages"]["Row"];
type Conversation = Database["public"]["Tables"]["conversations"]["Row"];

const ChatConversation = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [newMessage, setNewMessage] = useState("");

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

  const sendMessage = async () => {
    if (!newMessage.trim() || !id) return;

    const { error } = await supabase.from("messages").insert({
      conversation_id: id,
      content: newMessage,
      status: "sent",
      sender_name: "Agent",
      sender_number: "system",
    });

    if (!error) {
      setNewMessage("");
      refetchMessages();
    }
  };

  if (!id) {
    return <div>Invalid conversation ID</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative">
      <div className="fixed top-0 left-0 right-0 bg-white border-b p-4 z-10">
        <div className="max-w-4xl mx-auto flex items-center">
          <Button
            variant="ghost"
            className="mr-4"
            onClick={() => navigate(`/chats/${conversation?.platform}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-xl font-semibold">
            Chat with {conversation?.contact_name}
          </h1>
        </div>
      </div>

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
                    : ""
                }`}
              >
                <CardContent className="p-3">
                  <div className="text-sm font-medium mb-1">
                    {message.sender_name}
                  </div>
                  <div className="text-sm">{message.content}</div>
                  <div className="text-xs opacity-70 mt-1">
                    {new Date(message.created_at).toLocaleTimeString()}
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t bg-white p-4 z-10">
        <div className="max-w-4xl mx-auto flex gap-4">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <Button onClick={sendMessage}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatConversation;