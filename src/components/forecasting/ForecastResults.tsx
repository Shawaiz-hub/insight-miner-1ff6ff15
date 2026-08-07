import { useMemo, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, Brush, CartesianGrid, ComposedChart, Legend, Line, LineChart,
  ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowDownToLine, ArrowUpDown, ChevronLeft, ChevronRight, Download, Image as ImageIcon, Save, Trophy,
} from "lucide-react";
import type { ForecastResult } from "@/lib/forecastEngine";
import { downloadChartPng, exportForecastCsv, exportForecastExcel, exportForecastJson, exportForecastPdf } from "@/lib/forecastExport";

interface Props {
  result: ForecastResult;
  datasetName: string;
  onSave?: () => void;
  saving?: boolean;
  saved?: boolean;
}

const num = (v: number | null | undefined, digits = 2) =>
  v === null || v === undefined || !Number.isFinite(v) ? "—" : v.toLocaleString(undefined, { maximumFractionDigits: digits });

function ChartFrame({ title, description, children, id }: { title: string; description?: string; children: React.ReactNode; id: string }) {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        <Button variant="ghost" size="sm" onClick={() => downloadChartPng(id, title)} aria-label={`Download ${title} as PNG`}>
          <ImageIcon className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div id={id} className="h-[280px] w-full">{children}</div>
      </CardContent>
    </Card>
  );
}

const axis = { stroke: "hsl(var(--muted-foreground))", fontSize: 11 };
const tooltipStyle = {
  contentStyle: {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "0.5rem",
    fontSize: 12,
  },
};

