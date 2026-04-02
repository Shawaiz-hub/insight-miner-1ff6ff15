import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { StatsSection } from "@/components/home/StatsSection";
import { AlgorithmsSection } from "@/components/home/AlgorithmsSection";
import { WorkflowSection } from "@/components/home/WorkflowSection";
import { BlogSection } from "@/components/home/BlogSection";
import { CTASection } from "@/components/home/CTASection";
import { supabase } from "@/integrations/supabase/client";

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

const sectionComponents: Record<string, React.FC> = {
  hero: HeroSection,
  stats: StatsSection,
  algorithms: AlgorithmsSection,
  workflow: WorkflowSection,
  blog: BlogSection,
  cta: CTASection,
};

function CustomSection({ section }: { section: HomeSection }) {
  return (
    <section className="py-16 sm:py-24">
      <div className="container px-4 sm:px-6">
        {section.title && <h2 className="text-3xl font-bold text-center mb-4">{section.title}</h2>}
        {section.subtitle && <p className="text-muted-foreground text-center mb-8">{section.subtitle}</p>}
        {section.content && (
          <div className="prose prose-invert max-w-4xl mx-auto" dangerouslySetInnerHTML={{ __html: section.content }} />
        )}
      </div>
    </section>
  );
}

const Index = () => {
  const [sections, setSections] = useState<HomeSection[]>(defaultSections);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("setting_value")
      .eq("setting_key", "home_sections")
      .single()
      .then(({ data }) => {
        if (data?.setting_value) {
          const saved = data.setting_value as unknown as HomeSection[];
          if (Array.isArray(saved) && saved.length > 0) {
            setSections(saved.sort((a, b) => a.order - b.order));
          }
        }
      });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {sections
          .filter((s) => s.enabled)
          .map((section) => {
            if (section.type === "custom") {
              return <CustomSection key={section.id} section={section} />;
            }
            const Component = sectionComponents[section.type];
            return Component ? <Component key={section.id} /> : null;
          })}
      </main>
      <Footer />
    </div>
  );
};

export default Index;
