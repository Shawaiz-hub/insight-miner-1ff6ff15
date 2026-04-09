import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Settings,
  Globe,
  ArrowLeft,
  Eye,
  FileText,
  FolderOpen,
  Tags,
  Home,
  Map,
} from "lucide-react";
import { cn } from "@/lib/utils";

const adminLinks = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/users", icon: Users, label: "Users" },
  { to: "/admin/seo", icon: Globe, label: "SEO Management" },
  { to: "/admin/visitors", icon: Eye, label: "Visitor Logs" },
  { to: "/admin/blog", icon: FileText, label: "Blog Posts" },
  { to: "/admin/blog/categories", icon: FolderOpen, label: "Categories" },
  { to: "/admin/blog/tags", icon: Tags, label: "Tags" },
  { to: "/admin/home-sections", icon: Home, label: "Homepage Sections" },
  { to: "/admin/sitemap", icon: Map, label: "Sitemap" },
  { to: "/admin/settings", icon: Settings, label: "Settings" },
];

export function AdminSidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 min-h-screen border-r border-border bg-card/50 flex flex-col">
      <div className="p-4 border-b border-border">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Site
        </Link>
        <h2 className="mt-3 text-lg font-bold">Admin Panel</h2>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {adminLinks.map((link) => {
          const isActive = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <link.icon className="w-4 h-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
