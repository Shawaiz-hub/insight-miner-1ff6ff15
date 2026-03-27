import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, Eye, Activity, Database, FileText } from "lucide-react";

interface DashboardStats {
  totalUsers: number;
  totalVisits: number;
  uniqueVisitors: number;
  todayVisits: number;
  totalBlogs: number;
  recentActivity: Array<{
    page_path: string;
    created_at: string;
    user_id: string | null;
  }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalVisits: 0,
    uniqueVisitors: 0,
    todayVisits: 0,
    totalBlogs: 0,
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const [profilesRes, visitsRes, todayRes, recentRes, blogsRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("visitor_logs").select("id", { count: "exact", head: true }),
        supabase.from("visitor_logs").select("id", { count: "exact", head: true })
          .gte("created_at", new Date().toISOString().split("T")[0]),
        supabase.from("visitor_logs").select("page_path, created_at, user_id")
          .order("created_at", { ascending: false })
          .limit(20),
        supabase.from("blog_posts").select("id", { count: "exact", head: true }).eq("is_deleted", false),
      ]);

      // Count unique non-null user_ids from visitor logs
      const { data: uniqueData } = await supabase
        .from("visitor_logs")
        .select("user_id")
        .not("user_id", "is", null);

      const uniqueUserIds = new Set(uniqueData?.map(v => v.user_id) || []);

      setStats({
        totalUsers: profilesRes.count || 0,
        totalVisits: visitsRes.count || 0,
        uniqueVisitors: uniqueUserIds.size,
        todayVisits: todayRes.count || 0,
        totalBlogs: blogsRes.count || 0,
        recentActivity: recentRes.data || [],
      });
      setLoading(false);
    }

    fetchStats();
  }, []);

  const statCards = [
    { title: "Total Users", value: stats.totalUsers, icon: Users, color: "text-blue-500" },
    { title: "Total Page Views", value: stats.totalVisits, icon: Eye, color: "text-green-500" },
    { title: "Logged-in Visitors", value: stats.uniqueVisitors, icon: Activity, color: "text-yellow-500" },
    { title: "Today's Views", value: stats.todayVisits, icon: Database, color: "text-purple-500" },
    { title: "Total Blogs", value: stats.totalBlogs, icon: FileText, color: "text-cyan-500" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {loading ? "—" : stat.value.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : stats.recentActivity.length === 0 ? (
              <p className="text-muted-foreground">No activity yet</p>
            ) : (
              <div className="space-y-2">
                {stats.recentActivity.map((activity, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${activity.user_id ? "bg-green-500" : "bg-muted-foreground"}`} />
                      <span className="text-sm font-mono">{activity.page_path}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{activity.user_id ? "Logged in" : "Anonymous"}</span>
                      <span>{new Date(activity.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
