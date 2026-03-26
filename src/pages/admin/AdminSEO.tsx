import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";

interface PageSEO {
  title: string;
  description: string;
  keywords: string;
  ogTitle: string;
  ogDescription: string;
}

const defaultPages: Record<string, PageSEO> = {
  home: { title: "SmartMine - Advanced Data Mining Platform", description: "Advanced data mining platform for pattern discovery and rule extraction.", keywords: "data mining, association rules, apriori, fp-growth, machine learning", ogTitle: "SmartMine", ogDescription: "Advanced data mining platform" },
  dashboard: { title: "Dashboard - SmartMine", description: "Run data mining algorithms and analyze results.", keywords: "data mining dashboard, algorithm analysis", ogTitle: "SmartMine Dashboard", ogDescription: "Run mining algorithms" },
  docs: { title: "Documentation - SmartMine", description: "Learn how to use SmartMine for data mining.", keywords: "documentation, api reference, tutorials", ogTitle: "SmartMine Docs", ogDescription: "SmartMine documentation" },
  auth: { title: "Sign In - SmartMine", description: "Sign in to your SmartMine account.", keywords: "sign in, login, register", ogTitle: "Sign In", ogDescription: "Access your SmartMine account" },
  history: { title: "Mining History - SmartMine", description: "View your mining operation history.", keywords: "mining history, results", ogTitle: "Mining History", ogDescription: "Your mining history" },
  profile: { title: "Profile - SmartMine", description: "Manage your SmartMine profile.", keywords: "profile, account settings", ogTitle: "Profile", ogDescription: "Manage your profile" },
};

export default function AdminSEO() {
  const [seoData, setSeoData] = useState<Record<string, PageSEO>>(defaultPages);
  const [activePage, setActivePage] = useState("home");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function loadSEO() {
      const { data } = await supabase
        .from("site_settings")
        .select("setting_key, setting_value")
        .eq("setting_key", "seo_settings")
        .single();

      if (data?.setting_value) {
        setSeoData({ ...defaultPages, ...(data.setting_value as Record<string, PageSEO>) });
      }
    }
    loadSEO();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("site_settings")
      .upsert({
        setting_key: "seo_settings",
        setting_value: seoData as any,
        updated_at: new Date().toISOString(),
      }, { onConflict: "setting_key" });

    if (error) {
      toast({ title: "Error saving SEO settings", variant: "destructive" });
    } else {
      toast({ title: "SEO settings saved!" });
    }
    setSaving(false);
  };

  const updateField = (field: keyof PageSEO, value: string) => {
    setSeoData((prev) => ({
      ...prev,
      [activePage]: { ...prev[activePage], [field]: value },
    }));
  };

  const current = seoData[activePage];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">SEO Management</h1>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save All"}
          </Button>
        </div>

        <div className="flex gap-2 flex-wrap">
          {Object.keys(seoData).map((page) => (
            <Button
              key={page}
              variant={activePage === page ? "default" : "outline"}
              size="sm"
              onClick={() => setActivePage(page)}
            >
              {page.charAt(0).toUpperCase() + page.slice(1)}
            </Button>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              SEO Settings — {activePage.charAt(0).toUpperCase() + activePage.slice(1)} Page
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Page Title (max 60 chars)</Label>
              <Input
                value={current.title}
                onChange={(e) => updateField("title", e.target.value)}
                maxLength={60}
              />
              <p className="text-xs text-muted-foreground">{current.title.length}/60</p>
            </div>

            <div className="space-y-2">
              <Label>Meta Description (max 160 chars)</Label>
              <Textarea
                value={current.description}
                onChange={(e) => updateField("description", e.target.value)}
                maxLength={160}
                rows={2}
              />
              <p className="text-xs text-muted-foreground">{current.description.length}/160</p>
            </div>

            <div className="space-y-2">
              <Label>Keywords (comma-separated)</Label>
              <Input
                value={current.keywords}
                onChange={(e) => updateField("keywords", e.target.value)}
                placeholder="keyword1, keyword2, keyword3"
              />
            </div>

            <div className="space-y-2">
              <Label>OG Title</Label>
              <Input
                value={current.ogTitle}
                onChange={(e) => updateField("ogTitle", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>OG Description</Label>
              <Textarea
                value={current.ogDescription}
                onChange={(e) => updateField("ogDescription", e.target.value)}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
