import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Facebook, Instagram, FileText, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";

const platforms = [
  {
    id: "whatsapp",
    name: "WhatsApp",
    icon: MessageSquare,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/20",
    borderColor: "border-emerald-200 dark:border-emerald-800",
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: Facebook,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/20",
    borderColor: "border-blue-200 dark:border-blue-800",
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: Instagram,
    color: "text-pink-600",
    bgColor: "bg-pink-50 dark:bg-pink-950/20",
    borderColor: "border-pink-200 dark:border-pink-800",
  },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
      } else {
        setUserName(session.user.email?.split('@')[0] || "User");
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/login");
      } else {
        setUserName(session.user.email?.split('@')[0] || "User");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handlePlatformSelect = (platformId: string) => {
    setSelectedPlatform(platformId);
    navigate(`/chats/${platformId}`);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Mahasen AI</h1>
            <p className="text-slate-600 dark:text-slate-400">Welcome, {userName}</p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate("/knowledge-base")}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Manage Files
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/ai-settings")}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              AI Settings
            </Button>
            <ThemeToggle />
            <Button variant="outline" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {platforms.map((platform) => (
            <Card
              key={platform.id}
              className={`p-6 cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${
                selectedPlatform === platform.id ? platform.borderColor : "border-transparent"
              } dark:bg-slate-900`}
              onClick={() => handlePlatformSelect(platform.id)}
            >
              <div className={`rounded-full w-12 h-12 ${platform.bgColor} ${platform.color} flex items-center justify-center mb-4`}>
                <platform.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{platform.name}</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">Manage your {platform.name} conversations</p>
              <Button
                variant="ghost"
                className={`w-full justify-start ${platform.color}`}
                onClick={() => handlePlatformSelect(platform.id)}
              >
                View Chats
              </Button>
            </Card>
          ))}

          <Card className="p-6 cursor-pointer transition-all duration-200 hover:shadow-lg border-2 border-transparent dark:bg-slate-900">
            <div className="rounded-full w-12 h-12 bg-purple-50 dark:bg-purple-950/20 text-purple-600 flex items-center justify-center mb-4">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Knowledge Base</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Manage your uploaded files and documents
            </p>
            <Button
              variant="ghost"
              className="w-full justify-start text-purple-600"
              onClick={() => navigate("/knowledge-base")}
            >
              Manage Files
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;