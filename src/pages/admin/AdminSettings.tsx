import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Save, Plus, Trash2, Server } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FooterLink {
  label: string;
  url: string;
  icon: string;
}

interface SiteSettings {
  footerLinks: FooterLink[];
  backendUrl: string;
  siteName: string;
  siteDescription: string;
}

const defaultSettings: SiteSettings = {
  footerLinks: [
    { label: "GitHub", url: "https://github.com/Shawaiz-hub", icon: "github" },
    { label: "LinkedIn", url: "https://www.linkedin.com/in/shawaiz-ali-2025b1394", icon: "linkedin" },
  ],
  backendUrl: API_BASE,
  siteName: "SmartMine",
  siteDescription: "Advanced data mining platform for pattern discovery and rule extraction.",
};

export default function AdminSettings() {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [backendStatus, setBackendStatus] = useState<BackendStatus>("checking");
  const [backendError, setBackendError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function loadSettings() {
      const { data } = await supabase
        .from("site_settings")
        .select("setting_key, setting_value")
        .eq("setting_key", "general_settings")
        .single();

      if (data?.setting_value) {
        setSettings({ ...defaultSettings, ...(data.setting_value as unknown as SiteSettings) });
      }
    }
    loadSettings();
  }, []);

  useEffect(() => {
    checkBackend();
  }, [settings.backendUrl]);

  const checkBackend = async () => {
    setBackendStatus("checking");
    setBackendError(null);
    const { status, error } = await checkBackendHealth(settings.backendUrl || API_BASE);
    setBackendStatus(status);
    setBackendError(error ?? null);
  };


  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("site_settings")
      .upsert({
        setting_key: "general_settings",
        setting_value: settings as any,
        updated_at: new Date().toISOString(),
      }, { onConflict: "setting_key" });

    if (error) {
      toast({ title: "Error saving settings", variant: "destructive" });
    } else {
      toast({ title: "Settings saved!" });
    }
    setSaving(false);
  };

  const addFooterLink = () => {
    setSettings((prev) => ({
      ...prev,
      footerLinks: [...prev.footerLinks, { label: "", url: "", icon: "" }],
    }));
  };

  const removeFooterLink = (index: number) => {
    setSettings((prev) => ({
      ...prev,
      footerLinks: prev.footerLinks.filter((_, i) => i !== index),
    }));
  };

  const updateFooterLink = (index: number, field: keyof FooterLink, value: string) => {
    setSettings((prev) => ({
      ...prev,
      footerLinks: prev.footerLinks.map((link, i) =>
        i === index ? { ...link, [field]: value } : link
      ),
    }));
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Settings</h1>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>

        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Site Name</Label>
              <Input
                value={settings.siteName}
                onChange={(e) => setSettings((p) => ({ ...p, siteName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Site Description</Label>
              <Textarea
                value={settings.siteDescription}
                onChange={(e) => setSettings((p) => ({ ...p, siteDescription: e.target.value }))}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Backend Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5" />
              Backend Server
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Label>Status:</Label>
              <Badge variant={backendStatus === "online" ? "default" : backendStatus === "offline" ? "destructive" : "secondary"}>
                {backendStatus === "checking" ? "Checking..." : backendStatus === "online" ? "Online" : "Offline"}
              </Badge>
              <Button variant="outline" size="sm" onClick={checkBackend}>
                Refresh
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Backend URL</Label>
              <Input
                value={settings.backendUrl}
                onChange={(e) => setSettings((p) => ({ ...p, backendUrl: e.target.value }))}
                placeholder="https://your-backend.com"
              />
            </div>
          </CardContent>
        </Card>

        {/* Footer Links */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Footer Social Links
              <Button variant="outline" size="sm" onClick={addFooterLink}>
                <Plus className="w-4 h-4 mr-1" /> Add Link
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {settings.footerLinks.map((link, i) => (
              <div key={i} className="flex items-end gap-3">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Label</Label>
                  <Input
                    value={link.label}
                    onChange={(e) => updateFooterLink(i, "label", e.target.value)}
                    placeholder="GitHub"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">URL</Label>
                  <Input
                    value={link.url}
                    onChange={(e) => updateFooterLink(i, "url", e.target.value)}
                    placeholder="https://github.com/..."
                  />
                </div>
                <div className="w-28 space-y-1">
                  <Label className="text-xs">Icon</Label>
                  <Input
                    value={link.icon}
                    onChange={(e) => updateFooterLink(i, "icon", e.target.value)}
                    placeholder="github"
                  />
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeFooterLink(i)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
