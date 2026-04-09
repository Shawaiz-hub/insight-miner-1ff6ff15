import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Save, Plus, Trash2, Download, Globe } from "lucide-react";

interface SitemapEntry {
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: string;
}

const defaultEntries: SitemapEntry[] = [
  { loc: "/", lastmod: new Date().toISOString().split("T")[0], changefreq: "weekly", priority: "1.0" },
  { loc: "/dashboard", lastmod: new Date().toISOString().split("T")[0], changefreq: "daily", priority: "0.9" },
  { loc: "/docs", lastmod: new Date().toISOString().split("T")[0], changefreq: "weekly", priority: "0.8" },
  { loc: "/blog", lastmod: new Date().toISOString().split("T")[0], changefreq: "daily", priority: "0.8" },
  { loc: "/auth", lastmod: new Date().toISOString().split("T")[0], changefreq: "monthly", priority: "0.7" },
  { loc: "/history", lastmod: new Date().toISOString().split("T")[0], changefreq: "daily", priority: "0.7" },
  { loc: "/profile", lastmod: new Date().toISOString().split("T")[0], changefreq: "monthly", priority: "0.6" },
  { loc: "/saved-rules", lastmod: new Date().toISOString().split("T")[0], changefreq: "daily", priority: "0.6" },
  { loc: "/sitemap", lastmod: new Date().toISOString().split("T")[0], changefreq: "monthly", priority: "0.4" },
  { loc: "/privacy", lastmod: new Date().toISOString().split("T")[0], changefreq: "yearly", priority: "0.3" },
  { loc: "/terms", lastmod: new Date().toISOString().split("T")[0], changefreq: "yearly", priority: "0.3" },
];

const BASE_URL = "https://advance-data-mining.vercel.app";

export default function AdminSitemap() {
  const [entries, setEntries] = useState<SitemapEntry[]>(defaultEntries);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("setting_value")
        .eq("setting_key", "sitemap_entries")
        .single();
      if (data?.setting_value) {
        const saved = data.setting_value as unknown as SitemapEntry[];
        if (Array.isArray(saved) && saved.length > 0) setEntries(saved);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("site_settings").upsert({
      setting_key: "sitemap_entries",
      setting_value: entries as any,
      updated_at: new Date().toISOString(),
    }, { onConflict: "setting_key" });

    if (error) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sitemap entries saved!" });
      setHasChanges(false);
    }
    setSaving(false);
  };

  const addEntry = () => {
    setEntries(prev => [...prev, {
      loc: "/new-page",
      lastmod: new Date().toISOString().split("T")[0],
      changefreq: "monthly",
      priority: "0.5",
    }]);
    setHasChanges(true);
  };

  const removeEntry = (index: number) => {
    setEntries(prev => prev.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const updateEntry = (index: number, field: keyof SitemapEntry, value: string) => {
    setEntries(prev => prev.map((e, i) => i === index ? { ...e, [field]: value } : e));
    setHasChanges(true);
  };

  const generateXml = () => {
    const urls = entries.map(e => `  <url>
    <loc>${BASE_URL}${e.loc}</loc>
    <lastmod>${e.lastmod}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`).join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
  };

  const downloadXml = () => {
    const xml = generateXml();
    const blob = new Blob([xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sitemap.xml";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Sitemap Management</h1>
            <p className="text-sm text-muted-foreground">Manage URLs that appear in your sitemap.xml and /sitemap page</p>
            {hasChanges && <p className="text-sm text-amber-500 mt-1">You have unsaved changes</p>}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={downloadXml}>
              <Download className="w-4 h-4 mr-2" /> Download XML
            </Button>
            <Button variant="outline" onClick={addEntry}>
              <Plus className="w-4 h-4 mr-2" /> Add URL
            </Button>
            <Button onClick={handleSave} disabled={saving || !hasChanges}>
              <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Globe className="w-4 h-4" /> Base URL: {BASE_URL}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {entries.map((entry, index) => (
              <div key={index} className="flex items-end gap-3 p-3 rounded-lg border border-border bg-muted/20">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Path</Label>
                  <Input value={entry.loc} onChange={e => updateEntry(index, "loc", e.target.value)} placeholder="/page-path" />
                </div>
                <div className="w-36 space-y-1">
                  <Label className="text-xs">Last Modified</Label>
                  <Input type="date" value={entry.lastmod} onChange={e => updateEntry(index, "lastmod", e.target.value)} />
                </div>
                <div className="w-32 space-y-1">
                  <Label className="text-xs">Change Freq</Label>
                  <Select value={entry.changefreq} onValueChange={v => updateEntry(index, "changefreq", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"].map(f => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24 space-y-1">
                  <Label className="text-xs">Priority</Label>
                  <Select value={entry.priority} onValueChange={v => updateEntry(index, "priority", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["1.0", "0.9", "0.8", "0.7", "0.6", "0.5", "0.4", "0.3", "0.2", "0.1"].map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeEntry(index)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">XML Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-64 font-mono">
              {generateXml()}
            </pre>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
