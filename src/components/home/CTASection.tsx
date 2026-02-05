import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Upload, Database } from "lucide-react";

export function CTASection() {
  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6">
      <div className="container">
        <div className="relative glass-card rounded-2xl sm:rounded-3xl p-8 sm:p-12 md:p-16 text-center overflow-hidden">
          {/* Background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[250px] sm:w-[400px] h-[250px] sm:h-[400px] bg-primary/20 rounded-full blur-[60px] sm:blur-[100px]" />
          
          <div className="relative z-10">
            <div className="feature-icon w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-6">
              <Database className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
            
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-3 sm:mb-4">
              Ready to Mine Your Data?
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-6 sm:mb-8 text-sm sm:text-base">
              Start discovering hidden patterns and association rules in your datasets.
              Upload your data and run powerful mining algorithms — completely free.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Button variant="hero" size="lg" asChild className="w-full sm:w-auto">
                <Link to="/dashboard">
                  Go to Dashboard <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </Link>
              </Button>
              <Button variant="heroOutline" size="lg" asChild className="w-full sm:w-auto">
                <Link to="/dashboard">
                  <Upload className="w-4 h-4 sm:w-5 sm:h-5" /> Try Sample Dataset
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
