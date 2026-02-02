import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Download, FileJson, FileSpreadsheet, FileText, Check } from "lucide-react";
import type { AssociationRule, FrequentItemset, MiningParams } from "@/pages/Dashboard";

interface ClusteringData {
  algorithm: string;
  n_clusters: number;
  cluster_labels: number[];
  silhouette_score: number;
  cluster_sizes: { [key: string]: number };
  data_points: Array<{ features: number[]; cluster: number }>;
}

interface ClassificationData {
  algorithm: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  confusion_matrix: number[][];
  class_labels: string[];
  classification_report: string;
}

interface ExportResultsProps {
  // Association rule mining
  rules?: AssociationRule[];
  itemsets?: FrequentItemset[];
  algorithm?: string;
  params?: MiningParams;
  transactionCount?: number;
  // Clustering
  clusteringData?: ClusteringData;
  // Classification
  classificationData?: ClassificationData;
  // Export type
  exportType?: "association" | "clustering" | "classification";
}

const algorithmNames: Record<string, string> = {
  apriori: "Apriori",
  fpgrowth: "FP-Growth",
  eclat: "ECLAT",
  hmine: "H-Mine",
  carma: "CARMA",
  charm: "CHARM",
  maxminer: "MaxMiner",
  kmeans: "K-Means",
  dbscan: "DBSCAN",
  hierarchical: "Hierarchical",
  decision_tree: "Decision Tree",
  random_forest: "Random Forest",
  naive_bayes: "Naive Bayes",
  svm: "SVM",
  knn: "K-NN",
};

