import { useCallback, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UploadCloud, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { parseFile, type ParsedDataset } from "@/lib/forecastEngine";

interface Props {
  dataset: ParsedDataset | null;
  onDataset: (dataset: ParsedDataset | null) => void;
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export function ForecastUpload({ dataset, onDataset }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!ext || !["csv", "xlsx", "xls", "json"].includes(ext)) {
        setError("Unsupported file type. Please upload a CSV, Excel (.xlsx) or JSON file.");
        return;
      }
      setBusy(true);
      setProgress(15);
      try {
        const timer = setInterval(() => setProgress((p) => Math.min(90, p + 12)), 90);
        const parsed = await parseFile(file);
        clearInterval(timer);
        setProgress(100);
        if (!parsed.columns.some((c) => c.type === "date")) {
          setError("No date-like column detected — you can still pick one manually below.");
        }
        onDataset(parsed);
      } catch (e) {
        onDataset(null);
        setError(e instanceof Error ? e.message : "Failed to read the file.");
      } finally {
        setBusy(false);
        setTimeout(() => setProgress(0), 600);
      }
    },
    [onDataset],
  );

  const preview = dataset?.rows.slice(0, 10) ?? [];

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <UploadCloud className="w-5 h-5 text-primary" /> Upload Dataset
        </CardTitle>
        <CardDescription>CSV, Excel (.xlsx) or JSON files with a date column and a numeric target.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
          className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer ${
            dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/60"
          }`}
        >
          <UploadCloud className="w-10 h-10 mx-auto mb-3 text-primary" />
          <p className="font-medium">Drag &amp; drop your dataset here</p>
          <p className="text-sm text-muted-foreground mb-4">or</p>
          <Button type="button" variant="outline" disabled={busy}>Browse Files</Button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
        </div>

        {progress > 0 && <Progress value={progress} className="h-2" />}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {dataset && (
          <>
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-sm">{dataset.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatSize(dataset.size)} · {dataset.rows.length} rows · {dataset.columns.length} columns
                </p>
              </div>
              <Badge variant="outline" className="gap-1">
                <CheckCircle2 className="w-3 h-3" /> Validated
              </Badge>
            </div>

            <div className="rounded-lg border border-border/60 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {dataset.columns.map((c) => (
                      <TableHead key={c.name} className="whitespace-nowrap">
                        {c.name}
                        <span className="ml-2 text-[10px] uppercase text-muted-foreground">{c.type}</span>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((row, i) => (
                    <TableRow key={i}>
                      {dataset.columns.map((c) => (
                        <TableCell key={c.name} className="whitespace-nowrap text-xs">
                          {row[c.name] === null || row[c.name] === undefined ? "—" : String(row[c.name])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground">Showing the first {preview.length} rows.</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
