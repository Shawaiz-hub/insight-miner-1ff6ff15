import { useEffect, useState, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Save, Plus, Trash2, GripVertical, ChevronUp, ChevronDown } from "lucide-react";

interface HomeSection {
  id: string;
  title: string;
  subtitle: string;
  content: string;
  type: "hero" | "stats" | "algorithms" | "workflow" | "blog" | "cta" | "custom";
  enabled: boolean;
  order: number;
}

const defaultSections: HomeSection[] = [
  { id: "hero", title: "Hero Section", subtitle: "", content: "", type: "hero", enabled: true, order: 0 },
  { id: "stats", title: "Stats Section", subtitle: "", content: "", type: "stats", enabled: true, order: 1 },
  { id: "algorithms", title: "Algorithms Section", subtitle: "", content: "", type: "algorithms", enabled: true, order: 2 },
  { id: "workflow", title: "Workflow Section", subtitle: "", content: "", type: "workflow", enabled: true, order: 3 },
  { id: "blog", title: "Blog Section", subtitle: "", content: "", type: "blog", enabled: true, order: 4 },
  { id: "cta", title: "CTA Section", subtitle: "", content: "", type: "cta", enabled: true, order: 5 },
];

export default function AdminHomeSections() {
  const [sections, setSections] = useState<HomeSection[]>(defaultSections);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("setting_value")
        .eq("setting_key", "home_sections")
        .single();
      if (data?.setting_value) {
        const saved = data.setting_value as unknown as HomeSection[];
        if (Array.isArray(saved) && saved.length > 0) {
          setSections(saved);
        }
      }
    };
    load();
  }, []);

  const markChanged = () => setHasChanges(true);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("site_settings").upsert({
      setting_key: "home_sections",
      setting_value: sections as any,
      updated_at: new Date().toISOString(),
    }, { onConflict: "setting_key" });

    if (error) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Homepage sections saved!" });
      setHasChanges(false);
    }
    setSaving(false);
  };

  const moveSection = (index: number, direction: "up" | "down") => {
    const newSections = [...sections];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newSections.length) return;
    [newSections[index], newSections[swapIndex]] = [newSections[swapIndex], newSections[index]];
    newSections.forEach((s, i) => (s.order = i));
    setSections(newSections);
    markChanged();
  };

  const toggleSection = (index: number) => {
    setSections((prev) =>
      prev.map((s, i) => (i === index ? { ...s, enabled: !s.enabled } : s))
    );
    markChanged();
  };

  const updateSection = (index: number, field: keyof HomeSection, value: string) => {
    setSections((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
    markChanged();
  };

  const addCustomSection = () => {
    const id = `custom-${Date.now()}`;
    setSections((prev) => [
      ...prev,
      { id, title: "New Custom Section", subtitle: "", content: "<p>Your content here</p>", type: "custom" as const, enabled: true, order: prev.length },
    ]);
    markChanged();
    toast({ title: "Custom section added!", description: "Edit it below, then click Save." });
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const removeSection = (index: number) => {
    const section = sections[index];
    if (section.type !== "custom") return;
    setSections((prev) => prev.filter((_, i) => i !== index));
    markChanged();
    toast({ title: "Section removed", description: "Click Save to apply changes." });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Homepage Sections</h1>
            {hasChanges && (
              <p className="text-sm text-amber-500 mt-1">You have unsaved changes</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={addCustomSection}>
              <Plus className="w-4 h-4 mr-2" /> Add Section
            </Button>
            <Button onClick={handleSave} disabled={saving || !hasChanges}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {sections.map((section, index) => (
            <Card key={section.id} className={!section.enabled ? "opacity-50" : ""}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-4">
                  <div className="flex flex-col gap-1 pt-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveSection(index, "up")} disabled={index === 0}>
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <GripVertical className="w-4 h-4 text-muted-foreground mx-auto" />
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveSection(index, "down")} disabled={index === sections.length - 1}>
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Switch checked={section.enabled} onCheckedChange={() => toggleSection(index)} />
                        <span className="font-medium">{section.title}</span>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{section.type}</span>
                      </div>
                      {section.type === "custom" && (
                        <Button variant="ghost" size="icon" onClick={() => removeSection(index)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>

                    {section.type === "custom" && (
                      <div className="space-y-3 pl-4 border-l-2 border-border">
                        <div className="space-y-1">
                          <Label className="text-xs">Section Title</Label>
                          <Input value={section.title} onChange={(e) => updateSection(index, "title", e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Subtitle</Label>
                          <Input value={section.subtitle} onChange={(e) => updateSection(index, "subtitle", e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Content (HTML)</Label>
                          <Textarea value={section.content} onChange={(e) => updateSection(index, "content", e.target.value)} rows={4} className="font-mono text-sm" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div ref={bottomRef} />
      </div>
    </AdminLayout>
  );
}