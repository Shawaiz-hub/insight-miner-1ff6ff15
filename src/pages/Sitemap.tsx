import { Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/layout/PageTransition";
import {
  Home, LayoutDashboard, BookOpen, LogIn, Clock, User, Shield, FileText, Bookmark, Map,
} from "lucide-react";

const sections = [
  {
    title: "Main",
    links: [
      { to: "/", label: "Home", icon: Home, description: "Landing page and platform overview" },
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Run data mining algorithms on your datasets" },
      { to: "/docs", label: "Documentation", icon: BookOpen, description: "Guides, API reference, and tutorials" },
    ],
  },
  {
    title: "Account",
    links: [
      { to: "/auth", label: "Sign In / Sign Up", icon: LogIn, description: "Authentication and account creation" },
      { to: "/profile", label: "Profile", icon: User, description: "Manage your account settings" },
    ],
  },
  {
    title: "Data",
    links: [
      { to: "/history", label: "Mining History", icon: Clock, description: "View and manage past mining sessions" },
      { to: "/saved-rules", label: "Saved Rules", icon: Bookmark, description: "Browse and manage saved association rules" },
    ],
  },
  {
    title: "Legal",
    links: [
      { to: "/privacy", label: "Privacy Policy", icon: Shield, description: "How we handle your data" },
      { to: "/terms", label: "Terms of Service", icon: FileText, description: "Terms and conditions of use" },
    ],
  },
];

export default function Sitemap() {
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

            <div className="space-y-8">
              {sections.map((section) => (
                <div key={section.title}>
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    {section.title}
                  </h2>
                  <div className="grid gap-2">
                    {section.links.map((link) => (
                      <Link
                        key={link.to}
                        to={link.to}
                        className="group flex items-center gap-3 rounded-lg border border-border bg-secondary/20 px-4 py-3 hover:bg-secondary/40 transition-colors"
                      >
                        <link.icon className="w-4 h-4 text-primary flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium group-hover:text-primary transition-colors">
                            {link.label}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {link.description}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
}
