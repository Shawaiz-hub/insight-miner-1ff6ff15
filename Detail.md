# SmartMine — Advanced Data Mining Platform

## Complete Feature Documentation

---

## 🏠 Homepage & Landing

- **Dynamic Section Rendering**: Admin-controlled homepage sections (Hero, Stats, Algorithms, Workflow, Blog, FAQ, CTA) with drag-and-drop ordering, enable/disable toggles
- **SEO-Optimized FAQ**: Accordion FAQ section with automatic JSON-LD `FAQPage` schema markup for Google rich results and AI answer engines
- **Hero Section**: Animated gradient hero with call-to-action buttons
- **Stats Section**: Real-time platform statistics display
- **Algorithms Section**: Visual overview of supported mining algorithms
- **Workflow Section**: Step-by-step data mining process visualization
- **Blog Section**: Latest published blog posts carousel
- **CTA Section**: Conversion-focused call-to-action banner

---

## ⛏️ Data Mining Engine

### Association Rule Mining
- **Apriori Algorithm**: Classic level-wise candidate generation approach
- **FP-Growth Algorithm**: Frequent Pattern tree-based mining (faster for large datasets)
- **ECLAT Algorithm**: Equivalence Class Transformation using vertical TID-lists
- **CHARM Algorithm**: Closed itemset mining with closure property detection

### Classification
- **Decision Tree**: Tree-based classification with feature importance
- **Naive Bayes**: Probabilistic classifier based on Bayes' theorem
- **K-Nearest Neighbors (KNN)**: Instance-based lazy learning
- **Support Vector Machine (SVM)**: Maximum margin hyperplane classification
- **Random Forest**: Ensemble of decision trees with bagging

### Clustering
- **K-Means**: Centroid-based partitioning clustering
- **DBSCAN**: Density-based spatial clustering
- **Hierarchical Clustering**: Agglomerative bottom-up clustering with dendrograms

### Mining Features
- **Algorithm Recommendation**: AI-powered algorithm selector based on dataset characteristics
- **Parameter Configuration**: Interactive sliders for min_support, min_confidence, min_lift, k-clusters, eps, min_samples
- **Preprocessing Pipeline**: Data cleaning, normalization, encoding, and transformation
- **Preprocessing Comparison**: Before/after data quality comparison
- **Next Purchase Prediction**: Predict likely next items based on association rules
- **Rule Network Visualization**: Interactive graph visualization of discovered association rules
- **Results Table**: Sortable, filterable table of mined rules with support, confidence, and lift metrics
- **Results Visualization**: Charts and graphs for mining output analysis
- **Export Results**: Download mining results as CSV files

---

## 📊 Dashboard

- **Data Upload**: CSV file upload with drag-and-drop support
- **Dataset Preview**: Tabular preview of uploaded data with column statistics
- **Task Selection**: Choose between Association Rules, Classification, or Clustering
- **Algorithm Selector**: Visual algorithm picker with tooltips explaining each algorithm
- **Real-time Processing**: Live progress indicators during mining execution
- **Execution Time Tracking**: Millisecond-precision timing of mining operations
- **Recommendation Comparison**: Side-by-side comparison of algorithm performance

---

## 🔐 Authentication & Authorization

- **Email/Password Sign Up & Sign In**: Standard credential-based authentication
- **Google OAuth**: One-click Google sign-in integration
- **Apple Sign-In**: Apple OAuth provider for iOS/macOS users
- **Email Verification**: Users must verify email before accessing protected features
- **Forgot Password / Password Reset**: Email-based password recovery flow with dedicated reset page
- **User Profiles**: Editable profile with full name, email, and avatar
- **Role-Based Access Control (RBAC)**: Admin, Moderator, and User roles stored in dedicated `user_roles` table
- **Protected Routes**: Authentication-gated pages for dashboard, history, saved rules, and profile
- **Session Management**: Persistent sessions with automatic token refresh

---

## 📝 Blog System

- **Full CMS**: Create, edit, publish, and soft-delete blog posts from the admin panel
- **Rich Content Editor**: Markdown/HTML content editing with featured images
- **Categories**: Organize posts into categories (Data Mining, Data Science, Machine Learning, etc.)
- **Tags**: Multi-tag support for granular content classification
- **SEO Metadata**: Per-post SEO title, meta description, focus keyword, and slug
- **Blog Post Views**: Automatic view counting
- **Category Filtering**: Filter posts by category on the public blog page
- **10+ Seed Posts**: Pre-generated high-intent keyword posts targeting:
  - "Apriori Algorithm Explained Step-by-Step"
  - "FP-Growth vs Apriori: Complete Comparison"
  - "Best Data Mining Tools for Students"
  - "K-Means Clustering Tutorial"
  - "Market Basket Analysis Guide"
  - And more...

---

## 🛠️ Admin Panel

### Dashboard
- **Analytics Overview**: Key metrics and usage statistics

### User Management
- **User List**: View all registered users with roles
- **Role Assignment**: Assign admin/moderator/user roles

### Homepage Sections
- **Section Manager**: Enable/disable/reorder homepage sections
- **Custom Section Support**: Add new custom sections with titles and content
- **Live Preview**: Changes reflect immediately on the homepage

### Blog Management
- **Post Editor**: Full WYSIWYG blog post editor with SEO fields
- **Category Manager**: Create, edit, delete blog categories
- **Tag Manager**: Create, edit, delete blog tags

