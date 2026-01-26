import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Database, TrendingUp, Layers, Activity } from "lucide-react";
import type { DatasetProfile } from "@/hooks/useMining";

interface DatasetPreviewProps {
  stats: {
    transactions: number;
    unique_items: number;
    avg_items_per_transaction: number;
    top_items?: Array<{ item: string; count: number }>;
  } | null;
  profile: DatasetProfile | null;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function DatasetPreview({ stats, profile }: DatasetPreviewProps) {
  const [transactionDistribution, setTransactionDistribution] = useState<Array<{ name: string; value: number }>>([]);

  useEffect(() => {
    if (profile) {
      // Create mock transaction length distribution based on profile
      const avg = profile.avg_transaction_length;
      const distribution = [
        { name: '1-3 items', value: Math.max(5, Math.round(30 * (3 / avg))) },
        { name: '4-6 items', value: Math.max(10, Math.round(35 * (avg / 5))) },
        { name: '7-10 items', value: Math.max(5, Math.round(20 * (avg / 8))) },
        { name: '10+ items', value: Math.max(2, Math.round(15 * (avg / 12))) },
      ];
      setTransactionDistribution(distribution);
    }
  }, [profile]);

  if (!stats) {
    return null;
  }

  const topItemsData = stats.top_items?.slice(0, 10).map(item => ({
    name: item.item.length > 12 ? item.item.substring(0, 12) + '...' : item.item,
    count: item.count,
    fullName: item.item,
  })) || [];

  const densityData = profile ? [
    { name: 'Density', value: profile.density * 100 },
    { name: 'Sparsity', value: profile.sparsity * 100 },
  ] : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <div className="feature-icon w-10 h-10">
          <Activity className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Dataset Analysis</h3>
          <p className="text-sm text-muted-foreground">Visual overview of your transaction data</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card border-border/50">
          <CardContent className="p-4 text-center">
            <Database className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-primary">{stats.transactions.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Transactions</p>
          </CardContent>
        </Card>
        
        <Card className="glass-card border-border/50">
          <CardContent className="p-4 text-center">
            <Layers className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-primary">{stats.unique_items.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Unique Items</p>
          </CardContent>
        </Card>
        
        <Card className="glass-card border-border/50">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-primary">{stats.avg_items_per_transaction.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Avg Items/Trans</p>
          </CardContent>
        </Card>
        
        <Card className="glass-card border-border/50">
          <CardContent className="p-4 text-center">
            <Activity className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-primary">{profile?.estimated_memory_mb.toFixed(1) || '—'}MB</p>
            <p className="text-xs text-muted-foreground">Est. Memory</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Items Bar Chart */}
        {topItemsData.length > 0 && (
          <Card className="glass-card border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Top 10 Most Frequent Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topItemsData} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={80} 
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number, _name: string, props: { payload: { fullName: string } }) => [
                        `${value} occurrences`,
                        props.payload.fullName
                      ]}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transaction Distribution */}
        <Card className="glass-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Transaction Size Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={transactionDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {transactionDistribution.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Density/Sparsity Indicator */}
      {profile && (
        <Card className="glass-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Dataset Characteristics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-secondary/30">
                <p className="text-xs text-muted-foreground mb-1">Density</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${Math.min(profile.density * 100 * 10, 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{(profile.density * 100).toFixed(2)}%</span>
                </div>
              </div>
              
              <div className="p-3 rounded-lg bg-secondary/30">
                <p className="text-xs text-muted-foreground mb-1">Sparsity</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-chart-2 transition-all duration-500"
                      style={{ width: `${profile.sparsity * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{(profile.sparsity * 100).toFixed(1)}%</span>
                </div>
              </div>
              
              <div className="p-3 rounded-lg bg-secondary/30">
                <p className="text-xs text-muted-foreground mb-1">Dataset Size</p>
                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                  profile.is_large ? 'bg-amber-500/20 text-amber-500' : 'bg-green-500/20 text-green-500'
                }`}>
                  {profile.is_large ? 'Large' : 'Standard'}
                </span>
              </div>
              
              <div className="p-3 rounded-lg bg-secondary/30">
                <p className="text-xs text-muted-foreground mb-1">Recommendation</p>
                <span className="text-sm font-medium text-primary">
                  {profile.is_sparse ? 'FP-Growth' : profile.is_large ? 'ECLAT' : 'Apriori'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
