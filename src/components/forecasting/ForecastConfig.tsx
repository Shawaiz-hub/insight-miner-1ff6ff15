import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, SlidersHorizontal, Brush, Columns3, Play, Loader2 } from "lucide-react";
import {
  FORECAST_MODELS,
  HORIZON_PRESETS,
  type CleaningOptions,
  type CleaningSummary,
  type Frequency,
  type ParsedDataset,
} from "@/lib/forecastEngine";

export interface Mapping {
  dateCol: string;
  targetCol: string;
  categoryCol: string;
  category: string;
  regionCol: string;
  region: string;
}

export interface Settings {
  horizon: number;
  frequency: Frequency;
  confidence: number;
  models: string[];
}

interface Props {
  dataset: ParsedDataset;
  mapping: Mapping;
  onMapping: (m: Mapping) => void;
  cleaning: CleaningOptions;
  onCleaning: (c: CleaningOptions) => void;
  settings: Settings;
  onSettings: (s: Settings) => void;
  summary: CleaningSummary | null;
  recommended: string | null;
  onTrain: () => void;
  isTraining: boolean;
  canTrain: boolean;
}

const CLEANING_ITEMS: { key: keyof CleaningOptions; label: string }[] = [
  { key: "removeMissing", label: "Remove Missing Values" },
  { key: "fillMissing", label: "Fill Missing Values" },
  { key: "removeDuplicates", label: "Remove Duplicates" },
  { key: "normalize", label: "Normalize Data" },
  { key: "detectOutliers", label: "Detect Outliers" },
  { key: "smooth", label: "Smooth Time Series" },
];

const CONFIDENCE_STEPS = [80, 90, 95, 99];

