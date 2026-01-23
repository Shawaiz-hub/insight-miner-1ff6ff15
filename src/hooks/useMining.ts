import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AssociationRule, FrequentItemset, MiningParams } from "@/pages/Dashboard";

interface MiningResult {
  rules: AssociationRule[];
  itemsets: FrequentItemset[];
  transactionCount: number;
  uniqueItems: number;
}

export function useMining() {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const runMining = async (
    transactions: string[][],
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

      console.log(`Calling mine-patterns edge function with ${transactions.length} transactions`);
      
      const { data, error: fnError } = await supabase.functions.invoke("mine-patterns", {
        body: {
          transactions,
          algorithm,
          params,
        },
      });

      clearInterval(progressInterval);

      if (fnError) {
        console.error("Edge function error:", fnError);
        throw new Error(fnError.message || "Mining failed");
      }

      if (!data.success) {
        throw new Error(data.error || "Mining failed");
      }

      setProgress(100);
      console.log(`Mining complete: ${data.rules.length} rules, ${data.itemsets.length} itemsets`);

      return {
        rules: data.rules,
        itemsets: data.itemsets,
        transactionCount: data.transactionCount,
        uniqueItems: data.uniqueItems,
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

  return {
    runMining,
    isRunning,
    error,
    progress,
  };
}
