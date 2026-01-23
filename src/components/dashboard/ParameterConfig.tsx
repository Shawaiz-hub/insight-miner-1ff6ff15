import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { MiningParams } from "@/pages/Dashboard";

interface ParameterConfigProps {
  params: MiningParams;
  onChange: (params: MiningParams) => void;
  algorithm: string;
}

const algorithmNames: Record<string, string> = {
  apriori: "Apriori",
  fpgrowth: "FP-Growth",
  eclat: "ECLAT",
  hmine: "H-Mine",
  carma: "CARMA",
  charm: "CHARM",
  maxminer: "MaxMiner",
};

export function ParameterConfig({ params, onChange, algorithm }: ParameterConfigProps) {
  const updateParam = <K extends keyof MiningParams>(key: K, value: MiningParams[K]) => {
    onChange({ ...params, [key]: value });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Configure Parameters</h2>
        <p className="text-muted-foreground">
          Set thresholds for{" "}
          <span className="text-primary font-medium">
            {algorithmNames[algorithm]}
          </span>{" "}
          algorithm
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Minimum Support */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label htmlFor="minSupport" className="text-sm font-medium">
                Minimum Support
              </Label>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-4 h-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    The minimum proportion of transactions that must contain an
                    itemset for it to be considered frequent.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <span className="text-sm font-mono text-primary">
              {(params.minSupport * 100).toFixed(0)}%
            </span>
          </div>
          <Slider
            id="minSupport"
            value={[params.minSupport]}
            onValueChange={([val]) => updateParam("minSupport", val)}
            min={0.01}
            max={1}
            step={0.01}
            className="py-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Minimum Confidence */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label htmlFor="minConfidence" className="text-sm font-medium">
                Minimum Confidence
              </Label>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-4 h-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    The minimum probability that a rule's consequent appears
                    given its antecedent. Confidence = Support(A∪B) / Support(A)
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <span className="text-sm font-mono text-primary">
              {(params.minConfidence * 100).toFixed(0)}%
            </span>
          </div>
          <Slider
            id="minConfidence"
            value={[params.minConfidence]}
            onValueChange={([val]) => updateParam("minConfidence", val)}
            min={0.1}
            max={1}
            step={0.01}
            className="py-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>10%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Maximum Rule Length */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label htmlFor="maxRuleLength" className="text-sm font-medium">
                Max Rule Length
              </Label>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-4 h-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    Maximum number of items in a frequent itemset. Higher values
                    may increase computation time.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <span className="text-sm font-mono text-primary">
              {params.maxRuleLength}
            </span>
          </div>
          <Input
            id="maxRuleLength"
            type="number"
            value={params.maxRuleLength}
            onChange={(e) =>
              updateParam("maxRuleLength", parseInt(e.target.value) || 2)
            }
            min={2}
            max={10}
            className="bg-secondary"
          />
        </div>

        {/* Lift Threshold */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label htmlFor="liftThreshold" className="text-sm font-medium">
                Lift Threshold
              </Label>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-4 h-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    Lift measures how much more likely the consequent is given
                    the antecedent. Lift greater than 1 indicates positive correlation.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <span className="text-sm font-mono text-primary">
              ≥ {params.liftThreshold.toFixed(1)}
            </span>
          </div>
          <Slider
            id="liftThreshold"
            value={[params.liftThreshold]}
            onValueChange={([val]) => updateParam("liftThreshold", val)}
            min={0}
            max={5}
            step={0.1}
            className="py-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0</span>
            <span>5</span>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-8 p-4 rounded-xl bg-secondary/50 border border-border">
        <h4 className="font-medium mb-2">Parameter Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Algorithm</p>
            <p className="font-medium text-primary">{algorithmNames[algorithm]}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Min Support</p>
            <p className="font-medium">{(params.minSupport * 100).toFixed(0)}%</p>
          </div>
          <div>
            <p className="text-muted-foreground">Min Confidence</p>
            <p className="font-medium">{(params.minConfidence * 100).toFixed(0)}%</p>
          </div>
          <div>
            <p className="text-muted-foreground">Max Length</p>
            <p className="font-medium">{params.maxRuleLength} items</p>
          </div>
        </div>
      </div>
    </div>
  );
}
