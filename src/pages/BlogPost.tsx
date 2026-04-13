import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Eye, ArrowLeft, User } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";

interface Post {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  featured_image: string | null;
  views: number;
  published_at: string | null;
  created_at: string;
  seo_title: string | null;
  meta_description: string | null;
  category_id: string | null;
}

interface Tag {
  id: string;
  name: string;
  slug: string;
}

export default function BlogPost() {
  const { slug } = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      if (!slug) return;

      const { data: postData } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .eq("is_deleted", false)
        .single();

      if (postData) {
        setPost(postData as Post);

        // Increment views
        await supabase
          .from("blog_posts")
          .update({ views: (postData.views || 0) + 1 } as any)
          .eq("id", postData.id);

        // Fetch category
        if (postData.category_id) {
          const { data: cat } = await supabase
            .from("blog_categories")
            .select("name")
            .eq("id", postData.category_id)
            .single();
          if (cat) setCategoryName(cat.name);
        }

        // Fetch tags
        const { data: postTags } = await supabase
          .from("blog_post_tags")
          .select("tag_id")
          .eq("post_id", postData.id);

        if (postTags && postTags.length > 0) {
          const tagIds = postTags.map((t) => t.tag_id);
          const { data: tagData } = await supabase
            .from("blog_tags")
            .select("id, name, slug")
            .in("id", tagIds);
          setTags(tagData || []);
        }
      }
      setLoading(false);
    };
    fetchPost();
  }, [slug]);

  // SEO meta tags
  useEffect(() => {
    if (post) {
      document.title = post.seo_title || post.title;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute("content", post.meta_description || post.excerpt || "");
    }
    return () => { document.title = "SmartMine"; };
  }, [post]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-20 pb-16 container px-4 sm:px-6 max-w-4xl">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-3/4" />
            <div className="h-64 bg-muted rounded" />
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-20 pb-16 container px-4 sm:px-6 text-center">
          <h1 className="text-3xl font-bold mt-20">Post Not Found</h1>
          <p className="text-muted-foreground mt-4">The article you're looking for doesn't exist.</p>
          <Button asChild className="mt-6">
            <Link to="/blog">Back to Blog</Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <article className="pt-20 pb-16">
        <div className="container px-4 sm:px-6 max-w-4xl">
          <Button variant="ghost" asChild className="mb-6">
            <Link to="/blog">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Blog
            </Link>
          </Button>

          {/* Header */}
          <header className="mb-8">
            {categoryName && (
              <Badge variant="secondary" className="mb-4">{categoryName}</Badge>
            )}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">{post.title}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(post.published_at || post.created_at).toLocaleDateString("en-US", {
                  year: "numeric", month: "long", day: "numeric"
                })}
              </div>
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {post.views} views
              </div>
            </div>
          </header>

          {/* Featured image */}
          {post.featured_image && (
            <img
              src={post.featured_image}
              alt={post.title}
              className="w-full rounded-xl mb-8 max-h-[500px] object-cover"
            />
          )}

          {/* Content */}
          <div
            className="prose prose-invert prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Tags */}
          {tags.length > 0 && (
            <div className="mt-12 pt-6 border-t border-border">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag.id} variant="outline">{tag.name}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </article>
      <Footer />
    </div>
  );
}
