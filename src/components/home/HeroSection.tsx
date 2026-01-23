import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Upload, Shield, Zap, BarChart3 } from "lucide-react";

const badges = [
  "Multi-Algorithm Mining",
  "Real-time Processing",
  "Association Rules",
];

const features = [
  { icon: Shield, label: "Privacy First", desc: "Local processing" },
  { icon: Zap, label: "Lightning Fast", desc: "Optimized algorithms" },
  { icon: Upload, label: "Easy Upload", desc: "CSV & Excel support" },
  { icon: BarChart3, label: "Visual Results", desc: "Interactive charts" },
];

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute inset-0 bg-gradient-radial" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px]" />

      <div className="container relative z-10 py-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badges */}
          <div className="flex flex-wrap justify-center gap-2 mb-8 animate-fade-in">
            {badges.map((badge) => (
              <span key={badge} className="section-badge">
                {badge}
              </span>
            ))}
          </div>

          {/* Main heading */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight animate-fade-in" style={{ animationDelay: "0.1s" }}>
            The Most Advanced
            <br />
            <span className="gradient-text">Data Mining & Rule</span>
            <br />
            Discovery Platform
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            Discover hidden patterns with Apriori, FP-Growth, ECLAT, and more.
            Upload your data, choose algorithms, and extract actionable insights
            — all in one powerful, free platform.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <Button variant="hero" size="xl" asChild>
              <Link to="/dashboard">
                Go to Dashboard <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
            <Button variant="heroOutline" size="xl" asChild>
              <Link to="/docs">
                <Upload className="w-5 h-5" /> Upload Dataset
              </Link>
            </Button>
          </div>

          {/* Feature pills */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in" style={{ animationDelay: "0.4s" }}>
            {features.map((feature) => (
              <div
                key={feature.label}
                className="glass-card rounded-xl p-4 card-hover"
              >
                <feature.icon className="w-6 h-6 text-primary mb-2 mx-auto" />
                <p className="font-medium text-sm">{feature.label}</p>
                <p className="text-xs text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
