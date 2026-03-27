import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, X } from "lucide-react";

interface Tag {
  id: string;
  name: string;
  slug: string;
}

export default function AdminBlogTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTag, setNewTag] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTags = async () => {
    setLoading(true);
    const { data } = await supabase.from("blog_tags").select("*").order("name");
    setTags(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchTags(); }, []);

  const addTag = async () => {
    if (!newTag.trim()) return;
    const slug = newTag.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const { error } = await supabase.from("blog_tags").insert({ name: newTag.trim(), slug } as any);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setNewTag("");
    toast({ title: "Tag added" });
    fetchTags();
  };

  const deleteTag = async (id: string) => {
    await supabase.from("blog_tags").delete().eq("id", id);
    toast({ title: "Tag removed" });
    fetchTags();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Tags</h1>

        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-2 mb-6">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="New tag name..."
                onKeyDown={(e) => e.key === "Enter" && addTag()}
              />
              <Button onClick={addTag}>
                <Plus className="w-4 h-4 mr-2" /> Add
              </Button>
            </div>

            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : tags.length === 0 ? (
              <p className="text-muted-foreground">No tags yet</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag.id} variant="secondary" className="text-sm px-3 py-1.5 gap-2">
                    {tag.name}
                    <button onClick={() => deleteTag(tag.id)} className="hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
