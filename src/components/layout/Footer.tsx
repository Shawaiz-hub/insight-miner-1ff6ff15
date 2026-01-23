import { Link } from "react-router-dom";
import { Database, Github, Twitter, Linkedin } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-card/30">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="feature-icon w-9 h-9">
                <Database className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xl font-bold">
                Smart<span className="text-primary">Mine</span>
              </span>
            </Link>
            <p className="text-muted-foreground text-sm">
              Advanced data mining platform for pattern discovery and rule extraction.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Algorithms</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/dashboard?algo=apriori" className="hover:text-foreground transition-colors">Apriori</Link></li>
              <li><Link to="/dashboard?algo=fpgrowth" className="hover:text-foreground transition-colors">FP-Growth</Link></li>
              <li><Link to="/dashboard?algo=eclat" className="hover:text-foreground transition-colors">ECLAT</Link></li>
              <li><Link to="/dashboard?algo=charm" className="hover:text-foreground transition-colors">CHARM</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/docs" className="hover:text-foreground transition-colors">Documentation</Link></li>
              <li><Link to="/docs#api" className="hover:text-foreground transition-colors">API Reference</Link></li>
              <li><Link to="/docs#examples" className="hover:text-foreground transition-colors">Examples</Link></li>
              <li><Link to="/docs#faq" className="hover:text-foreground transition-colors">FAQ</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Connect</h4>
            <div className="flex gap-3">
              <a href="#" className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary/20 transition-colors">
                <Github className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary/20 transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary/20 transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-border/50 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>© 2026 SmartMine. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
