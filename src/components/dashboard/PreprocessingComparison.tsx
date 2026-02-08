import { ArrowRight, TrendingDown, TrendingUp, Minus, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface PreprocessingStats {
  transactions: number;
  unique_items: number;
  avg_items_per_transaction: number;
}

interface PreprocessingComparisonProps {
  beforeStats: PreprocessingStats | null;
  afterStats: PreprocessingStats | null;
  isVisible: boolean;
}

export function PreprocessingComparison({ 
  beforeStats, 
  afterStats, 
  isVisible 
}: PreprocessingComparisonProps) {
  if (!isVisible || !beforeStats || !afterStats) {
    return null;
  }

  const calculateChange = (before: number, after: number) => {
    if (before === 0) return 0;
    return ((after - before) / before) * 100;
  };

  const formatChange = (change: number) => {
    if (Math.abs(change) < 0.1) return "No change";
    const sign = change > 0 ? "+" : "";
    return `${sign}${change.toFixed(1)}%`;
  };

  const getChangeIcon = (change: number) => {
    if (Math.abs(change) < 0.1) return <Minus className="w-4 h-4 text-muted-foreground" />;
    if (change > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    return <TrendingDown className="w-4 h-4 text-amber-500" />;
  };

  const getChangeColor = (change: number, isReduction: boolean = false) => {
    if (Math.abs(change) < 0.1) return "text-muted-foreground";
    // For reductions (like removing noise), negative is good
    if (isReduction) {
      return change < 0 ? "text-green-500" : "text-amber-500";
    }
    return change > 0 ? "text-green-500" : "text-amber-500";
  };

  const transactionChange = calculateChange(beforeStats.transactions, afterStats.transactions);
  const itemChange = calculateChange(beforeStats.unique_items, afterStats.unique_items);
  const avgChange = calculateChange(beforeStats.avg_items_per_transaction, afterStats.avg_items_per_transaction);

  const metrics = [
    {
      label: "Transactions",
      before: beforeStats.transactions,
      after: afterStats.transactions,
      change: transactionChange,
      isReduction: true,
      description: "Total number of transactions in dataset"
    },
    {
      label: "Unique Items",
      before: beforeStats.unique_items,
      after: afterStats.unique_items,
      change: itemChange,
      isReduction: true,
      description: "Number of distinct items across all transactions"
    },
    {
      label: "Avg Items/Transaction",
      before: beforeStats.avg_items_per_transaction,
      after: afterStats.avg_items_per_transaction,
      change: avgChange,
      isReduction: false,
      format: (v: number) => v.toFixed(2),
      description: "Average basket size"
    }
  ];

  // Calculate data quality improvement
  const noiseReduction = Math.abs(Math.min(0, itemChange));
  const dataQualityScore = Math.min(100, 50 + noiseReduction * 2);

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <CheckCircle className="w-5 h-5 text-primary" />
          Preprocessing Results
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Data Quality Score */}
        <div className="p-3 rounded-lg bg-secondary/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Data Quality Score</span>
            <Badge variant={dataQualityScore > 70 ? "default" : "secondary"}>
              {dataQualityScore.toFixed(0)}%
            </Badge>
          </div>
          <Progress value={dataQualityScore} className="h-2" />
        </div>

        {/* Before/After Comparison Table */}
        <div className="space-y-3">
          {metrics.map((metric) => (
            <div 
              key={metric.label}
              className="flex items-center gap-2 p-2 rounded-lg bg-secondary/20"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground truncate">{metric.label}</p>
                <div className="flex items-center gap-2 mt-1">
                  {/* Before value */}
                  <span className="text-sm font-medium text-muted-foreground">
                    {metric.format ? metric.format(metric.before) : metric.before.toLocaleString()}
                  </span>
                  
                  <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  
                  {/* After value */}
                  <span className="text-sm font-bold">
                    {metric.format ? metric.format(metric.after) : metric.after.toLocaleString()}
                  </span>
                </div>
              </div>
              
              {/* Change indicator */}
              <div className={`flex items-center gap-1 text-xs ${getChangeColor(metric.change, metric.isReduction)}`}>
                {getChangeIcon(metric.change)}
                <span className="hidden sm:inline">{formatChange(metric.change)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border/50">
          {transactionChange < 0 && (
            <span className="text-green-500">
              Removed {Math.abs(beforeStats.transactions - afterStats.transactions).toLocaleString()} noisy transactions
            </span>
          )}
          {itemChange < 0 && transactionChange >= 0 && (
            <span className="text-green-500">
              Removed {Math.abs(beforeStats.unique_items - afterStats.unique_items)} rare/common items
            </span>
          )}
          {transactionChange >= 0 && itemChange >= 0 && (
            <span>Dataset ready for mining</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
