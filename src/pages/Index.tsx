import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { StatsSection } from "@/components/home/StatsSection";
import { AlgorithmsSection } from "@/components/home/AlgorithmsSection";
import { WorkflowSection } from "@/components/home/WorkflowSection";
import { BlogSection } from "@/components/home/BlogSection";
import { CTASection } from "@/components/home/CTASection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <StatsSection />
        <AlgorithmsSection />
        <WorkflowSection />
        <BlogSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
