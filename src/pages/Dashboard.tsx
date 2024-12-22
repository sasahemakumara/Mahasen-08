import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Facebook, Instagram } from "lucide-react";
import { useNavigate } from "react-router-dom";

const platforms = [
  {
    id: "whatsapp",
    name: "WhatsApp",
    icon: MessageSquare,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: Facebook,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: Instagram,
    color: "text-pink-600",
    bgColor: "bg-pink-50",
    borderColor: "border-pink-200",
  },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

  const handlePlatformSelect = (platformId: string) => {
    setSelectedPlatform(platformId);
    navigate(`/chats/${platformId}`);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {platforms.map((platform) => (
            <Card
              key={platform.id}
              className={`p-6 cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${
                selectedPlatform === platform.id ? platform.borderColor : "border-transparent"
              }`}
              onClick={() => handlePlatformSelect(platform.id)}
            >
              <div className={`rounded-full w-12 h-12 ${platform.bgColor} ${platform.color} flex items-center justify-center mb-4`}>
                <platform.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{platform.name}</h3>
              <p className="text-slate-600 mb-4">Manage your {platform.name} conversations</p>
              <Button
                variant="ghost"
                className={`w-full justify-start ${platform.color}`}
                onClick={() => handlePlatformSelect(platform.id)}
              >
                View Chats
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;