import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AssociationRule, FrequentItemset } from "@/pages/Dashboard";

interface ResultsVisualizationProps {
  rules: AssociationRule[];
  itemsets: FrequentItemset[];
}

export function ResultsVisualization({ rules, itemsets }: ResultsVisualizationProps) {
  // Support vs Confidence scatter data
  const scatterData = useMemo(() => {
    return rules.map((rule) => ({
      support: rule.support * 100,
      confidence: rule.confidence * 100,
      lift: rule.lift,
      rule: `${rule.antecedent.join(", ")} → ${rule.consequent.join(", ")}`,
    }));
  }, [rules]);

  // Top items by frequency - Fixed to handle all itemsets and extract individual items
  const itemFrequency = useMemo(() => {
    const freq: Record<string, number> = {};
    
    // First try single-item itemsets
    const singleItemsets = itemsets.filter((is) => is.items.length === 1);
    
    if (singleItemsets.length > 0) {
      singleItemsets.forEach((is) => {
        freq[is.items[0]] = (freq[is.items[0]] || 0) + is.count;
      });
    } else {
      // Fallback: extract items from all itemsets and count occurrences
      itemsets.forEach((is) => {
        is.items.forEach((item) => {
          freq[item] = (freq[item] || 0) + is.count;
        });
      });
    }
    
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([item, count]) => ({ item, count }));
  }, [itemsets]);

  // Confidence distribution
  const confidenceDistribution = useMemo(() => {
    const ranges = [
      { range: "50-60%", min: 0.5, max: 0.6, count: 0 },
      { range: "60-70%", min: 0.6, max: 0.7, count: 0 },
      { range: "70-80%", min: 0.7, max: 0.8, count: 0 },
      { range: "80-90%", min: 0.8, max: 0.9, count: 0 },
      { range: "90-100%", min: 0.9, max: 1.0, count: 0 },
    ];
    rules.forEach((rule) => {
      for (const r of ranges) {
        if (rule.confidence >= r.min && rule.confidence < r.max) {
          r.count++;
          break;
        }
        if (rule.confidence >= 0.9) {
          ranges[4].count++;
          break;
        }
      }
    });
    return ranges.filter((r) => r.count > 0);
  }, [rules]);

  // Lift distribution for pie chart
  const liftDistribution = useMemo(() => {
    const categories = [
      { name: "Weak (< 1.2)", value: 0, fill: "hsl(var(--muted))" },
      { name: "Moderate (1.2-1.5)", value: 0, fill: "hsl(var(--accent))" },
      { name: "Strong (> 1.5)", value: 0, fill: "hsl(var(--primary))" },
    ];
    rules.forEach((rule) => {
      if (rule.lift < 1.2) categories[0].value++;
      else if (rule.lift < 1.5) categories[1].value++;
      else categories[2].value++;
    });
    return categories.filter((c) => c.value > 0);
  }, [rules]);

  // Itemset size distribution
  const itemsetSizes = useMemo(() => {
    const sizes: Record<number, number> = {};
    itemsets.forEach((is) => {
      sizes[is.items.length] = (sizes[is.items.length] || 0) + 1;
    });
    return Object.entries(sizes).map(([size, count]) => ({
      size: `${size}-itemset`,
      count,
    }));
  }, [itemsets]);

  const getScatterColor = (lift: number) => {
    if (lift >= 1.5) return "hsl(var(--primary))";
    if (lift >= 1.2) return "hsl(var(--accent))";
    return "hsl(var(--muted))";
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">Visualizations</h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Support vs Confidence Scatter */}
        <Card className="bg-secondary/30 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Support vs Confidence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <XAxis
                    type="number"
                    dataKey="support"
                    name="Support"
                    unit="%"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis
                    type="number"
                    dataKey="confidence"
                    name="Confidence"
                    unit="%"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background/95 border border-border rounded-lg p-3 shadow-lg">
                            <p className="text-sm font-medium text-foreground mb-1">
                              {data.rule}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Support: {data.support.toFixed(1)}%
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Confidence: {data.confidence.toFixed(1)}%
                            </p>
                            <p className="text-xs text-primary">
                              Lift: {data.lift.toFixed(2)}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Scatter data={scatterData}>
                    {scatterData.map((entry, index) => (
                      <Cell key={index} fill={getScatterColor(entry.lift)} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Item Frequency */}
        <Card className="bg-secondary/30 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Items by Frequency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={itemFrequency}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                >
                  <XAxis
                    type="number"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis
                    type="category"
                    dataKey="item"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    width={55}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Confidence Distribution */}
        <Card className="bg-secondary/30 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Confidence Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={confidenceDistribution}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <XAxis
                    dataKey="range"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Lift Distribution Pie */}
        <Card className="bg-secondary/30 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Lift Strength Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={liftDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {liftDistribution.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend
                    formatter={(value) => (
                      <span style={{ color: "hsl(var(--foreground))" }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Itemset Size Distribution */}
      <Card className="bg-secondary/30 border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Itemset Size Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={itemsetSizes}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <XAxis
                  dataKey="size"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                />
                <YAxis
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
