import { Brain, BarChart3, Target, RefreshCw, Trophy, Database, Layers, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

interface ShapFeature {
  feature: string;
  raw_value: number;
  shap_value: number;
  direction: "positive" | "negative";
  rank: number;
}

interface ShapData {
  base_value: number;
  predicted_value: number;
  features: ShapFeature[];
}


interface LatestResults {
  run_id: string;
  dataset: string;
  target: string;
  best_model: string;
  results: {
    classification_report: Record<string, any>;
    roc_auc_score: number | null;
    confusion_matrix: number[][];
  };
  automl_leaderboard: Record<string, any>;
}

const MetricRing = ({ value, label, color }: { value: number; label: string; color: string }) => {
  const pct = Math.min(Math.max(value, 0), 100);
  const circumference = 2 * Math.PI * 38;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative h-20 w-20">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r="38" fill="none" stroke="hsl(var(--muted))" strokeWidth="9" />
          <circle
            cx="50" cy="50" r="38" fill="none"
            stroke={color}
            strokeWidth="9"
            strokeDasharray={`${(pct / 100) * circumference} ${circumference}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-base font-bold">{value.toFixed(1)}%</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center">{label}</p>
    </div>
  );
};

const Explainability = () => {
  const [explainImg, setExplainImg] = useState<string | null>(null);
  const [localImg, setLocalImg] = useState<string | null>(null);
  const [latestResults, setLatestResults] = useState<LatestResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [shapData, setShapData] = useState<ShapData | null>(null);
  const [modelMetrics, setModelMetrics] = useState<{
    accuracy: number;
    f1: number;
    roc: number | null;
    precision: number;
    recall: number;
  } | null>(null);

  const fetchExplanations = async () => {
    setLoading(true);
    try {
      // Step 1: Get latest results to know the real run_id and model metrics
      const latestRes = await fetch("http://127.0.0.1:8000/results/latest");
      const latest = await latestRes.json();

      if (!latest || latest.status === "Error" || !latest.run_id) {
        setLoading(false);
        return;
      }

      setLatestResults(latest);

      // Extract real model performance metrics
      const report = latest.results?.classification_report;
      if (report) {
        const weighted = report["weighted avg"] || report["macro avg"] || {};
        const accuracy = report["accuracy"] != null
          ? report["accuracy"] * 100
          : (weighted["f1-score"] || 0) * 100;
        setModelMetrics({
          accuracy: parseFloat(accuracy.toFixed(1)),
          f1: parseFloat(((weighted["f1-score"] || 0) * 100).toFixed(1)),
          roc: latest.results.roc_auc_score != null
            ? parseFloat((latest.results.roc_auc_score * 100).toFixed(1))
            : null,
          precision: parseFloat(((weighted["precision"] || 0) * 100).toFixed(1)),
          recall: parseFloat(((weighted["recall"] || 0) * 100).toFixed(1)),
        });
      }

      // Step 2: Fetch SHAP plots using the real run_id
      const explainRes = await fetch(`http://127.0.0.1:8000/explain/${latest.run_id}`);
      const explainData = await explainRes.json();

      if (explainData.base64_str) {
        setExplainImg(`data:image/png;base64,${explainData.base64_str}`);
      }
      if (explainData.local_base64_str) {
        setLocalImg(`data:image/png;base64,${explainData.local_base64_str}`);
      }
      if (explainData.shap_data) {
        setShapData(explainData.shap_data);
      }
    } catch (e) {
      console.error("Failed to load explainability data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExplanations();
  }, []);

  // Clean dataset name (strip UUID prefix from filename)
  const cleanDataset = latestResults?.dataset
    ? latestResults.dataset.split("_").slice(1).join("_") || latestResults.dataset
    : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Model Explainability" description="Understand why models make their predictions">
        <div className="flex items-center gap-2">
          {latestResults && (
            <Badge variant="outline" className="gap-1 font-mono text-xs">
              <Trophy className="h-3 w-3 text-warning" />
              {latestResults.best_model}
            </Badge>
          )}
          <Button size="sm" variant="outline" onClick={fetchExplanations} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </div>
      </PageHeader>

      {/* Run metadata bar */}
      {latestResults && (
        <div className="flex flex-wrap items-center gap-4 px-4 py-3 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground font-mono">
          <span className="flex items-center gap-1.5">
            <Database className="h-3 w-3" />
            {cleanDataset || "—"}
          </span>
          <span className="flex items-center gap-1.5">
            <Target className="h-3 w-3" />
            target: <span className="text-foreground">{latestResults.target || "—"}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Trophy className="h-3 w-3 text-warning" />
            champion: <span className="text-foreground">{latestResults.best_model}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Layers className="h-3 w-3" />
            run: <span className="text-foreground">{latestResults.run_id.substring(0, 8)}</span>
          </span>
        </div>
      )}

      {/* No data state */}
      {!loading && !latestResults && (
        <div className="border border-dashed border-border rounded-lg p-12 flex flex-col items-center justify-center text-center">
          <Brain className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No model trained yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Go to <span className="font-medium text-foreground">AutoML & Benchmarking</span> and click{" "}
            <span className="font-medium text-foreground">Run AutoML</span> first
          </p>
        </div>
      )}

      {/* SHAP Global Summary */}
      {(latestResults || loading) && (
        <div className="bg-card rounded-lg border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-card-foreground">Global SHAP Feature Importance</h3>
            {latestResults && (
              <span className="ml-auto text-xs text-muted-foreground font-mono">
                {latestResults.best_model} · all training samples
              </span>
            )}
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-[300px]">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : explainImg ? (
            <>
              <img
                src={explainImg}
                alt="Global SHAP Summary Plot"
                className="w-full object-contain rounded-md border border-border"
              />
              <p className="text-xs text-muted-foreground mt-3">
                Each dot is one training sample. Features higher up had more impact on model decisions.
                Red = pushes prediction higher, Blue = pushes it lower.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-10">Global SHAP plot not available</p>
          )}
        </div>
      )}

      {/* SHAP Local + Model Metrics */}
      {(latestResults || loading) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Local SHAP Waterfall */}
          <div className="bg-card rounded-lg border border-border p-5">
            <h3 className="text-sm font-semibold text-card-foreground mb-1">
              Local Explanation — Waterfall
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Why the model made this specific prediction for one sample
            </p>
            {loading ? (
              <div className="flex items-center justify-center h-[240px]">
                <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : localImg ? (
              <img
                src={localImg}
                alt="Local SHAP Waterfall"
                className="w-full h-auto rounded-md border border-border"
              />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">Local SHAP plot not available</p>
            )}
          </div>

          {/* Real Model Performance Metrics */}
          <div className="bg-card rounded-lg border border-border p-5">
            <div className="flex items-center gap-2 mb-5">
              <Target className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-card-foreground">Champion Model Performance</h3>
            </div>

            {modelMetrics ? (
              <>
                {/* Metric rings */}
                <div className="flex justify-around mb-6">
                  <MetricRing
                    value={modelMetrics.accuracy}
                    label="Accuracy"
                    color="hsl(var(--primary))"
                  />
                  <MetricRing
                    value={modelMetrics.f1}
                    label="F1 Score"
                    color="#22c55e"
                  />
                  {modelMetrics.roc != null ? (
                    <MetricRing
                      value={modelMetrics.roc}
                      label="ROC-AUC"
                      color="#f59e0b"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <div className="h-20 w-20 rounded-full border-4 border-dashed border-muted flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">N/A</span>
                      </div>
                      <p className="text-xs text-muted-foreground">ROC-AUC</p>
                    </div>
                  )}
                </div>

                {/* Precision / Recall detail */}
                <div className="space-y-3 border-t border-border pt-4">
                  {[
                    { label: "Precision", value: modelMetrics.precision },
                    { label: "Recall", value: modelMetrics.recall },
                    { label: "F1 Score", value: modelMetrics.f1 },
                  ].map((m) => (
                    <div key={m.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{m.label}</span>
                        <span className="font-medium font-mono">{m.value}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-primary transition-all"
                          style={{ width: `${m.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between px-3 py-2 rounded-md bg-muted/40">
                  <span className="text-xs text-muted-foreground">Champion</span>
                  <Badge variant="default" className="text-xs gap-1">
                    <Trophy className="h-3 w-3" />
                    {latestResults?.best_model}
                  </Badge>
                </div>
              </>
            ) : loading ? (
              <div className="flex items-center justify-center h-[200px]">
                <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-center">
                <p className="text-xs text-muted-foreground">Run AutoML to see real model metrics</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Plain-English "Why this prediction?" Card ── */}
      {shapData && (
        <div className="bg-card rounded-lg border border-border p-5">
          <div className="flex items-center gap-2 mb-5">
            <Brain className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-card-foreground">
              Why did the model make this prediction?
            </h3>
            <span className="ml-auto text-xs text-muted-foreground font-mono">
              First training sample · top factors
            </span>
          </div>

          {/* Baseline → Prediction bar */}
          <div className="flex items-center gap-3 mb-6 px-4 py-3 rounded-lg bg-muted/40 border border-border">
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground">Baseline</p>
              <p className="text-sm font-bold font-mono">{(shapData.base_value * 100).toFixed(1)}%</p>
            </div>
            <div className="flex-1 flex items-center gap-1">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-muted-foreground to-primary transition-all"
                  style={{ width: `${Math.min(Math.abs(shapData.predicted_value) * 100, 100)}%` }}
                />
              </div>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground">Final</p>
              <p className={`text-sm font-bold font-mono ${
                shapData.predicted_value > shapData.base_value ? "text-green-500" : "text-red-400"
              }`}>
                {(shapData.predicted_value * 100).toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Feature rows */}
          <div className="space-y-3">
            {shapData.features.slice(0, 7).map((f) => {
              const pct = Math.min((Math.abs(f.shap_value) / Math.abs(shapData.features[0].shap_value)) * 100, 100);
              const isPos = f.direction === "positive";
              return (
                <div key={f.feature} className="group">
                  <div className="flex items-center gap-3">
                    {/* Direction icon */}
                    <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                      isPos ? "bg-green-500/10" : "bg-red-400/10"
                    }`}>
                      {isPos
                        ? <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                        : <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                      }
                    </div>

                    {/* Feature name + value */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between mb-1">
                        <span className="text-sm font-medium font-mono truncate">{f.feature}</span>
                        <span className="text-xs text-muted-foreground font-mono ml-2 shrink-0">
                          = {f.raw_value}
                        </span>
                      </div>
                      {/* Contribution bar */}
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${isPos ? "bg-green-500" : "bg-red-400"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* SHAP value */}
                    <span className={`text-xs font-bold font-mono shrink-0 w-16 text-right ${
                      isPos ? "text-green-500" : "text-red-400"
                    }`}>
                      {isPos ? "+" : ""}{f.shap_value.toFixed(4)}
                    </span>
                  </div>

                  {/* Human sentence */}
                  <p className="text-xs text-muted-foreground mt-1 pl-10">
                    {isPos
                      ? `↑ pushed the prediction higher (feature value: ${f.raw_value})`
                      : `↓ pulled the prediction lower (feature value: ${f.raw_value})`
                    }
                  </p>
                </div>
              );
            })}
          </div>

          {shapData.features.length > 7 && (
            <p className="text-xs text-muted-foreground mt-4 text-center">
              + {shapData.features.length - 7} more features with smaller contributions (see Global SHAP chart above)
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default Explainability;
