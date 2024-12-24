import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";

type Conversation = Database["public"]["Tables"]["conversations"]["Row"];
type Message = Database["public"]["Tables"]["messages"]["Row"];

export const useConversation = (id: string | undefined) => {
  const { toast } = useToast();

  const { data: conversation, refetch: refetchConversation } = useQuery({
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

  const updateAIEnabled = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!id) throw new Error("Conversation ID is required");

      const { error } = await supabase
        .from("conversations")
        .update({ ai_enabled: enabled })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      refetchConversation();
    },
    onError: (error) => {
      console.error("Error updating AI enabled state:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update AI Assistant state",
      });
    },
  });

  return {
    conversation,
    messages,
    refetchMessages,
    updateAIEnabled,
  };
};