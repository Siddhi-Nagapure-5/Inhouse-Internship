import { GitBranch, Clock, Hash, ArrowRight, ArrowLeftRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const lineageNodes = [
  { label: "Raw CSV", type: "data", detail: "financial_raw.csv" },
  { label: "Versioned v2.3", type: "version", detail: "hash: a3f8c2d" },
  { label: "Feature Eng.", type: "transform", detail: "15 features" },
  { label: "CatBoost v2", type: "model", detail: "96.1% acc" },
  { label: "Eval Metrics", type: "metric", detail: "F1: 95.3%" },
];

const nodeColors: Record<string, string> = {
  data: "bg-info/10 text-info border-info/30",
  version: "bg-chart-5/10 text-chart-5 border-chart-5/30",
  transform: "bg-warning/10 text-warning border-warning/30",
  model: "bg-primary/10 text-primary border-primary/30",
  metric: "bg-success/10 text-success border-success/30",
};

const timeline = [
  { version: "v2.3", date: "Feb 15, 2026", author: "alice@ml.co", changes: "Added credit_score, fixed nulls in income", hash: "a3f8c2d" },
  { version: "v2.2", date: "Feb 10, 2026", author: "bob@ml.co", changes: "Outlier removal on age column", hash: "e7b1f4a" },
  { version: "v2.1", date: "Feb 5, 2026", author: "alice@ml.co", changes: "Region encoding to category type", hash: "c9d2e3f" },
  { version: "v2.0", date: "Jan 28, 2026", author: "carol@ml.co", changes: "Major schema revision, 5 new columns", hash: "b4a6d8c" },
  { version: "v1.5", date: "Jan 15, 2026", author: "bob@ml.co", changes: "Null handling improvement", hash: "f1e5g7h" },
];

const metadata = [
  { key: "Dataset", value: "financial_v2.3" },
  { key: "Hash", value: "a3f8c2d9e4b1" },
  { key: "Rows", value: "1,248,356" },
  { key: "Columns", value: "15" },
  { key: "Size", value: "342 MB" },
  { key: "Created", value: "Feb 15, 2026" },
  { key: "Format", value: "Parquet" },
];

const Provenance = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Provenance & Lineage" description="Track data origins and transformations">
        <Button variant="outline" size="sm"><ArrowLeftRight className="h-4 w-4 mr-2" />Compare Versions</Button>
      </PageHeader>

      {/* Lineage Graph */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-sm font-semibold text-card-foreground mb-5">Data Lineage Graph</h3>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {lineageNodes.map((node, i) => (
            <div key={node.label} className="flex items-center gap-3">
              <div className={`px-4 py-3 rounded-lg border text-center ${nodeColors[node.type]}`}>
                <p className="text-xs font-semibold">{node.label}</p>
                <p className="text-[10px] opacity-70 mt-0.5">{node.detail}</p>
              </div>
              {i < lineageNodes.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Version Timeline */}
        <div className="lg:col-span-2 bg-card rounded-lg border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-card-foreground">Version Timeline</h3>
          </div>
          <div className="space-y-4">
            {timeline.map((v, i) => (
              <div key={v.version} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`h-3 w-3 rounded-full border-2 ${i === 0 ? "bg-primary border-primary" : "bg-card border-muted-foreground/30"}`} />
                  {i < timeline.length - 1 && <div className="w-px flex-1 bg-border" />}
                </div>
                <div className="pb-4 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={i === 0 ? "default" : "secondary"} className="text-xs">{v.version}</Badge>
                    <span className="text-xs text-muted-foreground">{v.date}</span>
                  </div>
                  <p className="text-sm text-card-foreground">{v.changes}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{v.author}</span>
                    <span className="font-mono flex items-center gap-1"><Hash className="h-3 w-3" />{v.hash}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Metadata Panel */}
        <div className="bg-card rounded-lg border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <GitBranch className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-card-foreground">Dataset Metadata</h3>
          </div>
          <div className="space-y-2">
            {metadata.map((m) => (
              <div key={m.key} className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50">
                <span className="text-xs text-muted-foreground">{m.key}</span>
                <span className="text-xs font-medium font-mono">{m.value}</span>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" className="w-full mt-4">
            <ArrowLeftRight className="h-3 w-3 mr-2" />Compare v2.2 vs v2.3
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Provenance;
