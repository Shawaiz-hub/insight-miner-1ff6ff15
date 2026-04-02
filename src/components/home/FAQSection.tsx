import { useEffect } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSectionProps {
  title?: string;
  subtitle?: string;
  faqs: FAQItem[];
  schemaId?: string;
}

export function FAQSection({ title = "Frequently Asked Questions", subtitle, faqs, schemaId = "faq-schema" }: FAQSectionProps) {
  useEffect(() => {
    // Inject FAQ JSON-LD schema
    const existing = document.getElementById(schemaId);
    if (existing) existing.remove();

    const schema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    };

    const script = document.createElement("script");
    script.id = schemaId;
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);

    return () => {
      const el = document.getElementById(schemaId);
      if (el) el.remove();
    };
  }, [faqs, schemaId]);

  return (
    <section id="faq" className="py-16 sm:py-24">
      <div className="container max-w-3xl px-4 sm:px-6">
        <div className="text-center mb-10">
          <span className="section-badge mb-4">
            <HelpCircle className="w-4 h-4" />
            FAQ
          </span>
          <h2 className="text-3xl font-bold mb-3">{title}</h2>
          {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
        </div>
        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="glass-card rounded-xl px-5 border-none">
              <AccordionTrigger className="text-left font-medium text-sm sm:text-base hover:no-underline">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
