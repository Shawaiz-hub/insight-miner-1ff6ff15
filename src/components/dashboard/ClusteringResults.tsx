import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, BarChart, Bar } from "recharts";
import { Boxes, CircleDot, Clock, Target, Layers, TrendingUp } from "lucide-react";
import type { ClusteringResults as ClusteringResultsType } from "./ClusteringConfig";

interface ClusteringResultsProps {
  results: ClusteringResultsType;
}

const CLUSTER_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(210, 70%, 50%)',
  'hsl(280, 70%, 50%)',
  'hsl(30, 70%, 50%)',
  'hsl(170, 70%, 50%)',
  'hsl(330, 70%, 50%)',
];

export function ClusteringResults({ results }: ClusteringResultsProps) {
  const AlgorithmIcon = results.algorithm === 'kmeans' ? Boxes : CircleDot;

  // Prepare scatter plot data using first two features
  const scatterData = useMemo(() => {
    if (results.data_points.length === 0) return [];
    
    return results.data_points.map((point, idx) => ({
      x: point.features[0] || 0,
      y: point.features[1] || 0,
      cluster: point.cluster,
      index: idx,
    }));
  }, [results.data_points]);

  // Prepare cluster size pie chart data
  const clusterSizeData = useMemo(() => {
    return Object.entries(results.cluster_sizes).map(([cluster, size]) => ({
      name: cluster === '-1' ? 'Noise' : `Cluster ${cluster}`,
      value: size,
      cluster: parseInt(cluster),
    }));
  }, [results.cluster_sizes]);

  // Prepare bar chart for cluster distribution
  const clusterDistribution = useMemo(() => {
    return clusterSizeData.map(d => ({
      ...d,
      percentage: ((d.value / results.data_points.length) * 100).toFixed(1),
    }));
  }, [clusterSizeData, results.data_points.length]);

  const getSilhouetteColor = (score: number) => {
    if (score >= 0.7) return 'text-green-500';
    if (score >= 0.5) return 'text-emerald-500';
    if (score >= 0.25) return 'text-amber-500';
    return 'text-red-500';
  };

  const getSilhouetteLabel = (score: number) => {
    if (score >= 0.7) return 'Excellent';
    if (score >= 0.5) return 'Good';
    if (score >= 0.25) return 'Fair';
    if (score > 0) return 'Weak';
    return 'Poor';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="feature-icon w-12 h-12">
            <AlgorithmIcon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Clustering Results</h3>
            <p className="text-sm text-muted-foreground">
              {results.algorithm === 'kmeans' ? 'K-Means' : 'DBSCAN'} Clustering
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
        <Card className="glass-card border-border/50 overflow-hidden">
          <CardContent className="p-4 relative">
            <div className="absolute inset-0 opacity-10 bg-primary" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <Layers className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Clusters Found</span>
              </div>
              <p className="text-3xl font-bold text-primary">
                {results.n_clusters}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/50 overflow-hidden">
          <CardContent className="p-4 relative">
            <div className="absolute inset-0 opacity-10 bg-chart-2" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4" style={{ color: 'hsl(var(--chart-2))' }} />
                <span className="text-xs text-muted-foreground">Silhouette Score</span>
              </div>
              <p className={`text-3xl font-bold ${getSilhouetteColor(results.silhouette_score)}`}>
                {results.silhouette_score.toFixed(3)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {getSilhouetteLabel(results.silhouette_score)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/50 overflow-hidden">
          <CardContent className="p-4 relative">
            <div className="absolute inset-0 opacity-10 bg-chart-3" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4" style={{ color: 'hsl(var(--chart-3))' }} />
                <span className="text-xs text-muted-foreground">Data Points</span>
              </div>
              <p className="text-3xl font-bold" style={{ color: 'hsl(var(--chart-3))' }}>
                {results.data_points.length}
              </p>
            </div>
          </CardContent>
        </Card>

        {results.inertia !== undefined && (
          <Card className="glass-card border-border/50 overflow-hidden">
            <CardContent className="p-4 relative">
              <div className="absolute inset-0 opacity-10 bg-chart-4" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <Boxes className="w-4 h-4" style={{ color: 'hsl(var(--chart-4))' }} />
                  <span className="text-xs text-muted-foreground">Inertia</span>
                </div>
                <p className="text-3xl font-bold" style={{ color: 'hsl(var(--chart-4))' }}>
                  {results.inertia.toFixed(1)}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Scatter Plot */}
        <Card className="glass-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Cluster Visualization (First 2 Features)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    type="number" 
                    dataKey="x" 
                    name={results.feature_names[0] || 'Feature 1'}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="y" 
                    name={results.feature_names[1] || 'Feature 2'}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number, name: string) => [value.toFixed(3), name]}
                    labelFormatter={(_, payload) => {
                      if (payload && payload[0]) {
                        return `Cluster: ${payload[0].payload.cluster === -1 ? 'Noise' : payload[0].payload.cluster}`;
                      }
                      return '';
                    }}
                  />
                  <Scatter data={scatterData}>
                    {scatterData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.cluster === -1 ? 'hsl(var(--muted-foreground))' : CLUSTER_COLORS[entry.cluster % CLUSTER_COLORS.length]}
                        opacity={entry.cluster === -1 ? 0.3 : 0.8}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Cluster Size Distribution */}
        <Card className="glass-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cluster Size Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={clusterSizeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {clusterSizeData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.cluster === -1 ? 'hsl(var(--muted-foreground))' : CLUSTER_COLORS[entry.cluster % CLUSTER_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`${value} points`, 'Size']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cluster Details Bar Chart */}
      <Card className="glass-card border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Cluster Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={clusterDistribution} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  label={{ value: 'Points', angle: -90, position: 'insideLeft', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number, _name: string, props: { payload: { percentage: string } }) => [
                    `${value} points (${props.payload.percentage}%)`,
                    'Size'
                  ]}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {clusterDistribution.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.cluster === -1 ? 'hsl(var(--muted-foreground))' : CLUSTER_COLORS[entry.cluster % CLUSTER_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Cluster Centers (for K-Means) */}
      {results.cluster_centers && results.cluster_centers.length > 0 && (
        <Card className="glass-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cluster Centers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="p-2 text-left text-muted-foreground">Cluster</th>
                    {results.feature_names.slice(0, 6).map((name, i) => (
                      <th key={i} className="p-2 text-center font-medium">{name}</th>
                    ))}
                    {results.feature_names.length > 6 && (
                      <th className="p-2 text-center text-muted-foreground">...</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {results.cluster_centers.map((center, i) => (
                    <tr key={i} className="border-t border-border/50">
                      <td className="p-2 font-medium">
                        <span 
                          className="inline-block w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: CLUSTER_COLORS[i % CLUSTER_COLORS.length] }}
                        />
                        Cluster {i}
                      </td>
                      {center.slice(0, 6).map((val, j) => (
                        <td key={j} className="p-2 text-center font-mono text-xs">
                          {val.toFixed(3)}
                        </td>
                      ))}
                      {center.length > 6 && (
                        <td className="p-2 text-center text-muted-foreground">...</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
