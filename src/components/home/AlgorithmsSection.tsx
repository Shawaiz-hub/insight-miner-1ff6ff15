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
    <section className="py-24">
      <div className="container">
        <div className="text-center mb-16">
          <span className="section-badge mb-4">Powered by Research</span>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Seven Powerful Algorithms,{" "}
            <span className="gradient-text">One Platform</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            State-of-the-art algorithms designed for accuracy, efficiency, and
            actionable pattern discovery.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {algorithms.slice(0, 6).map((algo, index) => (
            <div
              key={algo.name}
              className="glass-card rounded-2xl p-6 card-hover animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{
                  background: `linear-gradient(135deg, ${algo.color.split(" ")[0].replace("from-", "")}, transparent)`,
                }}
              >
                <algo.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{algo.name}</h3>
              <p className="text-muted-foreground text-sm mb-4">
                {algo.description}
              </p>
              <ul className="space-y-2 mb-6">
                {algo.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <Check className="w-4 h-4 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button variant="outline" size="sm" asChild className="w-full">
                <Link to={algo.href}>
                  Try Now <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          ))}
        </div>

        {/* Featured algorithm card */}
        <div className="mt-8 glass-card rounded-2xl p-8 glow-border animate-fade-in" style={{ animationDelay: "0.6s" }}>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Maximize className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-2xl font-bold">{algorithms[6].name}</h3>
              </div>
              <p className="text-muted-foreground mb-4">
                {algorithms[6].description}
              </p>
              <div className="flex flex-wrap gap-2">
                {algorithms[6].features.map((feature) => (
                  <span
                    key={feature}
                    className="px-3 py-1 rounded-full bg-secondary text-sm"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
            <Button variant="hero" size="lg" asChild>
              <Link to={algorithms[6].href}>
                Use MaxMiner <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
