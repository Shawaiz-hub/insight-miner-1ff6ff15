import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { useSEO } from "@/hooks/useSEO";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Trash2, Eye, Lock, TrendingUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { modelLabel } from "@/lib/forecastEngine";

interface ForecastRecord {
  id: string;
  dataset_name: string;
  model: string;
  accuracy: number | null;
  status: string;
  created_at: string;
  results: unknown;
  parameters: unknown;
}

export default function ForecastHistory() {
  useSEO({ title: "Forecast History", description: "Review, download and manage your saved SmartMine forecasting projects.", path: "/forecast-history" });
  const { user, isLoading } = useAuth();
  const [records, setRecords] = useState<ForecastRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ForecastRecord | null>(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      const { data, error } = await supabase
        .from("forecasts")
        .select("id, dataset_name, model, accuracy, status, created_at, results, parameters")
        .order("created_at", { ascending: false });
      if (error) toast({ title: "Could not load forecasts", description: error.message, variant: "destructive" });
      setRecords((data ?? []) as ForecastRecord[]);
      setLoading(false);
    })();
  }, [user]);

  const remove = async (id: string) => {
    const { error } = await supabase.from("forecasts").delete().eq("id", id);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return; }
    setRecords((r) => r.filter((x) => x.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const download = (record: ForecastRecord) => {
    const blob = new Blob([JSON.stringify(record, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${record.dataset_name.replace(/[^a-z0-9]+/gi, "_")}_forecast.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isLoading && !user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container px-4 pt-24 max-w-lg">
          <Card className="border-border/50 bg-card/50 text-center">
            <CardContent className="p-8 space-y-4">
              <div className="feature-icon w-12 h-12 mx-auto"><Lock className="w-6 h-6 text-primary" /></div>
              <h1 className="text-2xl font-bold">Sign in to view your forecasts</h1>
              <Button asChild className="w-full"><Link to="/auth">Sign in</Link></Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container px-4 sm:px-6 pt-20 sm:pt-24 pb-24">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Forecast History</h1>
            <p className="mt-2 text-muted-foreground">Every saved forecasting project, with its model and accuracy.</p>
          </div>
          <Button asChild><Link to="/forecasting"><TrendingUp className="mr-2 h-4 w-4" /> New Forecast</Link></Button>
        </header>

        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader><CardTitle className="text-base">Saved projects</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            {loading || isLoading ? (
              <div className="h-32 animate-pulse rounded-lg bg-muted/40" />
            ) : records.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No forecasts saved yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dataset</TableHead>
                    <TableHead>Forecast Date</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Accuracy</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">{r.dataset_name}</TableCell>
                      <TableCell className="whitespace-nowrap">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="whitespace-nowrap">{modelLabel(r.model)}</TableCell>
                      <TableCell>{r.accuracy === null ? "—" : `${Number(r.accuracy).toFixed(1)}%`}</TableCell>
                      <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button size="sm" variant="ghost" onClick={() => setSelected(r)} aria-label="View forecast"><Eye className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => download(r)} aria-label="Download forecast"><Download className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(r.id)} aria-label="Delete forecast"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {selected && (
          <Card className="mt-6 border-border/50 bg-card/50 backdrop-blur">
            <CardHeader><CardTitle className="text-base">{selected.dataset_name}</CardTitle></CardHeader>
            <CardContent>
              <pre className="max-h-80 overflow-auto rounded-lg bg-muted/40 p-4 text-xs">
                {JSON.stringify(selected.results, null, 2).slice(0, 8000)}
              </pre>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
