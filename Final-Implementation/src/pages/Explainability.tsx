import { Brain, BarChart3, Target } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";

const Explainability = () => {
  const [explainImg, setExplainImg] = useState<string | null>(null);
  const [localImg, setLocalImg] = useState<string | null>(null);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/explain/demo123")
      .then(res => res.json())
      .then(data => {
         if(data.base64_str) {
           setExplainImg(`data:image/png;base64,${data.base64_str}`);
         }
         if(data.local_base64_str) {
           setLocalImg(`data:image/png;base64,${data.local_base64_str}`);
         }
      })
      .catch(console.error);
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Model Explainability" description="Understand why models make their predictions">
        <Badge variant="outline" className="gap-1">
          <Brain className="h-3 w-3" /> Latest Model
        </Badge>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 mb-6">
        {/* SHAP Values Global */}
        <div className="bg-card rounded-lg border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-card-foreground">Global Explanations Summary (Live API)</h3>
          </div>
          {explainImg ? (
            <img src={explainImg} alt="Global SHAP Plot" className="w-full h-[600px] object-contain rounded-md border border-border" />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-10">Run AutoML Pipeline to generate Global Explanations...</p>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SHAP Values Local */}
        <div className="bg-card rounded-lg border border-border p-5">
          <h3 className="text-sm font-semibold text-card-foreground mb-4">Local Explanation Waterfall (Live API)</h3>
          {localImg ? (
            <img src={localImg} alt="Local SHAP Plot" className="w-full h-auto rounded-md border border-border" />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-10">Run AutoML Pipeline to generate Local Explanations...</p>
          )}
        </div>

        {/* Confidence */}
        <div className="bg-card rounded-lg border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-card-foreground">Data Confidence Matrix</h3>
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
            <p className="text-sm text-muted-foreground mt-4">Feature Completeness High</p>
            <Badge className="mt-2 bg-success/10 text-success border-success/20" variant="outline">Pipeline Ready</Badge>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Explainability;
