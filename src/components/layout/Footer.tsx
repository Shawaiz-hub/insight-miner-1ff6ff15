import { Link } from "react-router-dom";
import { Database, Github, Linkedin } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-card/30">
      <div className="container py-8 sm:py-12 px-4 sm:px-6">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          <div className="col-span-2 sm:col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-3 sm:mb-4">
              <div className="feature-icon w-8 h-8 sm:w-9 sm:h-9">
                <Database className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <span className="text-lg sm:text-xl font-bold">
                Smart<span className="text-primary">Mine</span>
              </span>
            </Link>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Advanced data mining platform for pattern discovery and rule extraction.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Algorithms</h4>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-muted-foreground">
              <li><Link to="/dashboard?algo=apriori" className="hover:text-foreground transition-colors">Apriori</Link></li>
              <li><Link to="/dashboard?algo=fpgrowth" className="hover:text-foreground transition-colors">FP-Growth</Link></li>
              <li><Link to="/dashboard?algo=eclat" className="hover:text-foreground transition-colors">ECLAT</Link></li>
              <li><Link to="/dashboard?algo=charm" className="hover:text-foreground transition-colors">CHARM</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Resources</h4>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-muted-foreground">
              <li><Link to="/docs" className="hover:text-foreground transition-colors">Documentation</Link></li>
              <li><Link to="/docs#api" className="hover:text-foreground transition-colors">API Reference</Link></li>
              <li><Link to="/docs#examples" className="hover:text-foreground transition-colors">Examples</Link></li>
              <li><Link to="/docs#faq" className="hover:text-foreground transition-colors">FAQ</Link></li>
              <li><Link to="/blog" className="hover:text-foreground transition-colors">Blog</Link></li>
            </ul>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Connect</h4>
            <div className="flex gap-2 sm:gap-3">
              <a href="https://github.com/Shawaiz-hub" target="_blank" rel="noopener noreferrer" className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary/20 transition-colors">
                <Github className="w-4 h-4 sm:w-5 sm:h-5" />
              </a>
              <a href="https://www.linkedin.com/in/shawaiz-ali-2025b1394" target="_blank" rel="noopener noreferrer" className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary/20 transition-colors">
                <Linkedin className="w-4 h-4 sm:w-5 sm:h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-border/50 mt-6 sm:mt-8 pt-6 sm:pt-8 flex flex-col md:flex-row justify-between items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
          <p>© 2026 SmartMine. All rights reserved.</p>
          <div className="flex gap-4 sm:gap-6">
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
            <Link to="/sitemap" className="hover:text-foreground transition-colors">Sitemap</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
