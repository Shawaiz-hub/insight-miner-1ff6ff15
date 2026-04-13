import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { useSEO } from "@/hooks/useSEO";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { DataUpload } from "@/components/dashboard/DataUpload";
import { AlgorithmSelector } from "@/components/dashboard/AlgorithmSelector";
import { ParameterConfig } from "@/components/dashboard/ParameterConfig";
import { ResultsTable } from "@/components/dashboard/ResultsTable";
import { ResultsVisualization } from "@/components/dashboard/ResultsVisualization";
import { RuleNetwork } from "@/components/dashboard/RuleNetwork";
import { ExportResults } from "@/components/dashboard/ExportResults";
import { PreprocessingConfig } from "@/components/dashboard/PreprocessingConfig";
import { ClassificationConfig, type ClassificationResults as ClassificationResultsType } from "@/components/dashboard/ClassificationConfig";
import { ClassificationResults } from "@/components/dashboard/ClassificationResults";
import { ClusteringConfig, type ClusteringResults as ClusteringResultsType } from "@/components/dashboard/ClusteringConfig";
import { ClusteringResults } from "@/components/dashboard/ClusteringResults";
import { NextPurchasePrediction } from "@/components/dashboard/NextPurchasePrediction";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, RotateCcw, Database, Settings, BarChart3, AlertCircle, Filter, CheckCircle2, XCircle, Brain, Link2, Boxes } from "lucide-react";
import { useMining } from "@/hooks/useMining";
import { Progress } from "@/components/ui/progress";

