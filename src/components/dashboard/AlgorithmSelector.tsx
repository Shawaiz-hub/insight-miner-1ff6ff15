import { useState, useEffect } from "react";
import { Layers, Network, Binary, Cpu, Workflow, Lock, Maximize, Check, GitBranch, Waves, Database, Lightbulb, Zap, AlertTriangle, TrendingUp, RefreshCw } from "lucide-react";
import { AlgorithmInfoIcon } from "./AlgorithmTooltip";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import type { DatasetInfo } from "@/pages/Dashboard";
import type { AlgorithmRecommendation, DatasetProfile } from "@/hooks/useMining";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AlgorithmSelectorProps {
  selected: string;
  onSelect: (algo: string) => void;
  dataset: DatasetInfo | null;
  recommendation?: AlgorithmRecommendation | null;
  datasetProfile?: DatasetProfile | null;
  onFetchRecommendation?: (minSupport?: number) => Promise<AlgorithmRecommendation | null>;
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
    id: "closet",
    name: "CLOSET",
    icon: Lock,
    description: "FP-tree based closed pattern mining for efficient compression.",
    complexity: "O(n log n)",
    bestFor: "Compact representation",
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

const familyDescriptions: Record<string, string> = {
  Classical: "Level-wise candidate generation algorithms",
  "FP-Tree": "Pattern-growth using tree structures",
  Vertical: "TID-list intersection based",
  Projected: "Database projection techniques",
  Stream: "Streaming/incremental data",
  Closed: "Lossless pattern compression",
  Maximal: "Minimal output representation",
  Extended: "Specialized mining extensions",
};

export function AlgorithmSelector({ selected, onSelect, dataset, recommendation, datasetProfile, onFetchRecommendation }: AlgorithmSelectorProps) {
  const [isLoadingRec, setIsLoadingRec] = useState(false);
  const [autoApplied, setAutoApplied] = useState(false);
  const [recMinSupport, setRecMinSupport] = useState(0.1);

  // Auto-fetch recommendation when component mounts with a dataset
  useEffect(() => {
    if (dataset && !recommendation && onFetchRecommendation && !isLoadingRec) {
      setIsLoadingRec(true);
      onFetchRecommendation(recMinSupport).finally(() => setIsLoadingRec(false));
    }
  }, [dataset, recommendation, onFetchRecommendation, isLoadingRec, recMinSupport]);

  const handleReRunRecommendation = async () => {
    if (!onFetchRecommendation || isLoadingRec) return;
    setIsLoadingRec(true);
    setAutoApplied(false);
    await onFetchRecommendation(recMinSupport);
    setIsLoadingRec(false);
  };

  // Auto-select recommended algorithm once
  useEffect(() => {
    if (recommendation?.top_pick && !autoApplied) {
      const normalizedPick = recommendation.top_pick.toLowerCase().replace(/[\s_]/g, '-');
      const matchingAlgo = algorithms.find(a => a.id === normalizedPick);
      if (matchingAlgo) {
        onSelect(matchingAlgo.id);
        setAutoApplied(true);
      }
    }
  }, [recommendation, autoApplied, onSelect]);

  const getRecScore = (algoId: string): number | null => {
    if (!recommendation?.recommendations) return null;
    const rec = recommendation.recommendations.find(
      r => r.algorithm.toLowerCase().replace(/[\s_]/g, '-') === algoId
    );
    return rec?.score ?? null;
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/30';
      case 'medium': return 'bg-amber-500/10 text-amber-500 border-amber-500/30';
      default: return 'bg-green-500/10 text-green-500 border-green-500/30';
    }
  };

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

      {/* Recommendation Banner */}
      {recommendation && (
        <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 sm:p-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="feature-icon w-10 h-10 sm:w-12 sm:h-12 bg-primary/20 flex-shrink-0">
              <Lightbulb className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base sm:text-lg font-semibold">AI Recommendation</h3>
                <Badge variant="secondary" className="text-[10px]">Auto-selected</Badge>
              </div>
              <p className="text-lg sm:text-2xl font-bold text-primary mb-1 capitalize">
                {recommendation.top_pick?.replace(/-/g, ' ')}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground mb-3">{recommendation.top_reason}</p>
              
              <div className="flex flex-wrap gap-2">
                {recommendation.rule_explosion_risk && (
                  <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs ${getRiskColor(recommendation.rule_explosion_risk)}`}>
                    <AlertTriangle className="w-3 h-3" />
                    Rule Explosion: <span className="capitalize font-medium">{recommendation.rule_explosion_risk}</span>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs h-7"
                  onClick={() => {
                    const normalizedPick = recommendation.top_pick?.toLowerCase().replace(/[\s_]/g, '-');
                    const matchingAlgo = algorithms.find(a => a.id === normalizedPick);
                    if (matchingAlgo) onSelect(matchingAlgo.id);
                  }}
                >
                  <Zap className="w-3 h-3" />
                  Use Recommended
                </Button>
              </div>

              {/* Min Support Slider for Re-running */}
              <div className="mt-4 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground font-medium">Adjust Min Support & Re-analyze</p>
                  <span className="text-xs font-mono text-primary">{(recMinSupport * 100).toFixed(0)}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <Slider
                    value={[recMinSupport * 100]}
                    onValueChange={([val]) => setRecMinSupport(val / 100)}
                    min={1}
                    max={50}
                    step={1}
                    className="flex-1"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-1.5 text-xs h-7 flex-shrink-0"
                    onClick={handleReRunRecommendation}
                    disabled={isLoadingRec}
                  >
                    {isLoadingRec ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3" />
                    )}
                    Re-analyze
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Score breakdown */}
          {recommendation.recommendations && recommendation.recommendations.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border/50">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Algorithm Scores</p>
              <div className="grid gap-1.5">
                {recommendation.recommendations.slice(0, 5).map((rec, idx) => (
                  <div key={rec.algorithm} className="flex items-center gap-3 text-xs">
                    <span className="w-4 text-center text-muted-foreground font-medium">{idx + 1}</span>
                    <span className="w-24 sm:w-28 capitalize truncate font-medium">{rec.algorithm.replace(/-/g, ' ')}</span>
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${rec.score}%` }} />
                    </div>
                    <span className="w-8 text-right text-muted-foreground">{rec.score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dataset Profile Quick Stats */}
          {datasetProfile && (
            <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="text-center">
                <p className="text-lg font-bold text-primary">{datasetProfile.n_transactions?.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">Transactions</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-primary">{datasetProfile.n_unique_items?.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">Unique Items</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-primary">{((datasetProfile.sparsity || 0) * 100).toFixed(1)}%</p>
                <p className="text-[10px] text-muted-foreground">Sparsity</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-primary">{datasetProfile.estimated_memory_mb?.toFixed(1)} MB</p>
                <p className="text-[10px] text-muted-foreground">Est. Memory</p>
              </div>
            </div>
          )}
        </div>
      )}

      {isLoadingRec && !recommendation && (
        <div className="flex items-center justify-center gap-3 p-4 rounded-xl bg-secondary/30 animate-pulse">
          <TrendingUp className="w-4 h-4 text-primary animate-bounce" />
          <p className="text-sm text-muted-foreground">Analyzing dataset for best algorithm...</p>
        </div>
      )}

      {/* Algorithm Families with Tooltips */}
      <TooltipProvider>
        <div className="flex flex-wrap gap-2 justify-center mb-4">
          {Object.entries(familyColors).map(([family]) => (
            <Tooltip key={family}>
              <TooltipTrigger asChild>
                <span
                  className="text-xs px-2 py-1 rounded-full bg-secondary/50 text-muted-foreground cursor-help hover:bg-secondary transition-colors"
                >
                  {family}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{familyDescriptions[family]}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {algorithms.map((algo) => {
          const score = getRecScore(algo.id);
          const isRecommended = recommendation?.top_pick?.toLowerCase().replace(/[\s_]/g, '-') === algo.id;

          return (
            <button
              key={algo.id}
              onClick={() => onSelect(algo.id)}
              className={`relative text-left p-4 sm:p-5 rounded-xl border transition-all card-hover ${
                selected === algo.id
                  ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                  : isRecommended
                  ? "border-primary/40 bg-primary/[0.02]"
                  : "border-border hover:border-primary/50"
              }`}
            >
              {/* Recommended badge */}
              {isRecommended && selected !== algo.id && (
                <div className="absolute -top-2 left-3 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-medium flex items-center gap-1">
                  <Lightbulb className="w-2.5 h-2.5" /> Recommended
                </div>
              )}

              {/* Selection indicator */}
              {selected === algo.id && (
                <div className="absolute top-2 right-2 sm:top-3 sm:right-3 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-3 h-3 sm:w-4 sm:h-4 text-primary-foreground" />
                </div>
              )}
              
              {/* Info tooltip icon */}
              <div className="absolute top-2 right-10 sm:top-3 sm:right-12">
                <AlgorithmInfoIcon algorithm={algo} />
              </div>
              
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
              
              {/* Score bar */}
              {score !== null && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary/70 rounded-full" style={{ width: `${score}%` }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{score}</span>
                </div>
              )}

              <p className="text-[10px] text-muted-foreground/70 mt-1">{algo.family}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
