import { useNavigate } from "react-router-dom";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Session check error:", error);
        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: "Please try again.",
        });
      }
      if (session) {
        navigate("/dashboard");
      }
    };

    checkUser();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center">
            <Button
              variant="ghost"
              className="mr-2"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <CardTitle className="text-2xl font-bold">Welcome to Mahasen AI</CardTitle>
              <CardDescription>Sign in to access your support dashboard and manage your conversations</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#10b981',
                    brandAccent: '#059669',
                  },
                },
              },
            }}
            theme="light"
            providers={[]}
            redirectTo={`${window.location.origin}/dashboard`}
            onError={(error) => {
              console.error("Auth error:", error);
              toast({
                variant: "destructive",
                title: "Authentication Error",
                description: error.message,
              });
            }}
            view="sign_in"
            showLinks={false}
          />
        </CardContent>
        <CardFooter className="flex justify-center border-t pt-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Don't have an account?{" "}
            <Button variant="link" className="p-0 h-auto font-semibold" onClick={() => navigate("/signup")}>
              Create one here
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;