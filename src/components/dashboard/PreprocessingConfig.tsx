import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Filter, Trash2, Check, RefreshCw, Percent, Type, AlertTriangle } from "lucide-react";
import { useMining } from "@/hooks/useMining";
import { DatasetPreview } from "./DatasetPreview";
import type { DatasetInfo } from "@/pages/Dashboard";

interface PreprocessingConfigProps {
  dataset: DatasetInfo;
  stats: {
    transactions: number;
    unique_items: number;
    avg_items_per_transaction: number;
    top_items?: Array<{ item: string; count: number }>;
  } | null;
  onComplete: () => void;
}

export function PreprocessingConfig({ dataset, stats, onComplete }: PreprocessingConfigProps) {
  const [removeDuplicates, setRemoveDuplicates] = useState(false);
  const [removeNulls, setRemoveNulls] = useState(true);
  const [lowercase, setLowercase] = useState(false);
  const [minItems, setMinItems] = useState(1);
  const [maxItems, setMaxItems] = useState(50);
  const [minItemFrequency, setMinItemFrequency] = useState(0);
  const [excludeItems, setExcludeItems] = useState<string[]>([]);
  const [excludeInput, setExcludeInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  
  const { preprocessDataset, getDatasetInfo, datasetStats, datasetProfile } = useMining();

  const currentStats = datasetStats || stats;

  // Fetch dataset info with top items on mount
  useEffect(() => {
    getDatasetInfo();
  }, [getDatasetInfo]);

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
      removeNulls,
      lowercase,
      minItems,
      maxItems,
      minItemFrequency: minItemFrequency / 100,
      excludeItems: excludeItems.length > 0 ? excludeItems : undefined,
    });
    
    setIsProcessing(false);
    
    if (success) {
      // Refresh dataset info after preprocessing
      await getDatasetInfo();
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

      {/* Toggle Preview */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
        <div>
          <p className="font-medium">Dataset Preview</p>
          <p className="text-sm text-muted-foreground">Show visual analysis of your data</p>
        </div>
        <Switch checked={showPreview} onCheckedChange={setShowPreview} />
      </div>

      {/* Dataset Preview Panel */}
      {showPreview && (
        <DatasetPreview 
          stats={currentStats ? { ...currentStats, top_items: (currentStats as typeof currentStats & { top_items?: Array<{ item: string; count: number }> })?.top_items } : null} 
          profile={datasetProfile} 
        />
      )}

      {/* Preprocessing Options */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Basic Cleaning */}
        <div className="space-y-4 p-4 rounded-xl border border-border">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-primary" />
            <p className="font-medium">Data Cleaning</p>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox
                id="remove-duplicates"
                checked={removeDuplicates}
                onCheckedChange={(checked) => setRemoveDuplicates(checked as boolean)}
              />
              <Label htmlFor="remove-duplicates" className="cursor-pointer text-sm">
                Remove duplicate transactions
              </Label>
            </div>
            
            <div className="flex items-center gap-3">
              <Checkbox
                id="remove-nulls"
                checked={removeNulls}
                onCheckedChange={(checked) => setRemoveNulls(checked as boolean)}
              />
              <Label htmlFor="remove-nulls" className="cursor-pointer text-sm">
                Remove null/empty values
              </Label>
            </div>
            
            <div className="flex items-center gap-3">
              <Checkbox
                id="lowercase"
                checked={lowercase}
                onCheckedChange={(checked) => setLowercase(checked as boolean)}
              />
              <Label htmlFor="lowercase" className="cursor-pointer text-sm flex items-center gap-2">
                <Type className="w-3 h-3" />
                Convert items to lowercase
              </Label>
            </div>
          </div>
        </div>

        {/* Min Item Frequency */}
        <div className="space-y-4 p-4 rounded-xl border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Percent className="w-4 h-4 text-primary" />
            <p className="font-medium">Item Frequency Filter</p>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Remove rare items that appear below this frequency threshold
          </p>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Min Frequency</span>
              <span className="font-medium">{minItemFrequency}%</span>
            </div>
            <Slider
              value={[minItemFrequency]}
              onValueChange={([val]) => setMinItemFrequency(val)}
              min={0}
              max={20}
              step={0.5}
            />
            <p className="text-xs text-muted-foreground">
              Items appearing in less than {minItemFrequency}% of transactions will be removed
            </p>
          </div>
        </div>
      </div>

      {/* Transaction Size Filter */}
      <div className="space-y-4 p-4 rounded-xl border border-border">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-primary" />
          <p className="font-medium">Filter by Transaction Size</p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Minimum Items per Transaction</span>
              <span className="font-medium">{minItems}</span>
            </div>
            <Slider
              value={[minItems]}
              onValueChange={([val]) => setMinItems(val)}
              min={1}
              max={15}
              step={1}
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Maximum Items per Transaction</span>
              <span className="font-medium">{maxItems}</span>
            </div>
            <Slider
              value={[maxItems]}
              onValueChange={([val]) => setMaxItems(val)}
              min={10}
              max={100}
              step={5}
            />
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