### SEO Settings
- **Global Meta Tags**: Site-wide title, description, and keywords
- **Open Graph / Social**: OG tags for social media sharing

### Sitemap Management
- **URL Manager**: Add, edit, remove sitemap URLs
- **Metadata Controls**: Set lastmod, changefreq, and priority per URL
- **XML Preview**: Live preview of generated sitemap XML
- **XML Download**: One-click download of sitemap.xml file
- **Database Persistence**: Sitemap entries saved to `site_settings` table

### Visitor Analytics
- **Visitor Logs**: Track page visits with user agent, IP, and timestamps
- **Page Path Tracking**: See which pages receive the most traffic

### Settings
- **Site Configuration**: General platform settings

---

## 📄 Documentation

- **Algorithm Pseudocode**: Detailed pseudocode for Apriori, FP-Growth, ECLAT, and CHARM
- **Association Rule Generation**: Step-by-step rule generation algorithm
- **API Reference**: Complete REST API documentation with request/response schemas
  - `POST /api/mine` — Association rule mining
  - `POST /api/classify` — Classification tasks
  - `POST /api/cluster` — Clustering tasks
- **Practical Examples**: Step-by-step tutorials
  - Market Basket Analysis with Apriori
  - Customer Segmentation with K-Means
  - Large Dataset Processing with FP-Growth
- **Algorithm FAQ**: Technical Q&A with JSON-LD schema markup

---

## 📜 History & Saved Rules

- **Mining History**: Complete log of all mining runs with algorithm, parameters, dataset name, execution time, and results summary
- **Saved Rules**: Bookmark individual association rules with custom names and notes
- **History Detail View**: Drill into past mining runs to review full results

---

## 🌐 SEO & Search Optimization

- **JSON-LD Schema Markup**: SoftwareApplication, FAQPage, Article schemas
- **Dynamic Sitemap**: Database-driven sitemap.xml with admin management
- **robots.txt**: Configured for all major crawlers (Googlebot, Bingbot, social bots)
- **Meta Tags**: Per-page title, description, and Open Graph tags
- **Semantic HTML**: Proper heading hierarchy (single H1), landmark elements
- **Canonical URLs**: Proper canonical tag configuration
- **AEO/GEO Optimization**: Content structured for AI answer engines (ChatGPT, Gemini, Perplexity)

---

## 📱 Progressive Web App (PWA)

- **Offline Support**: IndexedDB-based offline data caching
- **Pull to Refresh**: Native-feel pull-to-refresh on mobile
- **Bottom Navigation**: Mobile-optimized bottom tab bar
- **Responsive Design**: Full mobile/tablet/desktop responsive layout
- **Offline Indicator**: Visual indicator when network connection is lost
- **App Icons**: PWA-ready SVG icons (192x192)

---

## 🎨 UI/UX

- **Dark/Light Mode**: Full theme support with CSS custom properties
- **Glass Morphism**: Frosted glass card effects throughout the UI
- **Gradient Accents**: Vibrant gradient text and backgrounds
- **Framer Motion Animations**: Page transitions and micro-interactions
- **Accessible Components**: Built on Radix UI primitives (shadcn/ui)
- **Toast Notifications**: Success/error feedback via Sonner and custom toasts
- **Loading Skeletons**: Smooth loading states for lazy-loaded pages

---

## 🗄️ Database Schema (Lovable Cloud)

| Table | Purpose |
|-------|---------|
| `profiles` | User profile data (name, email, avatar) |
| `user_roles` | RBAC roles (admin, moderator, user) |
| `mining_history` | Mining run logs with parameters and results |
| `mining_results` | Detailed mining output data |
| `saved_rules` | User-bookmarked association rules |
| `blog_posts` | Blog content with SEO metadata |
| `blog_categories` | Blog category taxonomy |
| `blog_tags` | Blog tag taxonomy |
| `blog_post_tags` | Many-to-many post-tag relationships |
| `site_settings` | Key-value site configuration (homepage sections, sitemap entries, SEO settings) |
| `visitor_logs` | Page visit analytics |

---

## 🚀 Deployment

- **Frontend**: Vite + React 18 + TypeScript, deployed on Vercel
- **Backend**: Lovable Cloud (Supabase) for database, auth, edge functions, and storage
- **Docker Support**: Dockerfile and docker-compose.yml for self-hosted deployment
- **Nginx Config**: Production-ready nginx reverse proxy configuration

---

## 🔗 Links

- **Production URL**: https://advance-data-mining.vercel.app/
- **Sitemap**: https://advance-data-mining.vercel.app/sitemap.xml
- **GitHub**: https://github.com/Shawaiz-hub
- **LinkedIn**: https://www.linkedin.com/in/shawaiz-ali-2025b1394

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript |
| Build Tool | Vite 5 |
| Styling | Tailwind CSS v3 + shadcn/ui |
| Animation | Framer Motion |
| State/Data | TanStack React Query |
| Routing | React Router v6 |
| Backend | Lovable Cloud (Supabase) |
| Auth | Supabase Auth (Email, Google, Apple OAuth) |
| Database | PostgreSQL (via Supabase) |
| Charts | Recharts |
| Icons | Lucide React |
| Offline | IndexedDB (idb) |
| Deployment | Vercel + Docker |
