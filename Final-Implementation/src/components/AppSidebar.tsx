import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Database,
  Bot,
  GitBranch,
  Brain,
  FlaskConical,
  Settings,
  ChevronLeft,
  ChevronRight,
  Workflow,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { title: "Dashboard", path: "/", icon: LayoutDashboard },
  { title: "Data Curation", path: "/data-curation", icon: Database },
  { title: "AutoML Benchmarking", path: "/automl", icon: Bot },
  { title: "Provenance & Lineage", path: "/provenance", icon: GitBranch },
  { title: "Explainability", path: "/explainability", icon: Brain },
  { title: "Experiments", path: "/experiments", icon: FlaskConical },
  { title: "Settings", path: "/settings", icon: Settings },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <aside
      className={cn(
        "h-screen sticky top-0 flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-14 border-b border-sidebar-border">
        <Workflow className="h-6 w-6 text-primary shrink-0" />
        {!collapsed && (
          <span className="font-semibold text-sm text-foreground truncate">
            TrustML Pipeline
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.title}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-2 flex items-center justify-between">
        <ThemeToggle />
        <div className="flex items-center gap-1">
          <button
            onClick={signOut}
            className="h-8 w-8 flex items-center justify-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8 flex items-center justify-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
