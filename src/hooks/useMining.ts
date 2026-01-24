import { useState } from "react";
import type { AssociationRule, FrequentItemset, MiningParams } from "@/pages/Dashboard";

const API_BASE = "http://localhost:5000";

interface MiningResult {
  rules: AssociationRule[];
  itemsets: FrequentItemset[];
  transactionCount: number;
  uniqueItems: number;
}

interface UploadResult {
  success: boolean;
  message: string;
  stats: {
    transactions: number;
    unique_items: number;
    avg_items_per_transaction: number;
  };
}

interface PreprocessOptions {
  removeDuplicates?: boolean;
  minItems?: number;
  maxItems?: number;
  excludeItems?: string[];
}

export function useMining() {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [datasetStats, setDatasetStats] = useState<UploadResult["stats"] | null>(null);

  const uploadDataset = async (file: File): Promise<UploadResult | null> => {
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_BASE}/api/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setDatasetStats(data.stats);
      return data;
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "Failed to upload dataset");
      return null;
    }
  };

  const preprocessDataset = async (options: PreprocessOptions): Promise<boolean> => {
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
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Preprocessing failed");
      }

      setDatasetStats(data.stats);
      return true;
    } catch (err) {
      console.error("Preprocessing error:", err);
      setError(err instanceof Error ? err.message : "Failed to preprocess dataset");
      return false;
    }
  };

  const runMining = async (
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
        }),
      });

      clearInterval(progressInterval);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Mining failed");
      }

      setProgress(100);
      console.log(`Mining complete: ${data.rules_count} rules discovered`);

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
      };
    } catch (err) {
      console.error("Mining error:", err);
      setError(err instanceof Error ? err.message : "An error occurred during mining");
      return null;
    } finally {
      setIsRunning(false);
      setTimeout(() => setProgress(0), 500);
    }
  };

  const checkHealth = async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/api/health`);
      return response.ok;
    } catch {
      return false;
    }
  };

  return {
    uploadDataset,
    preprocessDataset,
    runMining,
    checkHealth,
    isRunning,
    error,
    progress,
    datasetStats,
  };
}
