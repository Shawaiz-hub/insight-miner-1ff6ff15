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

interface ExportResultsProps {
  rules: AssociationRule[];
  itemsets: FrequentItemset[];
  algorithm: string;
  params: MiningParams;
  transactionCount: number;
}

const algorithmNames: Record<string, string> = {
  apriori: "Apriori",
  fpgrowth: "FP-Growth",
  eclat: "ECLAT",
  hmine: "H-Mine",
  carma: "CARMA",
  charm: "CHARM",
  maxminer: "MaxMiner",
};

export function ExportResults({
  rules,
  itemsets,
  algorithm,
  params,
  transactionCount,
}: ExportResultsProps) {
  const [exportedFormat, setExportedFormat] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const generateCSV = () => {
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
      `Algorithm,${algorithmNames[algorithm]}`,
      `Min Support,${(params.minSupport * 100).toFixed(1)}%`,
      `Min Confidence,${(params.minConfidence * 100).toFixed(1)}%`,
      `Max Rule Length,${params.maxRuleLength}`,
      `Lift Threshold,${params.liftThreshold}`,
      `Transactions Processed,${transactionCount}`,
      `Total Rules Found,${rules.length}`,
      `Total Itemsets Found,${itemsets.length}`,
      "",
      "# Association Rules",
    ];

    const csv = [
      ...configSection,
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    return csv;
  };

  const generateJSON = () => {
    const data = {
      metadata: {
        algorithm: algorithmNames[algorithm],
        algorithmId: algorithm,
        parameters: {
          minSupport: params.minSupport,
          minConfidence: params.minConfidence,
          maxRuleLength: params.maxRuleLength,
          liftThreshold: params.liftThreshold,
        },
        statistics: {
          transactionCount,
          rulesFound: rules.length,
          itemsetsFound: itemsets.length,
          avgConfidence:
            rules.length > 0
              ? rules.reduce((acc, r) => acc + r.confidence, 0) / rules.length
              : 0,
          avgLift:
            rules.length > 0
              ? rules.reduce((acc, r) => acc + r.lift, 0) / rules.length
              : 0,
        },
        exportDate: new Date().toISOString(),
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
    };

    return JSON.stringify(data, null, 2);
  };

  const generatePDF = () => {
    // Generate HTML content for PDF-like report
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Mining Report - ${algorithmNames[algorithm]}</title>
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
  <h1>🔍 SmartMine Mining Report</h1>
  
  <h2>Configuration</h2>
  <table class="config-table">
    <tr><td>Algorithm</td><td>${algorithmNames[algorithm]}</td></tr>
    <tr><td>Minimum Support</td><td>${(params.minSupport * 100).toFixed(1)}%</td></tr>
    <tr><td>Minimum Confidence</td><td>${(params.minConfidence * 100).toFixed(1)}%</td></tr>
    <tr><td>Maximum Rule Length</td><td>${params.maxRuleLength}</td></tr>
    <tr><td>Lift Threshold</td><td>${params.liftThreshold}</td></tr>
  </table>
  
  <h2>Statistics</h2>
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
      ${rules
        .map(
          (rule) => `
        <tr>
          <td>${rule.id}</td>
          <td>${rule.antecedent.join(", ")}</td>
          <td style="text-align: center;">→</td>
          <td>${rule.consequent.join(", ")}</td>
          <td>${(rule.support * 100).toFixed(1)}%</td>
          <td>${(rule.confidence * 100).toFixed(1)}%</td>
          <td>${rule.lift.toFixed(2)}</td>
        </tr>
      `
        )
        .join("")}
    </tbody>
  </table>
  
  <div class="footer">
    Generated by SmartMine on ${new Date().toLocaleString()}
  </div>
</body>
</html>
    `;
    return html;
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
    const filename = `smartmine-${algorithm}-${timestamp}`;

    switch (format) {
      case "csv":
        downloadFile(generateCSV(), `${filename}.csv`, "text/csv");
        break;
      case "json":
        downloadFile(generateJSON(), `${filename}.json`, "application/json");
        break;
      case "html":
        downloadFile(generatePDF(), `${filename}.html`, "text/html");
        break;
    }

    setExportedFormat(format);
    setTimeout(() => setExportedFormat(null), 2000);
  };

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
          <DialogTitle>Export Mining Results</DialogTitle>
          <DialogDescription>
            Choose a format to export your {rules.length} discovered rules and {itemsets.length}{" "}
            itemsets.
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
