import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useNavigate } from "react-router-dom";
import { Mail, Facebook, Linkedin, ArrowLeft } from "lucide-react";

const About = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 w-full bg-background/80 backdrop-blur-sm border-b z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <span className="text-xl font-semibold">Mahasen AI</span>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-16">
            {/* About Mahasen AI */}
            <section className="space-y-4">
              <h1 className="text-4xl font-bold text-foreground">About Mahasen AI</h1>
              <p className="text-lg text-muted-foreground">
                Mahasen AI is an intelligent customer support software that revolutionizes how businesses interact with their customers.
              </p>
            </section>

            {/* About Company */}
            <section className="space-y-6">
              <h2 className="text-3xl font-semibold text-foreground">Our Company</h2>
              <div className="prose prose-slate dark:prose-invert max-w-none">
                <p className="text-lg text-muted-foreground">
                  Aventis is a forward thinking company dedicated to creating innovative products that prioritize the betterment of humanity. With a deep commitment to social impact of our technologies, we design solutions that not only meet the needs of today but also help build a brighter, more sustainable future.
                </p>
                <p className="text-lg text-muted-foreground">
                  At Aventis, we put humanity first, ensuring that every product we develop serves to improve lives, enhance well-being, and foster positive change for generations to come.
                </p>
                <div className="mt-6">
                  <p className="text-xl font-medium text-foreground italic">
                    "Driven by Innovation, Guided by Humanity"
                  </p>
                </div>
              </div>
            </section>

            {/* Connect with Us */}
            <section className="space-y-6">
              <h2 className="text-3xl font-semibold text-foreground">Connect with Us</h2>
              <div className="space-y-4">
                <a
                  href="mailto:aventis.global.company@gmail.com"
                  className="flex items-center space-x-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Mail className="h-5 w-5" />
                  <span>aventis.global.company@gmail.com</span>
                </a>
                <a
                  href="https://web.facebook.com/aventis.global/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Facebook className="h-5 w-5" />
                  <span>Facebook</span>
                </a>
                <a
                  href="https://www.linkedin.com/company/aventis-global"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Linkedin className="h-5 w-5" />
                  <span>LinkedIn</span>
                </a>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default About;
