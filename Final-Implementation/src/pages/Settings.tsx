import { useState } from "react";
import { User, Bell, Shield } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useProfile, useUpdateProfile } from "@/hooks/useData";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const SettingsPage = () => {
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [initialized, setInitialized] = useState(false);

  // Initialize form from profile data
  if (profile && !initialized) {
    setFullName(profile.full_name || "");
    setInitialized(true);
  }

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync({ full_name: fullName });
      toast({ title: "Settings saved", description: "Your profile has been updated." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <PageHeader title="Settings" description="Manage your platform preferences" />

      {/* Profile */}
      <div className="bg-card rounded-lg border border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <User className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-card-foreground">Profile</h3>
        </div>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Full Name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input value={user?.email || ""} className="h-9 text-sm" readOnly />
            </div>
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="bg-card rounded-lg border border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-card-foreground">Notifications</h3>
        </div>
        <div className="space-y-4">
          {[
            { label: "Experiment completed", desc: "Get notified when an experiment finishes" },
            { label: "Data drift alerts", desc: "Alert when data drift exceeds threshold" },
            { label: "Model deployment", desc: "Notification on model deployment status" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Switch defaultChecked />
            </div>
          ))}
        </div>
      </div>

      {/* API & Security */}
      <div className="bg-card rounded-lg border border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-card-foreground">Account</h3>
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">User ID</Label>
            <Input value={user?.id || ""} className="h-9 text-sm font-mono" readOnly />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={handleSave} disabled={updateProfile.isPending}>
          {updateProfile.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
};

export default SettingsPage;
