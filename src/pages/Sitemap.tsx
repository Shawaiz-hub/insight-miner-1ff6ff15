import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/layout/PageTransition";
import { supabase } from "@/integrations/supabase/client";
import {
  Home, LayoutDashboard, BookOpen, LogIn, Clock, User, Shield, FileText, Bookmark, Map, Newspaper,
} from "lucide-react";

const iconMap: Record<string, any> = {
  "/": Home,
  "/dashboard": LayoutDashboard,
  "/docs": BookOpen,
  "/auth": LogIn,
  "/history": Clock,
  "/profile": User,
  "/privacy": Shield,
  "/terms": FileText,
  "/saved-rules": Bookmark,
  "/sitemap": Map,
  "/blog": Newspaper,
};

const descriptionMap: Record<string, string> = {
  "/": "Landing page and platform overview",
  "/dashboard": "Run data mining algorithms on your datasets",
  "/docs": "Guides, API reference, and tutorials",
  "/auth": "Sign in or create an account",
  "/history": "View and manage past mining sessions",
  "/profile": "Manage your account settings",
  "/privacy": "How we handle your data",
  "/terms": "Terms and conditions of use",
  "/saved-rules": "Browse and manage saved association rules",
  "/sitemap": "All pages on this site",
  "/blog": "Articles and tutorials on data mining",
};

interface SitemapEntry {
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: string;
}

export default function Sitemap() {
  const [entries, setEntries] = useState<SitemapEntry[]>([]);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("setting_value")
      .eq("setting_key", "sitemap_entries")
      .single()
      .then(({ data }) => {
        if (data?.setting_value) {
          const saved = data.setting_value as unknown as SitemapEntry[];
          if (Array.isArray(saved) && saved.length > 0) {
            setEntries(saved.sort((a, b) => parseFloat(b.priority) - parseFloat(a.priority)));
            return;
          }
        }
        // Fallback defaults
        setEntries([
          { loc: "/", lastmod: "", changefreq: "weekly", priority: "1.0" },
          { loc: "/dashboard", lastmod: "", changefreq: "daily", priority: "0.9" },
          { loc: "/docs", lastmod: "", changefreq: "weekly", priority: "0.8" },
          { loc: "/blog", lastmod: "", changefreq: "daily", priority: "0.8" },
          { loc: "/auth", lastmod: "", changefreq: "monthly", priority: "0.7" },
          { loc: "/history", lastmod: "", changefreq: "daily", priority: "0.7" },
          { loc: "/profile", lastmod: "", changefreq: "monthly", priority: "0.6" },
          { loc: "/saved-rules", lastmod: "", changefreq: "daily", priority: "0.6" },
          { loc: "/sitemap", lastmod: "", changefreq: "monthly", priority: "0.4" },
          { loc: "/privacy", lastmod: "", changefreq: "yearly", priority: "0.3" },
          { loc: "/terms", lastmod: "", changefreq: "yearly", priority: "0.3" },
        ]);
      });
  }, []);

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container py-20 sm:py-24 px-4 sm:px-6 pb-24 sm:pb-12">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <Map className="w-7 h-7 text-primary" />
              <h1 className="text-2xl sm:text-3xl font-bold">Sitemap</h1>
            </div>

            <div className="grid gap-2">
              {entries.map((entry) => {
                const Icon = iconMap[entry.loc] || FileText;
                const description = descriptionMap[entry.loc] || entry.loc;
                const isExternal = entry.loc.startsWith("http");

                if (isExternal) {
                  return (
                    <a
                      key={entry.loc}
                      href={entry.loc}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-3 rounded-lg border border-border bg-secondary/20 px-4 py-3 hover:bg-secondary/40 transition-colors"
                    >
                      <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium group-hover:text-primary transition-colors">{entry.loc}</p>
                      </div>
                    </a>
                  );
                }

                return (
                  <Link
                    key={entry.loc}
                    to={entry.loc}
                    className="group flex items-center gap-3 rounded-lg border border-border bg-secondary/20 px-4 py-3 hover:bg-secondary/40 transition-colors"
                  >
                    <Icon className="w-4 h-4 text-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium group-hover:text-primary transition-colors">
                        {entry.loc === "/" ? "Home" : entry.loc.replace(/^\//, "").replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{description}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
}
