import { Brain, BarChart3, Target } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const featureImportance = [
  { feature: "credit_score", importance: 0.28, color: "hsl(var(--primary))" },
  { feature: "income", importance: 0.22, color: "hsl(var(--primary))" },
  { feature: "debt_ratio", importance: 0.18, color: "hsl(var(--chart-2))" },
  { feature: "age", importance: 0.12, color: "hsl(var(--chart-2))" },
  { feature: "employment_years", importance: 0.08, color: "hsl(var(--chart-3))" },
  { feature: "num_accounts", importance: 0.06, color: "hsl(var(--chart-3))" },
  { feature: "region", importance: 0.04, color: "hsl(var(--chart-4))" },
  { feature: "education", importance: 0.02, color: "hsl(var(--chart-4))" },
];

const shapValues = [
  { feature: "credit_score", value: 720, shap: +0.35, direction: "positive" },
  { feature: "income", value: "$85K", shap: +0.22, direction: "positive" },
  { feature: "debt_ratio", value: "0.35", shap: -0.15, direction: "negative" },
  { feature: "age", value: 34, shap: +0.08, direction: "positive" },
  { feature: "employment_years", value: 6, shap: +0.05, direction: "positive" },
  { feature: "num_accounts", value: 3, shap: -0.03, direction: "negative" },
];

const predictionBreakdown = [
  { label: "Base Value", value: 0.5, bar: 50 },
  { label: "+ credit_score", value: 0.85, bar: 85 },
  { label: "+ income", value: 0.92, bar: 92 },
  { label: "− debt_ratio", value: 0.84, bar: 84 },
  { label: "Final Prediction", value: 0.87, bar: 87 },
];

const Explainability = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Model Explainability" description="Understand why models make their predictions">
        <Badge variant="outline" className="gap-1">
          <Brain className="h-3 w-3" /> CatBoost v2
        </Badge>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feature Importance */}
        <div className="bg-card rounded-lg border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-card-foreground">Feature Importance</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={featureImportance} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis dataKey="feature" type="category" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={110} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
              <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                {featureImportance.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* SHAP Values */}
        <div className="bg-card rounded-lg border border-border p-5">
          <h3 className="text-sm font-semibold text-card-foreground mb-4">SHAP Explanation (Sample #4821)</h3>
          <div className="space-y-3">
            {shapValues.map((sv) => (
              <div key={sv.feature} className="flex items-center gap-3">
                <span className="text-xs font-mono text-muted-foreground w-28 shrink-0">{sv.feature}</span>
                <span className="text-xs w-12 text-right">{sv.value}</span>
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden relative">
                    <div
                      className={`absolute top-0 h-full rounded-full ${sv.direction === "positive" ? "bg-success left-1/2" : "bg-destructive right-1/2"}`}
                      style={{ width: `${Math.abs(sv.shap) * 150}%` }}
                    />
                  </div>
                  <span className={`text-xs font-mono font-medium w-12 text-right ${sv.direction === "positive" ? "text-success" : "text-destructive"}`}>
                    {sv.shap > 0 ? "+" : ""}{sv.shap.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Prediction Breakdown */}
        <div className="bg-card rounded-lg border border-border p-5">
          <h3 className="text-sm font-semibold text-card-foreground mb-4">Prediction Waterfall</h3>
          <div className="space-y-3">
            {predictionBreakdown.map((step, i) => (
              <div key={step.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className={i === predictionBreakdown.length - 1 ? "font-semibold text-card-foreground" : "text-muted-foreground"}>
                    {step.label}
                  </span>
                  <span className="font-mono font-medium">{step.value.toFixed(2)}</span>
                </div>
                <Progress value={step.bar} className="h-2" />
              </div>
            ))}
          </div>
        </div>

        {/* Confidence */}
        <div className="bg-card rounded-lg border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-card-foreground">Confidence Score</h3>
          </div>
          <div className="flex flex-col items-center justify-center py-8">
            <div className="relative h-36 w-36">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke="hsl(var(--success))" strokeWidth="8"
                  strokeDasharray={`${87 * 2.64} ${100 * 2.64}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold text-foreground">87%</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">High Confidence — Low Risk</p>
            <Badge className="mt-2 bg-success/10 text-success border-success/20" variant="outline">Approved</Badge>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Explainability;
