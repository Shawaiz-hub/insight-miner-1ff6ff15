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
    color: "text-violet-400",
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
    <section className="py-24 bg-card/30 border-y border-border/50">
      <div className="container">
        <div className="text-center mb-16">
          <span className="section-badge mb-4">Simple Workflow</span>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            How <span className="gradient-text">SmartMine</span> Works
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Four simple steps to discover hidden patterns in your data using
            powerful mining algorithms.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {steps.map((step, index) => (
            <div
              key={step.step}
              className="relative animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="glass-card rounded-2xl p-6 h-full card-hover">
                <span className={`text-sm font-mono font-bold ${step.color} mb-4 block`}>
                  Step {step.step}
                </span>
                <div className="feature-icon mb-4">
                  <step.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.description}</p>
              </div>
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-0.5 bg-border" />
              )}
            </div>
          ))}
        </div>

        {/* Core Components */}
        <div className="text-center mb-8">
          <h3 className="text-xl font-semibold mb-2">Core System Components</h3>
          <p className="text-muted-foreground text-sm">
            Built with performance and reliability in mind
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {components.map((component, index) => (
            <div
              key={component.label}
              className="glass-card rounded-xl p-4 text-center card-hover animate-fade-in"
              style={{ animationDelay: `${0.4 + index * 0.1}s` }}
            >
              <component.icon className="w-8 h-8 text-primary mx-auto mb-3" />
              <p className="font-medium text-sm mb-1">{component.label}</p>
              <p className="text-xs text-muted-foreground">{component.desc}</p>
            </div>
          ))}
        </div>

        {/* Formula box */}
        <div className="mt-12 glass-card rounded-2xl p-6 text-center glow-border">
          <p className="text-sm text-muted-foreground mb-2">CONFIDENCE FORMULA</p>
          <p className="font-mono text-lg md:text-xl">
            <span className="text-primary">Confidence(A → B)</span> = Support(A ∪ B) / Support(A)
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Measures the reliability of the inference made by a rule
          </p>
        </div>
      </div>
    </section>
  );
}
