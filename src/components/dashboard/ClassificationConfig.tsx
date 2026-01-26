import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Brain, TreeDeciduous, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useMining } from "@/hooks/useMining";

interface ClassificationConfigProps {
  onResults: (results: ClassificationResults) => void;
}

export interface ClassificationResults {
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  confusion_matrix: number[][];
  class_labels: string[];
  classification_report: string;
  algorithm: string;
  feature_importances?: Array<{ feature: string; importance: number }>;
  execution_time: number;
}

const algorithms = [
  {
    id: "naive-bayes",
    name: "Naive Bayes",
    icon: Brain,
    description: "Probabilistic classifier based on Bayes' theorem with strong independence assumptions.",
    bestFor: "Text classification, small datasets",
    complexity: "O(n×d)",
  },
  {
    id: "decision-tree",
    name: "Decision Tree",
    icon: TreeDeciduous,
    description: "Tree-structured classifier that splits data based on feature values to make predictions.",
    bestFor: "Interpretable models, mixed data types",
    complexity: "O(n×d×log n)",
  },
];

export function ClassificationConfig({ onResults }: ClassificationConfigProps) {
  const [selectedAlgorithm, setSelectedAlgorithm] = useState("naive-bayes");
  const { runClassification, isRunning, error, progress } = useMining();

  const handleRunClassification = async () => {
    const result = await runClassification(selectedAlgorithm);
    if (result) {
      onResults({
        accuracy: result.accuracy,
        precision: result.precision,
        recall: result.recall,
        f1_score: result.f1_score,
        confusion_matrix: result.confusion_matrix,
        class_labels: result.class_labels,
        classification_report: result.classification_report,
        algorithm: result.algorithm,
        feature_importances: result.feature_importances,
        execution_time: result.execution_time,
      });
    }
  };

  const selectedAlgo = algorithms.find(a => a.id === selectedAlgorithm);

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Classification Mining</h2>
        <p className="text-muted-foreground">
          Train a classifier to predict class labels from your dataset
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
                <li>• Upload a CSV file where the <strong>last column</strong> is the class label</li>
                <li>• All other columns will be used as features</li>
                <li>• Categorical features will be automatically encoded</li>
                <li>• Data will be split 80/20 for training and testing</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Algorithm Selection */}
      <div className="space-y-4">
        <label className="text-sm font-medium">Select Classification Algorithm</label>
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

      {/* Selected Algorithm Details */}
      {selectedAlgo && (
        <Card className="glass-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <selectedAlgo.icon className="w-4 h-4 text-primary" />
              {selectedAlgo.name} Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{selectedAlgo.description}</p>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 rounded bg-secondary text-xs">Auto hyperparameter tuning</span>
              <span className="px-2 py-1 rounded bg-secondary text-xs">Cross-validation ready</span>
              <span className="px-2 py-1 rounded bg-secondary text-xs">Feature importance</span>
            </div>
          </CardContent>
        </Card>
      )}

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
            <span className="text-muted-foreground">Training model...</span>
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
          onClick={handleRunClassification}
          disabled={isRunning}
          className="gap-2"
        >
          {isRunning ? (
            <>
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Training...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run Classification
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
