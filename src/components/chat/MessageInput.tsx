import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";

interface MessageInputProps {
  newMessage: string;
  isSending: boolean;
  onMessageChange: (message: string) => void;
  onSendMessage: () => void;
}

export const MessageInput = ({
  newMessage,
  isSending,
  onMessageChange,
  onSendMessage,
}: MessageInputProps) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 border-t dark:border-slate-700 bg-white dark:bg-slate-800 p-4 z-10">
      <div className="max-w-4xl mx-auto flex gap-4">
        <Textarea
          value={newMessage}
          onChange={(e) => onMessageChange(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 dark:bg-slate-900 dark:text-white"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSendMessage();
            }
          }}
          disabled={isSending}
        />
        <Button onClick={onSendMessage} disabled={isSending}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};