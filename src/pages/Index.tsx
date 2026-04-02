import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { StatsSection } from "@/components/home/StatsSection";
import { AlgorithmsSection } from "@/components/home/AlgorithmsSection";
import { WorkflowSection } from "@/components/home/WorkflowSection";
import { BlogSection } from "@/components/home/BlogSection";
import { CTASection } from "@/components/home/CTASection";
import { FAQSection } from "@/components/home/FAQSection";
import { supabase } from "@/integrations/supabase/client";

const homeFAQs = [
  { question: "What is data mining?", answer: "Data mining is the process of discovering patterns, correlations, and anomalies in large datasets using statistical, mathematical, and computational techniques to predict outcomes and extract actionable insights." },
  { question: "What is the Apriori algorithm?", answer: "Apriori is a classic algorithm for mining frequent itemsets and generating association rules. It uses a breadth-first, level-wise search strategy and the downward closure property to prune the search space efficiently." },
  { question: "How does FP-Growth differ from Apriori?", answer: "FP-Growth avoids costly candidate generation by compressing the dataset into a compact FP-Tree structure. It mines frequent patterns directly from the tree, making it significantly faster than Apriori on large datasets." },
  { question: "What is association rule mining?", answer: "Association rule mining finds interesting relationships between variables in large datasets. It identifies rules like 'customers who buy bread also buy butter' using metrics such as support, confidence, and lift." },
  { question: "Is SmartMine free to use?", answer: "Yes, SmartMine is completely free to use. You can upload your datasets, run mining algorithms, visualize results, and export your findings without any cost." },
  { question: "What file formats does SmartMine support?", answer: "SmartMine supports CSV files for data upload. Simply prepare your transactional data in CSV format with items separated by columns, and upload it directly to the dashboard." },
  { question: "What is the ECLAT algorithm?", answer: "ECLAT (Equivalence Class Clustering and bottom-up Lattice Traversal) uses a vertical data representation with TID-sets. It finds frequent itemsets by intersecting TID-sets, often outperforming Apriori on dense datasets." },
  { question: "Can I compare multiple algorithms?", answer: "Yes, SmartMine allows you to run multiple algorithms on the same dataset and compare their results side-by-side, including execution time, number of rules discovered, and quality metrics." },
];

interface HomeSection {
  id: string;
  title: string;
  subtitle: string;
  content: string;
  type: "hero" | "stats" | "algorithms" | "workflow" | "blog" | "cta" | "faq" | "custom";
  enabled: boolean;
  order: number;
}

const defaultSections: HomeSection[] = [
  { id: "hero", title: "Hero Section", subtitle: "", content: "", type: "hero", enabled: true, order: 0 },
  { id: "stats", title: "Stats Section", subtitle: "", content: "", type: "stats", enabled: true, order: 1 },
  { id: "algorithms", title: "Algorithms Section", subtitle: "", content: "", type: "algorithms", enabled: true, order: 2 },
  { id: "workflow", title: "Workflow Section", subtitle: "", content: "", type: "workflow", enabled: true, order: 3 },
  { id: "blog", title: "Blog Section", subtitle: "", content: "", type: "blog", enabled: true, order: 4 },
  { id: "faq", title: "FAQ Section", subtitle: "", content: "", type: "faq", enabled: true, order: 5 },
  { id: "cta", title: "CTA Section", subtitle: "", content: "", type: "cta", enabled: true, order: 6 },
];

const sectionComponents: Record<string, React.FC> = {
  hero: HeroSection,
  stats: StatsSection,
  algorithms: AlgorithmsSection,
  workflow: WorkflowSection,
  blog: BlogSection,
  cta: CTASection,
  faq: () => <FAQSection faqs={homeFAQs} title="Data Mining FAQ" subtitle="Common questions about data mining and our platform" schemaId="home-faq" />,
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
