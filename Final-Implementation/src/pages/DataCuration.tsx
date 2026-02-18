import { useState, useRef } from "react";
import { Upload, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useDatasets, useCreateDataset, useUploadDatasetFile } from "@/hooks/useData";
import { useToast } from "@/hooks/use-toast";

const driftData = [
  { day: "Mon", baseline: 0.02, current: 0.03 },
  { day: "Tue", baseline: 0.02, current: 0.04 },
  { day: "Wed", baseline: 0.02, current: 0.05 },
  { day: "Thu", baseline: 0.02, current: 0.08 },
  { day: "Fri", baseline: 0.02, current: 0.06 },
  { day: "Sat", baseline: 0.02, current: 0.12 },
  { day: "Sun", baseline: 0.02, current: 0.09 },
];

const schemaRows = [
  { column: "customer_id", v1: "int64", v2: "int64", change: "none" },
  { column: "age", v1: "float32", v2: "int32", change: "type" },
  { column: "income", v1: "float64", v2: "float64", change: "none" },
  { column: "credit_score", v1: "—", v2: "int32", change: "added" },
  { column: "region", v1: "string", v2: "category", change: "type" },
];

const DataCuration = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { data: datasets = [], isLoading } = useDatasets();
  const createDataset = useCreateDataset();
  const uploadFile = useUploadDatasetFile();
  const { toast } = useToast();

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const { filePath } = await uploadFile.mutateAsync(file);
        await createDataset.mutateAsync({
          name: file.name,
          format: file.name.split(".").pop() || "csv",
          size_bytes: file.size,
          quality_score: Math.floor(Math.random() * 20) + 80,
          file_url: filePath,
        });
      }
      toast({ title: "Upload complete", description: `${files.length} dataset(s) uploaded successfully.` });
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

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Data Curation" description="Upload, clean, and engineer your datasets">
        <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          <Upload className="h-4 w-4 mr-2" />{uploading ? "Uploading..." : "Upload Dataset"}
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
          <p className="text-xs text-muted-foreground mt-1">CSV, Parquet, JSON up to 2GB</p>
          {!uploading && <Button variant="outline" size="sm" className="mt-4">Browse Files</Button>}
        </div>

        {/* Quality Score */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-sm font-semibold text-card-foreground mb-4">Data Quality Score</h3>
          {datasets.length > 0 ? (
            <div className="flex items-center gap-4 mb-4">
              <div className="text-4xl font-bold text-foreground">
                {Math.round(datasets.reduce((sum, d) => sum + (d.quality_score || 0), 0) / datasets.length)}
                <span className="text-lg text-muted-foreground">/100</span>
              </div>
              <div className="flex-1 space-y-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Completeness</span>
                    <span className="font-medium">95%</span>
                  </div>
                  <Progress value={95} className="h-1.5" />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Consistency</span>
                    <span className="font-medium">82%</span>
                  </div>
                  <Progress value={82} className="h-1.5" />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Uniqueness</span>
                    <span className="font-medium">91%</span>
                  </div>
                  <Progress value={91} className="h-1.5" />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Upload a dataset to see quality metrics.</p>
          )}
        </div>

        {/* Pipeline Flow */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-sm font-semibold text-card-foreground mb-4">Preprocessing Pipeline</h3>
          <div className="space-y-3">
            {[
              { label: "Raw Data", status: "done", icon: CheckCircle2 },
              { label: "Null Handling", status: "done", icon: CheckCircle2 },
              { label: "Outlier Removal", status: "done", icon: CheckCircle2 },
              { label: "Feature Engineering", status: "warning", icon: AlertTriangle },
            ].map((step, i) => (
              <div key={step.label} className="flex items-center gap-3">
                <step.icon className={`h-4 w-4 shrink-0 ${step.status === "done" ? "text-success" : "text-warning"}`} />
                <span className="text-sm">{step.label}</span>
                {i < 3 && <ArrowRight className="h-3 w-3 text-muted-foreground ml-auto" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Uploaded Datasets */}
      {datasets.length > 0 && (
        <div className="bg-card rounded-lg border border-border">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-card-foreground">Your Datasets ({datasets.length})</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Format</TableHead>
                <TableHead className="text-xs text-right">Size</TableHead>
                <TableHead className="text-xs text-right">Quality</TableHead>
                <TableHead className="text-xs">Uploaded</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {datasets.map((ds) => (
                <TableRow key={ds.id}>
                  <TableCell className="text-sm font-medium">{ds.name}</TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">{ds.format}</TableCell>
                  <TableCell className="text-xs text-right text-muted-foreground">
                    {ds.size_bytes ? `${(ds.size_bytes / 1024).toFixed(1)} KB` : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-right font-medium">{ds.quality_score || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(ds.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Schema Comparison */}
        <div className="bg-card rounded-lg border border-border">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-card-foreground">Schema Comparison (v2.2 → v2.3)</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Column</TableHead>
                <TableHead className="text-xs">v2.2</TableHead>
                <TableHead className="text-xs">v2.3</TableHead>
                <TableHead className="text-xs">Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schemaRows.map((row) => (
                <TableRow key={row.column}>
                  <TableCell className="font-mono text-xs">{row.column}</TableCell>
                  <TableCell className="text-xs">{row.v1}</TableCell>
                  <TableCell className="text-xs">{row.v2}</TableCell>
                  <TableCell>
                    <span className={`text-xs font-medium ${row.change === "added" ? "text-success" : row.change === "type" ? "text-warning" : "text-muted-foreground"}`}>
                      {row.change}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Drift Chart */}
        <div className="bg-card rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold text-card-foreground mb-4">Data Drift Detection</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={driftData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
              <Line type="monotone" dataKey="baseline" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" dot={false} />
              <Line type="monotone" dataKey="current" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-muted-foreground inline-block" style={{ borderTop: "2px dashed" }} /> Baseline</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-destructive inline-block" /> Current</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataCuration;