export function ExportResults({
  rules = [],
  itemsets = [],
  algorithm = "unknown",
  params,
  transactionCount = 0,
  clusteringData,
  classificationData,
  exportType = "association",
}: ExportResultsProps) {
  const [exportedFormat, setExportedFormat] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const generateAssociationCSV = () => {
    const headers = ["Rule #", "Antecedent", "Consequent", "Support (%)", "Confidence (%)", "Lift"];
    const rows = rules.map((rule) => [
      rule.id,
      `"${rule.antecedent.join(", ")}"`,
      `"${rule.consequent.join(", ")}"`,
      (rule.support * 100).toFixed(2),
      (rule.confidence * 100).toFixed(2),
      rule.lift.toFixed(3),
    ]);

    const configSection = [
      "# Mining Configuration",
      `Algorithm,${algorithmNames[algorithm] || algorithm}`,
      `Min Support,${params ? (params.minSupport * 100).toFixed(1) : 0}%`,
      `Min Confidence,${params ? (params.minConfidence * 100).toFixed(1) : 0}%`,
      `Max Rule Length,${params?.maxRuleLength || 0}`,
      `Lift Threshold,${params?.liftThreshold || 0}`,
      `Transactions Processed,${transactionCount}`,
      `Total Rules Found,${rules.length}`,
      `Total Itemsets Found,${itemsets.length}`,
      "",
      "# Association Rules",
    ];

    return [...configSection, headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  };

  const generateClusteringCSV = () => {
    if (!clusteringData) return "";
    
    const configSection = [
      "# Clustering Results",
      `Algorithm,${algorithmNames[clusteringData.algorithm] || clusteringData.algorithm}`,
      `Number of Clusters,${clusteringData.n_clusters}`,
      `Silhouette Score,${clusteringData.silhouette_score.toFixed(4)}`,
      "",
      "# Cluster Sizes",
      ...Object.entries(clusteringData.cluster_sizes).map(([cluster, size]) => 
        `Cluster ${cluster},${size} points`
      ),
      "",
      "# Data Point Assignments",
      "Point Index,Cluster Label,Features",
    ];
    
    const dataRows = clusteringData.data_points.map((point, idx) => 
      `${idx},${point.cluster},"${point.features.join(", ")}"`
    );
    
    return [...configSection, ...dataRows].join("\n");
  };

  const generateClassificationCSV = () => {
    if (!classificationData) return "";
    
    const configSection = [
      "# Classification Results",
      `Algorithm,${algorithmNames[classificationData.algorithm] || classificationData.algorithm}`,
      `Accuracy,${(classificationData.accuracy * 100).toFixed(2)}%`,
      `Precision,${(classificationData.precision * 100).toFixed(2)}%`,
      `Recall,${(classificationData.recall * 100).toFixed(2)}%`,
      `F1 Score,${(classificationData.f1_score * 100).toFixed(2)}%`,
      "",
      "# Confusion Matrix",
      `Classes,${classificationData.class_labels.join(",")}`,
      ...classificationData.confusion_matrix.map((row, idx) => 
        `${classificationData.class_labels[idx]},${row.join(",")}`
      ),
      "",
      "# Detailed Report",
      classificationData.classification_report,
    ];
    
    return configSection.join("\n");
  };

  const generateCSV = () => {
    switch (exportType) {
      case "clustering":
        return generateClusteringCSV();
      case "classification":
        return generateClassificationCSV();
      default:
        return generateAssociationCSV();
    }
  };

  const generateJSON = () => {
    const baseData = {
      metadata: {
        exportDate: new Date().toISOString(),
        exportType,
      },
    };

    switch (exportType) {
      case "clustering":
        return JSON.stringify({
          ...baseData,
          clustering: clusteringData,
        }, null, 2);
      case "classification":
        return JSON.stringify({
          ...baseData,
          classification: classificationData,
        }, null, 2);
      default:
        return JSON.stringify({
          ...baseData,
          metadata: {
            ...baseData.metadata,
            algorithm: algorithmNames[algorithm] || algorithm,
            algorithmId: algorithm,
            parameters: params,
            statistics: {
              transactionCount,
              rulesFound: rules.length,
              itemsetsFound: itemsets.length,
              avgConfidence: rules.length > 0
                ? rules.reduce((acc, r) => acc + r.confidence, 0) / rules.length
                : 0,
              avgLift: rules.length > 0
                ? rules.reduce((acc, r) => acc + r.lift, 0) / rules.length
                : 0,
            },
          },
          frequentItemsets: itemsets.map((is) => ({
            items: is.items,
            support: is.support,
            count: is.count,
          })),
          associationRules: rules.map((rule) => ({
            id: rule.id,
            antecedent: rule.antecedent,
            consequent: rule.consequent,
            support: rule.support,
            confidence: rule.confidence,
            lift: rule.lift,
          })),
        }, null, 2);
    }
  };

  const generateHTML = () => {
    const title = exportType === "clustering" 
      ? `Clustering Report - ${algorithmNames[clusteringData?.algorithm || ""] || clusteringData?.algorithm}`
      : exportType === "classification"
      ? `Classification Report - ${algorithmNames[classificationData?.algorithm || ""] || classificationData?.algorithm}`
      : `Mining Report - ${algorithmNames[algorithm] || algorithm}`;

    const statsHtml = exportType === "clustering" && clusteringData ? `
      <div class="stats-grid">
        <div class="stat-box">
          <div class="stat-value">${clusteringData.n_clusters}</div>
          <div class="stat-label">Clusters</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${clusteringData.silhouette_score.toFixed(3)}</div>
          <div class="stat-label">Silhouette Score</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${clusteringData.data_points.length}</div>
          <div class="stat-label">Data Points</div>
        </div>
      </div>
      <h2>Cluster Sizes</h2>
      <table class="config-table">
        ${Object.entries(clusteringData.cluster_sizes).map(([cluster, size]) => 
          `<tr><td>Cluster ${cluster}</td><td>${size} points</td></tr>`
        ).join("")}
      </table>
    ` : exportType === "classification" && classificationData ? `
      <div class="stats-grid">
        <div class="stat-box">
          <div class="stat-value">${(classificationData.accuracy * 100).toFixed(1)}%</div>
          <div class="stat-label">Accuracy</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${(classificationData.precision * 100).toFixed(1)}%</div>
          <div class="stat-label">Precision</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${(classificationData.recall * 100).toFixed(1)}%</div>
          <div class="stat-label">Recall</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${(classificationData.f1_score * 100).toFixed(1)}%</div>
          <div class="stat-label">F1 Score</div>
        </div>
      </div>
      <h2>Confusion Matrix</h2>
      <table class="rules-table">
        <thead>
          <tr>
            <th></th>
            ${classificationData.class_labels.map(l => `<th>${l}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${classificationData.confusion_matrix.map((row, idx) => `
            <tr>
              <td><strong>${classificationData.class_labels[idx]}</strong></td>
              ${row.map(val => `<td>${val}</td>`).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    ` : `
      <h2>Configuration</h2>
      <table class="config-table">
        <tr><td>Algorithm</td><td>${algorithmNames[algorithm] || algorithm}</td></tr>
        <tr><td>Minimum Support</td><td>${params ? (params.minSupport * 100).toFixed(1) : 0}%</td></tr>
        <tr><td>Minimum Confidence</td><td>${params ? (params.minConfidence * 100).toFixed(1) : 0}%</td></tr>
        <tr><td>Maximum Rule Length</td><td>${params?.maxRuleLength || 0}</td></tr>
      </table>
      <div class="stats-grid">
        <div class="stat-box">
          <div class="stat-value">${transactionCount}</div>
          <div class="stat-label">Transactions</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${itemsets.length}</div>
          <div class="stat-label">Itemsets</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${rules.length}</div>
          <div class="stat-label">Rules</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${rules.length > 0 ? ((rules.reduce((a, r) => a + r.confidence, 0) / rules.length) * 100).toFixed(1) : 0}%</div>
          <div class="stat-label">Avg Confidence</div>
        </div>
      </div>
      <h2>Discovered Rules</h2>
      <table class="rules-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Antecedent</th>
            <th>→</th>
            <th>Consequent</th>
            <th>Support</th>
            <th>Confidence</th>
            <th>Lift</th>
          </tr>
        </thead>
        <tbody>
          ${rules.map((rule) => `
            <tr>
              <td>${rule.id}</td>
              <td>${rule.antecedent.join(", ")}</td>
              <td style="text-align: center;">→</td>
              <td>${rule.consequent.join(", ")}</td>
              <td>${(rule.support * 100).toFixed(1)}%</td>
              <td>${(rule.confidence * 100).toFixed(1)}%</td>
              <td>${rule.lift.toFixed(2)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    h1 { color: #0ea5e9; border-bottom: 2px solid #0ea5e9; padding-bottom: 10px; }
    h2 { color: #0ea5e9; margin-top: 30px; }
    .config-table, .rules-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .config-table td, .rules-table th, .rules-table td { padding: 10px; border: 1px solid #ddd; }
    .config-table td:first-child { font-weight: bold; background: #f5f5f5; width: 200px; }
    .rules-table th { background: #0ea5e9; color: white; }
    .rules-table tr:nth-child(even) { background: #f9f9f9; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
    .stat-box { background: #f0f9ff; padding: 15px; border-radius: 8px; text-align: center; }
    .stat-value { font-size: 24px; font-weight: bold; color: #0ea5e9; }
    .stat-label { font-size: 12px; color: #666; }
    .footer { margin-top: 40px; text-align: center; color: #888; font-size: 12px; }
  </style>
</head>
<body>
  <h1>🔍 SmartMine ${title}</h1>
  ${statsHtml}
  <div class="footer">
    Generated by SmartMine on ${new Date().toLocaleString()}
  </div>
</body>
</html>
    `;
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExport = (format: "csv" | "json" | "html") => {
    const timestamp = new Date().toISOString().split("T")[0];
    const algoName = exportType === "clustering" 
      ? clusteringData?.algorithm 
      : exportType === "classification" 
      ? classificationData?.algorithm 
      : algorithm;
    const filename = `smartmine-${exportType}-${algoName}-${timestamp}`;

    switch (format) {
      case "csv":
        downloadFile(generateCSV(), `${filename}.csv`, "text/csv");
        break;
      case "json":
        downloadFile(generateJSON(), `${filename}.json`, "application/json");
        break;
      case "html":
        downloadFile(generateHTML(), `${filename}.html`, "text/html");
        break;
    }

    setExportedFormat(format);
    setTimeout(() => setExportedFormat(null), 2000);
  };

  const itemCount = exportType === "clustering" 
    ? `${clusteringData?.n_clusters || 0} clusters`
    : exportType === "classification"
    ? `${classificationData?.class_labels?.length || 0} classes`
    : `${rules.length} rules and ${itemsets.length} itemsets`;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export Results
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export {exportType.charAt(0).toUpperCase() + exportType.slice(1)} Results</DialogTitle>
          <DialogDescription>
            Choose a format to export your {itemCount}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-4">
          <button
            onClick={() => handleExport("csv")}
            className="w-full flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-secondary/50 transition-colors text-left"
          >
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <FileSpreadsheet className="w-6 h-6 text-emerald-500" />
            </div>
            <div className="flex-1">
              <p className="font-medium">CSV Spreadsheet</p>
              <p className="text-sm text-muted-foreground">
                Compatible with Excel, Google Sheets
              </p>
            </div>
            {exportedFormat === "csv" && <Check className="w-5 h-5 text-emerald-500" />}
          </button>

          <button
            onClick={() => handleExport("json")}
            className="w-full flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-secondary/50 transition-colors text-left"
          >
            <div className="p-2 rounded-lg bg-amber-500/10">
              <FileJson className="w-6 h-6 text-amber-500" />
            </div>
            <div className="flex-1">
              <p className="font-medium">JSON Data</p>
              <p className="text-sm text-muted-foreground">
                For programmatic use and APIs
              </p>
            </div>
            {exportedFormat === "json" && <Check className="w-5 h-5 text-emerald-500" />}
          </button>

          <button
            onClick={() => handleExport("html")}
            className="w-full flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-secondary/50 transition-colors text-left"
          >
            <div className="p-2 rounded-lg bg-rose-500/10">
              <FileText className="w-6 h-6 text-rose-500" />
            </div>
            <div className="flex-1">
              <p className="font-medium">HTML Report</p>
              <p className="text-sm text-muted-foreground">
                Printable report with full details
              </p>
            </div>
            {exportedFormat === "html" && <Check className="w-5 h-5 text-emerald-500" />}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
