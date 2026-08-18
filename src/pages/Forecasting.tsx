import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { useSEO } from "@/hooks/useSEO";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, Lock, History as HistoryIcon, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ForecastUpload } from "@/components/forecasting/ForecastUpload";
import { ForecastConfig, type Mapping, type Settings } from "@/components/forecasting/ForecastConfig";
import { ForecastResults } from "@/components/forecasting/ForecastResults";
import {
  buildSeries, modelLabel,
  type CleaningOptions, type CleaningSummary, type ForecastResult, type ParsedDataset,
} from "@/lib/forecastEngine";
import { toForecastResult, trainForecast } from "@/lib/forecastApi";

const STAGES = ["Preparing Dataset…", "Cleaning Data…", "Training Model…", "Generating Forecast…", "Complete"];

export default function Forecasting() {
  useSEO({
    title: "Forecasting",
    description: "Upload historical data and predict future trends with machine learning and time-series forecasting models in SmartMine.",
    path: "/forecasting",
  });

  const { user, isLoading: authLoading } = useAuth();
  const [dataset, setDataset] = useState<ParsedDataset | null>(null);
  const [mapping, setMapping] = useState<Mapping>({ dateCol: "", targetCol: "", categoryCol: "", category: "__all__", regionCol: "", region: "__all__" });
  const [cleaning, setCleaning] = useState<CleaningOptions>({
    removeMissing: false, fillMissing: true, removeDuplicates: true, normalize: false, detectOutliers: true, smooth: false,
  });
  const [settings, setSettings] = useState<Settings>({ horizon: 30, frequency: "daily", confidence: 95, models: ["linear", "holt_winters", "arima"] });
  const [summary, setSummary] = useState<CleaningSummary | null>(null);
  const [result, setResult] = useState<ForecastResult | null>(null);
  const [stage, setStage] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // auto-detect columns after upload
  useEffect(() => {
    if (!dataset) return;
    const date = dataset.columns.find((c) => c.type === "date");
    const target = dataset.columns.find((c) => c.type === "number");
    setMapping((m) => ({ ...m, dateCol: m.dateCol || date?.name || "", targetCol: m.targetCol || target?.name || "" }));
    setResult(null);
    setSaved(false);
  }, [dataset]);

  const series = useMemo(() => {
    if (!dataset || !mapping.dateCol || !mapping.targetCol) return [];
    try {
      const built = buildSeries(dataset.rows, mapping.dateCol, mapping.targetCol, settings.frequency, cleaning, {
        categoryCol: mapping.categoryCol, category: mapping.category, regionCol: mapping.regionCol, region: mapping.region,
      });
      setSummary(built.summary);
      return built.series;
    } catch {
      return [];
    }
  }, [dataset, mapping, cleaning, settings.frequency]);

  const recommended = useMemo(() => {
    if (series.length < 5) return null;
    if (series.length >= 24) return `${modelLabel("holt_winters")} (seasonality detected)`;
    if (series.length >= 12) return `${modelLabel("arima")} (short history, trend-driven)`;
    return `${modelLabel("linear")} (very short history)`;
  }, [series]);

  const handleTrain = async () => {
    if (!dataset) return;
    setError(null);
    setSaved(false);
    setResult(null);
    setRunId(null);
    setStage(0);

    // advance the staged indicator while the Python service trains
    let step = 0;
    const ticker = window.setInterval(() => {
      step = Math.min(step + 1, 3);
      setStage(step);
    }, 900);

    try {
      const res = await trainForecast({
        rows: dataset.rows,
        dateColumn: mapping.dateCol,
        targetColumn: mapping.targetCol,
        categoryColumn: mapping.categoryCol || undefined,
        category: mapping.category,
        regionColumn: mapping.regionCol || undefined,
        region: mapping.region,
        models: settings.models,
        horizon: settings.horizon,
        frequency: settings.frequency,
        confidence: settings.confidence,
        cleaning,
        datasetName: dataset.name,
        user: user?.email ?? user?.id,
      });
      window.clearInterval(ticker);
      setSummary(res.preprocessing ?? null);
      setRunId(res.runId ?? null);
      setResult(toForecastResult(res));
      setStage(4);
      if (res.failures?.length) {
        toast({
          title: "Some models could not be trained",
          description: res.failures.map((f) => `${f.label}: ${f.error}`).join(" · ").slice(0, 300),
        });
      }
      setTimeout(() => setStage(-1), 800);
    } catch (e) {
      window.clearInterval(ticker);
      setStage(-1);
      setError(e instanceof Error ? e.message : "Forecast failed.");
    }
  };

  const handleSave = async () => {
    if (!result || !user || !dataset) return;
    setSaving(true);
    const { error: err } = await supabase.from("forecasts").insert({
      user_id: user.id,
      dataset_name: dataset.name,
      model: result.bestModel,
      forecast_horizon: settings.horizon,
      frequency: settings.frequency,
      confidence_interval: settings.confidence,
      accuracy: result.metrics.accuracy,
      rmse: result.metrics.rmse,
      mae: result.metrics.mae,
      mape: result.metrics.mape,
      r2_score: result.metrics.r2,
      training_time_ms: result.trainingTimeMs,
      status: "completed",
      parameters: { mapping, cleaning, settings } as never,
      results: { rows: result.rows.slice(0, 500), scores: result.scores } as never,
    });
    setSaving(false);
    if (err) {
      toast({ title: "Could not save forecast", description: err.message, variant: "destructive" });
      return;
    }
    setSaved(true);
    toast({ title: "Forecast saved", description: "Find it any time under Forecast History." });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container px-4 pt-24">
          <div className="h-64 animate-pulse rounded-xl bg-muted/40" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container px-4 pt-24 pb-16 max-w-lg">
          <Card className="border-border/50 bg-card/50 backdrop-blur text-center">
            <CardContent className="p-8 space-y-4">
              <div className="feature-icon w-12 h-12 mx-auto"><Lock className="w-6 h-6 text-primary" /></div>
              <h1 className="text-2xl font-bold">Forecasting is for members</h1>
              <p className="text-muted-foreground text-sm">
                Sign in or create a free account to upload datasets and generate AI-powered forecasts.
              </p>
              <Button asChild className="w-full"><Link to="/auth">Sign in to continue</Link></Button>
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
            <h1 className="text-3xl sm:text-4xl font-bold flex items-center gap-3">
              <span className="feature-icon w-10 h-10"><TrendingUp className="w-5 h-5 text-primary" /></span>
              Forecasting
            </h1>
            <p className="mt-2 text-muted-foreground max-w-2xl">
              Upload your historical data and predict future trends using AI-powered forecasting models.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/forecast-history"><HistoryIcon className="mr-2 h-4 w-4" /> Forecast History</Link>
          </Button>
        </header>

        <div className="space-y-6">
          <ForecastUpload dataset={dataset} onDataset={setDataset} />

          {dataset && (
            <ForecastConfig
              dataset={dataset}
              mapping={mapping}
              onMapping={setMapping}
              cleaning={cleaning}
              onCleaning={setCleaning}
              settings={settings}
              onSettings={setSettings}
              summary={summary}
              recommended={recommended}
              onTrain={handleTrain}
              isTraining={stage >= 0 && stage < 4}
              canTrain={series.length >= 5 && settings.models.length > 0}
            />
          )}

          {dataset && series.length > 0 && series.length < 5 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Only {series.length} periods after aggregation — pick a finer frequency or a larger dataset.</AlertDescription>
            </Alert>
          )}

          {stage >= 0 && (
            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardContent className="p-6 space-y-3">
                <p className="text-sm font-medium">{STAGES[stage]}</p>
                <Progress value={((stage + 1) / STAGES.length) * 100} className="h-2" />
              </CardContent>
            </Card>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && dataset && (
            <ForecastResults result={result} datasetName={dataset.name} onSave={handleSave} saving={saving} saved={saved} />
          )}
        </div>
      </main>
    </div>
  );
}
