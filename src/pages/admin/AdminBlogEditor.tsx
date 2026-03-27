import { useEffect, useState, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useParams } from "react-router-dom";
import { Save, ArrowLeft, Eye, Code, FileText } from "lucide-react";
import Editor from "@monaco-editor/react";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Tag {
  id: string;
  name: string;
  slug: string;
}

interface PostForm {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  featured_image: string;
  category_id: string;
  status: string;
  seo_title: string;
  meta_description: string;
  focus_keyword: string;
  selectedTags: string[];
}

const generateSlug = (title: string) =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function AdminBlogEditor() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [saving, setSaving] = useState(false);
  const [editorTab, setEditorTab] = useState<string>("visual");

  const [form, setForm] = useState<PostForm>({
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    featured_image: "",
    category_id: "",
    status: "draft",
    seo_title: "",
    meta_description: "",
    focus_keyword: "",
    selectedTags: [],
  });

  useEffect(() => {
    const fetchData = async () => {
      const [catRes, tagRes] = await Promise.all([
        supabase.from("blog_categories").select("id, name, slug"),
        supabase.from("blog_tags").select("id, name, slug"),
      ]);
      setCategories(catRes.data || []);
      setTags(tagRes.data || []);

      if (isEditing && id) {
        const { data: post } = await supabase
          .from("blog_posts")
          .select("*")
          .eq("id", id)
          .single();

        if (post) {
          const { data: postTags } = await supabase
            .from("blog_post_tags")
            .select("tag_id")
            .eq("post_id", id);

          setForm({
            title: post.title,
            slug: post.slug,
            content: post.content || "",
            excerpt: post.excerpt || "",
            featured_image: post.featured_image || "",
            category_id: post.category_id || "",
            status: post.status,
            seo_title: post.seo_title || "",
            meta_description: post.meta_description || "",
            focus_keyword: post.focus_keyword || "",
            selectedTags: postTags?.map((t) => t.tag_id) || [],
          });
        }
      }
    };
    fetchData();
  }, [id, isEditing]);

  const updateField = (field: keyof PostForm, value: any) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "title" && !isEditing) {
        updated.slug = generateSlug(value);
      }
      if (field === "title" && !prev.seo_title) {
        updated.seo_title = value;
      }
      return updated;
    });
  };

  const toggleTag = (tagId: string) => {
    setForm((prev) => ({
      ...prev,
      selectedTags: prev.selectedTags.includes(tagId)
        ? prev.selectedTags.filter((t) => t !== tagId)
        : [...prev.selectedTags, tagId],
    }));
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.slug.trim()) {
      toast({ title: "Title and slug are required", variant: "destructive" });
      return;
    }

    setSaving(true);

    const postData = {
      title: form.title,
      slug: form.slug,
      content: form.content,
      excerpt: form.excerpt || null,
      featured_image: form.featured_image || null,
      category_id: form.category_id || null,
      status: form.status,
      seo_title: form.seo_title || null,
      meta_description: form.meta_description || null,
      focus_keyword: form.focus_keyword || null,
      published_at: form.status === "published" ? new Date().toISOString() : null,
    };

    let postId = id;

    if (isEditing && id) {
      const { error } = await supabase.from("blog_posts").update(postData as any).eq("id", id);
      if (error) {
        toast({ title: "Error saving post", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("blog_posts")
        .insert({ ...postData, author_id: user!.id } as any)
        .select("id")
        .single();
      if (error) {
        toast({ title: "Error creating post", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
      postId = data.id;
    }

    // Sync tags
    if (postId) {
      await supabase.from("blog_post_tags").delete().eq("post_id", postId);
      if (form.selectedTags.length > 0) {
        await supabase.from("blog_post_tags").insert(
          form.selectedTags.map((tag_id) => ({ post_id: postId!, tag_id })) as any
        );
      }
    }

    toast({ title: isEditing ? "Post updated!" : "Post created!" });
    navigate("/admin/blog");
    setSaving(false);
  };

  const seoScore = useMemo(() => {
    let score = 0;
    if (form.seo_title && form.seo_title.length <= 60) score += 20;
    if (form.meta_description && form.meta_description.length >= 120 && form.meta_description.length <= 160) score += 20;
    if (form.focus_keyword) score += 15;
    if (form.focus_keyword && form.title.toLowerCase().includes(form.focus_keyword.toLowerCase())) score += 15;
    if (form.focus_keyword && form.content.toLowerCase().includes(form.focus_keyword.toLowerCase())) score += 15;
    if (form.slug && form.slug.includes(form.focus_keyword?.toLowerCase().replace(/\s+/g, "-") || "---")) score += 15;
    return score;
  }, [form]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/blog")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold">{isEditing ? "Edit Post" : "New Post"}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Select value={form.status} onValueChange={(v) => updateField("status", v)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => updateField("title", e.target.value)}
                    placeholder="Post title..."
                    className="text-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input
                    value={form.slug}
                    onChange={(e) => updateField("slug", e.target.value)}
                    placeholder="post-url-slug"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Content
                  <Tabs value={editorTab} onValueChange={setEditorTab}>
                    <TabsList>
                      <TabsTrigger value="visual"><FileText className="w-4 h-4 mr-1" /> Visual</TabsTrigger>
                      <TabsTrigger value="code"><Code className="w-4 h-4 mr-1" /> Code</TabsTrigger>
                      <TabsTrigger value="preview"><Eye className="w-4 h-4 mr-1" /> Preview</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {editorTab === "visual" && (
                  <Textarea
                    value={form.content}
                    onChange={(e) => updateField("content", e.target.value)}
                    placeholder="Write your blog content here... (supports HTML)"
                    rows={15}
                    className="font-mono text-sm"
                  />
                )}
                {editorTab === "code" && (
                  <div className="border border-border rounded-lg overflow-hidden">
                    <Editor
                      height="400px"
                      defaultLanguage="html"
                      value={form.content}
                      onChange={(v) => updateField("content", v || "")}
                      theme="vs-dark"
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        wordWrap: "on",
                        automaticLayout: true,
                      }}
                    />
                  </div>
                )}
                {editorTab === "preview" && (
                  <div
                    className="prose prose-invert max-w-none min-h-[400px] p-4 border border-border rounded-lg bg-background"
                    dangerouslySetInnerHTML={{ __html: form.content }}
                  />
                )}
              </CardContent>
            </Card>

            {/* SEO Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  SEO Settings
                  <Badge variant={seoScore >= 80 ? "default" : seoScore >= 50 ? "secondary" : "destructive"}>
                    Score: {seoScore}/100
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>SEO Title ({form.seo_title.length}/60)</Label>
                  <Input
                    value={form.seo_title}
                    onChange={(e) => updateField("seo_title", e.target.value)}
                    placeholder="SEO optimized title..."
                    maxLength={60}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Meta Description ({form.meta_description.length}/160)</Label>
                  <Textarea
                    value={form.meta_description}
                    onChange={(e) => updateField("meta_description", e.target.value)}
                    placeholder="Meta description for search engines..."
                    maxLength={160}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Focus Keyword</Label>
                  <Input
                    value={form.focus_keyword}
                    onChange={(e) => updateField("focus_keyword", e.target.value)}
                    placeholder="Primary keyword"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Category</CardTitle></CardHeader>
              <CardContent>
                <Select value={form.category_id} onValueChange={(v) => updateField("category_id", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Tags</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant={form.selectedTags.includes(tag.id) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleTag(tag.id)}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                  {tags.length === 0 && (
                    <p className="text-sm text-muted-foreground">No tags yet. Create some in Tag Management.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Excerpt</CardTitle></CardHeader>
              <CardContent>
                <Textarea
                  value={form.excerpt}
                  onChange={(e) => updateField("excerpt", e.target.value)}
                  placeholder="Brief description..."
                  rows={3}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Featured Image</CardTitle></CardHeader>
              <CardContent>
                <Input
                  value={form.featured_image}
                  onChange={(e) => updateField("featured_image", e.target.value)}
                  placeholder="Image URL..."
                />
                {form.featured_image && (
                  <img src={form.featured_image} alt="Featured" className="mt-3 rounded-lg w-full h-32 object-cover" />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
