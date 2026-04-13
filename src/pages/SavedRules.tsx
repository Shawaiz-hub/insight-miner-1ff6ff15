import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSEO } from "@/hooks/useSEO";
import { Navbar } from "@/components/layout/Navbar";
import { OfflineIndicator } from "@/components/layout/OfflineIndicator";
import { PageTransition } from "@/components/layout/PageTransition";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { useOnline } from "@/hooks/useOnline";
import { PullToRefreshIndicator } from "@/components/ui/pull-to-refresh";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Bookmark, 
  Trash2, 
  Search, 
  ChevronRight, 
  AlertCircle,
  BookmarkX,
  ArrowLeft
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";

interface SavedRule {
  id: string;
  antecedent: string[];
  consequent: string[];
  support: number | null;
  confidence: number | null;
  lift: number | null;
  rule_name: string | null;
  notes: string | null;
  created_at: string;
}

const SavedRules = () => {
  useSEO({ title: "Saved Rules", description: "View and manage your saved association rules from data mining analyses.", path: "/saved-rules" });
  const navigate = useNavigate();
  const [rules, setRules] = useState<SavedRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const isOnline = useOnline();
  const { cacheSavedRules, getCachedSavedRules } = useOfflineCache();

  const fetchSavedRules = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("saved_rules")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      const rulesData = data || [];
      setRules(rulesData);
      
      // Cache the data for offline access
      await cacheSavedRules(rulesData);
    } catch (error) {
      console.error("Error fetching saved rules:", error);
      
      // If offline or error, try loading from cache
      if (!isOnline) {
        const cachedData = await getCachedSavedRules();
        if (cachedData.length > 0) {
          setRules(cachedData);
          toast.info("Showing cached rules");
        }
      } else {
        toast.error("Failed to load saved rules");
      }
    } finally {
      setIsLoading(false);
    }
  }, [isOnline, navigate, cacheSavedRules, getCachedSavedRules]);

  useEffect(() => {
    fetchSavedRules();
  }, [fetchSavedRules]);

  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    await fetchSavedRules();
    toast.success("Rules refreshed");
  }, [fetchSavedRules]);

  const { containerRef, isRefreshing, pullDistance, progress } = usePullToRefresh({
    onRefresh: handleRefresh,
    disabled: !isMobile,
  });

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    
    try {
      const { error } = await supabase
        .from("saved_rules")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      setRules(prev => prev.filter(r => r.id !== id));
      toast.success("Rule deleted");
    } catch (error) {
      console.error("Error deleting rule:", error);
      toast.error("Failed to delete rule");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredRules = rules.filter(rule => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      rule.antecedent.some(a => a.toLowerCase().includes(query)) ||
      rule.consequent.some(c => c.toLowerCase().includes(query)) ||
      rule.rule_name?.toLowerCase().includes(query)
    );
  });

  const getConfidenceColor = (conf: number | null) => {
    if (!conf) return "bg-muted text-muted-foreground";
    if (conf >= 0.8) return "bg-emerald-500/20 text-emerald-400";
    if (conf >= 0.6) return "bg-amber-500/20 text-amber-400";
    return "bg-muted text-muted-foreground";
  };

  const getLiftColor = (lift: number | null) => {
    if (!lift) return "bg-muted text-muted-foreground";
    if (lift >= 1.5) return "bg-emerald-500/20 text-emerald-400";
    if (lift >= 1.2) return "bg-amber-500/20 text-amber-400";
    return "bg-rose-500/20 text-rose-400";
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <div className="fixed inset-0 bg-animated-gradient pointer-events-none" />
        <div className="fixed inset-0 bg-grid opacity-10 pointer-events-none" />
        
        <OfflineIndicator />
        <Navbar />
        
        <div
          ref={containerRef}
          className="relative overflow-auto pt-20 sm:pt-24 pb-24 sm:pb-12"
          style={{ minHeight: "calc(100vh - 64px)" }}
        >
          <PullToRefreshIndicator
            pullDistance={pullDistance}
            isRefreshing={isRefreshing}
            progress={progress}
          />
          <main 
            className="relative z-10"
            style={{ transform: `translateY(${pullDistance}px)` }}
          >
            <div className="container max-w-5xl px-4 sm:px-6">
              <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8 animate-fade-in">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(-1)}
                  className="h-8 w-8 sm:h-10 sm:w-10"
                >
                  <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2 sm:gap-3">
                    <Bookmark className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                    Saved Rules
                  </h1>
                  <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                    Your bookmarked association rules
                    {isMobile && <span className="text-xs block mt-1">Pull down to refresh</span>}
                  </p>
                </div>
              </div>

              {/* Search */}
              <div className="relative mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search rules..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 max-w-md"
                />
              </div>

              {/* Rules List */}
              <div className="space-y-4 animate-fade-in" style={{ animationDelay: "0.2s" }}>
                {isLoading ? (
                  // Loading skeletons
                  Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="bg-secondary/30 border-border">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-2">
                            <Skeleton className="h-6 w-64" />
                            <Skeleton className="h-4 w-32" />
                          </div>
                          <Skeleton className="h-8 w-8" />
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : filteredRules.length > 0 ? (
                  filteredRules.map((rule, index) => (
                    <Card 
                      key={rule.id} 
                      className="bg-secondary/30 border-border hover:border-primary/30 transition-colors animate-fade-in-scale"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <div className="flex flex-wrap gap-1">
                                {rule.antecedent.map((item) => (
                                  <span
                                    key={item}
                                    className="px-2 py-0.5 rounded bg-primary/20 text-primary text-sm"
                                  >
                                    {item}
                                  </span>
                                ))}
                              </div>
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                              <div className="flex flex-wrap gap-1">
                                {rule.consequent.map((item) => (
                                  <span
                                    key={item}
                                    className="px-2 py-0.5 rounded bg-secondary text-sm"
                                  >
                                    {item}
                                  </span>
                                ))}
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                              <Badge variant="outline" className="font-mono text-xs">
                                Sup: {rule.support ? (rule.support * 100).toFixed(1) : "—"}%
                              </Badge>
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${getConfidenceColor(rule.confidence)}`}
                              >
                                Conf: {rule.confidence ? (rule.confidence * 100).toFixed(1) : "—"}%
                              </Badge>
                              <Badge 
                                variant="outline"
                                className={`text-xs ${getLiftColor(rule.lift)}`}
                              >
                                Lift: {rule.lift?.toFixed(2) || "—"}
                              </Badge>
                              <span className="text-muted-foreground text-xs hidden sm:inline">
                                Saved {new Date(rule.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(rule.id)}
                            disabled={deletingId === rule.id}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            {deletingId === rule.id ? (
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : rules.length > 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">No matching rules found</p>
                    <p className="text-sm">Try a different search term</p>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <BookmarkX className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">No saved rules yet</p>
                    <p className="text-sm mb-4">
                      Start by running association rule mining and save interesting rules
                    </p>
                    <Button onClick={() => navigate("/dashboard")}>
                      Go to Dashboard
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </PageTransition>
  );
};

export default SavedRules;
