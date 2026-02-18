import { Trophy, Settings2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const models = [
  { rank: 1, name: "CatBoost v2", accuracy: 96.1, f1: 95.3, rocAuc: 97.2, time: "12m", status: "champion" },
  { rank: 2, name: "XGBoost v3", accuracy: 94.2, f1: 93.8, rocAuc: 95.6, time: "8m", status: "challenger" },
  { rank: 3, name: "LightGBM v4", accuracy: 91.8, f1: 90.2, rocAuc: 93.1, time: "5m", status: "challenger" },
  { rank: 4, name: "Random Forest", accuracy: 89.5, f1: 88.1, rocAuc: 91.4, time: "15m", status: "baseline" },
  { rank: 5, name: "Logistic Reg.", accuracy: 82.3, f1: 80.7, rocAuc: 85.9, time: "1m", status: "baseline" },
];

const radarData = [
  { metric: "Accuracy", CatBoost: 96, XGBoost: 94, LightGBM: 92 },
  { metric: "Precision", CatBoost: 95, XGBoost: 93, LightGBM: 90 },
  { metric: "Recall", CatBoost: 94, XGBoost: 92, LightGBM: 89 },
  { metric: "F1", CatBoost: 95, XGBoost: 94, LightGBM: 90 },
  { metric: "ROC-AUC", CatBoost: 97, XGBoost: 96, LightGBM: 93 },
];

const perfData = [
  { name: "CatBoost", accuracy: 96.1, f1: 95.3 },
  { name: "XGBoost", accuracy: 94.2, f1: 93.8 },
  { name: "LightGBM", accuracy: 91.8, f1: 90.2 },
  { name: "RF", accuracy: 89.5, f1: 88.1 },
  { name: "LogReg", accuracy: 82.3, f1: 80.7 },
];

const hyperparams = [
  { param: "learning_rate", value: "0.05" },
  { param: "max_depth", value: "8" },
  { param: "n_estimators", value: "500" },
  { param: "subsample", value: "0.8" },
  { param: "colsample_bytree", value: "0.9" },
  { param: "reg_lambda", value: "1.0" },
];

const AutoML = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="AutoML & Benchmarking" description="Compare models and find the best performer">
        <Button size="sm">Run AutoML</Button>
      </PageHeader>

      {/* Leaderboard */}
      <div className="bg-card rounded-lg border border-border">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <Trophy className="h-4 w-4 text-warning" />
          <h3 className="text-sm font-semibold text-card-foreground">Model Leaderboard</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs w-12">#</TableHead>
              <TableHead className="text-xs">Model</TableHead>
              <TableHead className="text-xs text-right">Accuracy</TableHead>
              <TableHead className="text-xs text-right">F1</TableHead>
              <TableHead className="text-xs text-right">ROC-AUC</TableHead>
              <TableHead className="text-xs text-right">Train Time</TableHead>
              <TableHead className="text-xs">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {models.map((m) => (
              <TableRow key={m.rank} className={m.rank === 1 ? "bg-accent/30" : ""}>
                <TableCell className="font-bold text-sm">{m.rank}</TableCell>
                <TableCell className="text-sm font-medium">{m.name}</TableCell>
                <TableCell className="text-sm text-right font-mono">{m.accuracy}%</TableCell>
                <TableCell className="text-sm text-right font-mono">{m.f1}%</TableCell>
                <TableCell className="text-sm text-right font-mono">{m.rocAuc}%</TableCell>
                <TableCell className="text-sm text-right text-muted-foreground">{m.time}</TableCell>
                <TableCell>
                  <Badge variant={m.status === "champion" ? "default" : "secondary"} className="text-xs">
                    {m.status === "champion" && <Trophy className="h-3 w-3 mr-1" />}
                    {m.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Chart */}
        <div className="lg:col-span-1 bg-card rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold text-card-foreground mb-4">Performance Comparison</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={perfData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" domain={[70, 100]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={70} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
              <Bar dataKey="accuracy" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Accuracy" />
              <Bar dataKey="f1" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} name="F1 Score" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Radar Chart */}
        <div className="lg:col-span-1 bg-card rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold text-card-foreground mb-4">Multi-Metric Radar</h3>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <Radar name="CatBoost" dataKey="CatBoost" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} />
              <Radar name="XGBoost" dataKey="XGBoost" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.1} />
              <Radar name="LightGBM" dataKey="LightGBM" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" fillOpacity={0.1} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Hyperparameters */}
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 mb-4">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-card-foreground">Best Hyperparameters</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">CatBoost v2 (Champion)</p>
          <div className="space-y-2">
            {hyperparams.map((hp) => (
              <div key={hp.param} className="flex items-center justify-between py-1.5 px-3 rounded-md bg-muted/50">
                <span className="text-xs font-mono text-muted-foreground">{hp.param}</span>
                <span className="text-xs font-mono font-medium">{hp.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutoML;
