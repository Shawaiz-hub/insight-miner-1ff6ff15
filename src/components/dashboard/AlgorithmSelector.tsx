import { Layers, Network, Binary, Cpu, Workflow, Lock, Maximize, Check, GitBranch, Fingerprint, Waves, Sparkles, Database } from "lucide-react";
import type { DatasetInfo } from "@/pages/Dashboard";

interface AlgorithmSelectorProps {
  selected: string;
  onSelect: (algo: string) => void;
  dataset: DatasetInfo | null;
}

const algorithms = [
  // Classical Family
  {
    id: "apriori",
    name: "Apriori",
    icon: Layers,
    description: "Classic level-wise algorithm using candidate generation and anti-monotone pruning.",
    complexity: "O(2^n)",
    bestFor: "Small to medium datasets",
    type: "Frequent",
    family: "Classical",
  },
  {
    id: "apriori-tid",
    name: "Apriori-TID",
    icon: Database,
    description: "Apriori with TID-list optimization for memory-efficient support counting.",
    complexity: "O(n²)",
    bestFor: "Dense datasets",
    type: "Frequent",
    family: "Classical",
  },
  // FP-Tree Family
  {
    id: "fpgrowth",
    name: "FP-Growth",
    icon: Network,
    description: "Pattern-growth approach using compact FP-tree structure without candidate generation.",
    complexity: "O(n log n)",
    bestFor: "Large datasets",
    type: "Frequent",
    family: "FP-Tree",
  },
  {
    id: "fpmax",
    name: "FPMax",
    icon: Maximize,
    description: "FP-tree based maximal frequent itemset mining with look-ahead pruning.",
    complexity: "O(n log n)",
    bestFor: "Reducing output size",
    type: "Maximal",
    family: "FP-Tree",
  },
  // Vertical Format Family
  {
    id: "eclat",
    name: "ECLAT",
    icon: Binary,
    description: "Vertical data format with TID-list intersection for efficient pattern discovery.",
    complexity: "O(n²)",
    bestFor: "Dense datasets",
    type: "Frequent",
    family: "Vertical",
  },
  {
    id: "declat",
    name: "dEclat",
    icon: GitBranch,
    description: "ECLAT with diffset optimization for memory efficiency with deep patterns.",
    complexity: "O(n²)",
    bestFor: "Long transactions",
    type: "Frequent",
    family: "Vertical",
  },
  // Projected Database Family
  {
    id: "hmine",
    name: "H-Mine",
    icon: Cpu,
    description: "Hyper-linked structure mining for memory-constrained environments.",
    complexity: "O(n log n)",
    bestFor: "Limited memory",
    type: "Frequent",
    family: "Projected",
  },
  {
    id: "carma",
    name: "CARMA",
    icon: Workflow,
    description: "Continuous mining for streaming and incremental data environments.",
    complexity: "O(n)",
    bestFor: "Streaming data",
    type: "Frequent",
    family: "Stream",
  },
  // Closed/Maximal Family
  {
    id: "charm",
    name: "CHARM",
    icon: Lock,
    description: "Closed itemset mining for compact, lossless pattern representation.",
    complexity: "O(n²)",
    bestFor: "Reducing output size",
    type: "Closed",
    family: "Closed",
  },
  {
    id: "maxminer",
    name: "MaxMiner",
    icon: Maximize,
    description: "Maximal pattern discovery with look-ahead pruning for minimal output.",
    complexity: "O(n log n)",
    bestFor: "Finding boundaries",
    type: "Maximal",
    family: "Maximal",
  },
  // Extended Family
  {
    id: "fuzzy-apriori",
    name: "Fuzzy Apriori",
    icon: Waves,
    description: "Handles quantitative data with fuzzy membership functions.",
    complexity: "O(2^n)",
    bestFor: "Uncertain data",
    type: "Fuzzy",
    family: "Extended",
  },
];

const familyColors: Record<string, string> = {
  Classical: "from-blue-500/20 to-blue-500/5",
  "FP-Tree": "from-violet-500/20 to-violet-500/5",
  Vertical: "from-emerald-500/20 to-emerald-500/5",
  Projected: "from-amber-500/20 to-amber-500/5",
  Stream: "from-rose-500/20 to-rose-500/5",
  Closed: "from-cyan-500/20 to-cyan-500/5",
  Maximal: "from-purple-500/20 to-purple-500/5",
  Extended: "from-pink-500/20 to-pink-500/5",
};

export function AlgorithmSelector({ selected, onSelect, dataset }: AlgorithmSelectorProps) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-xl sm:text-2xl font-bold mb-2">Select Mining Algorithm</h2>
        <p className="text-muted-foreground text-sm sm:text-base">
          Choose the algorithm that best fits your dataset and requirements
        </p>
        {dataset && (
          <p className="text-xs sm:text-sm text-primary mt-2">
            Dataset: {dataset.name} ({dataset.rows} transactions)
          </p>
        )}
      </div>

      {/* Algorithm Families */}
      <div className="flex flex-wrap gap-2 justify-center mb-4">
        {Object.keys(familyColors).map((family) => (
          <span
            key={family}
            className="text-xs px-2 py-1 rounded-full bg-secondary/50 text-muted-foreground"
          >
            {family}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {algorithms.map((algo) => (
          <button
            key={algo.id}
            onClick={() => onSelect(algo.id)}
            className={`relative text-left p-4 sm:p-5 rounded-xl border transition-all card-hover ${
              selected === algo.id
                ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                : "border-border hover:border-primary/50"
            }`}
          >
            {selected === algo.id && (
              <div className="absolute top-2 right-2 sm:top-3 sm:right-3 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary flex items-center justify-center">
                <Check className="w-3 h-3 sm:w-4 sm:h-4 text-primary-foreground" />
              </div>
            )}
            
            <div 
              className={`feature-icon w-8 h-8 sm:w-10 sm:h-10 mb-2 sm:mb-3 bg-gradient-to-br ${familyColors[algo.family] || 'from-gray-500/20 to-gray-500/5'}`}
            >
              <algo.icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            
            <div className="flex items-center gap-2 mb-1 sm:mb-2 flex-wrap">
              <h3 className="font-semibold text-sm sm:text-base">{algo.name}</h3>
              <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                {algo.type}
              </span>
            </div>
            
            <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3 line-clamp-2">
              {algo.description}
            </p>
            
            <div className="flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground">
              <span>Complexity: {algo.complexity}</span>
            </div>
            <p className="text-[10px] sm:text-xs text-primary mt-1">{algo.bestFor}</p>
            <p className="text-[10px] text-muted-foreground/70 mt-1">{algo.family}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
