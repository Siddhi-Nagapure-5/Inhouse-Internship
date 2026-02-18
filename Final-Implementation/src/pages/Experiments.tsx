import { useState, useRef, useCallback } from "react";
import { FlaskConical, Play, CheckCircle2, Clock, XCircle, Filter, Search } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useExperiments, useCreateExperiment } from "@/hooks/useData";
import { useToast } from "@/hooks/use-toast";

const statusIcon: Record<string, React.ReactNode> = {
  completed: <CheckCircle2 className="h-3.5 w-3.5 text-success" />,
  running: <Clock className="h-3.5 w-3.5 text-info animate-spin" />,
  failed: <XCircle className="h-3.5 w-3.5 text-destructive" />,
};

const statusStyle: Record<string, string> = {
  completed: "bg-success/10 text-success border-success/20",
  running: "bg-info/10 text-info border-info/20",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
};

const Experiments = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const { data: experiments = [], isLoading } = useExperiments();
  const createExperiment = useCreateExperiment();
  const { toast } = useToast();

  const filtered = experiments.filter((exp) => {
    const matchesSearch = exp.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || exp.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createExperiment.mutateAsync({ name: newName, status: "running" });
      toast({ title: "Experiment created", description: `"${newName}" is now running.` });
      setNewName("");
      setDialogOpen(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Experiments" description="Track and manage all ML experiments">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Play className="h-4 w-4 mr-2" />New Experiment</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Experiment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Experiment Name</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Credit Risk v4" className="h-9 text-sm" />
              </div>
              <Button onClick={handleCreate} disabled={createExperiment.isPending} className="w-full h-9 text-sm">
                {createExperiment.isPending ? "Creating..." : "Create Experiment"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search experiments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] h-9 text-sm">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-lg border border-border">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading experiments...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {experiments.length === 0 ? "No experiments yet. Create your first one!" : "No experiments match your filters."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs text-right">Accuracy</TableHead>
                <TableHead className="text-xs text-right">F1</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((exp) => (
                <TableRow key={exp.id}>
                  <TableCell className="text-sm font-medium">{exp.name}</TableCell>
                  <TableCell className="text-sm text-right font-mono">{exp.accuracy ? `${exp.accuracy}%` : "—"}</TableCell>
                  <TableCell className="text-sm text-right font-mono">{exp.f1_score ? `${exp.f1_score}%` : "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`gap-1 ${statusStyle[exp.status || "running"]}`}>
                      {statusIcon[exp.status || "running"]}
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
    </div>
  );
};

export default Experiments;
