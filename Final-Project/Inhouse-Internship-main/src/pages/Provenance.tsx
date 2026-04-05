import { GitBranch, Clock, Hash, ArrowRight, ArrowLeftRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const initialLineageNodes = [
  { label: "Raw Dataset", type: "data", detail: "Waiting for upload..." },
  { label: "Version Check", type: "version", detail: "hash: pending" },
  { label: "Feature Eng.", type: "transform", detail: "pending" },
  { label: "AutoML Model", type: "model", detail: "pending" },
  { label: "Eval Metrics", type: "metric", detail: "pending" },
];

const nodeColors: Record<string, string> = {
  data: "bg-info/10 text-info border-info/30",
  version: "bg-chart-5/10 text-chart-5 border-chart-5/30",
  transform: "bg-warning/10 text-warning border-warning/30",
  model: "bg-primary/10 text-primary border-primary/30",
  metric: "bg-success/10 text-success border-success/30",
};

const timeline = [
  { version: "v1.0", date: "Today", author: "system", changes: "Awaiting dataset...", hash: "0000000" }
];

const initialMetadata = [
  { key: "Dataset", value: "Pending" },
  { key: "Hash", value: "Pending" },
  { key: "Rows", value: "Pending" },
  { key: "Columns", value: "Pending" },
  { key: "Created", value: "Pending" },
];

import { useEffect, useState } from "react";

const Provenance = () => {
  const [timelineState, setTimelineState] = useState(timeline);
  const [lineageState, setLineageState] = useState(initialLineageNodes);
  const [metadataState, setMetadataState] = useState(initialMetadata);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/provenance")
      .then(res => res.json())
      .then(data => {
         if(data && data.length > 0) {
            const mapped = [...data].reverse().map((d: any, i: number) => ({
                version: `v${data.length - i}.0`,
                date: d.timestamp ? new Date(d.timestamp).toLocaleDateString() : "Today",
                author: "system",
                changes: `AutoML Run on ${d.dataset_name} | Acc: ${d.test_accuracy ? (d.test_accuracy*100).toFixed(1)+'%' : 'N/A'}`,
                hash: d.run_id ? d.run_id.substring(0, 7) : "unknown"
            }));
            setTimelineState(mapped);

            const latest = data[data.length - 1];
            setLineageState([
              { label: "Raw Data", type: "data", detail: latest.dataset_name },
              { label: `Versioned`, type: "version", detail: `hash: ${latest.run_id?.substring(0,6) || "none"}` },
              { label: "Feature Eng.", type: "transform", detail: "Auto Cleaned" },
              { label: "AutoML Tune", type: "model", detail: "Best Model Saved" },
              { label: "Eval Metrics", type: "metric", detail: latest.test_accuracy ? `Acc: ${(latest.test_accuracy*100).toFixed(1)}%` : "Complete" },
            ]);

            setMetadataState([
              { key: "Dataset", value: latest.dataset_name },
              { key: "Run ID", value: latest.run_id },
              { key: "Rows Total", value: latest.data_shapes?.before_rows ? String(latest.data_shapes.before_rows) : "N/A" },
              { key: "Split Train", value: latest.data_shapes?.X_train ? String(latest.data_shapes.X_train[0]) : "N/A" },
              { key: "Created", value: latest.timestamp ? new Date(latest.timestamp).toLocaleTimeString() : "Today" },
            ]);
         }
      })
      .catch(console.error);
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Provenance & Lineage" description="Track data origins and transformations">
        <Button variant="outline" size="sm"><ArrowLeftRight className="h-4 w-4 mr-2" />Compare Versions</Button>
      </PageHeader>

      {/* Lineage Graph */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-sm font-semibold text-card-foreground mb-5">Data Lineage Graph</h3>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {lineageState.map((node, i) => (
            <div key={node.label} className="flex items-center gap-3">
              <div className={`px-4 py-3 rounded-lg border text-center ${nodeColors[node.type]}`}>
                <p className="text-xs font-semibold">{node.label}</p>
                <p className="text-[10px] opacity-70 mt-0.5">{node.detail}</p>
              </div>
              {i < lineageState.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />}
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
            {timelineState.map((v, i) => (
              <div key={v.hash + i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`h-3 w-3 rounded-full border-2 ${i === 0 ? "bg-primary border-primary" : "bg-card border-muted-foreground/30"}`} />
                  {i < timelineState.length - 1 && <div className="w-px flex-1 bg-border" />}
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
            {metadataState.map((m) => (
              <div key={m.key} className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50">
                <span className="text-xs text-muted-foreground">{m.key}</span>
                <span className="text-xs font-medium font-mono">{m.value}</span>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" className="w-full mt-4">
            <ArrowLeftRight className="h-3 w-3 mr-2" />Compare Active Source
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Provenance;
