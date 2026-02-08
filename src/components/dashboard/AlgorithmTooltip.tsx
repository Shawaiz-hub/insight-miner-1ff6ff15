import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

interface AlgorithmTooltipProps {
  algorithm: {
    id: string;
    name: string;
    description: string;
    complexity: string;
    bestFor: string;
    type: string;
    family: string;
  };
  children: React.ReactNode;
}

// Detailed algorithm information for tooltips
const algorithmDetails: Record<string, {
  strengths: string[];
  weaknesses: string[];
  useCases: string[];
  technicalNote: string;
}> = {
  apriori: {
    strengths: [
      "Simple and easy to understand",
      "Works well with small datasets",
      "Good baseline for comparison"
    ],
    weaknesses: [
      "Slow with large datasets",
      "High memory usage for candidates",
      "Multiple database scans required"
    ],
    useCases: [
      "Educational purposes",
      "Small retail datasets (<10K transactions)",
      "When interpretability matters most"
    ],
    technicalNote: "Uses level-wise candidate generation with anti-monotone pruning."
  },
  "apriori-tid": {
    strengths: [
      "More memory efficient than Apriori",
      "Only needs TID-list intersections",
      "Better for dense datasets"
    ],
    weaknesses: [
      "Initial TID-list construction overhead",
      "Still slower than FP-Growth"
    ],
    useCases: [
      "Dense transaction datasets",
      "When memory is a concern",
      "Medium-sized datasets"
    ],
    technicalNote: "Replaces database scans with TID-list intersections for support counting."
  },
  fpgrowth: {
    strengths: [
      "No candidate generation needed",
      "Highly compressed data structure",
      "Only 2 database scans required"
    ],
    weaknesses: [
      "FP-tree construction overhead",
      "Less efficient for very dense data"
    ],
    useCases: [
      "Large sparse datasets",
      "E-commerce transaction mining",
      "Production systems"
    ],
    technicalNote: "Builds FP-tree and mines patterns through conditional pattern bases."
  },
  fpmax: {
    strengths: [
      "Finds only maximal patterns",
      "Reduces output size dramatically",
      "Efficient with look-ahead pruning"
    ],
    weaknesses: [
      "Loses support information for subsets",
      "Cannot derive all rules directly"
    ],
    useCases: [
      "When output size is a concern",
      "Finding pattern boundaries",
      "High-dimensional datasets"
    ],
    technicalNote: "Uses MFI-tree (Maximal Frequent Itemset tree) with superset checking."
  },
  eclat: {
    strengths: [
      "Fast TID-list intersections",
      "Natural depth-first exploration",
      "Simple implementation"
    ],
    weaknesses: [
      "Memory grows with itemset depth",
      "TID-lists can become large"
    ],
    useCases: [
      "Dense datasets",
      "When transactions have many items",
      "Medium to large datasets"
    ],
    technicalNote: "Uses vertical data format with TID-set intersections."
  },
  declat: {
    strengths: [
      "Much lower memory than ECLAT",
      "Diffsets shrink as patterns grow",
      "Efficient for deep patterns"
    ],
    weaknesses: [
      "Initial computation overhead",
      "Complex implementation"
    ],
    useCases: [
      "Very long transactions",
      "Memory-constrained environments",
      "Mining deep pattern hierarchies"
    ],
    technicalNote: "Stores difference sets instead of TID-sets for memory efficiency."
  },
  hmine: {
    strengths: [
      "Memory-efficient H-struct",
      "Adaptive to data characteristics",
      "Good for limited memory"
    ],
    weaknesses: [
      "More complex than FP-Growth",
      "May not be fastest on all data"
    ],
    useCases: [
      "Memory-constrained systems",
      "Embedded systems",
      "When memory is critical"
    ],
    technicalNote: "Uses hyperlinked projected database structure."
  },
  carma: {
    strengths: [
      "Works with streaming data",
      "Single-pass algorithm",
      "Handles incremental updates"
    ],
    weaknesses: [
      "Approximate results possible",
      "Support threshold needed upfront"
    ],
    useCases: [
      "Real-time transaction streams",
      "Dynamic datasets",
      "Online mining applications"
    ],
    technicalNote: "Continuous Association Rule Mining Algorithm for streaming environments."
  },
  charm: {
    strengths: [
      "Lossless pattern compression",
      "Much smaller output than frequent",
      "All frequent itemsets derivable"
    ],
    weaknesses: [
      "More complex closure checking",
      "Slightly slower than ECLAT"
    ],
    useCases: [
      "When storage is limited",
      "Reducing rule explosion",
      "When complete info needed"
    ],
    technicalNote: "Finds closed itemsets using TID-set equality checking."
  },
  closet: {
    strengths: [
      "FP-tree based efficiency",
      "Lossless compression",
      "Efficient for dense data"
    ],
    weaknesses: [
      "FP-tree construction overhead",
      "Memory for tree structure"
    ],
    useCases: [
      "Large dense datasets",
      "When storage is limited",
      "Compact pattern representation"
    ],
    technicalNote: "Uses FP-tree and database projection for closed pattern mining."
  },
  maxminer: {
    strengths: [
      "Minimal output size",
      "Efficient look-ahead pruning",
      "Finds pattern boundaries"
    ],
    weaknesses: [
      "Loses subset support information",
      "Cannot derive all rules"
    ],
    useCases: [
      "Finding core patterns",
      "Pattern boundary discovery",
      "When only maximal needed"
    ],
    technicalNote: "Uses dynamic reordering and superset pruning with look-ahead."
  },
  "fuzzy-apriori": {
    strengths: [
      "Handles quantitative data",
      "Degree of membership support",
      "Natural uncertainty handling"
    ],
    weaknesses: [
      "Fuzzy set definition needed",
      "Slower than binary algorithms"
    ],
    useCases: [
      "Quantitative transaction data",
      "When items have quantities",
      "Uncertainty in data"
    ],
    technicalNote: "Extends Apriori with fuzzy membership functions for quantitative items."
  }
};

