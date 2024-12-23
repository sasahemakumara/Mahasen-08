import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import PlatformChats from "./pages/PlatformChats";
import ChatConversation from "./pages/ChatConversation";
import About from "./pages/About";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      networkMode: "always",
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (previously cacheTime)
    },
  },
});

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Check initial session
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        setIsAuthenticated(!!session);
      } catch (error) {
        console.error("Session check error:", error);
        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: "Please try logging in again.",
        });
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setIsAuthenticated(!!session);
      
      // If session is lost, clear QueryClient cache and show notification
      if (!session) {
        queryClient.clear();
        toast({
          variant: "destructive",
          title: "Session Expired",
          description: "Please log in again to continue.",
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [toast]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route
                path="/login"
                element={
                  isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
                }
              />
              <Route
                path="/signup"
                element={
                  isAuthenticated ? <Navigate to="/dashboard" replace /> : <Signup />
                }
              />
              <Route path="/about" element={<About />} />
              <Route
                path="/dashboard"
                element={
                  isAuthenticated ? (
                    <Dashboard />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />
              <Route
                path="/chats/:platform"
                element={
                  isAuthenticated ? (
                    <PlatformChats />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />
              <Route
                path="/chat/:id"
                element={
                  isAuthenticated ? (
                    <ChatConversation />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;