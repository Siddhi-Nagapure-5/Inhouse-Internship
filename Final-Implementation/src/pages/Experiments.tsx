import { useState, useEffect, useRef } from "react";
import { Upload, FlaskConical, TrendingDown, TrendingUp, Minus, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface BenchmarkResult {
  timestamp: string;
  dataset: string;
  original_performance: {
    accuracy: number | null;
    f1_score: number | null;
    roc_auc: number | null;
  };
  benchmark_performance: {
    accuracy: number | null;
    f1_score: number | null;
    roc_auc: number | null;
  };
}

const pct = (v: number | null) => (v != null ? (v * 100).toFixed(1) + "%" : "—");
const num = (v: number | null) => (v != null ? (v * 100).toFixed(1) : null);

const DeltaBadge = ({ orig, bench }: { orig: number | null; bench: number | null }) => {
  if (orig == null || bench == null) return <span className="text-muted-foreground text-xs">—</span>;
  const delta = ((bench - orig) * 100).toFixed(1);
  const positive = bench >= orig;
  return (
    <span className={`flex items-center gap-1 text-xs font-semibold ${positive ? "text-green-500" : "text-red-400"}`}>
      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {positive ? "+" : ""}{delta}%
    </span>
  );
};

const Experiments = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [history, setHistory] = useState<BenchmarkResult[]>([]);
  const [latestResult, setLatestResult] = useState<BenchmarkResult | null>(null);
  const [noModel, setNoModel] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);

  const fetchHistory = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/benchmark/history");
      const data: BenchmarkResult[] = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setHistory(data);
        setLatestResult(data[data.length - 1]);
        // Build chart from all results
        setChartData(data.map((d, i) => ({
          name: `Run ${i + 1}`,
          "Original Acc": num(d.original_performance.accuracy),
          "Benchmark Acc": num(d.benchmark_performance.accuracy),
          "Original F1": num(d.original_performance.f1_score),
          "Benchmark F1": num(d.benchmark_performance.f1_score),
        })));
      }
    } catch (e) {
      console.log("Could not load benchmark history.");
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setNoModel(false);
    try {
      const formData = new FormData();
      formData.append("file", files[0]);
      const res = await fetch("http://127.0.0.1:8000/benchmark", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        if (err.detail?.includes("Model") || err.detail?.includes("not found")) {
          setNoModel(true);
        } else {
          alert(`Benchmark failed: ${err.detail}`);
        }
        return;
      }
      const result: BenchmarkResult = await res.json();
      setLatestResult(result);
      await fetchHistory();
    } catch (e) {
      alert("Could not reach the backend. Is main.py running?");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Cross-Dataset Benchmarking" description="Test your trained model against a new dataset to measure generalization">
        <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? "Running Benchmark..." : "Upload Benchmark CSV"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => handleFileUpload(e.target.files)}
        />
      </PageHeader>

      {/* Instruction banner if no model trained */}
      {noModel && (
        <div className="flex items-center gap-3 bg-warning/10 border border-warning/30 rounded-lg px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
          <p className="text-sm text-warning">No trained model found. Please go to <strong>AutoML &amp; Benchmarking</strong> and click <strong>Run AutoML</strong> first to train a champion model before running a benchmark.</p>
        </div>
      )}

      {/* Empty state */}
      {history.length === 0 && !uploading && !noModel && (
        <div
          className="border border-dashed border-border rounded-lg p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary/40 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <FlaskConical className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-card-foreground">Upload a benchmark CSV to begin</p>
          <p className="text-xs text-muted-foreground mt-1">
            The champion model from your last AutoML run will evaluate the new dataset and compare its performance here.
          </p>
          <Button variant="outline" size="sm" className="mt-4">Browse Files</Button>
        </div>
      )}

      {/* Latest Benchmark Result — Score Cards */}
      {latestResult && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Accuracy", orig: latestResult.original_performance.accuracy, bench: latestResult.benchmark_performance.accuracy },
            { label: "F1 Score", orig: latestResult.original_performance.f1_score, bench: latestResult.benchmark_performance.f1_score },
            { label: "ROC-AUC", orig: latestResult.original_performance.roc_auc, bench: latestResult.benchmark_performance.roc_auc },
          ].map((metric) => (
            <div key={metric.label} className="bg-card rounded-lg border border-border p-4">
              <p className="text-xs text-muted-foreground font-medium mb-3">{metric.label}</p>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">Original</p>
                  <p className="text-lg font-bold font-mono">{pct(metric.orig)}</p>
                </div>
                <div className="text-center">
                  <DeltaBadge orig={metric.orig} bench={metric.bench} />
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Benchmark</p>
                  <p className="text-lg font-bold font-mono">{pct(metric.bench)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comparison Chart */}
      {chartData.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold text-card-foreground mb-4">Performance Comparison Across Benchmark Runs</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis domain={[50, 100]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
              />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              <Bar dataKey="Original Acc" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Benchmark Acc" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Original F1" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Benchmark F1" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* History Table */}
      {history.length > 0 && (
        <div className="bg-card rounded-lg border border-border">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-card-foreground">Benchmark History ({history.length} runs)</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Dataset</TableHead>
                <TableHead className="text-xs">Timestamp</TableHead>
                <TableHead className="text-xs text-right">Orig Acc</TableHead>
                <TableHead className="text-xs text-right">Bench Acc</TableHead>
                <TableHead className="text-xs text-right">Acc Δ</TableHead>
                <TableHead className="text-xs text-right">Orig F1</TableHead>
                <TableHead className="text-xs text-right">Bench F1</TableHead>
                <TableHead className="text-xs text-right">F1 Δ</TableHead>
                <TableHead className="text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...history].reverse().map((r, i) => {
                const accDrop = r.benchmark_performance.accuracy != null && r.original_performance.accuracy != null
                  ? r.benchmark_performance.accuracy >= r.original_performance.accuracy
                  : true;
                return (
                  <TableRow key={i}>
                    <TableCell className="text-xs font-mono max-w-[140px] truncate">
                      {r.dataset.split("/").pop()}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.timestamp}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{pct(r.original_performance.accuracy)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{pct(r.benchmark_performance.accuracy)}</TableCell>
                    <TableCell className="text-xs text-right">
                      <DeltaBadge orig={r.original_performance.accuracy} bench={r.benchmark_performance.accuracy} />
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">{pct(r.original_performance.f1_score)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{pct(r.benchmark_performance.f1_score)}</TableCell>
                    <TableCell className="text-xs text-right">
                      <DeltaBadge orig={r.original_performance.f1_score} bench={r.benchmark_performance.f1_score} />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs gap-1 ${accDrop ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/20"}`}>
                        {accDrop ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                        {accDrop ? "Generalized" : "Degraded"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default Experiments;
