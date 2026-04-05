import { useState, useRef, useEffect } from "react";
import { Upload, CheckCircle2, AlertTriangle, ArrowRight, Database, RefreshCw, MousePointerClick } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { useCreateDataset, useUploadDatasetFile } from "@/hooks/useData";
import { useToast } from "@/hooks/use-toast";

interface BackendDataset {
  file_id: string;
  filename: string;
  path: string;
}

interface QualityReport {
  rows: number;
  columns: number;
  completeness: number;
  uniqueness: number;
  consistency: number;
  overall: number;
  null_cells: number;
  duplicate_rows: number;
  schema: {
    column: string;
    dtype: string;
    null_count: number;
    null_pct: number;
    unique_count: number;
    unique_pct: number;
  }[];
  missing_chart: { column: string; missing_pct: number }[];
}

const dtypeColor = (dtype: string) => {
  if (dtype.startsWith("int") || dtype.startsWith("float")) return "text-blue-400";
  if (dtype === "object") return "text-amber-400";
  if (dtype.startsWith("bool")) return "text-green-400";
  return "text-muted-foreground";
};

const scoreColor = (score: number) => {
  if (score >= 90) return "text-green-500";
  if (score >= 70) return "text-amber-500";
  return "text-red-400";
};

const DataCuration = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [loadingQuality, setLoadingQuality] = useState(false);
  const [qualityReport, setQualityReport] = useState<QualityReport | null>(null);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [activeFilename, setActiveFilename] = useState<string | null>(null);
  const [backendDatasets, setBackendDatasets] = useState<BackendDataset[]>([]);

  const createDataset = useCreateDataset();
  const uploadFile = useUploadDatasetFile();
  const { toast } = useToast();

  const fetchBackendDatasets = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/datasets");
      if (res.ok) {
        const data: BackendDataset[] = await res.json();
        setBackendDatasets(data);
      }
    } catch {
      console.log("Backend not reachable for dataset list.");
    }
  };

  const fetchQuality = async (fileId: string, filename?: string) => {
    setLoadingQuality(true);
    setQualityReport(null);
    try {
      const res = await fetch(`http://127.0.0.1:8000/dataset/${fileId}/quality`);
      if (res.ok) {
        const data: QualityReport = await res.json();
        setQualityReport(data);
      }
    } catch {
      toast({ title: "Could not load quality data", description: "Is the backend running?", variant: "destructive" });
    } finally {
      setLoadingQuality(false);
    }
  };

  const selectDataset = (ds: BackendDataset) => {
    setActiveFileId(ds.file_id);
    setActiveFilename(ds.filename);
    localStorage.setItem("automl_file_id", ds.file_id);
    localStorage.setItem("automl_filename", ds.filename);
    fetchQuality(ds.file_id, ds.filename);
    toast({ title: "Dataset selected", description: `Now showing: ${ds.filename}` });
  };

  // On mount: load backend datasets and quality for last-used file
  useEffect(() => {
    fetchBackendDatasets();
    const storedId = localStorage.getItem("automl_file_id");
    const storedName = localStorage.getItem("automl_filename");
    if (storedId) {
      setActiveFileId(storedId);
      setActiveFilename(storedName);
      fetchQuality(storedId);
    }
  }, []);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        // Upload to Supabase
        const { filePath } = await uploadFile.mutateAsync(file);
        let qualityScore = 80;
        let newFileId: string | null = null;

        if (file.name.endsWith(".csv")) {
          const formData = new FormData();
          formData.append("file", file);
          const backendRes = await fetch("http://127.0.0.1:8000/upload", {
            method: "POST",
            body: formData,
          });
          if (backendRes.ok) {
            const backendData = await backendRes.json();
            newFileId = backendData.file_id;
            setActiveFileId(backendData.file_id);
            setActiveFilename(backendData.filename);
            localStorage.setItem("automl_file_id", backendData.file_id);
            localStorage.setItem("automl_filename", backendData.filename);

            // Fetch real quality
            const qRes = await fetch(`http://127.0.0.1:8000/dataset/${backendData.file_id}/quality`);
            if (qRes.ok) {
              const qData: QualityReport = await qRes.json();
              setQualityReport(qData);
              qualityScore = qData.overall;
            }
            // Refresh backend dataset list
            await fetchBackendDatasets();
          }
        }

        await createDataset.mutateAsync({
          name: file.name,
          format: file.name.split(".").pop() || "csv",
          size_bytes: file.size,
          quality_score: qualityScore,
          file_url: filePath,
        });
      }
      toast({ title: "Upload complete", description: `${files.length} dataset(s) uploaded.` });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFileUpload(e.dataTransfer.files);
  };

  const pipelineSteps = [
    {
      label: "Raw Data",
      detail: qualityReport ? `${qualityReport.rows.toLocaleString()} rows × ${qualityReport.columns} cols` : activeFilename ? "Select to analyze" : "—",
      status: qualityReport ? "done" : "pending",
    },
    {
      label: "Null Handling",
      detail: qualityReport
        ? qualityReport.null_cells === 0 ? "No missing values ✓" : `${qualityReport.null_cells} cells to impute`
        : "—",
      status: qualityReport ? (qualityReport.null_cells === 0 ? "done" : "warning") : "pending",
    },
    {
      label: "Outlier Removal",
      detail: qualityReport
        ? qualityReport.duplicate_rows === 0 ? "No duplicates found ✓" : `${qualityReport.duplicate_rows} duplicates`
        : "—",
      status: qualityReport ? (qualityReport.duplicate_rows === 0 ? "done" : "warning") : "pending",
    },
    {
      label: "Feature Engineering",
      detail: qualityReport ? `${qualityReport.columns} features ready` : "—",
      status: qualityReport ? "done" : "pending",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Data Curation" description="Upload, clean, and engineer your datasets">
        <Button
          size="sm"
          variant="outline"
          className="mr-2"
          disabled={!activeFileId || loadingQuality}
          onClick={() => activeFileId && fetchQuality(activeFileId)}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loadingQuality ? "animate-spin" : ""}`} />
          Refresh
        </Button>
        <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? "Uploading..." : "Upload Dataset"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".csv,.parquet,.json,.xlsx"
          multiple
          onChange={(e) => handleFileUpload(e.target.files)}
        />
      </PageHeader>

      {/* Top Row: Upload + Quality + Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Panel */}
        <div
          className="bg-card rounded-lg border border-border p-6 border-dashed flex flex-col items-center justify-center text-center min-h-[200px] cursor-pointer hover:border-primary/50 transition-colors"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className={`h-10 w-10 mb-3 ${uploading ? "text-primary animate-pulse" : "text-muted-foreground"}`} />
          <p className="text-sm font-medium text-card-foreground">
            {uploading ? "Uploading..." : "Drop your dataset here"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">CSV up to 2GB</p>
          {activeFilename && !uploading && (
            <div className="mt-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
              <Database className="h-3 w-3 text-primary" />
              <span className="text-xs text-primary font-mono truncate max-w-[150px]">{activeFilename}</span>
            </div>
          )}
          {!uploading && <Button variant="outline" size="sm" className="mt-4">Browse Files</Button>}
        </div>

        {/* Quality Score — DYNAMIC */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-sm font-semibold text-card-foreground mb-4">
            Data Quality Score
            {activeFilename && (
              <span className="ml-2 text-xs font-mono text-muted-foreground font-normal">{activeFilename}</span>
            )}
          </h3>
          {loadingQuality ? (
            <div className="flex items-center justify-center h-[120px]">
              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : qualityReport ? (
            <>
              <div className="flex items-center gap-4 mb-4">
                <div className={`text-4xl font-bold ${scoreColor(qualityReport.overall)}`}>
                  {qualityReport.overall}
                  <span className="text-lg text-muted-foreground">/100</span>
                </div>
                <div className="flex-1 space-y-2">
                  {[
                    { label: "Completeness", value: qualityReport.completeness },
                    { label: "Uniqueness", value: qualityReport.uniqueness },
                    { label: "Consistency", value: qualityReport.consistency },
                  ].map((m) => (
                    <div key={m.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{m.label}</span>
                        <span className={`font-medium ${scoreColor(m.value)}`}>{m.value}%</span>
                      </div>
                      <Progress value={m.value} className="h-1.5" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted/40 rounded-md p-2 text-center">
                  <p className="text-[10px] text-muted-foreground">Rows</p>
                  <p className="text-sm font-bold font-mono">{qualityReport.rows.toLocaleString()}</p>
                </div>
                <div className="bg-muted/40 rounded-md p-2 text-center">
                  <p className="text-[10px] text-muted-foreground">Columns</p>
                  <p className="text-sm font-bold font-mono">{qualityReport.columns}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-[140px] text-center">
              <MousePointerClick className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground">
                {backendDatasets.length > 0
                  ? "Click a dataset below to inspect its quality"
                  : "Upload a CSV to see quality metrics"}
              </p>
            </div>
          )}
        </div>

        {/* Pipeline Steps — DYNAMIC */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-sm font-semibold text-card-foreground mb-4">Preprocessing Pipeline</h3>
          <div className="space-y-4">
            {pipelineSteps.map((step, i) => {
              const Icon = step.status === "done" ? CheckCircle2 : step.status === "warning" ? AlertTriangle : Database;
              const iconClass = step.status === "done" ? "text-success" : step.status === "warning" ? "text-warning" : "text-muted-foreground/30";
              return (
                <div key={step.label} className="flex items-start gap-3">
                  <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${iconClass}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{step.label}</p>
                    {step.detail !== "—" && (
                      <p className="text-[10px] text-muted-foreground font-mono">{step.detail}</p>
                    )}
                  </div>
                  {i < pipelineSteps.length - 1 && (
                    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0 mt-1" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selectable Datasets Table */}
      {backendDatasets.length > 0 && (
        <div className="bg-card rounded-lg border border-border">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-card-foreground">
                Available Datasets ({backendDatasets.length})
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Click any row to inspect quality</p>
            </div>
            <Button size="sm" variant="ghost" onClick={fetchBackendDatasets} className="text-xs">
              <RefreshCw className="h-3 w-3 mr-1" /> Refresh List
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs w-4" />
                <TableHead className="text-xs">Filename</TableHead>
                <TableHead className="text-xs">File ID</TableHead>
                <TableHead className="text-xs text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backendDatasets.map((ds) => {
                const isActive = ds.file_id === activeFileId;
                return (
                  <TableRow
                    key={ds.file_id}
                    className={`cursor-pointer transition-colors ${
                      isActive
                        ? "bg-primary/10 hover:bg-primary/15"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => selectDataset(ds)}
                  >
                    <TableCell className="pr-0">
                      {isActive && (
                        <div className="w-2 h-2 rounded-full bg-primary mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className={`text-sm font-mono ${isActive ? "text-primary font-semibold" : ""}`}>
                      {ds.filename}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {ds.file_id.substring(0, 8)}…
                    </TableCell>
                    <TableCell className="text-right">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
                          <CheckCircle2 className="h-3 w-3" /> Selected
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Click to select</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Schema + Missing Values — shown for selected dataset */}
      {qualityReport && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Real column schema */}
          <div className="bg-card rounded-lg border border-border">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold text-card-foreground">Column Schema</h3>
              <span className="text-xs font-mono text-muted-foreground">{activeFilename}</span>
            </div>
            <div className="max-h-[320px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Column</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs text-right">Null %</TableHead>
                    <TableHead className="text-xs text-right">Unique</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {qualityReport.schema.map((col) => (
                    <TableRow key={col.column}>
                      <TableCell className="font-mono text-xs">{col.column}</TableCell>
                      <TableCell>
                        <span className={`text-xs font-mono font-medium ${dtypeColor(col.dtype)}`}>
                          {col.dtype}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        {col.null_pct > 0 ? (
                          <span className="text-warning font-medium">{col.null_pct}%</span>
                        ) : (
                          <span className="text-success text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-right text-muted-foreground">
                        {col.unique_count.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Missing Values Chart */}
          <div className="bg-card rounded-lg border border-border p-4">
            <h3 className="text-sm font-semibold text-card-foreground mb-1">Missing Values by Column</h3>
            <p className="text-xs text-muted-foreground mb-4">
              {qualityReport.null_cells === 0
                ? "✅ No missing values detected"
                : `${qualityReport.null_cells} missing cells across ${qualityReport.missing_chart.length} column(s)`}
            </p>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={qualityReport.missing_chart} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 10 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis
                  dataKey="column"
                  type="category"
                  tick={{ fontSize: 10 }}
                  stroke="hsl(var(--muted-foreground))"
                  width={80}
                />
                <Tooltip
                  formatter={(val: any) => [`${val}%`, "Missing"]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="missing_pct" radius={[0, 4, 4, 0]}>
                  {qualityReport.missing_chart.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={
                        entry.missing_pct > 50
                          ? "hsl(var(--destructive))"
                          : entry.missing_pct > 20
                          ? "#f59e0b"
                          : "hsl(var(--primary))"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Empty state */}
      {backendDatasets.length === 0 && !loadingQuality && (
        <div className="border border-dashed border-border rounded-lg p-10 flex flex-col items-center justify-center text-center">
          <Database className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No datasets available yet</p>
          <p className="text-xs text-muted-foreground mt-1">Upload a CSV to get started</p>
        </div>
      )}
    </div>
  );
};

export default DataCuration;
