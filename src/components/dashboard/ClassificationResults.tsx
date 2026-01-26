import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { CheckCircle2, Target, TrendingUp, Clock, Brain, TreeDeciduous } from "lucide-react";
import type { ClassificationResults as ClassificationResultsType } from "./ClassificationConfig";

interface ClassificationResultsProps {
  results: ClassificationResultsType;
}

export function ClassificationResults({ results }: ClassificationResultsProps) {
  const metrics = [
    { name: 'Accuracy', value: results.accuracy, icon: Target, color: 'hsl(var(--primary))' },
    { name: 'Precision', value: results.precision, icon: CheckCircle2, color: 'hsl(var(--chart-2))' },
    { name: 'Recall', value: results.recall, icon: TrendingUp, color: 'hsl(var(--chart-3))' },
    { name: 'F1 Score', value: results.f1_score, icon: Brain, color: 'hsl(var(--chart-4))' },
  ];

  const AlgorithmIcon = results.algorithm === 'naive-bayes' ? Brain : TreeDeciduous;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="feature-icon w-12 h-12">
            <AlgorithmIcon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Classification Results</h3>
            <p className="text-sm text-muted-foreground">
              {results.algorithm === 'naive-bayes' ? 'Naive Bayes' : 'Decision Tree'} Classifier
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          {results.execution_time.toFixed(3)}s
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.name} className="glass-card border-border/50 overflow-hidden">
            <CardContent className="p-4 relative">
              <div 
                className="absolute inset-0 opacity-10"
                style={{ backgroundColor: metric.color }}
              />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <metric.icon className="w-4 h-4" style={{ color: metric.color }} />
                  <span className="text-xs text-muted-foreground">{metric.name}</span>
                </div>
                <p className="text-3xl font-bold" style={{ color: metric.color }}>
                  {(metric.value * 100).toFixed(1)}%
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Confusion Matrix */}
      <Card className="glass-card border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Confusion Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="p-2 text-left text-muted-foreground"></th>
                  {results.class_labels.map((label) => (
                    <th key={label} className="p-2 text-center font-medium">
                      Predicted: {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.confusion_matrix.map((row, i) => (
                  <tr key={i}>
                    <td className="p-2 font-medium text-muted-foreground">
                      Actual: {results.class_labels[i]}
                    </td>
                    {row.map((value, j) => {
                      const isCorrect = i === j;
                      const total = row.reduce((a, b) => a + b, 0);
                      const percentage = total > 0 ? (value / total) * 100 : 0;
                      
                      return (
                        <td 
                          key={j} 
                          className={`p-2 text-center font-mono ${
                            isCorrect 
                              ? 'bg-green-500/20 text-green-500' 
                              : value > 0 
                                ? 'bg-red-500/10 text-red-400' 
                                : 'text-muted-foreground'
                          }`}
                        >
                          <div>{value}</div>
                          <div className="text-xs opacity-70">({percentage.toFixed(1)}%)</div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Feature Importance (for Decision Tree) */}
      {results.feature_importances && results.feature_importances.length > 0 && (
        <Card className="glass-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Feature Importance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={results.feature_importances.slice(0, 10)} 
                  layout="vertical"
                  margin={{ left: 100, right: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    type="number" 
                    domain={[0, 1]}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    dataKey="feature" 
                    type="category" 
                    width={90}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [(value * 100).toFixed(2) + '%', 'Importance']}
                  />
                  <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                    {results.feature_importances.slice(0, 10).map((_, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={`hsl(var(--chart-${(index % 5) + 1}))`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Classification Report */}
      <Card className="glass-card border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Detailed Classification Report</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs font-mono bg-secondary/30 p-4 rounded-lg overflow-x-auto whitespace-pre">
            {results.classification_report}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
