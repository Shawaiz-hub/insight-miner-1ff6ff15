import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Layers, Network, Binary, Cpu, Workflow, Lock, Maximize, BookOpen, Code, FileText } from "lucide-react";

const algorithms = [
  {
    id: "apriori",
    name: "Apriori",
    icon: Layers,
    pseudocode: `Apriori(D, min_sup):
  L1 = Find frequent 1-itemsets in D
  k = 2
  While L(k-1) is not empty:
    Ck = Generate candidates from L(k-1)
    For each transaction t in D:
      For each candidate c in Ck:
        If c ⊆ t then count[c]++
    Lk = Candidates with support ≥ min_sup
    k = k + 1
  Return all Lk`,
  },
  {
    id: "fpgrowth",
    name: "FP-Growth",
    icon: Network,
    pseudocode: `FP_Growth(D, min_sup):
  Scan D to find frequent 1-itemsets
  Build FP-Tree:
    Order items by descending frequency
    Insert transactions into FP-tree
  Call FP_Growth_Recursive(FP-Tree, null)

FP_Growth_Recursive(Tree, α):
  If Tree contains a single path:
    For each combination β of nodes:
      Output α ∪ β as frequent itemset
  Else:
    For each item i in header table:
      New pattern = α ∪ {i}
      Output New pattern
      Construct conditional FP-tree
      Recurse if not empty`,
  },
  {
    id: "eclat",
    name: "ECLAT",
    icon: Binary,
    pseudocode: `ECLAT(D, min_sup):
  Convert D into vertical TID-lists
  For each item i:
    If support(i) ≥ min_sup:
      Output {i}
      ECLAT_Extend({i}, TID-list(i))

ECLAT_Extend(prefix P, TID-list(P)):
  For each item j after last item in P:
    TID-list(P∪{j}) = TID-list(P) ∩ TID-list(j)
    If support ≥ min_sup:
      Output P ∪ {j}
      ECLAT_Extend(P ∪ {j}, TID-list(P∪{j}))`,
  },
  {
    id: "charm",
    name: "CHARM",
    icon: Lock,
    pseudocode: `CHARM(D, min_sup):
  For each frequent item i:
    CHARM_Extend({i}, TID-list(i))

CHARM_Extend(P, TID-list(P)):
  For each item j after last item in P:
    TID-list(P∪{j}) = intersection
    If support ≥ min_sup:
      If closure property satisfied:
        Output closed itemset
      CHARM_Extend(P ∪ {j}, TID-list)`,
  },
];

const Docs = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-12">
        <div className="container max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <span className="section-badge mb-4">
              <BookOpen className="w-4 h-4" />
              Documentation
            </span>
            <h1 className="text-4xl font-bold mb-4">
              Algorithm <span className="gradient-text">Reference</span>
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Learn about the mining algorithms, their pseudocode, and when to use each one.
            </p>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {[
              { icon: Code, label: "Pseudocode", href: "#algorithms" },
              { icon: FileText, label: "API Docs", href: "#api" },
              { icon: BookOpen, label: "Examples", href: "#examples" },
              { icon: Layers, label: "FAQ", href: "#faq" },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="glass-card rounded-xl p-4 text-center card-hover"
              >
                <link.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                <span className="text-sm font-medium">{link.label}</span>
              </a>
            ))}
          </div>

          {/* Algorithms */}
          <section id="algorithms" className="space-y-8">
            <h2 className="text-2xl font-bold">Algorithm Pseudocode</h2>
            
            {algorithms.map((algo) => (
              <div key={algo.id} className="glass-card rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="feature-icon w-10 h-10">
                    <algo.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">{algo.name}</h3>
                </div>
                <pre className="bg-secondary/50 rounded-xl p-4 overflow-x-auto text-sm font-mono text-muted-foreground">
                  {algo.pseudocode}
                </pre>
              </div>
            ))}
          </section>

          {/* Rule Generation */}
          <section className="mt-12 glass-card rounded-2xl p-6">
            <h3 className="text-xl font-semibold mb-4">Association Rule Generation</h3>
            <pre className="bg-secondary/50 rounded-xl p-4 overflow-x-auto text-sm font-mono text-muted-foreground">
{`Generate_Rules(F, min_conf):
  For each frequent itemset f in F:
    For each non-empty subset s of f:
      conf = support(f) / support(s)
      If conf ≥ min_conf:
        Rule: s → (f - s)
        Compute lift
        Output rule`}
            </pre>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Docs;
