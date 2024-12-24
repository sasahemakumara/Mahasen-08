import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { MessageInput } from "@/components/chat/MessageInput";
import { useConversation } from "@/components/chat/useConversation";
import { useMessageSending } from "@/components/chat/useMessageSending";
import { useRealtimeMessages } from "@/components/chat/useRealtimeMessages";

const ChatConversation = () => {
  const { id } = useParams<{ id: string }>();
  const [newMessage, setNewMessage] = useState("");
  const [isAIEnabled, setIsAIEnabled] = useState(true);

  const { conversation, messages, refetchMessages, updateAIEnabled } = useConversation(id);
  const { sendMessage, isSending } = useMessageSending(
    id,
    conversation?.contact_number,
    refetchMessages,
    isAIEnabled
  );

  // Set up realtime subscription
  useRealtimeMessages(id, refetchMessages);

  // Initialize AI state from conversation data
  useEffect(() => {
    if (conversation?.ai_enabled !== undefined) {
      console.log('Setting AI enabled state from conversation:', conversation.ai_enabled);
      setIsAIEnabled(conversation.ai_enabled);
    }
  }, [conversation?.ai_enabled]);

  const handleAIToggle = async (enabled: boolean) => {
    console.log('Toggling AI state to:', enabled);
    setIsAIEnabled(enabled);
    updateAIEnabled.mutate(enabled);
  };

  const handleSendMessage = async () => {
    await sendMessage(newMessage);
    setNewMessage("");
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
        onAIToggle={handleAIToggle}
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
        onSendMessage={handleSendMessage}
      />
    </div>
  );
};

export default ChatConversation;