export function ForecastConfig({
  dataset, mapping, onMapping, cleaning, onCleaning, settings, onSettings,
  summary, recommended, onTrain, isTraining, canTrain,
}: Props) {
  const uniqueValues = (col: string) =>
    Array.from(new Set(dataset.rows.map((r) => String(r[col] ?? "")).filter(Boolean))).slice(0, 200);

  const toggleModel = (id: string) => {
    const models = settings.models.includes(id)
      ? settings.models.filter((m) => m !== id)
      : [...settings.models, id];
    onSettings({ ...settings, models });
  };

  const isCustomHorizon = !HORIZON_PRESETS.some((p) => p.value === settings.horizon);

  return (
    <div className="space-y-6">
      {/* Mapping */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Columns3 className="w-5 h-5 text-primary" /> Dataset Mapping
          </CardTitle>
          <CardDescription>Choose which columns describe time and the value you want to predict.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {([
            ["dateCol", "Date Column", ["date", "text", "number"]],
            ["targetCol", "Target Column", ["number"]],
            ["categoryCol", "Category Column (optional)", ["text", "number", "date"]],
            ["regionCol", "Region Column (optional)", ["text", "number", "date"]],
          ] as const).map(([field, label, allowed]) => (
            <div key={field} className="space-y-2">
              <Label>{label}</Label>
              <Select
                value={mapping[field] || "__none__"}
                onValueChange={(v) =>
                  onMapping({
                    ...mapping,
                    [field]: v === "__none__" ? "" : v,
                    ...(field === "categoryCol" ? { category: "__all__" } : {}),
                    ...(field === "regionCol" ? { region: "__all__" } : {}),
                  })
                }
              >
                <SelectTrigger><SelectValue placeholder="Select a column" /></SelectTrigger>
                <SelectContent>
                  {(field === "categoryCol" || field === "regionCol") && (
                    <SelectItem value="__none__">None</SelectItem>
                  )}
                  {dataset.columns
                    .filter((c) => allowed.includes(c.type as never) || true)
                    .map((c) => (
                      <SelectItem key={c.name} value={c.name}>
                        {c.name} <span className="text-muted-foreground">· {c.type}</span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          ))}

          {mapping.categoryCol && (
            <div className="space-y-2">
              <Label>Filter Category</Label>
              <Select value={mapping.category} onValueChange={(v) => onMapping({ ...mapping, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All categories</SelectItem>
                  {uniqueValues(mapping.categoryCol).map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {mapping.regionCol && (
            <div className="space-y-2">
              <Label>Filter Region</Label>
              <Select value={mapping.region} onValueChange={(v) => onMapping({ ...mapping, region: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All regions</SelectItem>
                  {uniqueValues(mapping.regionCol).map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cleaning */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brush className="w-5 h-5 text-primary" /> Data Cleaning
          </CardTitle>
          <CardDescription>Automatic preprocessing applied before training.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CLEANING_ITEMS.map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 rounded-lg border border-border/60 p-3 text-sm cursor-pointer hover:bg-muted/40">
                <Checkbox
                  checked={cleaning[key]}
                  onCheckedChange={(v) => onCleaning({ ...cleaning, [key]: Boolean(v) })}
                />
                {label}
              </label>
            ))}
          </div>

          {summary && (
            <div className="grid gap-2 sm:grid-cols-3 rounded-lg border border-border/60 bg-muted/30 p-3 text-xs">
              <span>Rows in: <strong>{summary.originalRows}</strong></span>
              <span>Series points: <strong>{summary.finalRows}</strong></span>
              <span>Duplicates removed: <strong>{summary.duplicatesRemoved}</strong></span>
              <span>Missing removed: <strong>{summary.missingRemoved}</strong></span>
              <span>Missing filled: <strong>{summary.missingFilled}</strong></span>
              <span>Outliers handled: <strong>{summary.outliersDetected}</strong></span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <SlidersHorizontal className="w-5 h-5 text-primary" /> Forecast Settings
          </CardTitle>
          <CardDescription>Control how far ahead and how granular the forecast should be.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Forecast Horizon</Label>
            <Select
              value={isCustomHorizon ? "custom" : String(settings.horizon)}
              onValueChange={(v) => onSettings({ ...settings, horizon: v === "custom" ? 45 : Number(v) })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {HORIZON_PRESETS.map((p) => (
                  <SelectItem key={p.value} value={String(p.value)}>{p.label}</SelectItem>
                ))}
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            {isCustomHorizon && (
              <Input
                type="number"
                min={1}
                max={2000}
                value={settings.horizon}
                onChange={(e) => onSettings({ ...settings, horizon: Math.max(1, Number(e.target.value) || 1) })}
                placeholder="Days ahead"
              />
            )}
          </div>

          <div className="space-y-2">
            <Label>Forecast Frequency</Label>
            <Select value={settings.frequency} onValueChange={(v) => onSettings({ ...settings, frequency: v as Frequency })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 sm:col-span-2">
            <div className="flex items-center justify-between">
              <Label>Confidence Interval</Label>
              <Badge variant="secondary">{settings.confidence}%</Badge>
            </div>
            <Slider
              min={0}
              max={3}
              step={1}
              value={[CONFIDENCE_STEPS.indexOf(settings.confidence) === -1 ? 2 : CONFIDENCE_STEPS.indexOf(settings.confidence)]}
              onValueChange={([i]) => onSettings({ ...settings, confidence: CONFIDENCE_STEPS[i] })}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              {CONFIDENCE_STEPS.map((c) => <span key={c}>{c}%</span>)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Models */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-primary" /> Forecast Models
          </CardTitle>
          <CardDescription>
            Select one or more models — the most accurate one on a hold-out window is used for the final forecast.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {recommended && (
            <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm flex items-center justify-between gap-3 flex-wrap">
              <span>Recommended for this dataset: <strong>{recommended}</strong></span>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FORECAST_MODELS.map((m) => {
              const active = settings.models.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleModel(m.id)}
                  className={`text-left rounded-lg border p-3 transition-all ${
                    active ? "border-primary bg-primary/10 shadow-[0_0_0_1px_hsl(var(--primary)/0.3)]" : "border-border/60 hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{m.label}</span>
                    <Checkbox checked={active} className="pointer-events-none" />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{m.description}</p>
                </button>
              );
            })}
          </div>

          <Button className="w-full" size="lg" onClick={onTrain} disabled={!canTrain || isTraining}>
            {isTraining ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Training…</> : <><Play className="mr-2 h-4 w-4" /> Train Model</>}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
