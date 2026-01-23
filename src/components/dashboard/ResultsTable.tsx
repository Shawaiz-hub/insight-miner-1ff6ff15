import { useState } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronRight, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AssociationRule, MiningParams } from "@/pages/Dashboard";

interface ResultsTableProps {
  rules: AssociationRule[];
  algorithm: string;
  params: MiningParams;
}

type SortKey = "support" | "confidence" | "lift";
type SortDir = "asc" | "desc";

const algorithmNames: Record<string, string> = {
  apriori: "Apriori",
  fpgrowth: "FP-Growth",
  eclat: "ECLAT",
  hmine: "H-Mine",
  carma: "CARMA",
  charm: "CHARM",
  maxminer: "MaxMiner",
};

export function ResultsTable({ rules, algorithm, params }: ResultsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("confidence");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sortedRules = [...rules].sort((a, b) => {
    const multiplier = sortDir === "asc" ? 1 : -1;
    return (a[sortKey] - b[sortKey]) * multiplier;
  });

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) return <ArrowUpDown className="w-4 h-4" />;
    return sortDir === "asc" ? (
      <ArrowUp className="w-4 h-4" />
    ) : (
      <ArrowDown className="w-4 h-4" />
    );
  };

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.8) return "text-emerald-400";
    if (conf >= 0.6) return "text-amber-400";
    return "text-muted-foreground";
  };

  const getLiftColor = (lift: number) => {
    if (lift >= 1.5) return "text-emerald-400";
    if (lift >= 1.0) return "text-amber-400";
    return "text-rose-400";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold mb-1">Discovered Rules</h2>
          <p className="text-muted-foreground text-sm">
            Found {rules.length} association rules using {algorithmNames[algorithm]}
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span>Avg Confidence:</span>
            <span className="font-mono text-primary">
              {(
                (rules.reduce((acc, r) => acc + r.confidence, 0) / rules.length) *
                100
              ).toFixed(1)}
              %
            </span>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-secondary/50 border border-border">
          <p className="text-sm text-muted-foreground">Total Rules</p>
          <p className="text-2xl font-bold">{rules.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-secondary/50 border border-border">
          <p className="text-sm text-muted-foreground">Min Support</p>
          <p className="text-2xl font-bold">{(params.minSupport * 100).toFixed(0)}%</p>
        </div>
        <div className="p-4 rounded-xl bg-secondary/50 border border-border">
          <p className="text-sm text-muted-foreground">Min Confidence</p>
          <p className="text-2xl font-bold">{(params.minConfidence * 100).toFixed(0)}%</p>
        </div>
        <div className="p-4 rounded-xl bg-secondary/50 border border-border">
          <p className="text-sm text-muted-foreground">Highest Lift</p>
          <p className="text-2xl font-bold text-primary">
            {Math.max(...rules.map((r) => r.lift)).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full">
          <thead className="bg-secondary/50">
            <tr>
              <th className="text-left py-3 px-4 font-medium">#</th>
              <th className="text-left py-3 px-4 font-medium">Rule</th>
              <th className="text-left py-3 px-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("support")}
                  className="gap-1 -ml-2"
                >
                  Support <SortIcon columnKey="support" />
                </Button>
              </th>
              <th className="text-left py-3 px-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("confidence")}
                  className="gap-1 -ml-2"
                >
                  Confidence <SortIcon columnKey="confidence" />
                </Button>
              </th>
              <th className="text-left py-3 px-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("lift")}
                  className="gap-1 -ml-2"
                >
                  Lift <SortIcon columnKey="lift" />
                </Button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRules.map((rule, index) => (
              <tr
                key={rule.id}
                className="border-t border-border/50 hover:bg-secondary/30 transition-colors"
              >
                <td className="py-3 px-4 text-muted-foreground">{index + 1}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex flex-wrap gap-1">
                      {rule.antecedent.map((item) => (
                        <span
                          key={item}
                          className="px-2 py-0.5 rounded bg-primary/20 text-primary text-sm"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    <div className="flex flex-wrap gap-1">
                      {rule.consequent.map((item) => (
                        <span
                          key={item}
                          className="px-2 py-0.5 rounded bg-secondary text-sm"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 font-mono text-sm">
                  {(rule.support * 100).toFixed(1)}%
                </td>
                <td className={`py-3 px-4 font-mono text-sm ${getConfidenceColor(rule.confidence)}`}>
                  {(rule.confidence * 100).toFixed(1)}%
                </td>
                <td className={`py-3 px-4 font-mono text-sm ${getLiftColor(rule.lift)}`}>
                  {rule.lift.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rules.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No rules found with the current parameters.</p>
          <p className="text-sm">Try lowering the support or confidence thresholds.</p>
        </div>
      )}
    </div>
  );
}
