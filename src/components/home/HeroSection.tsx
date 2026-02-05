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
      
      {/* Floating Geometric Shapes - hidden on mobile for performance */}
      <div className="hidden md:block absolute top-1/4 left-[10%] w-24 lg:w-32 h-24 lg:h-32 geometric-shape animate-float-slow" style={{ animationDelay: "0s" }} />
      <div className="hidden md:block absolute top-1/3 right-[15%] w-20 lg:w-24 h-20 lg:h-24 geometric-shape animate-float-slow" style={{ animationDelay: "-5s" }} />
      <div className="hidden lg:block absolute bottom-1/4 left-[20%] w-20 h-20 geometric-shape animate-float-slow" style={{ animationDelay: "-10s" }} />
      <div className="hidden lg:block absolute bottom-1/3 right-[10%] w-28 h-28 geometric-shape animate-float-slow rotate-45" style={{ animationDelay: "-3s" }} />
      <div className="hidden xl:block absolute top-[60%] left-[5%] w-16 h-16 geometric-shape animate-float-slow rotate-12" style={{ animationDelay: "-7s" }} />
      
      {/* Glow Orbs - reduced size on mobile */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-primary/10 rounded-full blur-[80px] md:blur-[120px] animate-pulse-slow" />
      <div className="hidden sm:block absolute bottom-1/4 right-1/4 w-[200px] md:w-[400px] h-[200px] md:h-[400px] bg-accent/5 rounded-full blur-[60px] md:blur-[100px] animate-pulse-slow" style={{ animationDelay: "-2s" }} />

      <div className="container relative z-10 py-12 sm:py-16 md:py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badges */}
          <div className="flex flex-wrap justify-center gap-2 mb-6 sm:mb-8 stagger-children">
            {badges.map((badge) => (
              <span key={badge} className="section-badge hover-scale text-xs sm:text-sm">
                {badge}
              </span>
            ))}
          </div>

          {/* Main heading with gradient animation */}
          <h1 
            className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold mb-4 sm:mb-6 leading-tight opacity-0 animate-fade-in"
            style={{ animationDelay: "0.2s" }}
          >
            <span className="inline-block animate-fade-in" style={{ animationDelay: "0.1s" }}>The</span>{" "}
            <span className="inline-block animate-fade-in" style={{ animationDelay: "0.15s" }}>Most</span>{" "}
            <span className="inline-block animate-fade-in" style={{ animationDelay: "0.2s" }}>Advanced</span>
            <br />
            <span className="inline-block gradient-text animate-fade-in" style={{ animationDelay: "0.25s" }}>Data</span>{" "}
            <span className="inline-block gradient-text animate-fade-in" style={{ animationDelay: "0.3s" }}>Mining</span>{" "}
            <span className="inline-block gradient-text animate-fade-in" style={{ animationDelay: "0.35s" }}>&</span>{" "}
            <span className="inline-block gradient-text animate-fade-in" style={{ animationDelay: "0.4s" }}>Rule</span>
            <br />
            <span className="inline-block animate-fade-in" style={{ animationDelay: "0.45s" }}>Discovery</span>{" "}
            <span className="inline-block animate-fade-in" style={{ animationDelay: "0.5s" }}>Platform</span>
          </h1>

          {/* Subtitle with word-by-word animation */}
          <p 
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 opacity-0 animate-fade-in leading-relaxed"
            style={{ animationDelay: "0.4s" }}
          >
            <span className="inline-block animate-fade-in" style={{ animationDelay: "0.55s" }}>Discover</span>{" "}
            <span className="inline-block animate-fade-in" style={{ animationDelay: "0.57s" }}>hidden</span>{" "}
            <span className="inline-block animate-fade-in" style={{ animationDelay: "0.59s" }}>patterns</span>{" "}
            <span className="inline-block animate-fade-in" style={{ animationDelay: "0.61s" }}>with</span>{" "}
            <span className="inline-block animate-fade-in font-semibold text-primary" style={{ animationDelay: "0.63s" }}>Apriori,</span>{" "}
            <span className="inline-block animate-fade-in font-semibold text-primary" style={{ animationDelay: "0.65s" }}>FP-Growth,</span>{" "}
            <span className="inline-block animate-fade-in font-semibold text-primary" style={{ animationDelay: "0.67s" }}>ECLAT,</span>{" "}
            <span className="inline-block animate-fade-in" style={{ animationDelay: "0.69s" }}>and</span>{" "}
            <span className="inline-block animate-fade-in" style={{ animationDelay: "0.71s" }}>more.</span>{" "}
            <span className="inline-block animate-fade-in" style={{ animationDelay: "0.73s" }}>Upload</span>{" "}
            <span className="inline-block animate-fade-in" style={{ animationDelay: "0.75s" }}>your</span>{" "}
            <span className="inline-block animate-fade-in" style={{ animationDelay: "0.77s" }}>data,</span>{" "}
            <span className="inline-block animate-fade-in" style={{ animationDelay: "0.79s" }}>choose</span>{" "}
            <span className="inline-block animate-fade-in" style={{ animationDelay: "0.81s" }}>algorithms,</span>{" "}
            <span className="inline-block animate-fade-in" style={{ animationDelay: "0.83s" }}>and</span>{" "}
            <span className="inline-block animate-fade-in" style={{ animationDelay: "0.85s" }}>extract</span>{" "}
            <span className="inline-block animate-fade-in" style={{ animationDelay: "0.87s" }}>actionable</span>{" "}
            <span className="inline-block animate-fade-in" style={{ animationDelay: "0.89s" }}>insights</span>{" "}
            <span className="inline-block animate-fade-in" style={{ animationDelay: "0.91s" }}>—</span>{" "}
            <span className="inline-block animate-fade-in" style={{ animationDelay: "0.93s" }}>all</span>{" "}
            <span className="inline-block animate-fade-in" style={{ animationDelay: "0.95s" }}>in</span>{" "}
            <span className="inline-block animate-fade-in" style={{ animationDelay: "0.97s" }}>one</span>{" "}
            <span className="inline-block animate-fade-in font-semibold" style={{ animationDelay: "0.99s" }}>powerful,</span>{" "}
            <span className="inline-block animate-fade-in font-semibold text-primary" style={{ animationDelay: "1.01s" }}>free</span>{" "}
            <span className="inline-block animate-fade-in" style={{ animationDelay: "1.03s" }}>platform.</span>
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
              <Link to="/dashboard">
                <Upload className="w-5 h-5" /> Upload Dataset
              </Link>
            </Button>
          </div>

          {/* Feature pills */}
          <div 
            className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 stagger-children"
            style={{ animationDelay: "0.6s" }}
          >
            {features.map((feature, index) => (
              <div
                key={feature.label}
                className="glass-card rounded-lg sm:rounded-xl p-3 sm:p-4 card-hover hover-lift opacity-0 animate-fade-in"
                style={{ animationDelay: `${1.1 + index * 0.1}s` }}
              >
                <feature.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary mb-2 mx-auto transition-transform duration-300 group-hover:scale-110" />
                <p className="font-medium text-xs sm:text-sm">{feature.label}</p>
                <p className="text-xs text-muted-foreground hidden sm:block">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
