import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Platform = Database["public"]["Enums"]["platform_type"];

interface Conversation {
  id: string;
  contact_name: string;
  contact_number: string;
  updated_at: string;
  platform: Platform;
}

const PlatformChats = () => {
  const { platform } = useParams<{ platform: Platform }>();
  const navigate = useNavigate();

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["conversations", platform],
    queryFn: async () => {
      if (!platform) throw new Error("Platform is required");

      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("platform", platform)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data as Conversation[];
    },
    enabled: !!platform,
  });

  if (!platform) {
    return <div>Invalid platform specified</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            className="mr-4"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold capitalize">{platform} Chats</h1>
        </div>

        {isLoading ? (
          <div className="text-center py-8">Loading conversations...</div>
        ) : conversations?.length === 0 ? (
          <div className="text-center py-8">No conversations found</div>
        ) : (
          <div className="grid gap-4">
            {conversations?.map((conversation) => (
              <Card
                key={conversation.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/chat/${conversation.id}`)}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-semibold">
                    {conversation.contact_name}
                  </CardTitle>
                  <div className="text-sm text-muted-foreground">
                    {new Date(conversation.updated_at).toLocaleDateString()}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    {conversation.contact_number}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlatformChats;