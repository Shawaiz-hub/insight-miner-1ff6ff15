import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Transaction {
  items: string[];
}

interface MiningParams {
  minSupport: number;
  minConfidence: number;
  maxRuleLength: number;
  liftThreshold: number;
}

interface AssociationRule {
  id: number;
  antecedent: string[];
  consequent: string[];
  support: number;
  confidence: number;
  lift: number;
}

interface FrequentItemset {
  items: string[];
  support: number;
  count: number;
}

// Helper to get all subsets of an array
function getSubsets(arr: string[]): string[][] {
  const result: string[][] = [];
  const n = arr.length;
  for (let i = 1; i < Math.pow(2, n) - 1; i++) {
    const subset: string[] = [];
    for (let j = 0; j < n; j++) {
      if (i & (1 << j)) {
        subset.push(arr[j]);
      }
    }
    if (subset.length > 0) {
      result.push(subset.sort());
    }
  }
  return result;
}

// Calculate support for an itemset
function calculateSupport(itemset: string[], transactions: Transaction[]): number {
  const count = transactions.filter(t => 
    itemset.every(item => t.items.includes(item))
  ).length;
  return count / transactions.length;
}

// Generate combinations of k items
function combinations(arr: string[], k: number): string[][] {
  if (k === 1) return arr.map(item => [item]);
  if (k > arr.length) return [];
  
  const result: string[][] = [];
  for (let i = 0; i <= arr.length - k; i++) {
    const rest = combinations(arr.slice(i + 1), k - 1);
    for (const combo of rest) {
      result.push([arr[i], ...combo]);
    }
  }
  return result;
}

// APRIORI Algorithm
function apriori(transactions: Transaction[], params: MiningParams): { itemsets: FrequentItemset[], rules: AssociationRule[] } {
  console.log("Running Apriori algorithm...");
  const allItems = [...new Set(transactions.flatMap(t => t.items))];
  const frequentItemsets: FrequentItemset[] = [];
  
  // Find frequent 1-itemsets
  let currentLevel: string[][] = allItems.map(item => [item]);
  
  for (let k = 1; k <= params.maxRuleLength; k++) {
    const levelItemsets: FrequentItemset[] = [];
    
    for (const candidate of currentLevel) {
      const support = calculateSupport(candidate, transactions);
      if (support >= params.minSupport) {
        levelItemsets.push({
          items: candidate,
          support,
          count: Math.round(support * transactions.length)
        });
      }
    }
    
    frequentItemsets.push(...levelItemsets);
    
    if (levelItemsets.length === 0 || k === params.maxRuleLength) break;
    
    // Generate next level candidates
    const frequentItems = levelItemsets.map(is => is.items);
    const nextCandidates: string[][] = [];
    
    for (let i = 0; i < frequentItems.length; i++) {
      for (let j = i + 1; j < frequentItems.length; j++) {
        const merged = [...new Set([...frequentItems[i], ...frequentItems[j]])].sort();
        if (merged.length === k + 1) {
          const exists = nextCandidates.some(c => 
            c.length === merged.length && c.every(item => merged.includes(item))
          );
          if (!exists) nextCandidates.push(merged);
        }
      }
    }
    
    currentLevel = nextCandidates;
  }
  
  return { itemsets: frequentItemsets, rules: generateRules(frequentItemsets, transactions, params) };
}

// FP-Growth Algorithm (Simplified version)
function fpGrowth(transactions: Transaction[], params: MiningParams): { itemsets: FrequentItemset[], rules: AssociationRule[] } {
  console.log("Running FP-Growth algorithm...");
  
  // Count item frequencies
  const itemCounts: Record<string, number> = {};
  transactions.forEach(t => {
    t.items.forEach(item => {
      itemCounts[item] = (itemCounts[item] || 0) + 1;
    });
  });
  
  // Filter items by min support
  const minCount = params.minSupport * transactions.length;
  const frequentItems = Object.entries(itemCounts)
    .filter(([_, count]) => count >= minCount)
    .sort((a, b) => b[1] - a[1])
    .map(([item]) => item);
  
  const frequentItemsets: FrequentItemset[] = [];
  
  // Add 1-itemsets
  frequentItems.forEach(item => {
    const support = itemCounts[item] / transactions.length;
    frequentItemsets.push({
      items: [item],
      support,
      count: itemCounts[item]
    });
  });
  
  // Build conditional pattern bases and mine
  for (let size = 2; size <= params.maxRuleLength; size++) {
    const combos = combinations(frequentItems, size);
    for (const combo of combos) {
      const support = calculateSupport(combo, transactions);
      if (support >= params.minSupport) {
        frequentItemsets.push({
          items: combo,
          support,
          count: Math.round(support * transactions.length)
        });
      }
    }
  }
  
  return { itemsets: frequentItemsets, rules: generateRules(frequentItemsets, transactions, params) };
}

// ECLAT Algorithm (Vertical Data Format)
function eclat(transactions: Transaction[], params: MiningParams): { itemsets: FrequentItemset[], rules: AssociationRule[] } {
  console.log("Running ECLAT algorithm...");
  
  // Build vertical TID-lists
  const tidLists: Record<string, Set<number>> = {};
  transactions.forEach((t, idx) => {
    t.items.forEach(item => {
      if (!tidLists[item]) tidLists[item] = new Set();
      tidLists[item].add(idx);
    });
  });
  
  const minCount = params.minSupport * transactions.length;
  const frequentItemsets: FrequentItemset[] = [];
  
  // Find frequent items
  const frequentItems = Object.entries(tidLists)
    .filter(([_, tids]) => tids.size >= minCount)
    .map(([item]) => item)
    .sort();
  
  // Add 1-itemsets
  frequentItems.forEach(item => {
    const count = tidLists[item].size;
    frequentItemsets.push({
      items: [item],
      support: count / transactions.length,
      count
    });
  });
  
  // Recursively find larger itemsets using TID intersection
  function eclatExtend(prefix: string[], prefixTids: Set<number>, items: string[]) {
    for (let i = 0; i < items.length; i++) {
      const newItemset = [...prefix, items[i]];
      if (newItemset.length > params.maxRuleLength) continue;
      
      const newTids = new Set([...prefixTids].filter(tid => tidLists[items[i]].has(tid)));
      
      if (newTids.size >= minCount) {
        frequentItemsets.push({
          items: newItemset,
          support: newTids.size / transactions.length,
          count: newTids.size
        });
        
        eclatExtend(newItemset, newTids, items.slice(i + 1));
      }
    }
  }
  
  eclatExtend([], new Set(transactions.map((_, i) => i)), frequentItems);
  
  return { itemsets: frequentItemsets, rules: generateRules(frequentItemsets, transactions, params) };
}

// H-Mine Algorithm (Hyperlinked structure)
function hMine(transactions: Transaction[], params: MiningParams): { itemsets: FrequentItemset[], rules: AssociationRule[] } {
  console.log("Running H-Mine algorithm...");
  
  // Similar to FP-Growth but uses projected database approach
  const itemCounts: Record<string, number> = {};
  transactions.forEach(t => {
    t.items.forEach(item => {
      itemCounts[item] = (itemCounts[item] || 0) + 1;
    });
  });
  
  const minCount = params.minSupport * transactions.length;
  const frequentItems = Object.entries(itemCounts)
    .filter(([_, count]) => count >= minCount)
    .sort((a, b) => b[1] - a[1])
    .map(([item]) => item);
  
  const frequentItemsets: FrequentItemset[] = [];
  
  // Add frequent 1-itemsets
  frequentItems.forEach(item => {
    frequentItemsets.push({
      items: [item],
      support: itemCounts[item] / transactions.length,
      count: itemCounts[item]
    });
  });
  
  // Mine using projected databases
  function mineProjected(prefix: string[], projectedTxns: Transaction[]) {
    if (prefix.length >= params.maxRuleLength) return;
    
    const localCounts: Record<string, number> = {};
    projectedTxns.forEach(t => {
      t.items.forEach(item => {
        if (!prefix.includes(item)) {
          localCounts[item] = (localCounts[item] || 0) + 1;
        }
      });
    });
    
    const localFrequent = Object.entries(localCounts)
      .filter(([_, count]) => count / transactions.length >= params.minSupport)
      .map(([item]) => item);
    
    for (const item of localFrequent) {
      const newPrefix = [...prefix, item].sort();
      const support = calculateSupport(newPrefix, transactions);
      
      if (support >= params.minSupport) {
        const exists = frequentItemsets.some(fi => 
          fi.items.length === newPrefix.length && 
          fi.items.every(i => newPrefix.includes(i))
        );
        
        if (!exists) {
          frequentItemsets.push({
            items: newPrefix,
            support,
            count: Math.round(support * transactions.length)
          });
          
          const newProjected = projectedTxns.filter(t => t.items.includes(item));
          mineProjected(newPrefix, newProjected);
        }
      }
    }
  }
  
  for (const item of frequentItems) {
    const projected = transactions.filter(t => t.items.includes(item));
    mineProjected([item], projected);
  }
  
  return { itemsets: frequentItemsets, rules: generateRules(frequentItemsets, transactions, params) };
}

// CARMA Algorithm (Continuous Association Rule Mining)
function carma(transactions: Transaction[], params: MiningParams): { itemsets: FrequentItemset[], rules: AssociationRule[] } {
  console.log("Running CARMA algorithm...");
  
  // CARMA is designed for streaming data - we simulate with incremental processing
  const candidateTree: Map<string, { count: number; maxError: number }> = new Map();
  const n = transactions.length;
  
  // First pass - count all itemsets up to max length
  transactions.forEach((t, phase) => {
    const items = t.items.sort();
    
    for (let size = 1; size <= Math.min(items.length, params.maxRuleLength); size++) {
      const combos = combinations(items, size);
      for (const combo of combos) {
        const key = combo.join(',');
        const current = candidateTree.get(key) || { count: 0, maxError: phase };
        candidateTree.set(key, { count: current.count + 1, maxError: current.maxError });
      }
    }
  });
  
  // Filter by minimum support
  const frequentItemsets: FrequentItemset[] = [];
  candidateTree.forEach((value, key) => {
    const support = value.count / n;
    if (support >= params.minSupport) {
      frequentItemsets.push({
        items: key.split(','),
        support,
        count: value.count
      });
    }
  });
  
  return { itemsets: frequentItemsets, rules: generateRules(frequentItemsets, transactions, params) };
}

// CHARM Algorithm (Closed Itemsets)
function charm(transactions: Transaction[], params: MiningParams): { itemsets: FrequentItemset[], rules: AssociationRule[] } {
  console.log("Running CHARM algorithm (Closed Itemsets)...");
  
  // Build TID-lists
  const tidLists: Record<string, Set<number>> = {};
  transactions.forEach((t, idx) => {
    t.items.forEach(item => {
      if (!tidLists[item]) tidLists[item] = new Set();
      tidLists[item].add(idx);
    });
  });
  
  const minCount = params.minSupport * transactions.length;
  const closedItemsets: FrequentItemset[] = [];
  
  // Find frequent items
  const frequentItems = Object.entries(tidLists)
    .filter(([_, tids]) => tids.size >= minCount)
    .map(([item]) => item)
    .sort();
  
  // Helper to check if itemset is closed
  function isClosed(itemset: string[], tids: Set<number>): boolean {
    for (const item of frequentItems) {
      if (itemset.includes(item)) continue;
      
      const itemTids = tidLists[item];
      const isSubset = [...tids].every(tid => itemTids.has(tid));
      if (isSubset) return false;
    }
    return true;
  }
  
  // CHARM extend
  function charmExtend(prefix: string[], prefixTids: Set<number>, items: string[]) {
    for (let i = 0; i < items.length; i++) {
      if (prefix.length >= params.maxRuleLength) continue;
      
      const newItemset = [...prefix, items[i]];
      const newTids = new Set([...prefixTids].filter(tid => tidLists[items[i]].has(tid)));
      
      if (newTids.size >= minCount) {
        // Check if closed
        if (isClosed(newItemset, newTids)) {
          closedItemsets.push({
            items: newItemset,
            support: newTids.size / transactions.length,
            count: newTids.size
          });
        }
        
        charmExtend(newItemset, newTids, items.slice(i + 1));
      }
    }
  }
  
  // Start with single items
  for (let i = 0; i < frequentItems.length; i++) {
    const item = frequentItems[i];
    const tids = tidLists[item];
    
    if (tids.size >= minCount && isClosed([item], tids)) {
      closedItemsets.push({
        items: [item],
        support: tids.size / transactions.length,
        count: tids.size
      });
    }
    
    charmExtend([item], tids, frequentItems.slice(i + 1));
  }
  
  return { itemsets: closedItemsets, rules: generateRules(closedItemsets, transactions, params) };
}

// MaxMiner Algorithm (Maximal Itemsets)
function maxMiner(transactions: Transaction[], params: MiningParams): { itemsets: FrequentItemset[], rules: AssociationRule[] } {
  console.log("Running MaxMiner algorithm (Maximal Itemsets)...");
  
  const minCount = params.minSupport * transactions.length;
  const allItems = [...new Set(transactions.flatMap(t => t.items))];
  
  // Count item frequencies
  const itemCounts: Record<string, number> = {};
  transactions.forEach(t => {
    t.items.forEach(item => {
      itemCounts[item] = (itemCounts[item] || 0) + 1;
    });
  });
  
  const frequentItems = Object.entries(itemCounts)
    .filter(([_, count]) => count >= minCount)
    .sort((a, b) => b[1] - a[1])
    .map(([item]) => item);
  
  const maximalItemsets: FrequentItemset[] = [];
  const frequentItemsets: Set<string> = new Set();
  
  // Check if an itemset has any frequent superset
  function hasFrequentSuperset(itemset: string[]): boolean {
    for (const maximal of maximalItemsets) {
      if (itemset.every(item => maximal.items.includes(item)) && maximal.items.length > itemset.length) {
        return true;
      }
    }
    return false;
  }
  
  // DFS with look-ahead
  function search(prefix: string[], remaining: string[], depth: number) {
    if (depth > params.maxRuleLength) return;
    
    const support = calculateSupport(prefix, transactions);
    if (support < params.minSupport) return;
    
    frequentItemsets.add(prefix.sort().join(','));
    
    // Look-ahead: check if prefix + all remaining is frequent
    const fullSet = [...prefix, ...remaining];
    if (fullSet.length <= params.maxRuleLength) {
      const fullSupport = calculateSupport(fullSet, transactions);
      if (fullSupport >= params.minSupport) {
        maximalItemsets.push({
          items: fullSet.sort(),
          support: fullSupport,
          count: Math.round(fullSupport * transactions.length)
        });
        return;
      }
    }
    
    // Continue DFS
    for (let i = 0; i < remaining.length; i++) {
      search([...prefix, remaining[i]], remaining.slice(i + 1), depth + 1);
    }
    
    // Check if maximal
    if (!hasFrequentSuperset(prefix) && prefix.length > 0) {
      const exists = maximalItemsets.some(m => 
        m.items.length === prefix.length && m.items.every(i => prefix.includes(i))
      );
      if (!exists) {
        maximalItemsets.push({
          items: prefix.sort(),
          support,
          count: Math.round(support * transactions.length)
        });
      }
    }
  }
  
  search([], frequentItems, 0);
  
  // Filter to only truly maximal
  const trulyMaximal = maximalItemsets.filter(m1 => 
    !maximalItemsets.some(m2 => 
      m2.items.length > m1.items.length && 
      m1.items.every(item => m2.items.includes(item))
    )
  );
  
  return { itemsets: trulyMaximal, rules: generateRules(trulyMaximal, transactions, params) };
}

// Generate association rules from frequent itemsets
function generateRules(itemsets: FrequentItemset[], transactions: Transaction[], params: MiningParams): AssociationRule[] {
  const rules: AssociationRule[] = [];
  let ruleId = 1;
  
  // Create lookup for itemset support
  const supportLookup: Record<string, number> = {};
  itemsets.forEach(is => {
    supportLookup[is.items.sort().join(',')] = is.support;
  });
  
  // Generate rules from itemsets with 2+ items
  for (const itemset of itemsets) {
    if (itemset.items.length < 2) continue;
    
    const subsets = getSubsets(itemset.items);
    
    for (const antecedent of subsets) {
      const consequent = itemset.items.filter(item => !antecedent.includes(item)).sort();
      if (consequent.length === 0) continue;
      
      const antecedentKey = antecedent.sort().join(',');
      const antecedentSupport = supportLookup[antecedentKey] || calculateSupport(antecedent, transactions);
      
      if (antecedentSupport === 0) continue;
      
      const confidence = itemset.support / antecedentSupport;
      const consequentSupport = supportLookup[consequent.join(',')] || calculateSupport(consequent, transactions);
      const lift = consequentSupport > 0 ? confidence / consequentSupport : 0;
      
      if (confidence >= params.minConfidence && lift >= params.liftThreshold) {
        rules.push({
          id: ruleId++,
          antecedent: antecedent,
          consequent: consequent,
          support: itemset.support,
          confidence,
          lift
        });
      }
    }
  }
  
  return rules.sort((a, b) => b.confidence - a.confidence);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transactions, algorithm, params } = await req.json();
    
    console.log(`Mining with ${algorithm}, ${transactions.length} transactions`);
    console.log(`Params: support=${params.minSupport}, confidence=${params.minConfidence}`);
    
    // Convert transactions to proper format
    const txns: Transaction[] = transactions.map((t: string[]) => ({ items: t }));
    
    let result: { itemsets: FrequentItemset[], rules: AssociationRule[] };
    
    switch (algorithm) {
      case 'apriori':
        result = apriori(txns, params);
        break;
      case 'fpgrowth':
        result = fpGrowth(txns, params);
        break;
      case 'eclat':
        result = eclat(txns, params);
        break;
      case 'hmine':
        result = hMine(txns, params);
        break;
      case 'carma':
        result = carma(txns, params);
        break;
      case 'charm':
        result = charm(txns, params);
        break;
      case 'maxminer':
        result = maxMiner(txns, params);
        break;
      default:
        result = apriori(txns, params);
    }
    
    console.log(`Found ${result.itemsets.length} itemsets and ${result.rules.length} rules`);
    
    return new Response(JSON.stringify({
      success: true,
      itemsets: result.itemsets,
      rules: result.rules,
      algorithm,
      transactionCount: transactions.length,
      uniqueItems: [...new Set(txns.flatMap(t => t.items))].length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Mining error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
