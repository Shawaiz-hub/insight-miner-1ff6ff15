import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Upload, Database } from "lucide-react";

export function CTASection() {
  return (
    <section className="py-24">
      <div className="container">
        <div className="relative glass-card rounded-3xl p-12 md:p-16 text-center overflow-hidden">
          {/* Background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-primary/20 rounded-full blur-[100px]" />
          
          <div className="relative z-10">
            <div className="feature-icon w-16 h-16 mx-auto mb-6">
              <Database className="w-8 h-8 text-primary" />
            </div>
            
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Ready to Mine Your Data?
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8">
              Start discovering hidden patterns and association rules in your datasets.
              Upload your data and run powerful mining algorithms — completely free.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="hero" size="xl" asChild>
                <Link to="/dashboard">
                  Go to Dashboard <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button variant="heroOutline" size="xl" asChild>
                <Link to="/dashboard">
                  <Upload className="w-5 h-5" /> Try Sample Dataset
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
