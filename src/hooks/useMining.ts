import { useState, useCallback } from "react";
import type { AssociationRule, FrequentItemset, MiningParams } from "@/pages/Dashboard";

const API_BASE = "http://localhost:5000";

interface MiningResult {
  rules: AssociationRule[];
  itemsets: FrequentItemset[];
  transactionCount: number;
  uniqueItems: number;
  executionTime?: {
    load_seconds: number;
    mine_seconds: number;
    total_seconds: number;
  };
  wasPruned?: boolean;
  originalRulesCount?: number;
}

interface UploadResult {
  success: boolean;
  message: string;
  stats: {
    transactions: number;
    unique_items: number;
    avg_items_per_transaction: number;
  };
  profile?: DatasetProfile;
}

export interface DatasetProfile {
  n_transactions: number;
  n_unique_items: number;
  avg_transaction_length: number;
  density: number;
  sparsity: number;
  estimated_memory_mb: number;
  is_large: boolean;
  is_sparse: boolean;
}

export interface AlgorithmRecommendation {
  recommendations: Array<{
    algorithm: string;
    score: number;
    reason: string;
  }>;
  rule_explosion_risk: string;
  top_pick: string;
  top_reason: string;
}

interface PreprocessOptions {
  removeDuplicates?: boolean;
  minItems?: number;
  maxItems?: number;
  excludeItems?: string[];
  minItemFrequency?: number;
  removeNulls?: boolean;
  lowercase?: boolean;
}

interface DatasetInfo {
  stats: {
    transactions: number;
    unique_items: number;
    avg_items_per_transaction: number;
    top_items?: Array<{ item: string; count: number }>;
  };
  profile: DatasetProfile;
}

interface ClassificationResult {
  success: boolean;
  algorithm: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  confusion_matrix: number[][];
  class_labels: string[];
  classification_report: string;
  feature_importances?: Array<{ feature: string; importance: number }>;
  execution_time: number;
}

interface ClusteringResult {
  algorithm: string;
  n_clusters: number;
  cluster_labels: number[];
  cluster_centers?: number[][];
  silhouette_score: number;
  inertia?: number;
  cluster_sizes: { [key: string]: number };
  feature_names: string[];
  data_points: Array<{ features: number[]; cluster: number }>;
  execution_time: number;
}

interface ElbowData {
  k: number;
  inertia: number;
  silhouette: number;
}

interface ElbowResult {
  elbow_data: ElbowData[];
  optimal_k_elbow: number;
  optimal_k_silhouette: number;
  recommendation: string;
}

