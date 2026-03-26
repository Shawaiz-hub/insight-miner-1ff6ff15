import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface VisitorLog {
  id: string;
  user_id: string | null;
  page_path: string;
  user_agent: string | null;
  created_at: string;
}

export default function AdminVisitors() {
  const [logs, setLogs] = useState<VisitorLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      const { data } = await supabase
        .from("visitor_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      setLogs(data || []);
      setLoading(false);
    }
    fetchLogs();
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Visitor Logs</h1>

        <Card>
          <CardHeader>
            <CardTitle>Recent Visitors</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Page</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Type</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Browser</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-3 px-2 font-mono text-xs">{log.page_path}</td>
                        <td className="py-3 px-2">
                          <Badge variant={log.user_id ? "default" : "secondary"}>
                            {log.user_id ? "Logged in" : "Anonymous"}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 text-xs text-muted-foreground max-w-[200px] truncate">
                          {log.user_agent || "—"}
                        </td>
                        <td className="py-3 px-2 text-muted-foreground text-xs">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
