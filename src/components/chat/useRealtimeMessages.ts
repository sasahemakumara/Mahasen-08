import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useRealtimeMessages = (
  id: string | undefined,
  refetchMessages: () => void
) => {
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
};