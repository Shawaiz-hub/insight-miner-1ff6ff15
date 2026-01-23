import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { DataUpload } from "@/components/dashboard/DataUpload";
import { AlgorithmSelector } from "@/components/dashboard/AlgorithmSelector";
import { ParameterConfig } from "@/components/dashboard/ParameterConfig";
import { ResultsTable } from "@/components/dashboard/ResultsTable";
import { Button } from "@/components/ui/button";
import { Play, RotateCcw, Download, Database, Settings, BarChart3 } from "lucide-react";

export type MiningStep = "upload" | "algorithm" | "parameters" | "results";

export interface DatasetInfo {
  name: string;
  rows: number;
  columns: number;
  transactions: string[][];
}

export interface MiningParams {
  minSupport: number;
  minConfidence: number;
  maxRuleLength: number;
  liftThreshold: number;
}

export interface AssociationRule {
  id: number;
  antecedent: string[];
  consequent: string[];
  support: number;
  confidence: number;
  lift: number;
}

const Dashboard = () => {
  const [step, setStep] = useState<MiningStep>("upload");
  const [dataset, setDataset] = useState<DatasetInfo | null>(null);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<string>("apriori");
  const [params, setParams] = useState<MiningParams>({
    minSupport: 0.1,
    minConfidence: 0.5,
    maxRuleLength: 4,
    liftThreshold: 1.0,
  });
  const [results, setResults] = useState<AssociationRule[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const handleDatasetUpload = (data: DatasetInfo) => {
    setDataset(data);
    setStep("algorithm");
  };

  const handleAlgorithmSelect = (algo: string) => {
    setSelectedAlgorithm(algo);
    setStep("parameters");
  };

  const handleRunMining = async () => {
    setIsRunning(true);
    
    // Simulate mining process
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    // Generate mock results
    const mockRules: AssociationRule[] = [
      { id: 1, antecedent: ["Bread"], consequent: ["Milk"], support: 0.42, confidence: 0.85, lift: 1.35 },
      { id: 2, antecedent: ["Diaper"], consequent: ["Beer"], support: 0.35, confidence: 0.78, lift: 1.52 },
      { id: 3, antecedent: ["Bread", "Butter"], consequent: ["Milk"], support: 0.28, confidence: 0.91, lift: 1.44 },
      { id: 4, antecedent: ["Eggs"], consequent: ["Bacon"], support: 0.31, confidence: 0.72, lift: 1.28 },
      { id: 5, antecedent: ["Coffee"], consequent: ["Sugar"], support: 0.45, confidence: 0.88, lift: 1.62 },
      { id: 6, antecedent: ["Milk", "Bread"], consequent: ["Butter"], support: 0.22, confidence: 0.68, lift: 1.18 },
      { id: 7, antecedent: ["Chips"], consequent: ["Soda"], support: 0.38, confidence: 0.82, lift: 1.45 },
      { id: 8, antecedent: ["Tea"], consequent: ["Honey"], support: 0.19, confidence: 0.65, lift: 1.21 },
    ];
    
    setResults(mockRules.filter(r => r.support >= params.minSupport && r.confidence >= params.minConfidence));
    setIsRunning(false);
    setStep("results");
  };

  const handleReset = () => {
    setStep("upload");
    setDataset(null);
    setResults([]);
  };

  const steps = [
    { key: "upload", label: "Upload", icon: Database },
    { key: "algorithm", label: "Algorithm", icon: Settings },
    { key: "parameters", label: "Parameters", icon: Settings },
    { key: "results", label: "Results", icon: BarChart3 },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-12">
        <div className="container max-w-6xl">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Mining Dashboard</h1>
              <p className="text-muted-foreground">
                Upload data, configure algorithms, and discover patterns
              </p>
            </div>
            <div className="flex gap-3">
              {step === "results" && (
                <Button variant="outline" className="gap-2">
                  <Download className="w-4 h-4" />
                  Export CSV
                </Button>
              )}
              <Button variant="outline" onClick={handleReset} className="gap-2">
                <RotateCcw className="w-4 h-4" />
                Reset
              </Button>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
            {steps.map((s, index) => (
              <div key={s.key} className="flex items-center">
                <button
                  onClick={() => index <= currentStepIndex && setStep(s.key as MiningStep)}
                  disabled={index > currentStepIndex}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    s.key === step
                      ? "bg-primary text-primary-foreground"
                      : index < currentStepIndex
                      ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  }`}
                >
                  <s.icon className="w-4 h-4" />
                  <span className="text-sm font-medium whitespace-nowrap">{s.label}</span>
                </button>
                {index < steps.length - 1 && (
                  <div className={`w-8 h-0.5 mx-2 ${index < currentStepIndex ? "bg-primary" : "bg-border"}`} />
                )}
              </div>
            ))}
          </div>

          {/* Content */}
          <div className="glass-card rounded-2xl p-6 md:p-8">
            {step === "upload" && (
              <DataUpload onUpload={handleDatasetUpload} />
            )}
            
            {step === "algorithm" && (
              <AlgorithmSelector
                selected={selectedAlgorithm}
                onSelect={handleAlgorithmSelect}
                dataset={dataset}
              />
            )}
            
            {step === "parameters" && (
              <div className="space-y-6">
                <ParameterConfig
                  params={params}
                  onChange={setParams}
                  algorithm={selectedAlgorithm}
                />
                <div className="flex justify-end">
                  <Button
                    variant="hero"
                    size="lg"
                    onClick={handleRunMining}
                    disabled={isRunning}
                    className="gap-2"
                  >
                    {isRunning ? (
                      <>
                        <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        Mining...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Run Mining
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
            
            {step === "results" && (
              <ResultsTable
                rules={results}
                algorithm={selectedAlgorithm}
                params={params}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
