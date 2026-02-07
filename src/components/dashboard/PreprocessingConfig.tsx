import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Filter, Trash2, Check, RefreshCw, Percent, Type, AlertTriangle, 
  Sparkles, Clock, Hash, FileText, Zap 
} from "lucide-react";
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
  // Basic Cleaning
  const [removeDuplicates, setRemoveDuplicates] = useState(false);
  const [removeNulls, setRemoveNulls] = useState(true);
  const [lowercase, setLowercase] = useState(false);
  
  // Advanced Text Normalization
  const [removeTimestamps, setRemoveTimestamps] = useState(false);
  const [removeNumericItems, setRemoveNumericItems] = useState(false);
  const [applySynonyms, setApplySynonyms] = useState(false);
  const [minItemLength, setMinItemLength] = useState(2);
  
  // Frequency Filters
  const [minItems, setMinItems] = useState(1);
  const [maxItems, setMaxItems] = useState(50);
  const [minItemFrequency, setMinItemFrequency] = useState(0);
  const [maxItemFrequency, setMaxItemFrequency] = useState(95);
  
  // Exclude Items
  const [excludeItems, setExcludeItems] = useState<string[]>([]);
  const [excludeInput, setExcludeInput] = useState("");
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const { preprocessDataset, getDatasetInfo, datasetStats, datasetProfile } = useMining();

  const currentStats = datasetStats || stats;

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
      // Advanced options can be added to the hook as needed
    });
    
    setIsProcessing(false);
    
    if (success) {
      await getDatasetInfo();
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold mb-2">Data Preprocessing</h2>
        <p className="text-muted-foreground text-sm sm:text-base">
          Clean and filter your dataset before mining
        </p>
      </div>

      {/* Toggle Preview */}
      <div className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-secondary/30">
        <div>
          <p className="font-medium text-sm sm:text-base">Dataset Preview</p>
          <p className="text-xs sm:text-sm text-muted-foreground">Show visual analysis of your data</p>
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

      {/* Basic Preprocessing Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Data Cleaning */}
        <div className="space-y-4 p-3 sm:p-4 rounded-xl border border-border">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-primary" />
            <p className="font-medium text-sm sm:text-base">Data Cleaning</p>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox
                id="remove-duplicates"
                checked={removeDuplicates}
                onCheckedChange={(checked) => setRemoveDuplicates(checked as boolean)}
              />
              <Label htmlFor="remove-duplicates" className="cursor-pointer text-xs sm:text-sm">
                Remove duplicate transactions
              </Label>
            </div>
            
            <div className="flex items-center gap-3">
              <Checkbox
                id="remove-nulls"
                checked={removeNulls}
                onCheckedChange={(checked) => setRemoveNulls(checked as boolean)}
              />
              <Label htmlFor="remove-nulls" className="cursor-pointer text-xs sm:text-sm">
                Remove null/empty values
              </Label>
            </div>
            
            <div className="flex items-center gap-3">
              <Checkbox
                id="lowercase"
                checked={lowercase}
                onCheckedChange={(checked) => setLowercase(checked as boolean)}
              />
              <Label htmlFor="lowercase" className="cursor-pointer text-xs sm:text-sm flex items-center gap-2">
                <Type className="w-3 h-3" />
                Convert items to lowercase
              </Label>
            </div>
          </div>
        </div>

        {/* Min Item Frequency */}
        <div className="space-y-4 p-3 sm:p-4 rounded-xl border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Percent className="w-4 h-4 text-primary" />
            <p className="font-medium text-sm sm:text-base">Frequency Pruning</p>
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mb-3">
            Remove rare items below threshold and overly common items above threshold
          </p>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs sm:text-sm">
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
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-muted-foreground">Max Frequency</span>
                <span className="font-medium">{maxItemFrequency}%</span>
              </div>
              <Slider
                value={[maxItemFrequency]}
                onValueChange={([val]) => setMaxItemFrequency(val)}
                min={50}
                max={100}
                step={1}
              />
              <p className="text-[10px] text-muted-foreground">
                Items appearing in &gt;{maxItemFrequency}% of transactions will be removed
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Options Toggle */}
      <div className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-secondary/30">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <div>
            <p className="font-medium text-sm sm:text-base">Advanced Options</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Additional normalization and filtering</p>
          </div>
        </div>
        <Switch checked={showAdvanced} onCheckedChange={setShowAdvanced} />
      </div>

      {/* Advanced Preprocessing Options */}
      {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Text Normalization */}
          <div className="space-y-4 p-3 sm:p-4 rounded-xl border border-border">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-primary" />
              <p className="font-medium text-sm sm:text-base">Text Normalization</p>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="remove-timestamps"
                  checked={removeTimestamps}
                  onCheckedChange={(checked) => setRemoveTimestamps(checked as boolean)}
                />
                <Label htmlFor="remove-timestamps" className="cursor-pointer text-xs sm:text-sm flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  Remove timestamp items
                </Label>
              </div>
              
              <div className="flex items-center gap-3">
                <Checkbox
                  id="remove-numeric"
                  checked={removeNumericItems}
                  onCheckedChange={(checked) => setRemoveNumericItems(checked as boolean)}
                />
                <Label htmlFor="remove-numeric" className="cursor-pointer text-xs sm:text-sm flex items-center gap-2">
                  <Hash className="w-3 h-3" />
                  Remove numeric-only items
                </Label>
              </div>
              
              <div className="flex items-center gap-3">
                <Checkbox
                  id="apply-synonyms"
                  checked={applySynonyms}
                  onCheckedChange={(checked) => setApplySynonyms(checked as boolean)}
                />
                <Label htmlFor="apply-synonyms" className="cursor-pointer text-xs sm:text-sm flex items-center gap-2">
                  <Zap className="w-3 h-3" />
                  Apply synonym normalization
                </Label>
              </div>
              
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-muted-foreground">Min Item Length</span>
                  <span className="font-medium">{minItemLength} chars</span>
                </div>
                <Slider
                  value={[minItemLength]}
                  onValueChange={([val]) => setMinItemLength(val)}
                  min={1}
                  max={5}
                  step={1}
                />
              </div>
            </div>
          </div>

          {/* Transaction Size Filter */}
          <div className="space-y-4 p-3 sm:p-4 rounded-xl border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="w-4 h-4 text-primary" />
              <p className="font-medium text-sm sm:text-base">Transaction Size</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-muted-foreground">Min Items</span>
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
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-muted-foreground">Max Items</span>
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
        </div>
      )}

      {/* Exclude Items */}
      <div className="space-y-4 p-3 sm:p-4 rounded-xl border border-border">
        <div className="flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-primary" />
          <p className="font-medium text-sm sm:text-base">Exclude Specific Items</p>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Remove specific items from all transactions before mining
        </p>
        
        <div className="flex gap-2">
          <Input
            placeholder="Enter item name..."
            value={excludeInput}
            onChange={(e) => setExcludeInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddExcludeItem()}
            className="text-sm"
          />
          <Button variant="secondary" onClick={handleAddExcludeItem} size="sm">
            Add
          </Button>
        </div>
        
        {excludeItems.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {excludeItems.map((item) => (
              <Badge
                key={item}
                variant="secondary"
                className="flex items-center gap-1 cursor-pointer hover:bg-destructive/20 text-xs"
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
      <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0">
        <Button
          variant="outline"
          onClick={handleApplyPreprocessing}
          disabled={isProcessing}
          className="gap-2 text-sm"
        >
          {isProcessing ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Apply Preprocessing
        </Button>
        
        <Button variant="hero" onClick={onComplete} className="gap-2 text-sm">
          <Check className="w-4 h-4" />
          Continue to Algorithm Selection
        </Button>
      </div>
    </div>
  );
}
