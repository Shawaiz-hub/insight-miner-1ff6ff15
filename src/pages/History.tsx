import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { OfflineIndicator } from "@/components/layout/OfflineIndicator";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/layout/PageTransition";
import { useRequireAuth } from "@/hooks/useAuth";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { useOnline } from "@/hooks/useOnline";
import { PullToRefreshIndicator } from "@/components/ui/pull-to-refresh";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, Database, Trash2, ArrowRight, History as HistoryIcon } from "lucide-react";
import { RecommendationComparison } from "@/components/dashboard/RecommendationComparison";
import { format } from "date-fns";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

interface MiningHistoryItem {
  id: string;
  algorithm: string;
  task_type: string;
  dataset_name: string | null;
  parameters: unknown;
  results_summary: unknown;
  execution_time_ms: number | null;
  created_at: string;
}

export default function History() {
  const { user, isLoading: authLoading } = useRequireAuth();
  const [history, setHistory] = useState<MiningHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isMobile = useIsMobile();
  const isOnline = useOnline();
  const { cacheHistory, getCachedHistory, syncPendingMutations, queueOfflineMutation } = useOfflineCache();

  const fetchHistory = useCallback(async () => {
    // Sync any pending offline mutations first
    await syncPendingMutations();
    
    try {
      const { data, error } = await supabase
        .from("mining_history")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      const historyData = data || [];
      setHistory(historyData);
      await cacheHistory(historyData);
    } catch (err) {
      console.error("Error fetching history:", err);
      
      if (!isOnline) {
        const cachedData = await getCachedHistory();
        if (cachedData.length > 0) {
          setHistory(cachedData);
          toast.info("Showing cached history");
        }
      } else {
        toast.error("Failed to load history");
      }
    } finally {
      setIsLoading(false);
    }
  }, [isOnline, cacheHistory, getCachedHistory, syncPendingMutations]);

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user, fetchHistory]);

  const handleRefresh = useCallback(async () => {
    await fetchHistory();
    toast.success("History refreshed");
  }, [fetchHistory]);

  const { containerRef, isRefreshing, pullDistance, progress } = usePullToRefresh({
    onRefresh: handleRefresh,
    disabled: !isMobile,
  });

  const deleteHistoryItem = async (id: string) => {
    try {
      if (isOnline) {
        const { error } = await supabase
          .from("mining_history")
          .delete()
          .eq("id", id);
        if (error) throw error;
      } else {
        await queueOfflineMutation("mining_history", "delete", { id });
      }
      
      setHistory(history.filter(item => item.id !== id));
      toast.success("History item deleted");
    } catch (err) {
      console.error("Error deleting history:", err);
      toast.error("Failed to delete history item");
    }
  };

  const getTaskTypeColor = (taskType: string) => {
    switch (taskType) {
      case "association":
        return "bg-primary/20 text-primary";
      case "clustering":
        return "bg-purple-500/20 text-purple-400";
      case "classification":
        return "bg-amber-500/20 text-amber-400";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <OfflineIndicator />
        <Navbar />
        <div
          ref={containerRef}
          className="relative overflow-auto"
          style={{ minHeight: "calc(100vh - 64px)" }}
        >
          <PullToRefreshIndicator
            pullDistance={pullDistance}
            isRefreshing={isRefreshing}
            progress={progress}
          />
          <main 
            className="container py-20 sm:py-24 px-4 sm:px-6 pb-24 sm:pb-12"
            style={{ transform: `translateY(${pullDistance}px)` }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2 sm:gap-3">
                  <HistoryIcon className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                  Mining History
                </h1>
                <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
                  View and manage your past data mining sessions
                  {isMobile && <span className="text-xs block mt-1">Pull down to refresh</span>}
                </p>
              </div>
              <Button asChild className="w-full sm:w-auto">
                <Link to="/dashboard">
                  New Mining Session
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </div>

            {history.length === 0 ? (
              <Card className="bg-secondary/30 border-border">
                <CardContent className="py-16 text-center">
                  <Database className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No mining history yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Start your first data mining session to see results here
                  </p>
                  <Button asChild>
                    <Link to="/dashboard">Go to Dashboard</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {history.map((item) => (
                  <Card key={item.id} className="bg-secondary/30 border-border hover:bg-secondary/50 transition-colors">
                    <CardContent className="py-3 sm:py-4 px-3 sm:px-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <Badge className={`${getTaskTypeColor(item.task_type)} text-xs`}>
                            {item.task_type}
                          </Badge>
                          <div>
                            <h3 className="font-semibold text-sm sm:text-base">
                              {item.algorithm.toUpperCase()}
                            </h3>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              {item.dataset_name || "Unnamed dataset"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6">
                          <div className="text-left sm:text-right">
                            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              <span className="hidden sm:inline">{format(new Date(item.created_at), "MMM d, yyyy h:mm a")}</span>
                              <span className="sm:hidden">{format(new Date(item.created_at), "MMM d, yyyy")}</span>
                            </div>
                            {item.execution_time_ms && (
                              <p className="text-xs text-muted-foreground">
                                Execution: {(item.execution_time_ms / 1000).toFixed(2)}s
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteHistoryItem(item.id)}
                            className="text-muted-foreground hover:text-destructive h-8 w-8 sm:h-10 sm:w-10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {item.results_summary && typeof item.results_summary === 'object' && !Array.isArray(item.results_summary) && Object.keys(item.results_summary).length > 0 && (
                        <div className="mt-4 pt-4 border-t border-border flex gap-6">
                          {Object.entries(item.results_summary as Record<string, unknown>).map(([key, value]) => (
                            <div key={key}>
                              <p className="text-xs text-muted-foreground capitalize">
                                {key.replace(/_/g, " ")}
                              </p>
                              <p className="font-semibold">
                                {typeof value === "number" ? value.toLocaleString() : String(value)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </main>
          <Footer />
        </div>
      </div>
    </PageTransition>
  );
}
