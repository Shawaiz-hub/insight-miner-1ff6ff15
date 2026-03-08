import { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import {
  Loader2, Clock, Database, Trash2, ArrowRight, History as HistoryIcon,
  Play, Filter, CalendarIcon, ArrowUpDown, X, Download, ChevronLeft, ChevronRight, Search,
} from "lucide-react";
import { RecommendationComparison } from "@/components/dashboard/RecommendationComparison";
import { format, isAfter, isBefore, startOfDay, endOfDay, subDays, startOfToday, startOfYear } from "date-fns";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

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

type SortField = "date" | "algorithm" | "execution_time";
type SortDir = "asc" | "desc";

export default function History() {
  const { user, isLoading: authLoading } = useRequireAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState<MiningHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isMobile = useIsMobile();
  const isOnline = useOnline();
  const { cacheHistory, getCachedHistory, syncPendingMutations, queueOfflineMutation } = useOfflineCache();

  // Filters
  const [filterTask, setFilterTask] = useState<string>("all");
  const [filterAlgorithm, setFilterAlgorithm] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchDataset, setSearchDataset] = useState("");

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredHistory.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredHistory.map(h => h.id)));
    }
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    try {
      if (isOnline) {
        const { error } = await supabase.from("mining_history").delete().in("id", ids);
        if (error) throw error;
      } else {
        for (const id of ids) await queueOfflineMutation("mining_history", "delete", { id });
      }
      setHistory(prev => prev.filter(item => !selectedIds.has(item.id)));
      toast.success(`Deleted ${ids.length} entries`);
      setSelectedIds(new Set());
    } catch (err) {
      console.error("Error bulk deleting:", err);
      toast.error("Failed to delete selected entries");
    }
  };

  const fetchHistory = useCallback(async () => {
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
    if (user) fetchHistory();
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
        const { error } = await supabase.from("mining_history").delete().eq("id", id);
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

  const handleReRun = (item: MiningHistoryItem) => {
    const params = (item.parameters && typeof item.parameters === "object") ? item.parameters as Record<string, unknown> : {};
    const searchParams = new URLSearchParams();
    searchParams.set("rerun", "true");
    searchParams.set("task", item.task_type);
    searchParams.set("algorithm", item.algorithm);
    if (params.minSupport !== undefined) searchParams.set("minSupport", String(params.minSupport));
    if (params.minConfidence !== undefined) searchParams.set("minConfidence", String(params.minConfidence));
    if (params.maxRuleLength !== undefined) searchParams.set("maxRuleLength", String(params.maxRuleLength));
    if (params.liftThreshold !== undefined) searchParams.set("liftThreshold", String(params.liftThreshold));
    if (item.dataset_name) searchParams.set("dataset", item.dataset_name);
    navigate(`/dashboard?${searchParams.toString()}`);
    toast.info(`Re-running ${item.algorithm.toUpperCase()} session — upload the same dataset to continue`);
  };

  // Unique values for filter dropdowns
  const uniqueTaskTypes = useMemo(() => [...new Set(history.map(h => h.task_type))], [history]);
  const uniqueAlgorithms = useMemo(() => [...new Set(history.map(h => h.algorithm))], [history]);

  // Filtered & sorted
  const filteredHistory = useMemo(() => {
    let result = [...history];

    if (searchDataset.trim()) result = result.filter(h => (h.dataset_name || "").toLowerCase().includes(searchDataset.trim().toLowerCase()));
    if (filterTask !== "all") result = result.filter(h => h.task_type === filterTask);
    if (filterAlgorithm !== "all") result = result.filter(h => h.algorithm === filterAlgorithm);
    if (dateFrom) result = result.filter(h => isAfter(new Date(h.created_at), startOfDay(dateFrom)));
    if (dateTo) result = result.filter(h => isBefore(new Date(h.created_at), endOfDay(dateTo)));

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === "date") cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      else if (sortField === "algorithm") cmp = a.algorithm.localeCompare(b.algorithm);
      else if (sortField === "execution_time") cmp = (a.execution_time_ms || 0) - (b.execution_time_ms || 0);
      return sortDir === "desc" ? -cmp : cmp;
    });

    return result;
  }, [history, filterTask, filterAlgorithm, dateFrom, dateTo, sortField, sortDir, searchDataset]);

  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / pageSize));
  const paginatedHistory = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredHistory.slice(start, start + pageSize);
  }, [filteredHistory, currentPage, pageSize]);

  // Reset page when filters or page size change
  useEffect(() => { setCurrentPage(1); }, [filterTask, filterAlgorithm, dateFrom, dateTo, searchDataset, pageSize]);

  const hasActiveFilters = filterTask !== "all" || filterAlgorithm !== "all" || dateFrom || dateTo || searchDataset.trim() !== "";

  const clearFilters = () => {
    setFilterTask("all");
    setFilterAlgorithm("all");
    setDateFrom(undefined);
    setDateTo(undefined);
    setSearchDataset("");
  };

  const exportData = filteredHistory.length > 0 ? filteredHistory : history;

  const downloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const data = exportData.map(({ id, algorithm, task_type, dataset_name, parameters, results_summary, execution_time_ms, created_at }) => ({
      id, algorithm, task_type, dataset_name, parameters, results_summary, execution_time_ms, created_at,
    }));
    downloadFile(JSON.stringify(data, null, 2), `mining-history-${format(new Date(), "yyyy-MM-dd")}.json`, "application/json");
    toast.success(`Exported ${data.length} entries as JSON`);
  };

  const handleExportCSV = () => {
    const headers = ["id", "algorithm", "task_type", "dataset_name", "execution_time_ms", "created_at", "parameters", "results_summary"];
    const rows = exportData.map(item =>
      headers.map(h => {
        const val = item[h as keyof MiningHistoryItem];
        if (val === null || val === undefined) return "";
        if (typeof val === "object") return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(",")
    );
    downloadFile([headers.join(","), ...rows].join("\n"), `mining-history-${format(new Date(), "yyyy-MM-dd")}.csv`, "text/csv");
    toast.success(`Exported ${exportData.length} entries as CSV`);
  };

  const getTaskTypeColor = (taskType: string) => {
    switch (taskType) {
      case "association": return "bg-primary/20 text-primary";
      case "clustering": return "bg-purple-500/20 text-purple-400";
      case "classification": return "bg-amber-500/20 text-amber-400";
      default: return "bg-secondary text-secondary-foreground";
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
        <div ref={containerRef} className="relative overflow-auto" style={{ minHeight: "calc(100vh - 64px)" }}>
          <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} progress={progress} />
          <main className="container py-20 sm:py-24 px-4 sm:px-6 pb-24 sm:pb-12" style={{ transform: `translateY(${pullDistance}px)` }}>
            {/* Header */}
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
              <div className="flex gap-2 w-full sm:w-auto flex-wrap">
                <Button
                  variant={showFilters ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="gap-1.5 flex-1 sm:flex-none"
                >
                  <Filter className="w-4 h-4" />
                  Filters
                  {hasActiveFilters && (
                    <span className="ml-1 w-4 h-4 rounded-full bg-primary-foreground/20 text-[10px] flex items-center justify-center">
                      !
                    </span>
                  )}
                </Button>
                {history.length > 0 && (
                  <>
                    <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5 flex-1 sm:flex-none">
                      <Download className="w-4 h-4" />
                      <span className="hidden sm:inline">CSV</span>
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportJSON} className="gap-1.5 flex-1 sm:flex-none">
                      <Download className="w-4 h-4" />
                      <span className="hidden sm:inline">JSON</span>
                    </Button>
                  </>
                )}
                <Button asChild size="sm" className="flex-1 sm:flex-none">
                  <Link to="/dashboard">
                    New Session <ArrowRight className="ml-1 w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <Card className="mb-6 bg-secondary/30 border-border animate-fade-in">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Filter className="w-4 h-4 text-primary" /> Filter & Sort
                    </p>
                    {hasActiveFilters && (
                      <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-7 gap-1">
                        <X className="w-3 h-3" /> Clear all
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                    {/* Dataset Search */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Dataset Name</p>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Search datasets..."
                          value={searchDataset}
                          onChange={e => setSearchDataset(e.target.value)}
                          className="h-9 text-xs pl-8"
                        />
                      </div>
                    </div>

                    {/* Task Type */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Task Type</p>
                      <Select value={filterTask} onValueChange={setFilterTask}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Tasks</SelectItem>
                          {uniqueTaskTypes.map(t => (
                            <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Algorithm */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Algorithm</p>
                      <Select value={filterAlgorithm} onValueChange={setFilterAlgorithm}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Algorithms</SelectItem>
                          {uniqueAlgorithms.map(a => (
                            <SelectItem key={a} value={a} className="uppercase">{a}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Date Quick Filters */}
                    <div className="sm:col-span-2">
                      <p className="text-xs text-muted-foreground mb-1.5">Date Range</p>
                      <div className="flex gap-1.5 flex-wrap mb-2">
                        {[
                          { label: "Today", from: startOfToday(), to: new Date() },
                          { label: "Last 7 days", from: subDays(new Date(), 7), to: new Date() },
                          { label: "Last 30 days", from: subDays(new Date(), 30), to: new Date() },
                        ].map(preset => (
                          <Button
                            key={preset.label}
                            variant={dateFrom?.getTime() === startOfDay(preset.from).getTime() ? "default" : "outline"}
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              setDateFrom(startOfDay(preset.from));
                              setDateTo(endOfDay(preset.to));
                            }}
                          >
                            {preset.label}
                          </Button>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full h-9 justify-start text-xs font-normal", !dateFrom && "text-muted-foreground")}>
                              <CalendarIcon className="w-3.5 h-3.5 mr-1.5" />
                              {dateFrom ? format(dateFrom, "MMM d, yyyy") : "Start date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className={cn("p-3 pointer-events-auto")} />
                          </PopoverContent>
                        </Popover>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full h-9 justify-start text-xs font-normal", !dateTo && "text-muted-foreground")}>
                              <CalendarIcon className="w-3.5 h-3.5 mr-1.5" />
                              {dateTo ? format(dateTo, "MMM d, yyyy") : "End date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className={cn("p-3 pointer-events-auto")} />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    {/* Sort */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Sort By</p>
                      <div className="flex gap-1.5">
                        <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
                          <SelectTrigger className="h-9 text-xs flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="date">Date</SelectItem>
                            <SelectItem value="algorithm">Algorithm</SelectItem>
                            <SelectItem value="execution_time">Exec Time</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 flex-shrink-0"
                          onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}
                        >
                          <ArrowUpDown className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {hasActiveFilters && (
                    <p className="text-xs text-muted-foreground mt-3">
                      Showing {filteredHistory.length} of {history.length} entries
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {history.length === 0 ? (
              <Card className="bg-secondary/30 border-border">
                <CardContent className="py-16 text-center">
                  <Database className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No mining history yet</h3>
                  <p className="text-muted-foreground mb-6">Start your first data mining session to see results here</p>
                  <Button asChild><Link to="/dashboard">Go to Dashboard</Link></Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <RecommendationComparison history={history} />

                {filteredHistory.length === 0 ? (
                  <Card className="bg-secondary/30 border-border">
                    <CardContent className="py-12 text-center">
                      <Filter className="w-10 h-10 mx-auto text-muted-foreground mb-3 opacity-40" />
                      <p className="font-medium">No results match your filters</p>
                      <p className="text-sm text-muted-foreground mb-4">Try adjusting your filter criteria</p>
                      <Button variant="outline" size="sm" onClick={clearFilters}>Clear Filters</Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {/* Bulk actions bar */}
                    <div className="flex items-center gap-3 px-1">
                      <Checkbox
                        checked={selectedIds.size === filteredHistory.length && filteredHistory.length > 0}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all"
                      />
                      <span className="text-xs text-muted-foreground">
                        {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all"}
                      </span>
                      {selectedIds.size > 0 && (
                        <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)} className="gap-1.5 text-xs h-7 ml-auto">
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete {selectedIds.size}
                        </Button>
                      )}
                    </div>
                    {paginatedHistory.map((item) => (
                      <Card key={item.id} className={cn("bg-secondary/30 border-border hover:bg-secondary/50 transition-colors", selectedIds.has(item.id) && "ring-1 ring-primary/50")}>
                        <CardContent className="py-3 sm:py-4 px-3 sm:px-6">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3 sm:gap-4">
                              <Checkbox
                                checked={selectedIds.has(item.id)}
                                onCheckedChange={() => toggleSelect(item.id)}
                                aria-label={`Select ${item.algorithm}`}
                              />
                              <Badge className={`${getTaskTypeColor(item.task_type)} text-xs`}>
                                {item.task_type}
                              </Badge>
                              <div>
                                <h3 className="font-semibold text-sm sm:text-base">{item.algorithm.toUpperCase()}</h3>
                                <p className="text-xs sm:text-sm text-muted-foreground">{item.dataset_name || "Unnamed dataset"}</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
                              <div className="text-left sm:text-right">
                                <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                                  <Clock className="w-3.5 h-3.5" />
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
                                variant="outline"
                                size="sm"
                                onClick={() => handleReRun(item)}
                                className="gap-1.5 text-xs h-8"
                                title="Re-run with same parameters"
                              >
                                <Play className="w-3 h-3" />
                                <span className="hidden sm:inline">Re-run</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteHistoryItem(item.id)}
                                className="text-muted-foreground hover:text-destructive h-8 w-8"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          {item.results_summary && typeof item.results_summary === 'object' && !Array.isArray(item.results_summary) && Object.keys(item.results_summary).length > 0 && (
                            <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-4 sm:gap-6">
                              {Object.entries(item.results_summary as Record<string, unknown>).map(([key, value]) => (
                                <div key={key}>
                                  <p className="text-[10px] sm:text-xs text-muted-foreground capitalize">{key.replace(/_/g, " ")}</p>
                                  <p className="font-semibold text-sm">{typeof value === "number" ? value.toLocaleString() : String(value)}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}

                    {/* Pagination */}
                    <div className="flex items-center justify-between pt-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Rows per page</span>
                        <Select value={String(pageSize)} onValueChange={v => setPageSize(Number(v))}>
                          <SelectTrigger className="h-8 w-[70px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5</SelectItem>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {totalPages > 1 && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => p - 1)}
                            className="h-8 w-8 p-0"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            Page {currentPage} of {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => p + 1)}
                            className="h-8 w-8 p-0"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </main>
          <Footer />
        </div>
      </div>
      {/* Bulk delete confirmation dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} entries?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the selected mining history entries. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={bulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageTransition>
  );
}
