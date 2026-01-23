import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { DataUpload } from "@/components/dashboard/DataUpload";
import { AlgorithmSelector } from "@/components/dashboard/AlgorithmSelector";
import { ParameterConfig } from "@/components/dashboard/ParameterConfig";
import { ResultsTable } from "@/components/dashboard/ResultsTable";
import { ResultsVisualization } from "@/components/dashboard/ResultsVisualization";
import { RuleNetwork } from "@/components/dashboard/RuleNetwork";
import { ExportResults } from "@/components/dashboard/ExportResults";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, RotateCcw, Database, Settings, BarChart3, AlertCircle } from "lucide-react";
import { useMining } from "@/hooks/useMining";
import { Progress } from "@/components/ui/progress";

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

export interface FrequentItemset {
  items: string[];
  support: number;
  count: number;
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
  const [itemsets, setItemsets] = useState<FrequentItemset[]>([]);
  const [transactionCount, setTransactionCount] = useState(0);
  
  const { runMining, isRunning, error, progress } = useMining();

  const handleDatasetUpload = (data: DatasetInfo) => {
    setDataset(data);
    setStep("algorithm");
  };

  const handleAlgorithmSelect = (algo: string) => {
    setSelectedAlgorithm(algo);
    setStep("parameters");
  };

  const handleRunMining = async () => {
    if (!dataset) return;
    
    const result = await runMining(dataset.transactions, selectedAlgorithm, params);
    
    if (result) {
      setResults(result.rules);
      setItemsets(result.itemsets);
      setTransactionCount(result.transactionCount);
      setStep("results");
    }
  };

  const handleReset = () => {
    setStep("upload");
    setDataset(null);
    setResults([]);
    setItemsets([]);
    setTransactionCount(0);
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
              {step === "results" && results.length > 0 && (
                <ExportResults
                  rules={results}
                  itemsets={itemsets}
                  algorithm={selectedAlgorithm}
                  params={params}
                  transactionCount={transactionCount}
                />
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

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/30 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

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
                
                {isRunning && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Processing...</span>
                      <span className="text-primary">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                )}
                
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
              <Tabs defaultValue="table" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="table">Rules Table</TabsTrigger>
                  <TabsTrigger value="charts">Charts</TabsTrigger>
                  <TabsTrigger value="network">Network</TabsTrigger>
                </TabsList>
                
                <TabsContent value="table">
                  <ResultsTable
                    rules={results}
                    algorithm={selectedAlgorithm}
                    params={params}
                  />
                </TabsContent>
                
                <TabsContent value="charts">
                  <ResultsVisualization rules={results} itemsets={itemsets} />
                </TabsContent>
                
                <TabsContent value="network">
                  <RuleNetwork rules={results} />
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
