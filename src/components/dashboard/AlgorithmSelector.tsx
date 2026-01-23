import { Layers, Network, Binary, Cpu, Workflow, Lock, Maximize, Check } from "lucide-react";
import type { DatasetInfo } from "@/pages/Dashboard";

interface AlgorithmSelectorProps {
  selected: string;
  onSelect: (algo: string) => void;
  dataset: DatasetInfo | null;
}

const algorithms = [
  {
    id: "apriori",
    name: "Apriori",
    icon: Layers,
    description: "Classic level-wise algorithm using candidate generation and anti-monotone pruning.",
    complexity: "O(2^n)",
    bestFor: "Small to medium datasets",
    type: "Frequent",
  },
  {
    id: "fpgrowth",
    name: "FP-Growth",
    icon: Network,
    description: "Pattern-growth approach using compact FP-tree structure without candidate generation.",
    complexity: "O(n log n)",
    bestFor: "Large datasets",
    type: "Frequent",
  },
  {
    id: "eclat",
    name: "ECLAT",
    icon: Binary,
    description: "Vertical data format with TID-list intersection for efficient pattern discovery.",
    complexity: "O(n²)",
    bestFor: "Dense datasets",
    type: "Frequent",
  },
  {
    id: "hmine",
    name: "H-Mine",
    icon: Cpu,
    description: "Hyper-linked structure mining for memory-constrained environments.",
    complexity: "O(n log n)",
    bestFor: "Limited memory",
    type: "Frequent",
  },
  {
    id: "carma",
    name: "CARMA",
    icon: Workflow,
    description: "Continuous mining for streaming and incremental data environments.",
    complexity: "O(n)",
    bestFor: "Streaming data",
    type: "Frequent",
  },
  {
    id: "charm",
    name: "CHARM",
    icon: Lock,
    description: "Closed itemset mining for compact, lossless pattern representation.",
    complexity: "O(n²)",
    bestFor: "Reducing output size",
    type: "Closed",
  },
  {
    id: "maxminer",
    name: "MaxMiner",
    icon: Maximize,
    description: "Maximal pattern discovery with look-ahead pruning for minimal output.",
    complexity: "O(n log n)",
    bestFor: "Finding boundaries",
    type: "Maximal",
  },
];

export function AlgorithmSelector({ selected, onSelect, dataset }: AlgorithmSelectorProps) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Select Mining Algorithm</h2>
        <p className="text-muted-foreground">
          Choose the algorithm that best fits your dataset and requirements
        </p>
        {dataset && (
          <p className="text-sm text-primary mt-2">
            Dataset: {dataset.name} ({dataset.rows} transactions)
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {algorithms.map((algo) => (
          <button
            key={algo.id}
            onClick={() => onSelect(algo.id)}
            className={`relative text-left p-5 rounded-xl border transition-all card-hover ${
              selected === algo.id
                ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                : "border-border hover:border-primary/50"
            }`}
          >
            {selected === algo.id && (
              <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <Check className="w-4 h-4 text-primary-foreground" />
              </div>
            )}
            
            <div className="feature-icon w-10 h-10 mb-3">
              <algo.icon className="w-5 h-5 text-primary" />
            </div>
            
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold">{algo.name}</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                {algo.type}
              </span>
            </div>
            
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {algo.description}
            </p>
            
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Complexity: {algo.complexity}</span>
            </div>
            <p className="text-xs text-primary mt-1">{algo.bestFor}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
