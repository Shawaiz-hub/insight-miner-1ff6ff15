import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Database, ChevronDown, Menu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const algorithms = [
  { name: "Apriori", href: "/dashboard?algo=apriori" },
  { name: "FP-Growth", href: "/dashboard?algo=fpgrowth" },
  { name: "ECLAT", href: "/dashboard?algo=eclat" },
  { name: "H-Mine", href: "/dashboard?algo=hmine" },
  { name: "CARMA", href: "/dashboard?algo=carma" },
  { name: "CHARM", href: "/dashboard?algo=charm" },
  { name: "MaxMiner", href: "/dashboard?algo=maxminer" },
];

export function Navbar() {
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="feature-icon w-9 h-9">
            <Database className="w-5 h-5 text-primary" />
          </div>
          <span className="text-xl font-bold">
            Smart<span className="text-primary">Mine</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <Link
            to="/"
            className={cn("nav-link", isHome && "nav-link-active")}
          >
            Home
          </Link>
          <Link to="/dashboard" className="nav-link">
            Dashboard
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger className="nav-link flex items-center gap-1">
              Algorithms <ChevronDown className="w-4 h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {algorithms.map((algo) => (
                <DropdownMenuItem key={algo.name} asChild>
                  <Link to={algo.href}>{algo.name}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Link to="/docs" className="nav-link">
            Documentation
          </Link>
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Button variant="heroOutline" asChild>
            <Link to="/dashboard">Get Started</Link>
          </Button>
        </div>

        {/* Mobile Navigation */}
        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <nav className="flex flex-col gap-4 mt-8">
              <Link to="/" className="text-lg font-medium">
                Home
              </Link>
              <Link to="/dashboard" className="text-lg font-medium">
                Dashboard
              </Link>
              <div className="border-t border-border pt-4">
                <p className="text-sm text-muted-foreground mb-2">Algorithms</p>
                {algorithms.map((algo) => (
                  <Link
                    key={algo.name}
                    to={algo.href}
                    className="block py-2 text-muted-foreground hover:text-foreground"
                  >
                    {algo.name}
                  </Link>
                ))}
              </div>
              <Button variant="hero" className="mt-4" asChild>
                <Link to="/dashboard">Get Started</Link>
              </Button>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
