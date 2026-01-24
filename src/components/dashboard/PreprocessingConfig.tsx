import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Filter, Trash2, Check, RefreshCw } from "lucide-react";
import { useMining } from "@/hooks/useMining";
import type { DatasetInfo } from "@/pages/Dashboard";

interface PreprocessingConfigProps {
  dataset: DatasetInfo;
  stats: {
    transactions: number;
    unique_items: number;
    avg_items_per_transaction: number;
  } | null;
  onComplete: () => void;
}

export function PreprocessingConfig({ dataset, stats, onComplete }: PreprocessingConfigProps) {
  const [removeDuplicates, setRemoveDuplicates] = useState(false);
  const [minItems, setMinItems] = useState(1);
  const [maxItems, setMaxItems] = useState(20);
  const [excludeItems, setExcludeItems] = useState<string[]>([]);
  const [excludeInput, setExcludeInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { preprocessDataset, datasetStats } = useMining();

  const currentStats = datasetStats || stats;

  const handleAddExcludeItem = () => {
    if (excludeInput.trim() && !excludeItems.includes(excludeInput.trim())) {
      setExcludeItems([...excludeItems, excludeInput.trim()]);
      setExcludeInput("");
    }
  };

  const handleRemoveExcludeItem = (item: string) => {
    setExcludeItems(excludeItems.filter((i) => i !== item));
  };

  const handleApplyPreprocessing = async () => {
    setIsProcessing(true);
    
    const success = await preprocessDataset({
      removeDuplicates,
      minItems,
      maxItems,
      excludeItems: excludeItems.length > 0 ? excludeItems : undefined,
    });
    
    setIsProcessing(false);
    
    if (success) {
      // Show success, stats will be updated
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Data Preprocessing</h2>
        <p className="text-muted-foreground">
          Clean and filter your dataset before mining
        </p>
      </div>

      {/* Current Dataset Stats */}
      <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-secondary/30">
        <div className="text-center">
          <p className="text-2xl font-bold text-primary">
            {currentStats?.transactions || dataset.rows}
          </p>
          <p className="text-sm text-muted-foreground">Transactions</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-primary">
            {currentStats?.unique_items || dataset.columns}
          </p>
          <p className="text-sm text-muted-foreground">Unique Items</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-primary">
            {currentStats?.avg_items_per_transaction?.toFixed(1) || "—"}
          </p>
          <p className="text-sm text-muted-foreground">Avg Items/Transaction</p>
        </div>
      </div>

      {/* Preprocessing Options */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Remove Duplicates */}
        <div className="space-y-4 p-4 rounded-xl border border-border">
          <div className="flex items-center gap-3">
            <Checkbox
              id="remove-duplicates"
              checked={removeDuplicates}
              onCheckedChange={(checked) => setRemoveDuplicates(checked as boolean)}
            />
            <Label htmlFor="remove-duplicates" className="cursor-pointer">
              <p className="font-medium">Remove Duplicate Transactions</p>
              <p className="text-sm text-muted-foreground">
                Eliminate identical transactions from the dataset
              </p>
            </Label>
          </div>
        </div>

        {/* Filter by Transaction Size */}
        <div className="space-y-4 p-4 rounded-xl border border-border">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-primary" />
            <p className="font-medium">Filter by Transaction Size</p>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Minimum Items</span>
                <span className="font-medium">{minItems}</span>
              </div>
              <Slider
                value={[minItems]}
                onValueChange={([val]) => setMinItems(val)}
                min={1}
                max={10}
                step={1}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Maximum Items</span>
                <span className="font-medium">{maxItems}</span>
              </div>
              <Slider
                value={[maxItems]}
                onValueChange={([val]) => setMaxItems(val)}
                min={5}
                max={50}
                step={1}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Exclude Items */}
      <div className="space-y-4 p-4 rounded-xl border border-border">
        <div className="flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-primary" />
          <p className="font-medium">Exclude Specific Items</p>
        </div>
        <p className="text-sm text-muted-foreground">
          Remove specific items from all transactions before mining
        </p>
        
        <div className="flex gap-2">
          <Input
            placeholder="Enter item name..."
            value={excludeInput}
            onChange={(e) => setExcludeInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddExcludeItem()}
          />
          <Button variant="secondary" onClick={handleAddExcludeItem}>
            Add
          </Button>
        </div>
        
        {excludeItems.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {excludeItems.map((item) => (
              <Badge
                key={item}
                variant="secondary"
                className="flex items-center gap-1 cursor-pointer hover:bg-destructive/20"
                onClick={() => handleRemoveExcludeItem(item)}
              >
                {item}
                <span className="text-destructive">×</span>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleApplyPreprocessing}
          disabled={isProcessing}
          className="gap-2"
        >
          {isProcessing ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Apply Preprocessing
        </Button>
        
        <Button variant="hero" onClick={onComplete} className="gap-2">
          <Check className="w-4 h-4" />
          Continue to Algorithm Selection
        </Button>
      </div>
    </div>
  );
}
