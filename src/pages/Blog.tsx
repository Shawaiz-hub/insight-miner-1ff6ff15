import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { useSEO } from "@/hooks/useSEO";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Search, Calendar, Eye, ArrowRight } from "lucide-react";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featured_image: string | null;
  status: string;
  views: number;
  published_at: string | null;
  created_at: string;
  category_id: string | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function Blog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const [postsRes, catsRes] = await Promise.all([
        supabase
          .from("blog_posts")
          .select("id, title, slug, excerpt, featured_image, status, views, published_at, created_at, category_id")
          .eq("status", "published")
          .eq("is_deleted", false)
          .order("published_at", { ascending: false }),
        supabase.from("blog_categories").select("id, name, slug"),
      ]);
      setPosts(postsRes.data || []);
      setCategories(catsRes.data || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const filtered = posts.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !activeCategory || p.category_id === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryName = (id: string | null) =>
    categories.find((c) => c.id === id)?.name || "Uncategorized";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-16">
        <div className="container px-4 sm:px-6">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Our <span className="text-primary">Blog</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Insights, tutorials, and updates about data mining and machine learning
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search articles..."
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={!activeCategory ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setActiveCategory(null)}
              >
                All
              </Badge>
              {categories.map((cat) => (
                <Badge
                  key={cat.id}
                  variant={activeCategory === cat.id ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setActiveCategory(cat.id)}
                >
                  {cat.name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Posts grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <div className="h-48 bg-muted rounded-t-lg" />
                  <CardContent className="pt-4 space-y-3">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-full" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">No articles found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((post) => (
                <Link key={post.id} to={`/blog/${post.slug}`} className="group">
                  <Card className="overflow-hidden border-border hover:border-primary/50 transition-all duration-300 h-full">
                    {post.featured_image ? (
                      <img
                        src={post.featured_image}
                        alt={post.title}
                        className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center">
                        <span className="text-4xl">📝</span>
                      </div>
                    )}
                    <CardContent className="pt-4 space-y-3">
                      <Badge variant="secondary" className="text-xs">
                        {getCategoryName(post.category_id)}
                      </Badge>
                      <h2 className="text-lg font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                        {post.title}
                      </h2>
                      {post.excerpt && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>
                      )}
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(post.published_at || post.created_at).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {post.views}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-primary text-sm font-medium pt-1">
                        Read more <ArrowRight className="w-3 h-3" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
