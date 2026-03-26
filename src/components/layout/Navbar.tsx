import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Database, ChevronDown, Menu, User, LogOut, History, Settings, Bookmark, Shield } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

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
  const navigate = useNavigate();
  const isHome = location.pathname === "/";
  const { user, signOut, isLoading } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const userInitials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase()
    : user?.email?.[0].toUpperCase() || "U";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-14 sm:h-16 items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-1.5 sm:gap-2">
          <div className="feature-icon w-7 h-7 sm:w-9 sm:h-9">
            <Database className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </div>
          <span className="text-lg sm:text-xl font-bold">
            Smart<span className="text-primary">Mine</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-6 xl:gap-8">
          <Link
            to="/"
            className={cn("nav-link text-sm", isHome && "nav-link-active")}
          >
            Home
          </Link>
          <Link to="/dashboard" className="nav-link text-sm">
            Dashboard
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger className="nav-link flex items-center gap-1 text-sm">
              Algorithms <ChevronDown className="w-3.5 h-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {algorithms.map((algo) => (
                <DropdownMenuItem key={algo.name} asChild>
                  <Link to={algo.href}>{algo.name}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Link to="/docs" className="nav-link text-sm">
            Documentation
          </Link>
        </nav>

        <div className="hidden lg:flex items-center gap-2 sm:gap-3">
          {isLoading ? null : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full">
                  <Avatar className="h-9 w-9 sm:h-10 sm:w-10">
                    <AvatarImage src={user.user_metadata?.avatar_url} />
                    <AvatarFallback className="bg-primary/20 text-primary text-sm">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    {user.user_metadata?.full_name && (
                      <p className="font-medium">{user.user_metadata.full_name}</p>
                    )}
                    <p className="text-sm text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/history" className="cursor-pointer">
                    <History className="mr-2 h-4 w-4" />
                    History
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/saved-rules" className="cursor-pointer">
                    <Bookmark className="mr-2 h-4 w-4" />
                    Saved Rules
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/dashboard" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" asChild size="sm">
                <Link to="/auth">Sign In</Link>
              </Button>
              <Button variant="heroOutline" asChild size="sm">
                <Link to="/auth">Get Started</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Navigation */}
        <Sheet>
          <SheetTrigger asChild className="lg:hidden">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 px-4 sm:px-6">
            <nav className="flex flex-col gap-3 sm:gap-4 mt-6 sm:mt-8">
              <Link to="/" className="text-base sm:text-lg font-medium">
                Home
              </Link>
              <Link to="/dashboard" className="text-base sm:text-lg font-medium">
                Dashboard
              </Link>
              {user && (
                <>
                  <Link to="/history" className="text-base sm:text-lg font-medium">
                    History
                  </Link>
                  <Link to="/saved-rules" className="text-base sm:text-lg font-medium">
                    Saved Rules
                  </Link>
                  <Link to="/profile" className="text-base sm:text-lg font-medium">
                    Profile
                  </Link>
                </>
              )}
              <div className="border-t border-border pt-3 sm:pt-4">
                <p className="text-xs sm:text-sm text-muted-foreground mb-2">Algorithms</p>
                <div className="grid grid-cols-2 gap-2">
                  {algorithms.map((algo) => (
                    <Link
                      key={algo.name}
                      to={algo.href}
                      className="block py-1.5 sm:py-2 text-sm text-muted-foreground hover:text-foreground"
                    >
                      {algo.name}
                    </Link>
                  ))}
                </div>
              </div>
              {user ? (
                <Button variant="destructive" className="mt-4" onClick={handleSignOut}>
                  Sign Out
                </Button>
              ) : (
                <Button variant="hero" className="mt-4" asChild>
                  <Link to="/auth">Get Started</Link>
                </Button>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
