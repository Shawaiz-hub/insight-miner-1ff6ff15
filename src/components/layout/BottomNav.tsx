import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, History, User, Bookmark, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/history", label: "History", icon: History },
  { path: "/saved-rules", label: "Saved", icon: Bookmark },
  { path: "/docs", label: "Docs", icon: FileText },
  { path: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const location = useLocation();
  const isMobile = useIsMobile();

  // Only show on mobile and when user is on an app page (not landing)
  const appPaths = ["/dashboard", "/history", "/saved-rules", "/profile", "/docs"];
  const isAppPage = appPaths.some(path => location.pathname.startsWith(path));

  if (!isMobile || !isAppPage) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive && "scale-110 transition-transform")} />
              <span className="text-[10px] font-medium">{label}</span>
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