export function ForecastResults({ result, datasetName, onSave, saving, saved }: Props) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [sortAsc, setSortAsc] = useState(true);
  const [filter, setFilter] = useState<"all" | "history" | "future">("all");

  const rows = useMemo(() => {
    let out = result.rows;
    if (filter === "history") out = out.filter((r) => r.actual !== null);
    if (filter === "future") out = out.filter((r) => r.actual === null);
    if (search.trim()) out = out.filter((r) => r.date.toLowerCase().includes(search.trim().toLowerCase()));
    return [...out].sort((a, b) => (a.date < b.date ? (sortAsc ? -1 : 1) : sortAsc ? 1 : -1));
  }, [result.rows, filter, search, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = rows.slice((page - 1) * pageSize, page * pageSize);

  const kpis = [
    { label: "Best Model", value: result.bestModelLabel, icon: Trophy },
    { label: "Forecast Accuracy", value: `${num(result.metrics.accuracy, 1)}%` },
    { label: "RMSE", value: num(result.metrics.rmse, 3) },
    { label: "MAE", value: num(result.metrics.mae, 3) },
    { label: "MAPE", value: `${num(result.metrics.mape, 2)}%` },
    { label: "R² Score", value: num(result.metrics.r2, 3) },
    { label: "Training Time", value: `${result.trainingTimeMs} ms` },
    { label: "Predictions", value: String(result.forecast.length) },
  ];

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="border-border/50 bg-gradient-to-br from-card/70 to-card/30 backdrop-blur">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="mt-1 text-lg font-semibold truncate">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">Engine: {result.engine === "python" ? "Python microservice" : "In-browser engine"}</Badge>
        {result.approximated && (
          <Badge variant="secondary">{result.bestModelLabel} approximated in-browser</Badge>
        )}
        {onSave && (
          <Button size="sm" variant="outline" onClick={onSave} disabled={saving || saved} className="ml-auto">
            <Save className="mr-2 h-4 w-4" /> {saved ? "Saved" : saving ? "Saving…" : "Save Forecast"}
          </Button>
        )}
      </div>

      {/* Model leaderboard */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base">Model Comparison</CardTitle>
          <CardDescription>Scored on a hold-out window of the historical data.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead>RMSE</TableHead>
                <TableHead>MAE</TableHead>
                <TableHead>MAPE</TableHead>
                <TableHead>R²</TableHead>
                <TableHead>Accuracy</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.scores.map((s) => (
                <TableRow key={s.model} className={s.model === result.bestModel ? "bg-primary/5" : ""}>
                  <TableCell className="font-medium whitespace-nowrap">{s.label}</TableCell>
                  <TableCell>{num(s.rmse, 3)}</TableCell>
                  <TableCell>{num(s.mae, 3)}</TableCell>
                  <TableCell>{num(s.mape, 2)}%</TableCell>
                  <TableCell>{num(s.r2, 3)}</TableCell>
                  <TableCell>{num(s.accuracy, 1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Charts */}
      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="accuracy">Accuracy</TabsTrigger>
          <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 grid gap-4 lg:grid-cols-2">
          <ChartFrame id="chart-history" title="Historical Data" description="Observed values over time">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={result.history}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" {...axis} />
                <YAxis {...axis} />
                <Tooltip {...tooltipStyle} />
                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
                <Brush height={18} stroke="hsl(var(--primary))" />
              </LineChart>
            </ResponsiveContainer>
          </ChartFrame>

          <ChartFrame id="chart-forecast" title="Forecast" description="Predicted future values">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={result.forecast}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" {...axis} />
                <YAxis {...axis} />
                <Tooltip {...tooltipStyle} />
                <Line type="monotone" dataKey="forecast" stroke="hsl(var(--accent))" dot={false} strokeWidth={2} />
                <Brush height={18} stroke="hsl(var(--accent))" />
              </LineChart>
            </ResponsiveContainer>
          </ChartFrame>

          <ChartFrame id="chart-combined" title="Actual vs Predicted" description="Fit quality across the full timeline">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={result.rows}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" {...axis} />
                <YAxis {...axis} />
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="actual" name="Actual" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="forecast" name="Predicted" stroke="hsl(var(--accent))" dot={false} strokeDasharray="4 4" strokeWidth={2} />
                <Brush height={18} stroke="hsl(var(--primary))" />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartFrame>

          <ChartFrame id="chart-ci" title="Confidence Interval" description="Upper and lower prediction bounds">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={result.rows}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" {...axis} />
                <YAxis {...axis} />
                <Tooltip {...tooltipStyle} />
                <Area type="monotone" dataKey="upper" stroke="none" fill="hsl(var(--primary))" fillOpacity={0.15} />
                <Area type="monotone" dataKey="lower" stroke="none" fill="hsl(var(--background))" fillOpacity={0.9} />
                <Line type="monotone" dataKey="forecast" stroke="hsl(var(--primary))" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartFrame>
        </TabsContent>

        <TabsContent value="accuracy" className="mt-4 grid gap-4 lg:grid-cols-2">
          <ChartFrame id="chart-trend" title="Trend" description="Smoothed underlying trend">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={result.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" {...axis} />
                <YAxis {...axis} />
                <Tooltip {...tooltipStyle} />
                <Line type="monotone" dataKey="trend" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </ChartFrame>

          <ChartFrame id="chart-monthly" title="Monthly Forecast" description="Forecast aggregated per period">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={result.monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="period" {...axis} />
                <YAxis {...axis} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
        </TabsContent>

        <TabsContent value="diagnostics" className="mt-4 grid gap-4 lg:grid-cols-2">
          <ChartFrame id="chart-residual" title="Residual Plot" description="Errors between actual and fitted values">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart data={result.residuals}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" {...axis} />
                <YAxis dataKey="residual" {...axis} />
                <Tooltip {...tooltipStyle} />
                <Scatter dataKey="residual" fill="hsl(var(--accent))" />
              </ScatterChart>
            </ResponsiveContainer>
          </ChartFrame>

          <ChartFrame id="chart-hist" title="Error Distribution" description="Histogram of residuals">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={result.errorHistogram}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="bucket" {...axis} />
                <YAxis {...axis} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>

          <ChartFrame id="chart-decomp" title="Seasonal Decomposition" description="Observed, trend, seasonal and residual components">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={result.decomposition}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" {...axis} />
                <YAxis {...axis} />
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="observed" name="Observed" stroke="hsl(var(--primary))" dot={false} />
                <Line type="monotone" dataKey="trend" name="Trend" stroke="hsl(var(--accent))" dot={false} />
                <Line type="monotone" dataKey="seasonal" name="Seasonal" stroke="hsl(var(--muted-foreground))" dot={false} />
                <Line type="monotone" dataKey="residual" name="Residual" stroke="hsl(var(--destructive))" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartFrame>
        </TabsContent>
      </Tabs>

      {/* Forecast table */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Forecast Table</CardTitle>
              <CardDescription>{rows.length} rows</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => exportForecastCsv(result, datasetName)}>
                <Download className="mr-1.5 h-3.5 w-3.5" /> CSV
              </Button>
              <Button size="sm" variant="outline" onClick={() => exportForecastExcel(result, datasetName)}>
                <Download className="mr-1.5 h-3.5 w-3.5" /> Excel
              </Button>
              <Button size="sm" variant="outline" onClick={() => exportForecastPdf(result, datasetName)}>
                <Download className="mr-1.5 h-3.5 w-3.5" /> PDF
              </Button>
              <Button size="sm" variant="outline" onClick={() => exportForecastJson(result, datasetName)}>
                <ArrowDownToLine className="mr-1.5 h-3.5 w-3.5" /> JSON
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Search date…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="max-w-[200px]"
            />
            <Select value={filter} onValueChange={(v) => { setFilter(v as typeof filter); setPage(1); }}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All rows</SelectItem>
                <SelectItem value="history">Historical only</SelectItem>
                <SelectItem value="future">Forecast only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[10, 15, 25, 50].map((n) => <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="overflow-x-auto rounded-lg border border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button className="flex items-center gap-1" onClick={() => setSortAsc((s) => !s)}>
                      Date <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </TableHead>
                  <TableHead>Actual</TableHead>
                  <TableHead>Forecast</TableHead>
                  <TableHead>Lower Bound</TableHead>
                  <TableHead>Upper Bound</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {current.map((r) => (
                  <TableRow key={r.date}>
                    <TableCell className="whitespace-nowrap font-medium">{r.date}</TableCell>
                    <TableCell>{num(r.actual)}</TableCell>
                    <TableCell>{num(r.forecast)}</TableCell>
                    <TableCell>{num(r.lower)}</TableCell>
                    <TableCell>{num(r.upper)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
