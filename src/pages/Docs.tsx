import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Layers, Network, Binary, Cpu, Workflow, Lock, Maximize, BookOpen, Code, FileText } from "lucide-react";
import { FAQSection } from "@/components/home/FAQSection";

const docsFAQs = [
  { question: "How do I choose the right algorithm?", answer: "For sparse datasets with many items, use Apriori or FP-Growth. For dense datasets, ECLAT or CHARM perform better. FP-Growth is generally the fastest for large datasets. Use the algorithm recommendation feature in the dashboard for personalized suggestions." },
  { question: "What do support, confidence, and lift mean?", answer: "Support measures how frequently an itemset appears in the dataset. Confidence measures the reliability of a rule (probability of consequent given antecedent). Lift measures the strength of association — a lift > 1 indicates positive correlation." },
  { question: "How do I set minimum support and confidence?", answer: "Start with min_support of 0.01–0.05 (1–5%) and min_confidence of 0.5 (50%). Adjust based on results: lower thresholds find more rules but may include noise; higher thresholds yield fewer but stronger rules." },
  { question: "What is the difference between closed and maximal itemsets?", answer: "A closed itemset has no superset with the same support. A maximal frequent itemset has no frequent superset. CHARM mines closed itemsets, while MaxMiner finds maximal ones. Closed itemsets preserve all frequency information." },
  { question: "Can I use SmartMine for market basket analysis?", answer: "Absolutely. SmartMine is ideal for market basket analysis. Upload your transaction data as CSV, select an association rule algorithm (Apriori, FP-Growth, or ECLAT), configure thresholds, and discover which products are frequently purchased together." },
  { question: "How do I export my mining results?", answer: "After running an analysis, use the Export button on the results page. You can export rules, visualizations, and summary statistics in CSV format for further analysis in spreadsheet tools or other applications." },
];

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

          {/* API Reference */}
          <section id="api" className="mt-12 space-y-6">
            <h2 className="text-2xl font-bold">API Reference</h2>
            <div className="glass-card rounded-2xl p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Code className="w-5 h-5 text-primary" />
                  POST /api/mine
                </h3>
                <p className="text-sm text-muted-foreground mb-3">Run a mining algorithm on your dataset. Returns frequent itemsets and association rules.</p>
                <pre className="bg-secondary/50 rounded-xl p-4 overflow-x-auto text-sm font-mono text-muted-foreground">
{`{
  "algorithm": "apriori" | "fpgrowth" | "eclat" | "charm",
  "data": [["bread","milk"], ["bread","eggs","milk"]],
  "min_support": 0.3,
  "min_confidence": 0.7,
  "min_lift": 1.0
}`}
                </pre>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Code className="w-5 h-5 text-primary" />
                  POST /api/classify
                </h3>
                <p className="text-sm text-muted-foreground mb-3">Run classification (Decision Tree, Naive Bayes, KNN, SVM, Random Forest) on labeled data.</p>
                <pre className="bg-secondary/50 rounded-xl p-4 overflow-x-auto text-sm font-mono text-muted-foreground">
{`{
  "algorithm": "decision_tree" | "naive_bayes" | "knn" | "svm" | "random_forest",
  "data": [[...features], ...],
  "labels": ["class1", "class2", ...],
  "test_size": 0.2
}`}
                </pre>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Code className="w-5 h-5 text-primary" />
                  POST /api/cluster
                </h3>
                <p className="text-sm text-muted-foreground mb-3">Run clustering (K-Means, DBSCAN, Hierarchical) on unlabeled data.</p>
                <pre className="bg-secondary/50 rounded-xl p-4 overflow-x-auto text-sm font-mono text-muted-foreground">
{`{
  "algorithm": "kmeans" | "dbscan" | "hierarchical",
  "data": [[...features], ...],
  "n_clusters": 3,        // for kmeans/hierarchical
  "eps": 0.5,             // for dbscan
  "min_samples": 5        // for dbscan
}`}
                </pre>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Code className="w-5 h-5 text-primary" />
                  Response Format
                </h3>
                <pre className="bg-secondary/50 rounded-xl p-4 overflow-x-auto text-sm font-mono text-muted-foreground">
{`{
  "success": true,
  "execution_time_ms": 245,
  "results": {
    "rules": [
      {
        "antecedent": ["bread"],
        "consequent": ["milk"],
        "support": 0.45,
        "confidence": 0.82,
        "lift": 1.34
      }
    ],
    "frequent_itemsets": [...]
  }
}`}
                </pre>
              </div>
            </div>
          </section>

          {/* Examples */}
          <section id="examples" className="mt-12 space-y-6">
            <h2 className="text-2xl font-bold">Examples</h2>

            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-3">1. Market Basket Analysis with Apriori</h3>
              <p className="text-sm text-muted-foreground mb-4">Upload a CSV of grocery transactions and discover which products are frequently bought together.</p>
              <pre className="bg-secondary/50 rounded-xl p-4 overflow-x-auto text-sm font-mono text-muted-foreground">
{`Step 1: Prepare CSV (one transaction per row)
  bread, milk, eggs
  bread, butter
  milk, eggs, cheese
  bread, milk, butter, eggs

Step 2: Upload to SmartMine dashboard
Step 3: Select "Apriori" algorithm
Step 4: Set min_support = 0.3, min_confidence = 0.6
Step 5: Click "Run Analysis"

Result: {bread} → {milk}  (support: 0.75, confidence: 0.85, lift: 1.13)`}
              </pre>
            </div>

            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-3">2. Customer Segmentation with K-Means</h3>
              <p className="text-sm text-muted-foreground mb-4">Cluster customers based on purchasing behavior to identify distinct market segments.</p>
              <pre className="bg-secondary/50 rounded-xl p-4 overflow-x-auto text-sm font-mono text-muted-foreground">
{`Step 1: Prepare CSV with numeric features
  customer_id, annual_spend, visit_frequency, avg_basket_size
  C001, 5200, 48, 35.50
  C002, 1200, 12, 22.00

Step 2: Upload and select "Clustering" task
Step 3: Choose K-Means, set K=3
Step 4: Run and visualize clusters

Result: 3 segments — High-Value, Occasional, Budget shoppers`}
              </pre>
            </div>

            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-3">3. FP-Growth for Large Datasets</h3>
              <p className="text-sm text-muted-foreground mb-4">When your dataset has 10,000+ transactions, FP-Growth is significantly faster than Apriori.</p>
              <pre className="bg-secondary/50 rounded-xl p-4 overflow-x-auto text-sm font-mono text-muted-foreground">
{`Step 1: Upload large transaction CSV
Step 2: Select "FP-Growth" (recommended by algorithm advisor)
Step 3: Set min_support = 0.01 for sparse datasets
Step 4: Run — typically 5-10x faster than Apriori

Tip: Use the Algorithm Recommendation feature
     to automatically select the best algorithm`}
              </pre>
            </div>
          </section>

          <FAQSection
            faqs={docsFAQs}
            title="Algorithm FAQ"
            subtitle="Common questions about data mining algorithms and usage"
            schemaId="docs-faq"
          />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Docs;