export function useMining() {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [datasetStats, setDatasetStats] = useState<UploadResult["stats"] | null>(null);
  const [datasetProfile, setDatasetProfile] = useState<DatasetProfile | null>(null);
  const [recommendation, setRecommendation] = useState<AlgorithmRecommendation | null>(null);

  const uploadDataset = useCallback(async (file: File): Promise<UploadResult | null> => {
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_BASE}/api/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const errorMessage = data.error || `Upload failed with status ${response.status}`;
        setError(errorMessage);
        return { success: false, message: errorMessage, stats: { transactions: 0, unique_items: 0, avg_items_per_transaction: 0 } };
      }

      const data = await response.json();

      setDatasetStats(data.stats);
      if (data.profile) {
        setDatasetProfile(data.profile);
      }
      return { ...data, success: true };
    } catch (err) {
      console.error("Upload error:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to connect to backend";
      setError(errorMessage);
      return { success: false, message: errorMessage, stats: { transactions: 0, unique_items: 0, avg_items_per_transaction: 0 } };
    }
  }, []);

  const preprocessDataset = useCallback(async (options: PreprocessOptions): Promise<boolean> => {
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/api/preprocess`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          remove_duplicates: options.removeDuplicates,
          min_items: options.minItems,
          max_items: options.maxItems,
          exclude_items: options.excludeItems,
          min_item_frequency: options.minItemFrequency,
          remove_nulls: options.removeNulls,
          lowercase: options.lowercase,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Preprocessing failed");
      }

      setDatasetStats(data.stats);
      if (data.profile) {
        setDatasetProfile(data.profile);
      }
      return true;
    } catch (err) {
      console.error("Preprocessing error:", err);
      setError(err instanceof Error ? err.message : "Failed to preprocess dataset");
      return false;
    }
  }, []);

  const getDatasetInfo = useCallback(async (): Promise<DatasetInfo | null> => {
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/api/dataset/info`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get dataset info");
      }

      setDatasetStats(data.stats);
      if (data.profile) {
        setDatasetProfile(data.profile);
      }
      return data;
    } catch (err) {
      console.error("Dataset info error:", err);
      return null;
    }
  }, []);

  const getRecommendation = useCallback(async (minSupport: number = 0.1): Promise<AlgorithmRecommendation | null> => {
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/api/recommend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ min_support: minSupport }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Recommendation failed");
      }

      setRecommendation(data.recommendation);
      if (data.profile) {
        setDatasetProfile(data.profile);
      }
      return data.recommendation;
    } catch (err) {
      console.error("Recommendation error:", err);
      return null;
    }
  }, []);

  const runMining = useCallback(async (
    _transactions: string[][] | null,
    algorithm: string,
    params: MiningParams
  ): Promise<MiningResult | null> => {
    setIsRunning(true);
    setError(null);
    setProgress(10);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress((p) => Math.min(p + 10, 80));
      }, 300);

      console.log(`Calling Flask backend with algorithm: ${algorithm}`);
      
      const response = await fetch(`${API_BASE}/api/mine`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          algorithm: algorithm.toLowerCase(),
          min_support: params.minSupport,
          min_confidence: params.minConfidence,
          max_rules: 5000,
        }),
      });

      clearInterval(progressInterval);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Mining failed");
      }

      setProgress(100);
      console.log(`Mining complete: ${data.rules_count} rules discovered in ${data.execution_time?.total_seconds}s`);

      // Convert API response to our format
      const rules: AssociationRule[] = data.rules.map((rule: {
        antecedent: string[];
        consequent: string[];
        support: number;
        confidence: number;
        lift: number;
      }, index: number) => ({
        id: index + 1,
        antecedent: rule.antecedent,
        consequent: rule.consequent,
        support: rule.support,
        confidence: rule.confidence,
        lift: rule.lift,
      }));

      // Create itemsets from rules (extract unique itemsets)
      const itemsetMap = new Map<string, FrequentItemset>();
      rules.forEach((rule) => {
        const allItems = [...rule.antecedent, ...rule.consequent].sort();
        const key = allItems.join(",");
        if (!itemsetMap.has(key)) {
          itemsetMap.set(key, {
            items: allItems,
            support: rule.support,
            count: Math.round(rule.support * (datasetStats?.transactions || 100)),
          });
        }
      });

      return {
        rules,
        itemsets: Array.from(itemsetMap.values()),
        transactionCount: datasetStats?.transactions || 0,
        uniqueItems: datasetStats?.unique_items || 0,
        executionTime: data.execution_time,
        wasPruned: data.was_pruned,
        originalRulesCount: data.original_rules_count,
      };
    } catch (err) {
      console.error("Mining error:", err);
      setError(err instanceof Error ? err.message : "An error occurred during mining");
      return null;
    } finally {
      setIsRunning(false);
      setTimeout(() => setProgress(0), 500);
    }
  }, [datasetStats?.transactions, datasetStats?.unique_items]);

  const runClassification = useCallback(async (
    algorithm: string
  ): Promise<ClassificationResult | null> => {
    setIsRunning(true);
    setError(null);
    setProgress(10);

    try {
      const progressInterval = setInterval(() => {
        setProgress((p) => Math.min(p + 15, 85));
      }, 200);

      const response = await fetch(`${API_BASE}/api/classify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          algorithm: algorithm.toLowerCase(),
        }),
      });

      clearInterval(progressInterval);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Classification failed");
      }

      setProgress(100);
      return data;
    } catch (err) {
      console.error("Classification error:", err);
      setError(err instanceof Error ? err.message : "An error occurred during classification");
      return null;
    } finally {
      setIsRunning(false);
      setTimeout(() => setProgress(0), 500);
    }
  }, []);

  const runClustering = useCallback(async (
    algorithm: string,
    params: { n_clusters?: number; eps?: number; min_samples?: number }
  ): Promise<ClusteringResult | null> => {
    setIsRunning(true);
    setError(null);
    setProgress(10);

    try {
      const progressInterval = setInterval(() => {
        setProgress((p) => Math.min(p + 15, 85));
      }, 200);

      const response = await fetch(`${API_BASE}/api/cluster`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          algorithm: algorithm.toLowerCase(),
          ...params,
        }),
      });

      clearInterval(progressInterval);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Clustering failed");
      }

      setProgress(100);
      return data;
    } catch (err) {
      console.error("Clustering error:", err);
      setError(err instanceof Error ? err.message : "An error occurred during clustering");
      return null;
    } finally {
      setIsRunning(false);
      setTimeout(() => setProgress(0), 500);
    }
  }, []);

  const getElbowData = useCallback(async (maxK: number = 10): Promise<ElbowResult | null> => {
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/api/elbow`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ max_k: maxK }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Elbow analysis failed");
      }

      return data;
    } catch (err) {
      console.error("Elbow analysis error:", err);
      setError(err instanceof Error ? err.message : "Failed to perform elbow analysis");
      return null;
    }
  }, []);

  const checkHealth = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/api/health`);
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  return {
    uploadDataset,
    preprocessDataset,
    getDatasetInfo,
    getRecommendation,
    runMining,
    runClassification,
    runClustering,
    getElbowData,
    checkHealth,
    isRunning,
    error,
    progress,
    datasetStats,
    datasetProfile,
    recommendation,
  };
}
