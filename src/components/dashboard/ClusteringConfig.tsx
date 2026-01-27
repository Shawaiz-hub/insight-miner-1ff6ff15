import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Play, Boxes, CircleDot, Info, CheckCircle2, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useMining } from "@/hooks/useMining";

interface ClusteringConfigProps {
  onResults: (results: ClusteringResults) => void;
}

export interface ClusteringResults {
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

const algorithms = [
  {
    id: "kmeans",
    name: "K-Means",
    icon: Boxes,
    description: "Partition-based clustering that divides data into K distinct non-overlapping clusters.",
    bestFor: "Spherical clusters, known K",
    complexity: "O(n×k×i)",
    params: ["n_clusters"],
  },
  {
    id: "dbscan",
    name: "DBSCAN",
    icon: CircleDot,
    description: "Density-based clustering that finds clusters of arbitrary shapes and identifies outliers.",
    bestFor: "Arbitrary shapes, outlier detection",
    complexity: "O(n log n)",
    params: ["eps", "min_samples"],
  },
];

export function ClusteringConfig({ onResults }: ClusteringConfigProps) {
  const [selectedAlgorithm, setSelectedAlgorithm] = useState("kmeans");
  const [nClusters, setNClusters] = useState(3);
  const [eps, setEps] = useState(0.5);
  const [minSamples, setMinSamples] = useState(5);
  const { runClustering, isRunning, error, progress } = useMining();

  const handleRunClustering = async () => {
    const params = selectedAlgorithm === "kmeans" 
      ? { n_clusters: nClusters }
      : { eps, min_samples: minSamples };
    
    const result = await runClustering(selectedAlgorithm, params);
    if (result) {
      onResults(result);
    }
  };

  const selectedAlgo = algorithms.find(a => a.id === selectedAlgorithm);

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Clustering Mining</h2>
        <p className="text-muted-foreground">
          Group similar data points into clusters
        </p>
      </div>

      {/* Instructions */}
      <Card className="glass-card border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-primary mt-0.5" />
            <div className="space-y-2">
              <p className="font-medium text-sm">Dataset Requirements</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Upload a CSV file with <strong>numeric features</strong></li>
                <li>• Non-numeric columns will be encoded automatically</li>
                <li>• Data will be standardized before clustering</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Algorithm Selection */}
      <div className="space-y-4">
        <label className="text-sm font-medium">Select Clustering Algorithm</label>
        <div className="grid md:grid-cols-2 gap-4">
          {algorithms.map((algo) => (
            <button
              key={algo.id}
              onClick={() => setSelectedAlgorithm(algo.id)}
              className={`relative text-left p-5 rounded-xl border transition-all card-hover ${
                selectedAlgorithm === algo.id
                  ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                  : "border-border hover:border-primary/50"
              }`}
            >
              {selectedAlgorithm === algo.id && (
                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
              
              <div className="feature-icon w-10 h-10 mb-3">
                <algo.icon className="w-5 h-5 text-primary" />
              </div>
              
              <h3 className="font-semibold mb-2">{algo.name}</h3>
              
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {algo.description}
              </p>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Complexity: {algo.complexity}</span>
              </div>
              <p className="text-xs text-primary mt-1">{algo.bestFor}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Algorithm Parameters */}
      <Card className="glass-card border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {selectedAlgo && <selectedAlgo.icon className="w-4 h-4 text-primary" />}
            {selectedAlgo?.name} Parameters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {selectedAlgorithm === "kmeans" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <Label>Number of Clusters (K)</Label>
                  <span className="font-medium text-primary">{nClusters}</span>
                </div>
                <Slider
                  value={[nClusters]}
                  onValueChange={([val]) => setNClusters(val)}
                  min={2}
                  max={15}
                  step={1}
                />
                <p className="text-xs text-muted-foreground">
                  Choose the number of clusters to partition your data into
                </p>
              </div>
            </div>
          )}
          
          {selectedAlgorithm === "dbscan" && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <Label>Epsilon (ε) - Neighborhood Radius</Label>
                  <span className="font-medium text-primary">{eps.toFixed(2)}</span>
                </div>
                <Slider
                  value={[eps]}
                  onValueChange={([val]) => setEps(val)}
                  min={0.1}
                  max={2.0}
                  step={0.05}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum distance between points to be considered neighbors
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <Label>Minimum Samples</Label>
                  <span className="font-medium text-primary">{minSamples}</span>
                </div>
                <Slider
                  value={[minSamples]}
                  onValueChange={([val]) => setMinSamples(val)}
                  min={2}
                  max={20}
                  step={1}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum points required to form a dense region
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Progress */}
      {isRunning && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Clustering...</span>
            <span className="text-primary">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Run Button */}
      <div className="flex justify-end">
        <Button
          variant="hero"
          size="lg"
          onClick={handleRunClustering}
          disabled={isRunning}
          className="gap-2"
        >
          {isRunning ? (
            <>
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Clustering...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run Clustering
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
