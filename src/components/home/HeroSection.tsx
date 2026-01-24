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
      {/* Animated Background */}
      <div className="absolute inset-0 bg-animated-gradient" />
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="absolute inset-0 bg-gradient-radial" />
      
      {/* Floating Geometric Shapes */}
      <div className="absolute top-1/4 left-[10%] w-32 h-32 geometric-shape animate-float-slow" style={{ animationDelay: "0s" }} />
      <div className="absolute top-1/3 right-[15%] w-24 h-24 geometric-shape animate-float-slow" style={{ animationDelay: "-5s" }} />
      <div className="absolute bottom-1/4 left-[20%] w-20 h-20 geometric-shape animate-float-slow" style={{ animationDelay: "-10s" }} />
      <div className="absolute bottom-1/3 right-[10%] w-28 h-28 geometric-shape animate-float-slow rotate-45" style={{ animationDelay: "-3s" }} />
      <div className="absolute top-[60%] left-[5%] w-16 h-16 geometric-shape animate-float-slow rotate-12" style={{ animationDelay: "-7s" }} />
      
      {/* Glow Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: "-2s" }} />

      <div className="container relative z-10 py-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badges */}
          <div className="flex flex-wrap justify-center gap-2 mb-8 stagger-children">
            {badges.map((badge) => (
              <span key={badge} className="section-badge hover-scale">
                {badge}
              </span>
            ))}
          </div>

          {/* Main heading */}
          <h1 
            className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight opacity-0 animate-fade-in"
            style={{ animationDelay: "0.2s" }}
          >
            The Most Advanced
            <br />
            <span className="gradient-text">Data Mining & Rule</span>
            <br />
            Discovery Platform
          </h1>

          {/* Subtitle */}
          <p 
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 opacity-0 animate-fade-in"
            style={{ animationDelay: "0.4s" }}
          >
            Discover hidden patterns with Apriori, FP-Growth, ECLAT, and more.
            Upload your data, choose algorithms, and extract actionable insights
            — all in one powerful, free platform.
          </p>

          {/* CTA Buttons */}
          <div 
            className="flex flex-col sm:flex-row gap-4 justify-center mb-16 opacity-0 animate-fade-in"
            style={{ animationDelay: "0.5s" }}
          >
            <Button variant="hero" size="xl" asChild className="btn-glow group">
              <Link to="/dashboard">
                Go to Dashboard 
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button variant="heroOutline" size="xl" asChild className="hover-lift">
              <Link to="/docs">
                <Upload className="w-5 h-5" /> Upload Dataset
              </Link>
            </Button>
          </div>

          {/* Feature pills */}
          <div 
            className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger-children"
            style={{ animationDelay: "0.6s" }}
          >
            {features.map((feature) => (
              <div
                key={feature.label}
                className="glass-card rounded-xl p-4 card-hover hover-lift"
              >
                <feature.icon className="w-6 h-6 text-primary mb-2 mx-auto transition-transform duration-300 group-hover:scale-110" />
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
