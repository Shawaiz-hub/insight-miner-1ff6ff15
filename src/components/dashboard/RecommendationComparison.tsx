import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import { TrendingUp, Lightbulb, Zap } from "lucide-react";

interface HistoryItem {
  id: string;
  algorithm: string;
  task_type: string;
  dataset_name: string | null;
  results_summary: unknown;
  execution_time_ms: number | null;
  created_at: string;
}

interface RecommendationComparisonProps {
  history: HistoryItem[];
}

interface ParsedEntry {
  dataset: string;
  algorithm: string;
  recommended: string;
  score: number;
  rulesCount: number;
  executionMs: number;
  date: string;
}

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(262 80% 60%)",
  "hsl(142 70% 45%)",
  "hsl(38 92% 50%)",
  "hsl(350 80% 55%)",
  "hsl(190 80% 45%)",
];

export function RecommendationComparison({ history }: RecommendationComparisonProps) {
  const entries = useMemo<ParsedEntry[]>(() => {
    return history
      .filter(item => {
        if (!item.results_summary || typeof item.results_summary !== "object") return false;
        const summary = item.results_summary as Record<string, unknown>;
        return summary.recommended_algorithm || summary.recommendation_score;
      })
      .map(item => {
        const summary = item.results_summary as Record<string, unknown>;
        return {
          dataset: item.dataset_name || "Unnamed",
          algorithm: item.algorithm,
          recommended: (summary.recommended_algorithm as string) || item.algorithm,
          score: (summary.recommendation_score as number) || 0,
          rulesCount: (summary.rules_count as number) || 0,
          executionMs: item.execution_time_ms || 0,
          date: item.created_at,
        };
      })
      .slice(0, 10);
  }, [history]);

  const chartData = useMemo(() => {
    return entries.map((e, i) => ({
      name: e.dataset.length > 15 ? e.dataset.slice(0, 15) + "…" : e.dataset,
      score: e.score,
      rules: e.rulesCount,
      time: Math.round(e.executionMs / 1000 * 100) / 100,
      recommended: e.recommended,
      algorithm: e.algorithm,
      fill: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [entries]);

  if (entries.length < 2) return null;

  return (
    <Card className="bg-secondary/30 border-border mb-6">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm sm:text-base">Recommendation Comparison</h3>
            <p className="text-xs text-muted-foreground">AI recommendation scores across your datasets</p>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="h-56 sm:h-64 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickLine={false}
                label={{ value: "Score", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" } }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value: number, name: string) => {
                  if (name === "score") return [`${value}`, "AI Score"];
                  return [value, name];
                }}
                labelFormatter={(label: string) => `Dataset: ${label}`}
              />
              <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} opacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Comparison Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-3 text-muted-foreground font-medium">Dataset</th>
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Used</th>
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Recommended</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">Score</th>
                <th className="text-right py-2 pl-3 text-muted-foreground font-medium">Rules</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => {
                const usedRecommended = entry.algorithm.toLowerCase().replace(/[\s_]/g, '-') === 
                  entry.recommended.toLowerCase().replace(/[\s_]/g, '-');
                return (
                  <tr key={entry.date + i} className="border-b border-border/50 last:border-0">
                    <td className="py-2 pr-3 font-medium truncate max-w-[120px]">{entry.dataset}</td>
                    <td className="py-2 px-3">
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {entry.algorithm.replace(/-/g, ' ')}
                      </Badge>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1">
                        <Lightbulb className="w-3 h-3 text-primary" />
                        <span className="capitalize">{entry.recommended.replace(/-/g, ' ')}</span>
                        {usedRecommended && (
                          <Zap className="w-3 h-3 text-green-500" />
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span
                        className="inline-block w-10 text-center font-mono font-bold rounded px-1"
                        style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}
                      >
                        {entry.score}
                      </span>
                    </td>
                    <td className="py-2 pl-3 text-right text-muted-foreground">{entry.rulesCount.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
