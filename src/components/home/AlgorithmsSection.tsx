import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Layers, Network, Binary, Cpu, Workflow, Lock, Maximize } from "lucide-react";

const algorithms = [
  {
    name: "Apriori",
    icon: Layers,
    description: "Classic level-wise algorithm for mining frequent itemsets using candidate generation and pruning.",
    features: ["Candidate generation", "Anti-monotone pruning", "Association rules"],
    color: "from-cyan-500/20 to-cyan-500/5",
    href: "/dashboard?algo=apriori",
  },
  {
    name: "FP-Growth",
    icon: Network,
    description: "Efficient pattern-growth algorithm using FP-tree structure without candidate generation.",
    features: ["FP-tree construction", "Pattern growth", "Memory efficient"],
    color: "from-violet-500/20 to-violet-500/5",
    href: "/dashboard?algo=fpgrowth",
  },
  {
    name: "ECLAT",
    icon: Binary,
    description: "Equivalence class transformation algorithm using vertical data format and set intersection.",
    features: ["Vertical TID-lists", "Depth-first search", "Fast intersection"],
    color: "from-emerald-500/20 to-emerald-500/5",
    href: "/dashboard?algo=eclat",
  },
  {
    name: "H-Mine",
    icon: Cpu,
    description: "Hyper-linked structure for projected database mining with dynamic adjustments.",
    features: ["H-struct format", "Dynamic links", "Projected mining"],
    color: "from-amber-500/20 to-amber-500/5",
    href: "/dashboard?algo=hmine",
  },
  {
    name: "CARMA",
    icon: Workflow,
    description: "Continuous association rule mining algorithm for streaming data environments.",
    features: ["Online mining", "Incremental updates", "Stream processing"],
    color: "from-rose-500/20 to-rose-500/5",
    href: "/dashboard?algo=carma",
  },
  {
    name: "CHARM",
    icon: Lock,
    description: "Mining closed frequent itemsets using vertical format and closure properties.",
    features: ["Closed itemsets", "Compact results", "Lossless compression"],
    color: "from-blue-500/20 to-blue-500/5",
    href: "/dashboard?algo=charm",
  },
  {
    name: "MaxMiner",
    icon: Maximize,
    description: "Efficient algorithm for discovering maximal frequent itemsets with look-ahead pruning.",
    features: ["Maximal patterns", "Look-ahead pruning", "Reduced output"],
    color: "from-purple-500/20 to-purple-500/5",
    href: "/dashboard?algo=maxminer",
  },
];

export function AlgorithmsSection() {
  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6">
      <div className="container">
        <div className="text-center mb-10 sm:mb-16">
          <span className="section-badge mb-3 sm:mb-4 text-xs sm:text-sm">Powered by Research</span>
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-3 sm:mb-4">
            Seven Powerful Algorithms,{" "}
            <span className="gradient-text">One Platform</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
            State-of-the-art algorithms designed for accuracy, efficiency, and
            actionable pattern discovery.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {algorithms.slice(0, 6).map((algo, index) => (
            <div
              key={algo.name}
              className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 card-hover animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4"
                style={{
                  background: `linear-gradient(135deg, ${algo.color.split(" ")[0].replace("from-", "")}, transparent)`,
                }}
              >
                <algo.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-1.5 sm:mb-2">{algo.name}</h3>
              <p className="text-muted-foreground text-xs sm:text-sm mb-3 sm:mb-4">
                {algo.description}
              </p>
              <ul className="space-y-1.5 sm:space-y-2 mb-4 sm:mb-6">
                {algo.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground"
                  >
                    <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button variant="outline" size="sm" asChild className="w-full text-xs sm:text-sm">
                <Link to={algo.href}>
                  Try Now <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </Link>
              </Button>
            </div>
          ))}
        </div>

        {/* Featured algorithm card */}
        <div className="mt-6 sm:mt-8 glass-card rounded-xl sm:rounded-2xl p-6 sm:p-8 glow-border animate-fade-in" style={{ animationDelay: "0.6s" }}>
          <div className="flex flex-col md:flex-row items-center gap-6 sm:gap-8">
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center gap-3 mb-3 sm:mb-4 justify-center md:justify-start">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Maximize className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold">{algorithms[6].name}</h3>
              </div>
              <p className="text-muted-foreground mb-3 sm:mb-4 text-sm sm:text-base">
                {algorithms[6].description}
              </p>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                {algorithms[6].features.map((feature) => (
                  <span
                    key={feature}
                    className="px-2 sm:px-3 py-1 rounded-full bg-secondary text-xs sm:text-sm"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
            <Button variant="hero" size="lg" asChild className="w-full md:w-auto">
              <Link to={algorithms[6].href}>
                Use MaxMiner <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
