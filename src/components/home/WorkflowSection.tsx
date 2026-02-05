import { Upload, Settings, Play, Download, Database, Cpu, BarChart, FileOutput } from "lucide-react";

const steps = [
  {
    step: "01",
    icon: Upload,
    title: "Upload Dataset",
    description: "Drop your CSV or Excel file. We automatically parse and validate the data structure.",
    color: "text-cyan-400",
  },
  {
    step: "02",
    icon: Settings,
    title: "Configure Parameters",
    description: "Set minimum support, confidence thresholds, and other algorithm-specific parameters.",
    color: "text-blue-400",
  },
  {
    step: "03",
    icon: Play,
    title: "Run Mining",
    description: "Execute your chosen algorithm. Watch real-time progress and performance metrics.",
    color: "text-emerald-400",
  },
  {
    step: "04",
    icon: Download,
    title: "Export Results",
    description: "Download discovered rules as CSV, JSON, or save directly to your database.",
    color: "text-amber-400",
  },
];

const components = [
  { icon: Database, label: "Data Preprocessing", desc: "Clean and transform raw data" },
  { icon: Cpu, label: "Algorithm Engine", desc: "Optimized mining implementations" },
  { icon: BarChart, label: "Analytics", desc: "Support & confidence metrics" },
  { icon: FileOutput, label: "Export Engine", desc: "Multiple output formats" },
];

export function WorkflowSection() {
  return (
    <section className="py-16 sm:py-24 bg-card/30 border-y border-border/50 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-radial opacity-50" />
      
      <div className="container relative z-10 px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-16">
          <span className="section-badge mb-3 sm:mb-4 text-xs sm:text-sm opacity-0 animate-fade-in">Simple Workflow</span>
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-3 sm:mb-4 opacity-0 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            How <span className="gradient-text">SmartMine</span> Works
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base opacity-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            Four simple steps to discover hidden patterns in your data using
            powerful mining algorithms.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-10 sm:mb-16">
          {steps.map((step, index) => (
            <div
              key={step.step}
              className="relative opacity-0 animate-slide-up"
              style={{ animationDelay: `${0.3 + index * 0.15}s` }}
            >
              <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 h-full card-hover hover-lift group">
                <span className={`text-xs sm:text-sm font-mono font-bold ${step.color} mb-3 sm:mb-4 block workflow-step`}>
                  Step {step.step}
                </span>
                <div className="feature-icon mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300 w-10 h-10 sm:w-12 sm:h-12">
                  <step.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold mb-1.5 sm:mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-xs sm:text-sm">{step.description}</p>
              </div>
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-0.5 bg-gradient-to-r from-border to-primary/30" />
              )}
            </div>
          ))}
        </div>

        {/* Core Components */}
        <div className="text-center mb-6 sm:mb-8">
          <h3 className="text-lg sm:text-xl font-semibold mb-1.5 sm:mb-2 opacity-0 animate-fade-in" style={{ animationDelay: "0.7s" }}>
            Core System Components
          </h3>
          <p className="text-muted-foreground text-xs sm:text-sm opacity-0 animate-fade-in" style={{ animationDelay: "0.8s" }}>
            Built with performance and reliability in mind
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {components.map((component, index) => (
            <div
              key={component.label}
              className="glass-card rounded-lg sm:rounded-xl p-3 sm:p-4 text-center card-hover hover-lift group opacity-0 animate-fade-in-scale"
              style={{ animationDelay: `${0.9 + index * 0.1}s` }}
            >
              <component.icon className="w-6 h-6 sm:w-8 sm:h-8 text-primary mx-auto mb-2 sm:mb-3 transition-all duration-300 group-hover:scale-110 group-hover:text-accent" />
              <p className="font-medium text-xs sm:text-sm mb-0.5 sm:mb-1">{component.label}</p>
              <p className="text-xs text-muted-foreground hidden sm:block">{component.desc}</p>
            </div>
          ))}
        </div>

        {/* Formula box */}
        <div className="mt-8 sm:mt-12 glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center glow-border hover-lift opacity-0 animate-fade-in" style={{ animationDelay: "1.3s" }}>
          <p className="text-xs sm:text-sm text-muted-foreground mb-1.5 sm:mb-2">CONFIDENCE FORMULA</p>
          <p className="font-mono text-sm sm:text-lg md:text-xl">
            <span className="text-primary">Confidence(A → B)</span> = Support(A ∪ B) / Support(A)
          </p>
          <p className="text-xs text-muted-foreground mt-1.5 sm:mt-2">
            Measures the reliability of the inference made by a rule
          </p>
        </div>
      </div>
    </section>
  );
}
