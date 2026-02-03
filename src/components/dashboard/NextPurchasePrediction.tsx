import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Search, TrendingUp, Sparkles, AlertCircle } from "lucide-react";
import type { AssociationRule } from "@/pages/Dashboard";

interface PredictionResult {
  recommendation: string;
  confidence: number;
  lift: number;
  antecedent: string[];
}

interface NextPurchasePredictionProps {
  rules: AssociationRule[];
}

export function NextPurchasePrediction({ rules }: NextPurchasePredictionProps) {
  const [inputItem, setInputItem] = useState("");
  const [predictions, setPredictions] = useState<PredictionResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePredict = useCallback(() => {
    if (!inputItem.trim()) {
      setError("Please enter an item name");
      return;
    }

    setIsSearching(true);
    setError(null);
    setHasSearched(true);

    // Simulate slight delay for animation effect
    setTimeout(() => {
      const searchTerm = inputItem.trim().toLowerCase();
      
      // Filter rules where antecedent contains the input item
      const matchingRules = rules.filter(rule => 
        rule.antecedent.some(item => 
          item.toLowerCase().includes(searchTerm) || 
          searchTerm.includes(item.toLowerCase())
        )
      );

      // Sort by confidence (descending) and extract unique recommendations
      const sortedRules = [...matchingRules].sort((a, b) => b.confidence - a.confidence);
      
      // Create unique recommendations
      const seenRecommendations = new Set<string>();
      const uniquePredictions: PredictionResult[] = [];

      for (const rule of sortedRules) {
        for (const consequent of rule.consequent) {
          if (!seenRecommendations.has(consequent.toLowerCase())) {
            seenRecommendations.add(consequent.toLowerCase());
            uniquePredictions.push({
              recommendation: consequent,
              confidence: rule.confidence,
              lift: rule.lift,
              antecedent: rule.antecedent,
            });
          }
        }
        if (uniquePredictions.length >= 10) break; // Limit to top 10
      }

      setPredictions(uniquePredictions);
      setIsSearching(false);
    }, 300);
  }, [inputItem, rules]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handlePredict();
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    if (confidence >= 0.6) return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    return "bg-muted text-muted-foreground";
  };

  const getLiftBadge = (lift: number) => {
    if (lift >= 1.5) return { label: "Strong", className: "bg-emerald-500/20 text-emerald-400" };
    if (lift >= 1.2) return { label: "Moderate", className: "bg-amber-500/20 text-amber-400" };
    return { label: "Weak", className: "bg-muted text-muted-foreground" };
  };

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShoppingCart className="w-5 h-5 text-primary" />
          What Will the Customer Buy Next?
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Enter an item to predict related purchases based on discovered association rules
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Enter item name (e.g., Milk, Bread)"
              value={inputItem}
              onChange={(e) => setInputItem(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-10 bg-background/50"
            />
          </div>
          <Button 
            onClick={handlePredict} 
            disabled={isSearching}
            className="gap-2"
          >
            {isSearching ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Predict Next Item
              </>
            )}
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Results */}
        {hasSearched && !isSearching && (
          <div className="space-y-3 animate-fade-in">
            {predictions.length > 0 ? (
              <>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Found {predictions.length} recommendation{predictions.length !== 1 ? "s" : ""} based on "{inputItem}"
                </div>
                
                <div className="grid gap-2">
                  {predictions.map((pred, index) => {
                    const liftInfo = getLiftBadge(pred.lift);
                    return (
                      <div
                        key={`${pred.recommendation}-${index}`}
                        className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50 transition-all duration-300 hover:border-primary/30 hover:bg-background/80 animate-fade-in-scale"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{pred.recommendation}</p>
                            <p className="text-xs text-muted-foreground">
                              Based on: {pred.antecedent.join(", ")}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={getConfidenceColor(pred.confidence)}
                          >
                            {(pred.confidence * 100).toFixed(0)}% confident
                          </Badge>
                          <Badge 
                            variant="outline"
                            className={liftInfo.className}
                          >
                            Lift: {pred.lift.toFixed(2)}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-center py-6 text-muted-foreground animate-fade-in">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No recommendations found for "{inputItem}"</p>
                <p className="text-sm">Try a different item name or check your spelling</p>
              </div>
            )}
          </div>
        )}

        {/* Initial state hint */}
        {!hasSearched && (
          <div className="text-center py-6 text-muted-foreground">
            <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Enter an item to see what customers typically buy next</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
