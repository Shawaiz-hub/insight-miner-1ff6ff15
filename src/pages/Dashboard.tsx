import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { DataUpload } from "@/components/dashboard/DataUpload";
import { AlgorithmSelector } from "@/components/dashboard/AlgorithmSelector";
import { ParameterConfig } from "@/components/dashboard/ParameterConfig";
import { ResultsTable } from "@/components/dashboard/ResultsTable";
import { ResultsVisualization } from "@/components/dashboard/ResultsVisualization";
import { RuleNetwork } from "@/components/dashboard/RuleNetwork";
import { ExportResults } from "@/components/dashboard/ExportResults";
import { PreprocessingConfig } from "@/components/dashboard/PreprocessingConfig";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, RotateCcw, Database, Settings, BarChart3, AlertCircle, Filter, CheckCircle2, XCircle } from "lucide-react";
import { useMining } from "@/hooks/useMining";
import { Progress } from "@/components/ui/progress";

export type MiningStep = "upload" | "preprocess" | "algorithm" | "parameters" | "results";

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
  const [backendConnected, setBackendConnected] = useState<boolean | null>(null);
  
  const { runMining, checkHealth, isRunning, error, progress, datasetStats } = useMining();

  useEffect(() => {
    const checkConnection = async () => {
      const connected = await checkHealth();
      setBackendConnected(connected);
    };
    checkConnection();
  }, []);

  const handleDatasetUpload = (data: DatasetInfo) => {
    setDataset(data);
    setStep("preprocess");
  };

  const handlePreprocessingComplete = () => setStep("algorithm");
  const handleAlgorithmSelect = (algo: string) => { setSelectedAlgorithm(algo); setStep("parameters"); };

  const handleRunMining = async () => {
    if (!dataset) return;
    const result = await runMining(null, selectedAlgorithm, params);
    if (result) {
      setResults(result.rules);
      setItemsets(result.itemsets);
      setTransactionCount(result.transactionCount);
      setStep("results");
    }
  };

  const handleReset = () => { setStep("upload"); setDataset(null); setResults([]); setItemsets([]); setTransactionCount(0); };

  const steps = [
    { key: "upload", label: "Upload", icon: Database },
    { key: "preprocess", label: "Preprocess", icon: Filter },
    { key: "algorithm", label: "Algorithm", icon: Settings },
    { key: "parameters", label: "Parameters", icon: Settings },
    { key: "results", label: "Results", icon: BarChart3 },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="fixed inset-0 bg-animated-gradient pointer-events-none" />
      <div className="fixed inset-0 bg-grid opacity-10 pointer-events-none" />
      
      <Navbar />
      <main className="pt-24 pb-12 relative z-10">
        <div className="container max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 animate-fade-in">
            <div>
              <h1 className="text-3xl font-bold mb-2">Mining Dashboard</h1>
              <p className="text-muted-foreground">Upload data, configure algorithms, and discover patterns</p>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${backendConnected === true ? "bg-green-500/10 text-green-500 border border-green-500/20" : backendConnected === false ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-muted text-muted-foreground"}`}>
                {backendConnected === true ? <><CheckCircle2 className="w-3 h-3" /> Backend Connected</> : backendConnected === false ? <><XCircle className="w-3 h-3" /> Backend Offline</> : "Checking..."}
              </div>
              {step === "results" && results.length > 0 && <ExportResults rules={results} itemsets={itemsets} algorithm={selectedAlgorithm} params={params} transactionCount={transactionCount} />}
              <Button variant="outline" onClick={handleReset} className="gap-2"><RotateCcw className="w-4 h-4" />Reset</Button>
            </div>
          </div>

          {backendConnected === false && (
            <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
              <div className="flex items-center gap-3"><AlertCircle className="w-5 h-5 text-amber-500" /><p className="text-sm font-medium text-amber-500">Flask Backend Not Running</p></div>
              <p className="text-sm text-muted-foreground pl-8">Start the backend server to enable mining:</p>
              <pre className="text-xs bg-secondary/50 rounded-lg p-3 ml-8 overflow-x-auto"><code>cd backend{"\n"}pip install -r requirements.txt{"\n"}python app.py</code></pre>
            </div>
          )}

          <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            {steps.map((s, index) => (
              <div key={s.key} className="flex items-center">
                <button onClick={() => index <= currentStepIndex && setStep(s.key as MiningStep)} disabled={index > currentStepIndex} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 hover-scale workflow-step ${s.key === step ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 active" : index < currentStepIndex ? "bg-secondary text-secondary-foreground hover:bg-secondary/80" : "bg-muted text-muted-foreground cursor-not-allowed"}`}>
                  <s.icon className="w-4 h-4" /><span className="text-sm font-medium whitespace-nowrap">{s.label}</span>
                </button>
                {index < steps.length - 1 && <div className={`w-8 h-0.5 mx-2 transition-all duration-500 ${index < currentStepIndex ? "bg-gradient-to-r from-primary to-primary/50" : "bg-border"}`} />}
              </div>
            ))}
          </div>

          {error && <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/30 flex items-center gap-3"><AlertCircle className="w-5 h-5 text-destructive" /><p className="text-sm text-destructive">{error}</p></div>}

          <div className="glass-card-elevated rounded-2xl p-6 md:p-8 animate-fade-in-scale" style={{ animationDelay: "0.2s" }}>
            {step === "upload" && <DataUpload onUpload={handleDatasetUpload} />}
            {step === "preprocess" && dataset && <PreprocessingConfig dataset={dataset} stats={datasetStats} onComplete={handlePreprocessingComplete} />}
            {step === "algorithm" && <AlgorithmSelector selected={selectedAlgorithm} onSelect={handleAlgorithmSelect} dataset={dataset} />}
            {step === "parameters" && (
              <div className="space-y-6">
                <ParameterConfig params={params} onChange={setParams} algorithm={selectedAlgorithm} />
                {isRunning && <div className="space-y-2"><div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Processing...</span><span className="text-primary">{progress}%</span></div><Progress value={progress} className="h-2" /></div>}
                <div className="flex justify-end">
                  <Button variant="hero" size="lg" onClick={handleRunMining} disabled={isRunning || backendConnected === false} className="gap-2">
                    {isRunning ? <><div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />Mining...</> : <><Play className="w-4 h-4" />Run Mining</>}
                  </Button>
                </div>
              </div>
            )}
            {step === "results" && (
              <Tabs defaultValue="table" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3"><TabsTrigger value="table">Rules Table</TabsTrigger><TabsTrigger value="charts">Charts</TabsTrigger><TabsTrigger value="network">Network</TabsTrigger></TabsList>
                <TabsContent value="table"><ResultsTable rules={results} algorithm={selectedAlgorithm} params={params} /></TabsContent>
                <TabsContent value="charts"><ResultsVisualization rules={results} itemsets={itemsets} /></TabsContent>
                <TabsContent value="network"><RuleNetwork rules={results} /></TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
