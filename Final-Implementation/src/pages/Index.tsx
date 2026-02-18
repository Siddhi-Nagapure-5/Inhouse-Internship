import { Database, Layers, Bot, Target, ArrowRight, CheckCircle2, Clock } from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useDatasets, useExperiments, useModels } from "@/hooks/useData";
import { useNavigate } from "react-router-dom";

const versionData = [
  { version: "v1.0", quality: 72 },
  { version: "v1.5", quality: 78 },
  { version: "v2.0", quality: 85 },
  { version: "v2.3", quality: 91 },
  { version: "v3.0", quality: 94 },
];

const statusColor: Record<string, string> = {
  completed: "bg-success/10 text-success border-success/20",
  running: "bg-info/10 text-info border-info/20",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
};

const Index = () => {
  const { data: datasets = [] } = useDatasets();
  const { data: experiments = [] } = useExperiments();
  const { data: models = [] } = useModels();
  const navigate = useNavigate();

  const bestAccuracy = models.length > 0
    ? `${Math.max(...models.map((m) => m.accuracy || 0)).toFixed(1)}%`
    : "—";
  const bestModel = models.length > 0
    ? models.reduce((best, m) => (m.accuracy || 0) > (best.accuracy || 0) ? m : best, models[0])
    : null;

  const recentExperiments = experiments.slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Dashboard Overview" description="Monitor your ML pipeline at a glance">
        <Button size="sm" onClick={() => navigate("/experiments")}>New Experiment</Button>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Active Datasets" value={datasets.length} icon={<Database className="h-5 w-5" />} />
        <KpiCard title="Dataset Versions" value={datasets.length} icon={<Layers className="h-5 w-5" />} />
        <KpiCard title="Models Trained" value={models.length} icon={<Bot className="h-5 w-5" />} />
        <KpiCard title="Best Model Accuracy" value={bestAccuracy} icon={<Target className="h-5 w-5" />} subtitle={bestModel?.name} />
      </div>

      {/* Pipeline Flow */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-sm font-semibold text-card-foreground mb-4">Pipeline Flow</h3>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {["Data Ingestion", "Curation & QA", "Feature Engineering", "Model Training", "Evaluation", "Deployment"].map(
            (step, i) => (
              <div key={step} className="flex items-center gap-2">
                <div className="px-4 py-2 rounded-lg bg-accent text-accent-foreground text-xs font-medium border border-border">
                  {step}
                </div>
                {i < 5 && <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />}
              </div>
            )
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Experiments */}
        <div className="lg:col-span-2 bg-card rounded-lg border border-border">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-card-foreground">Recent Experiments</h3>
          </div>
          {recentExperiments.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No experiments yet. <button onClick={() => navigate("/experiments")} className="text-primary hover:underline">Create one</button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Experiment</TableHead>
                  <TableHead className="text-xs">Accuracy</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentExperiments.map((exp) => (
                  <TableRow key={exp.id}>
                    <TableCell className="text-sm font-medium">{exp.name}</TableCell>
                    <TableCell className="text-sm font-medium">{exp.accuracy ? `${exp.accuracy}%` : "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColor[exp.status || "running"]}>
                        {exp.status === "completed" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                        {exp.status === "running" && <Clock className="h-3 w-3 mr-1 animate-spin" />}
                        {exp.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(exp.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Version Quality Chart */}
        <div className="bg-card rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold text-card-foreground mb-4">Dataset Quality Over Versions</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={versionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="version" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="quality" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Index;
