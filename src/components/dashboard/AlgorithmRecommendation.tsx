import { Lightbulb, TrendingUp, AlertTriangle, Zap, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Recommendation {
  algorithm: string;
  score: number;
  reason: string;
}

interface AlgorithmRecommendationProps {
  recommendations: Recommendation[];
  ruleExplosionRisk: string;
  topPick: string;
  topReason: string;
  onSelectAlgorithm: (algo: string) => void;
  datasetProfile: {
    n_transactions?: number;
    n_unique_items?: number;
    density?: number;
    sparsity?: number;
    is_large?: boolean;
    is_sparse?: boolean;
    estimated_memory_mb?: number;
  } | null;
}

export function AlgorithmRecommendation({
  recommendations,
  ruleExplosionRisk,
  topPick,
  topReason,
  onSelectAlgorithm,
  datasetProfile,
}: AlgorithmRecommendationProps) {
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'text-destructive bg-destructive/10 border-destructive/30';
      case 'medium': return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
      default: return 'text-green-500 bg-green-500/10 border-green-500/30';
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'high': return <AlertTriangle className="w-4 h-4" />;
      case 'medium': return <AlertTriangle className="w-4 h-4" />;
      default: return <CheckCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Recommendation */}
      <div className="glass-card rounded-xl p-6 border-2 border-primary/30 bg-primary/5">
        <div className="flex items-start gap-4">
          <div className="feature-icon w-12 h-12 bg-primary/20">
            <Lightbulb className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-1">Recommended Algorithm</h3>
            <p className="text-2xl font-bold gradient-text mb-2 capitalize">{topPick.replace('-', ' ')}</p>
            <p className="text-sm text-muted-foreground mb-4">{topReason}</p>
            <Button 
              variant="hero" 
              size="sm" 
              onClick={() => onSelectAlgorithm(topPick)}
              className="gap-2"
            >
              <Zap className="w-4 h-4" />
              Use {topPick.replace('-', ' ')}
            </Button>
          </div>
        </div>
      </div>

      {/* Dataset Insights */}
      {datasetProfile && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-primary">{datasetProfile.n_transactions?.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Transactions</p>
          </div>
          <div className="glass-card rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-primary">{datasetProfile.n_unique_items?.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Unique Items</p>
          </div>
          <div className="glass-card rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-primary">{((datasetProfile.sparsity || 0) * 100).toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">Sparsity</p>
          </div>
          <div className="glass-card rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-primary">{datasetProfile.estimated_memory_mb?.toFixed(1)} MB</p>
            <p className="text-xs text-muted-foreground">Est. Memory</p>
          </div>
        </div>
      )}

      {/* Rule Explosion Warning */}
      <div className={`rounded-lg p-4 border flex items-center gap-3 ${getRiskColor(ruleExplosionRisk)}`}>
        {getRiskIcon(ruleExplosionRisk)}
        <div>
          <p className="font-medium text-sm">
            Rule Explosion Risk: <span className="capitalize">{ruleExplosionRisk}</span>
          </p>
          <p className="text-xs opacity-80">
            {ruleExplosionRisk === 'high' 
              ? 'Consider using closed/maximal algorithms or increasing min_support'
              : ruleExplosionRisk === 'medium'
              ? 'Monitor rule count and adjust thresholds if needed'
              : 'Dataset characteristics are favorable for mining'}
          </p>
        </div>
      </div>

      {/* All Recommendations */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground">All Algorithm Scores</h4>
        <div className="grid gap-2">
          {recommendations.slice(0, 5).map((rec, index) => (
            <button
              key={rec.algorithm}
              onClick={() => onSelectAlgorithm(rec.algorithm)}
              className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-left group"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                {index + 1}
              </div>
              <div className="flex-1">
                <p className="font-medium capitalize group-hover:text-primary transition-colors">
                  {rec.algorithm.replace('-', ' ')}
                </p>
                <p className="text-xs text-muted-foreground">{rec.reason}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${rec.score}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-10 text-right">{rec.score}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
