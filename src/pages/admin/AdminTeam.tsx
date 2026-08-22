import { useCallback, useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GripVertical, Plus, Trash2, Pencil, Upload, X, Eye, Loader2 } from "lucide-react";
import {
  uploadTeamImage,
  deleteTeamImage,
  resolveTeamImageUrl,
} from "@/lib/teamImages";
import { TeamMemberModal, type TeamMember } from "@/components/home/TeamSection";

type Draft = Partial<TeamMember> & { skillsText?: string };

const emptyDraft: Draft = {
  full_name: "",
  role: "",
  short_bio: "",
  description: "",
  email: "",
  phone: "",
  location: "",
  department: "",
  experience: "",
  education: "",
  skillsText: "",
  linkedin_url: "",
  github_url: "",
  portfolio_url: "",
  facebook_url: "",
  instagram_url: "",
  is_featured: false,
  is_active: true,
};

export default function AdminTeam() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [previewMember, setPreviewMember] = useState<TeamMember | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("team_members")
      .select("*")
      .order("display_order", { ascending: true });
    if (error) toast({ title: "Failed to load team", description: error.message, variant: "destructive" });
    const list = (data ?? []) as TeamMember[];
    setMembers(list);
    const resolved: Record<string, string> = {};
    await Promise.all(
      list.map(async (m) => {
        const url = await resolveTeamImageUrl(m.image_url);
        if (url) resolved[m.id] = url;
      }),
    );
    setThumbs(resolved);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const openNew = () => {
    setDraft(emptyDraft);
    setPreview(null);
    setOpen(true);
  };

  const openEdit = async (m: TeamMember) => {
    setDraft({ ...m, skillsText: (m.skills ?? []).join(", ") });
    setPreview(await resolveTeamImageUrl(m.image_url));
    setOpen(true);
  };

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const path = await uploadTeamImage(file);
      const previous = draft.image_url;
      setDraft((d) => ({ ...d, image_url: path }));
      setPreview(await resolveTeamImageUrl(path));
      if (previous && previous !== path) await deleteTeamImage(previous);
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
    setUploading(false);
  };

  const removeImage = async () => {
    if (draft.image_url) await deleteTeamImage(draft.image_url);
    setDraft((d) => ({ ...d, image_url: null }));
    setPreview(null);
  };

  const save = async () => {
    if (!draft.full_name?.trim() || !draft.role?.trim()) {
      toast({ title: "Name and role are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      full_name: draft.full_name!.trim(),
      role: draft.role!.trim(),
      image_url: draft.image_url ?? null,
      short_bio: draft.short_bio || null,
      description: draft.description || null,
      email: draft.email || null,
      phone: draft.phone || null,
      location: draft.location || null,
      department: draft.department || null,
      experience: draft.experience || null,
      education: draft.education || null,
      skills: (draft.skillsText || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      linkedin_url: draft.linkedin_url || null,
      github_url: draft.github_url || null,
      portfolio_url: draft.portfolio_url || null,
      facebook_url: draft.facebook_url || null,
      instagram_url: draft.instagram_url || null,
      is_featured: Boolean(draft.is_featured),
      is_active: draft.is_active !== false,
      display_order: draft.display_order ?? members.length,
    };

    const { error } = draft.id
      ? await supabase.from("team_members").update(payload).eq("id", draft.id)
      : await supabase.from("team_members").insert(payload);

    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: draft.id ? "Member updated" : "Member added" });
      setOpen(false);
      await load();
    }
    setSaving(false);
  };

  const toggleActive = async (m: TeamMember) => {
    const { error } = await supabase
      .from("team_members")
      .update({ is_active: !m.is_active })
      .eq("id", m.id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    setMembers((prev) => prev.map((x) => (x.id === m.id ? { ...x, is_active: !x.is_active } : x)));
  };

  const remove = async (m: TeamMember) => {
    const { error } = await supabase.from("team_members").delete().eq("id", m.id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    if (m.image_url) await deleteTeamImage(m.image_url);
    toast({ title: "Member deleted" });
    setMembers((prev) => prev.filter((x) => x.id !== m.id));
  };

  const persistOrder = async (list: TeamMember[]) => {
    await Promise.all(
      list.map((m, i) =>
        supabase.from("team_members").update({ display_order: i }).eq("id", m.id),
      ),
    );
    toast({ title: "Order saved" });
  };

  const onDrop = async (index: number) => {
    if (dragIndex === null || dragIndex === index) return;
    const next = [...members];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(index, 0, moved);
    const reordered = next.map((m, i) => ({ ...m, display_order: i }));
    setMembers(reordered);
    setDragIndex(null);
    await persistOrder(reordered);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Team Management</h1>
            <p className="text-sm text-muted-foreground">Drag rows to reorder how members appear on the homepage.</p>
          </div>
          <Button onClick={openNew}>
            <Plus className="w-4 h-4 mr-2" /> Add Member
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading team...
          </div>
        ) : members.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No team members yet. Click “Add Member” to create the first one.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {members.map((m, index) => (
              <Card
                key={m.id}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(index)}
                className={`transition-opacity ${m.is_active ? "" : "opacity-60"} ${dragIndex === index ? "ring-2 ring-primary" : ""}`}
              >
                <CardContent className="flex items-center gap-4 py-3">
                  <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                  <span className="text-xs text-muted-foreground w-6">{index + 1}</span>
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex items-center justify-center text-xs">
                    {thumbs[m.id] ? (
                      <img src={thumbs[m.id]} alt={`${m.full_name} avatar`} className="w-full h-full object-cover" />
                    ) : (
                      m.full_name.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{m.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.role}</p>
                  </div>
                  {m.is_featured && <Badge variant="secondary">Featured</Badge>}
                  <Badge variant={m.is_active ? "default" : "destructive"}>
                    {m.is_active ? "Active" : "Inactive"}
                  </Badge>
                  <Switch checked={m.is_active} onCheckedChange={() => toggleActive(m)} />
                  <Button variant="ghost" size="icon" onClick={() => setPreviewMember(m)} aria-label="Preview">
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(m)} aria-label="Edit">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(m)} aria-label="Delete">
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft.id ? "Edit Member" : "Add Member"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                {preview ? (
                  <img src={preview} alt="Member preview" className="w-full h-full object-cover" />
                ) : (
                  <Upload className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div className="space-y-2">
                <Input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
                <div className="flex gap-2">
                  {uploading && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Uploading…
                    </span>
                  )}
                  {preview && !uploading && (
                    <Button variant="outline" size="sm" onClick={removeImage}>
                      <X className="w-3 h-3 mr-1" /> Remove image
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full Name *" value={draft.full_name} onChange={(v) => setDraft((d) => ({ ...d, full_name: v }))} />
              <Field label="Role *" value={draft.role} onChange={(v) => setDraft((d) => ({ ...d, role: v }))} />
              <Field label="Email" value={draft.email} onChange={(v) => setDraft((d) => ({ ...d, email: v }))} />
              <Field label="Phone" value={draft.phone} onChange={(v) => setDraft((d) => ({ ...d, phone: v }))} />
              <Field label="Location" value={draft.location} onChange={(v) => setDraft((d) => ({ ...d, location: v }))} />
              <Field label="Department" value={draft.department} onChange={(v) => setDraft((d) => ({ ...d, department: v }))} />
              <Field label="Experience" value={draft.experience} onChange={(v) => setDraft((d) => ({ ...d, experience: v }))} />
              <Field label="Education" value={draft.education} onChange={(v) => setDraft((d) => ({ ...d, education: v }))} />
              <Field label="LinkedIn URL" value={draft.linkedin_url} onChange={(v) => setDraft((d) => ({ ...d, linkedin_url: v }))} />
              <Field label="GitHub URL" value={draft.github_url} onChange={(v) => setDraft((d) => ({ ...d, github_url: v }))} />
              <Field label="Portfolio URL" value={draft.portfolio_url} onChange={(v) => setDraft((d) => ({ ...d, portfolio_url: v }))} />
              <Field label="Facebook URL" value={draft.facebook_url} onChange={(v) => setDraft((d) => ({ ...d, facebook_url: v }))} />
              <Field label="Instagram URL" value={draft.instagram_url} onChange={(v) => setDraft((d) => ({ ...d, instagram_url: v }))} />
              <Field label="Skills (comma separated)" value={draft.skillsText} onChange={(v) => setDraft((d) => ({ ...d, skillsText: v }))} />
            </div>

            <div className="space-y-2">
              <Label>Short Bio</Label>
              <Textarea rows={2} value={draft.short_bio ?? ""} onChange={(e) => setDraft((d) => ({ ...d, short_bio: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Full Description</Label>
              <Textarea rows={4} value={draft.description ?? ""} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} />
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={Boolean(draft.is_featured)} onCheckedChange={(v) => setDraft((d) => ({ ...d, is_featured: v }))} />
                Featured
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={draft.is_active !== false} onCheckedChange={(v) => setDraft((d) => ({ ...d, is_active: v }))} />
                Active
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || uploading}>{saving ? "Saving..." : "Save Member"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TeamMemberModal member={previewMember} onClose={() => setPreviewMember(null)} />
    </AdminLayout>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