export function AlgorithmTooltip({ algorithm, children }: AlgorithmTooltipProps) {
  const details = algorithmDetails[algorithm.id] || {
    strengths: ["Efficient pattern discovery"],
    weaknesses: ["See documentation for details"],
    useCases: ["General association rule mining"],
    technicalNote: algorithm.description
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent 
          side="right" 
          align="start"
          className="max-w-sm p-4 space-y-3"
        >
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <span className="font-bold text-primary">{algorithm.name}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
              {algorithm.family}
            </span>
          </div>
          
          <div>
            <p className="text-xs font-medium text-green-500 mb-1">✓ Strengths</p>
            <ul className="text-xs text-muted-foreground space-y-0.5">
              {details.strengths.map((s, i) => (
                <li key={i}>• {s}</li>
              ))}
            </ul>
          </div>
          
          <div>
            <p className="text-xs font-medium text-amber-500 mb-1">⚠ Considerations</p>
            <ul className="text-xs text-muted-foreground space-y-0.5">
              {details.weaknesses.map((w, i) => (
                <li key={i}>• {w}</li>
              ))}
            </ul>
          </div>
          
          <div>
            <p className="text-xs font-medium text-blue-500 mb-1">📊 Best For</p>
            <ul className="text-xs text-muted-foreground space-y-0.5">
              {details.useCases.map((u, i) => (
                <li key={i}>• {u}</li>
              ))}
            </ul>
          </div>
          
          <div className="pt-2 border-t border-border">
            <p className="text-[10px] text-muted-foreground italic">
              {details.technicalNote}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Simple info icon trigger for tooltips
export function AlgorithmInfoIcon({ algorithm }: { algorithm: AlgorithmTooltipProps["algorithm"] }) {
  return (
    <AlgorithmTooltip algorithm={algorithm}>
      <button 
        type="button"
        className="p-1 rounded-full hover:bg-secondary/50 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
      </button>
    </AlgorithmTooltip>
  );
}
