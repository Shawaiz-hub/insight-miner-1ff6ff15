import { FileText, Database, GitBranch, Target } from "lucide-react";

const stats = [
  { value: "7+", label: "Mining Algorithms", icon: GitBranch },
  { value: "1M+", label: "Transactions Processed", icon: Database },
  { value: "50K+", label: "Rules Discovered", icon: FileText },
  { value: "99.9%", label: "Accuracy Rate", icon: Target },
];

export function StatsSection() {
  return (
    <section className="py-20 border-y border-border/50 bg-card/30">
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className="text-center animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="feature-icon w-14 h-14 mx-auto mb-4">
                <stat.icon className="w-7 h-7 text-primary" />
              </div>
              <p className="stat-number mb-2">{stat.value}</p>
              <p className="text-muted-foreground text-sm">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
