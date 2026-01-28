import { useState, useCallback } from "react";
import { Upload, FileSpreadsheet, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMining } from "@/hooks/useMining";
import type { DatasetInfo } from "@/pages/Dashboard";

interface DataUploadProps {
  onUpload: (data: DatasetInfo) => void;
}

export function DataUpload({ onUpload }: DataUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<DatasetInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { uploadDataset } = useMining();

  const parseCSV = (content: string): string[][] => {
    const lines = content.trim().split("\n");
    return lines.map((line) =>
      line.split(",").map((cell) => cell.trim().replace(/^["']|["']$/g, ""))
    );
  };

  const handleFile = useCallback((file: File) => {
    setError(null);
    
    if (!file.name.endsWith(".csv") && !file.name.endsWith(".xlsx")) {
      setError("Please upload a CSV or Excel file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const rows = parseCSV(content);
        
        if (rows.length < 2) {
          setError("Dataset must have at least 2 rows (header + data)");
          return;
        }

        const dataset: DatasetInfo = {
          name: file.name,
          rows: rows.length - 1,
          columns: rows[0].length,
          transactions: rows.slice(1),
        };

        setPreview(dataset);
      } catch {
        setError("Failed to parse file. Please check the format.");
      }
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const loadSampleData = () => {
    const sampleTransactions = [
      ["Bread", "Milk", "Butter"],
      ["Bread", "Diaper", "Beer", "Eggs"],
      ["Milk", "Diaper", "Beer", "Cola"],
      ["Bread", "Milk", "Diaper", "Beer"],
      ["Bread", "Milk", "Diaper", "Cola"],
      ["Milk", "Butter", "Eggs"],
      ["Bread", "Butter", "Eggs", "Bacon"],
      ["Coffee", "Sugar", "Milk"],
      ["Tea", "Honey", "Milk"],
      ["Chips", "Soda", "Beer"],
    ];

    const dataset: DatasetInfo = {
      name: "sample_transactions.csv",
      rows: sampleTransactions.length,
      columns: Math.max(...sampleTransactions.map((t) => t.length)),
      transactions: sampleTransactions,
    };

    setPreview(dataset);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Upload Your Dataset</h2>
        <p className="text-muted-foreground">
          Upload a CSV or Excel file containing transactional data
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        }`}
      >
        <input
          type="file"
          accept=".csv,.xlsx"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="feature-icon w-16 h-16 mx-auto mb-4">
          <Upload className="w-8 h-8 text-primary" />
        </div>
        <p className="text-lg font-medium mb-2">
          Drag & drop your file here
        </p>
        <p className="text-muted-foreground text-sm mb-4">
          or click to browse (CSV, Excel)
        </p>
        <Button variant="outline" size="sm">
          Browse Files
        </Button>
      </div>

      {/* Sample data button */}
      <div className="text-center">
        <button
          onClick={loadSampleData}
          className="text-primary text-sm hover:underline"
        >
          Or load sample transaction dataset
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="glass-card rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-8 h-8 text-primary" />
              <div>
                <p className="font-medium">{preview.name}</p>
                <p className="text-sm text-muted-foreground">
                  {preview.rows} transactions • {preview.columns} max items
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-primary">
              <Check className="w-5 h-5" />
              <span className="text-sm font-medium">Valid</span>
            </div>
          </div>

          {/* Data preview table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">
                    #
                  </th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">
                    Items
                  </th>
                </tr>
              </thead>
              <tbody>
                {preview.transactions.slice(0, 5).map((row, index) => (
                  <tr key={index} className="border-b border-border/50">
                    <td className="py-2 px-3 text-muted-foreground">
                      {index + 1}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex flex-wrap gap-1">
                        {row.map((item, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded bg-secondary text-xs"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.rows > 5 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                Showing 5 of {preview.rows} transactions
              </p>
            )}
          </div>

          <Button
            variant="hero"
            className="w-full"
            disabled={isUploading}
            onClick={async () => {
              setIsUploading(true);
              setError(null);
              try {
                // Create CSV with proper header row
                const csvContent = "items\n" + preview.transactions.map(t => t.join(",")).join("\n");
                const file = new File([csvContent], preview.name, { type: "text/csv" });
                const result = await uploadDataset(file);
                if (result?.success) {
                  onUpload(preview);
                } else {
                  setError(result?.message || "Failed to upload to backend. Make sure the backend server is running.");
                }
              } catch (err) {
                console.error("Upload error:", err);
                setError("Failed to connect to backend. Make sure the Flask server is running on port 5000.");
              } finally {
                setIsUploading(false);
              }
            }}
          >
            {isUploading ? "Uploading..." : "Continue with this dataset"}
          </Button>
        </div>
      )}
    </div>
  );
}