export type MiningTask = "association" | "classification" | "clustering";
export type MiningStep = "upload" | "preprocess" | "task" | "algorithm" | "parameters" | "results";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [step, setStep] = useState<MiningStep>("upload");
  const [miningTask, setMiningTask] = useState<MiningTask>("association");
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
  const [classificationResults, setClassificationResults] = useState<ClassificationResultsType | null>(null);
  const [clusteringResults, setClusteringResults] = useState<ClusteringResultsType | null>(null);
  const [transactionCount, setTransactionCount] = useState(0);
  const [backendConnected, setBackendConnected] = useState<boolean | null>(null);
  const [rerunDatasetName, setRerunDatasetName] = useState<string | null>(null);
  
  const { runMining, checkHealth, getRecommendation, isRunning, error, progress, datasetStats, datasetProfile, recommendation } = useMining();

  // Handle re-run params from URL
  useEffect(() => {
    if (searchParams.get("rerun") === "true") {
      const task = searchParams.get("task") as MiningTask;
      const algorithm = searchParams.get("algorithm");
      const datasetName = searchParams.get("dataset");
      
      if (task) setMiningTask(task);
      if (algorithm) setSelectedAlgorithm(algorithm);
      if (datasetName) setRerunDatasetName(datasetName);
      
      const newParams: Partial<MiningParams> = {};
      if (searchParams.get("minSupport")) newParams.minSupport = parseFloat(searchParams.get("minSupport")!);
      if (searchParams.get("minConfidence")) newParams.minConfidence = parseFloat(searchParams.get("minConfidence")!);
      if (searchParams.get("maxRuleLength")) newParams.maxRuleLength = parseInt(searchParams.get("maxRuleLength")!);
      if (searchParams.get("liftThreshold")) newParams.liftThreshold = parseFloat(searchParams.get("liftThreshold")!);
      
      if (Object.keys(newParams).length > 0) {
        setParams(prev => ({ ...prev, ...newParams }));
      }
      
      // Clear URL params after reading
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const checkConnection = useCallback(async () => {
    const connected = await checkHealth();
    setBackendConnected(connected);
  }, [checkHealth]);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const handleDatasetUpload = (data: DatasetInfo) => {
    setDataset(data);
    setStep("preprocess");
  };

  const handlePreprocessingComplete = () => setStep("task");
  
  const handleTaskSelect = (task: MiningTask) => {
    setMiningTask(task);
    if (task === "classification") {
      setStep("algorithm");
    } else {
      setStep("algorithm");
    }
  };

  const handleAlgorithmSelect = (algo: string) => { 
    setSelectedAlgorithm(algo); 
    if (miningTask === "association") {
      setStep("parameters"); 
    }
  };

  const { cacheHistory, queueOfflineMutation, syncPendingMutations } = useOfflineCache();

  // Sync pending offline mutations when online
  useEffect(() => {
    syncPendingMutations();
  }, [syncPendingMutations]);

  const handleRunMining = async () => {
    if (!dataset) return;
    const result = await runMining(null, selectedAlgorithm, params);
    if (result) {
      setResults(result.rules);
      setItemsets(result.itemsets);
      setTransactionCount(result.transactionCount);
      setStep("results");

      // Save to history (cloud + local cache)
      const historyEntry = {
        id: crypto.randomUUID(),
        algorithm: selectedAlgorithm,
        task_type: miningTask,
        dataset_name: dataset.name,
        parameters: params,
        results_summary: {
          rules_count: result.rules.length,
          itemsets_count: result.itemsets.length,
          ...(recommendation ? {
            recommended_algorithm: recommendation.top_pick,
            recommendation_score: recommendation.recommendations?.[0]?.score,
          } : {}),
        },
        execution_time_ms: result.executionTime ? Math.round(result.executionTime.total_seconds * 1000) : null,
        created_at: new Date().toISOString(),
      };

      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("mining_history").insert([{
            algorithm: selectedAlgorithm,
            task_type: miningTask,
            dataset_name: dataset.name,
            parameters: JSON.parse(JSON.stringify(params)),
            results_summary: JSON.parse(JSON.stringify(historyEntry.results_summary)),
            execution_time_ms: historyEntry.execution_time_ms,
            user_id: user.id,
          }]);
        }
      } catch {
        await queueOfflineMutation("mining_history", "insert", historyEntry);
      }
    }
  };

  const handleClassificationResults = (results: ClassificationResultsType) => {
    setClassificationResults(results);
    setStep("results");
  };

  const handleClusteringResults = (results: ClusteringResultsType) => {
    setClusteringResults(results);
    setStep("results");
  };

  const handleReset = () => { 
    setStep("upload"); 
    setDataset(null); 
    setResults([]); 
    setItemsets([]); 
    setTransactionCount(0);
    setClassificationResults(null);
    setClusteringResults(null);
    setMiningTask("association");
  };

  const getSteps = () => {
    const baseSteps = [
      { key: "upload", label: "Upload", icon: Database },
      { key: "preprocess", label: "Preprocess", icon: Filter },
      { key: "task", label: "Task", icon: Brain },
    ];
    
    if (miningTask === "association") {
      return [
        ...baseSteps,
        { key: "algorithm", label: "Algorithm", icon: Settings },
        { key: "parameters", label: "Parameters", icon: Settings },
        { key: "results", label: "Results", icon: BarChart3 },
      ];
    } else {
      return [
        ...baseSteps,
        { key: "algorithm", label: "Classify", icon: Brain },
        { key: "results", label: "Results", icon: BarChart3 },
      ];
    }
  };

  const steps = getSteps();
  const currentStepIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="fixed inset-0 bg-animated-gradient pointer-events-none" />
      <div className="fixed inset-0 bg-grid opacity-10 pointer-events-none" />
      
      <Navbar />
      <main className="pt-24 pb-12 relative z-10">
        <div className="container max-w-6xl">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 md:mb-8 animate-fade-in">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Mining Dashboard</h1>
              <p className="text-muted-foreground text-sm sm:text-base">Upload data, configure algorithms, and discover patterns</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
              <div className={`flex items-center gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium ${backendConnected === true ? "bg-green-500/10 text-green-500 border border-green-500/20" : backendConnected === false ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-muted text-muted-foreground"}`}>
                {backendConnected === true ? <><CheckCircle2 className="w-3 h-3" /> <span className="hidden sm:inline">Backend</span> Connected</> : backendConnected === false ? <><XCircle className="w-3 h-3" /> <span className="hidden sm:inline">Backend</span> Offline</> : "Checking..."}
              </div>
              {step === "results" && miningTask === "association" && results.length > 0 && <ExportResults rules={results} itemsets={itemsets} algorithm={selectedAlgorithm} params={params} transactionCount={transactionCount} />}
              <Button variant="outline" onClick={handleReset} className="gap-2 text-sm"><RotateCcw className="w-4 h-4" /><span className="hidden sm:inline">Reset</span></Button>
            </div>
          </div>

          {backendConnected === false && (
            <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
              <div className="flex items-center gap-3"><AlertCircle className="w-5 h-5 text-amber-500" /><p className="text-sm font-medium text-amber-500">Flask Backend Not Running</p></div>
              <p className="text-sm text-muted-foreground pl-8">Start the backend server to enable mining:</p>
              <pre className="text-xs bg-secondary/50 rounded-lg p-3 ml-8 overflow-x-auto"><code>cd backend{"\n"}pip install -r requirements.txt{"\n"}python app.py</code></pre>
            </div>
          )}

          <div className="flex items-center gap-1 sm:gap-2 mb-6 md:mb-8 overflow-x-auto pb-2 scrollbar-hide animate-fade-in" style={{ animationDelay: "0.1s" }}>
            {steps.map((s, index) => (
              <div key={s.key} className="flex items-center flex-shrink-0">
                <button onClick={() => index <= currentStepIndex && setStep(s.key as MiningStep)} disabled={index > currentStepIndex} className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-all duration-300 hover-scale workflow-step ${s.key === step ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 active" : index < currentStepIndex ? "bg-secondary text-secondary-foreground hover:bg-secondary/80" : "bg-muted text-muted-foreground cursor-not-allowed"}`}>
                  <s.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" /><span className="text-xs sm:text-sm font-medium whitespace-nowrap">{s.label}</span>
                </button>
                {index < steps.length - 1 && <div className={`w-4 sm:w-8 h-0.5 mx-1 sm:mx-2 transition-all duration-500 ${index < currentStepIndex ? "bg-gradient-to-r from-primary to-primary/50" : "bg-border"}`} />}
              </div>
            ))}
          </div>

          {error && <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/30 flex items-center gap-3"><AlertCircle className="w-5 h-5 text-destructive" /><p className="text-sm text-destructive">{error}</p></div>}

          <div className="glass-card-elevated rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 animate-fade-in-scale" style={{ animationDelay: "0.2s" }}>
            {step === "upload" && (
              <>
                {rerunDatasetName && (
                  <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center gap-3">
                    <Play className="w-4 h-4 text-primary" />
                    <p className="text-sm">
                      Re-running <span className="font-semibold">{selectedAlgorithm.toUpperCase()}</span> session.
                      Upload <span className="font-medium">{rerunDatasetName}</span> to continue with the same parameters.
                    </p>
                  </div>
                )}
                <DataUpload onUpload={handleDatasetUpload} />
              </>
            )}
            {step === "preprocess" && dataset && <PreprocessingConfig dataset={dataset} stats={datasetStats} onComplete={handlePreprocessingComplete} />}
            
            {step === "task" && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold mb-2">Select Mining Task</h2>
                  <p className="text-muted-foreground">Choose the type of data mining to perform</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto">
                  <button
                    onClick={() => handleTaskSelect("association")}
                    className={`relative text-left p-6 rounded-xl border transition-all card-hover ${
                      miningTask === "association"
                        ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {miningTask === "association" && (
                      <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}
                    <div className="feature-icon w-12 h-12 mb-4">
                      <Link2 className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Association Rules</h3>
                    <p className="text-sm text-muted-foreground">
                      Discover patterns and relationships using Apriori, FP-Growth, ECLAT, and more.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="px-2 py-1 rounded bg-secondary text-xs">Frequent Itemsets</span>
                      <span className="px-2 py-1 rounded bg-secondary text-xs">Market Basket</span>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => handleTaskSelect("classification")}
                    className={`relative text-left p-6 rounded-xl border transition-all card-hover ${
                      miningTask === "classification"
                        ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {miningTask === "classification" && (
                      <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}
                    <div className="feature-icon w-12 h-12 mb-4">
                      <Brain className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Classification</h3>
                    <p className="text-sm text-muted-foreground">
                      Train classifiers with Naive Bayes or Decision Tree algorithms.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="px-2 py-1 rounded bg-secondary text-xs">Naive Bayes</span>
                      <span className="px-2 py-1 rounded bg-secondary text-xs">Decision Tree</span>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => handleTaskSelect("clustering")}
                    className={`relative text-left p-6 rounded-xl border transition-all card-hover ${
                      miningTask === "clustering"
                        ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {miningTask === "clustering" && (
                      <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}
                    <div className="feature-icon w-12 h-12 mb-4">
                      <Boxes className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Clustering</h3>
                    <p className="text-sm text-muted-foreground">
                      Group similar data points using K-Means or DBSCAN algorithms.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="px-2 py-1 rounded bg-secondary text-xs">K-Means</span>
                      <span className="px-2 py-1 rounded bg-secondary text-xs">DBSCAN</span>
                    </div>
                  </button>
                </div>
              </div>
            )}
            
            {step === "algorithm" && miningTask === "association" && (
              <AlgorithmSelector 
                selected={selectedAlgorithm} 
                onSelect={handleAlgorithmSelect} 
                dataset={dataset}
                recommendation={recommendation}
                datasetProfile={datasetProfile}
                onFetchRecommendation={getRecommendation}
              />
            )}
            
            {step === "algorithm" && miningTask === "classification" && (
              <ClassificationConfig onResults={handleClassificationResults} />
            )}
            
            {step === "parameters" && miningTask === "association" && (
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
            
            {step === "results" && miningTask === "association" && (
              <Tabs defaultValue="table" className="space-y-4 sm:space-y-6">
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
                  <TabsTrigger value="table" className="text-xs sm:text-sm py-2">Rules Table</TabsTrigger>
                  <TabsTrigger value="charts" className="text-xs sm:text-sm py-2">Charts</TabsTrigger>
                  <TabsTrigger value="network" className="text-xs sm:text-sm py-2">Network</TabsTrigger>
                  <TabsTrigger value="predict" className="text-xs sm:text-sm py-2">Predict</TabsTrigger>
                </TabsList>
                <TabsContent value="table"><ResultsTable rules={results} algorithm={selectedAlgorithm} params={params} /></TabsContent>
                <TabsContent value="charts"><ResultsVisualization rules={results} itemsets={itemsets} /></TabsContent>
                <TabsContent value="network"><RuleNetwork rules={results} /></TabsContent>
                <TabsContent value="predict"><NextPurchasePrediction rules={results} /></TabsContent>
              </Tabs>
            )}
            
            {step === "results" && miningTask === "classification" && classificationResults && (
              <ClassificationResults results={classificationResults} />
            )}
            
            {step === "algorithm" && miningTask === "clustering" && (
              <ClusteringConfig onResults={handleClusteringResults} />
            )}
            
            {step === "results" && miningTask === "clustering" && clusteringResults && (
              <ClusteringResults results={clusteringResults} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
