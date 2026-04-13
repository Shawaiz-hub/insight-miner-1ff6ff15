import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useSEO } from "@/hooks/useSEO";

export default function Terms() {
  useSEO({ title: "Terms of Service", description: "SmartMine terms of service. Read about the rules and guidelines for using our data mining platform.", path: "/terms" });
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-24 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: February 2, 2026</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using SmartMine ("Service"), you agree to be bound by these Terms of 
              Service ("Terms"). If you disagree with any part of these terms, you may not access 
              the Service. These Terms apply to all visitors, users, and others who access or use 
              the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              SmartMine is a data mining platform that provides association rule mining, clustering, 
              and classification services. The Service allows users to upload datasets, run various 
              data mining algorithms, and export results. We reserve the right to modify, suspend, 
              or discontinue any aspect of the Service at any time.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              When you create an account with us, you must provide accurate, complete, and current 
              information. You are responsible for:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Safeguarding your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized access</li>
              <li>Ensuring your account information is up to date</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You agree not to use the Service to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Upload malicious code, viruses, or harmful content</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe on intellectual property rights of others</li>
              <li>Process data you do not have rights to use</li>
              <li>Use the Service for any illegal purposes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Data and Content</h2>
            <p className="text-muted-foreground leading-relaxed">
              You retain all rights to the data you upload to the Service. By uploading data, you 
              grant us a limited license to process it as necessary to provide the Service. You 
              represent that you have all necessary rights to upload and process any data you submit. 
              We do not claim ownership of your data and will not share it with third parties except 
              as described in our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service and its original content, features, and functionality are and will remain 
              the exclusive property of SmartMine. The Service is protected by copyright, trademark, 
              and other laws. Our trademarks may not be used in connection with any product or service 
              without prior written consent.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground leading-relaxed">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, 
              EITHER EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, 
              SECURE, OR ERROR-FREE. THE RESULTS OF DATA MINING OPERATIONS ARE PROVIDED FOR 
              INFORMATIONAL PURPOSES AND SHOULD BE VALIDATED BEFORE MAKING BUSINESS DECISIONS.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              IN NO EVENT SHALL SMARTMINE, ITS DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE FOR ANY 
              INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF OR 
              RELATED TO YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT 
              YOU PAID US IN THE PAST TWELVE MONTHS.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Indemnification</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree to defend, indemnify, and hold harmless SmartMine and its affiliates from 
              any claims, damages, costs, and expenses arising from your use of the Service, your 
              violation of these Terms, or your violation of any rights of another party.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may terminate or suspend your account immediately, without prior notice or liability, 
              for any reason, including breach of these Terms. Upon termination, your right to use 
              the Service will immediately cease. You may also delete your account at any time through 
              your account settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with applicable laws, 
              without regard to conflict of law principles. Any disputes arising from these Terms 
              shall be resolved through binding arbitration in accordance with the rules of the 
              relevant arbitration association.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify or replace these Terms at any time. If a revision is 
              material, we will try to provide at least 30 days' notice prior to any new terms 
              taking effect. Continued use of the Service after changes become effective constitutes 
              acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about these Terms, please contact us at:{" "}
              <a href="mailto:legal@smartmine.dev" className="text-primary hover:underline">
                legal@smartmine.dev
              </a>
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
