import { PublicShell } from "@/components/PublicShell";
import { Mail } from "lucide-react";

const EFFECTIVE_DATE = "June 2, 2023";

type Section = {
  h: string;
  paragraphs?: string[];
  groups?: { intro?: string; items: string[] }[];
  outro?: string;
};

const sections: Section[] = [
  {
    h: "1. Acceptance of Terms",
    paragraphs: [
      "Welcome to Haratrading (\"Haratrading,\" \"Company,\" \"we,\" \"our,\" or \"us\").",
      "These Terms of Service (\"Terms\") govern your access to and use of our website, platform, products, and services.",
      "By accessing or using Haratrading, you agree to be bound by these Terms. If you do not agree with any part of these Terms, you must discontinue use of our services immediately.",
    ],
  },
  {
    h: "2. Eligibility",
    groups: [{ intro: "To use our services, you must:", items: ["Be at least 18 years old.", "Have the legal capacity to enter into binding agreements.", "Provide accurate and complete information during registration.", "Comply with all applicable laws and regulations."] }],
    outro: "Haratrading reserves the right to refuse service to any person at its sole discretion.",
  },
  {
    h: "3. Account Registration",
    paragraphs: ["Certain features may require account registration."],
    groups: [{ intro: "You agree to:", items: ["Maintain accurate account information.", "Keep login credentials confidential.", "Notify us immediately of unauthorized access.", "Accept responsibility for activities conducted through your account."] }],
    outro: "Haratrading is not liable for losses resulting from unauthorized account use caused by your failure to protect account credentials.",
  },
  {
    h: "4. Services",
    paragraphs: [
      "Haratrading provides trading, marketplace, financial technology, investment-related, or other business services as described on the platform.",
      "We may modify, suspend, discontinue, or update services at any time without prior notice.",
      "Nothing in these Terms guarantees uninterrupted access to our services.",
    ],
  },
  {
    h: "5. User Responsibilities",
    groups: [{ intro: "You agree not to:", items: ["Violate any law or regulation.", "Use the platform for fraudulent activities.", "Upload malicious software or harmful code.", "Attempt unauthorized access to systems or accounts.", "Interfere with platform operations.", "Misrepresent your identity.", "Engage in money laundering, terrorism financing, or illegal financial activities.", "Use automated tools to scrape, copy, or harvest platform data without authorization."] }],
    outro: "Violation of these provisions may result in account suspension, termination, and legal action.",
  },
  {
    h: "6. Know Your Customer (KYC) and Verification",
    paragraphs: ["Where required, Haratrading may request identity verification documents."],
    groups: [{ intro: "You agree that:", items: ["Information provided is accurate and authentic.", "We may verify your identity using third-party providers.", "Failure to provide requested information may result in restricted access or account closure."] }],
  },
  {
    h: "7. Payments and Fees",
    paragraphs: ["Users agree to pay all applicable fees associated with the services."],
    groups: [{ intro: "Haratrading reserves the right to:", items: ["Modify pricing and fees.", "Introduce new service charges.", "Refuse or cancel transactions where fraud or security concerns exist."] }],
    outro: "All payments are non-refundable unless otherwise required by law or expressly stated by Haratrading.",
  },
  {
    h: "8. Risk Disclosure",
    paragraphs: ["Trading, investing, and financial activities involve risk."],
    groups: [{ intro: "You acknowledge that:", items: ["Past performance does not guarantee future results.", "Market values may fluctuate.", "Financial losses may occur.", "Haratrading does not guarantee profits, returns, or investment success."] }],
    outro: "Users are solely responsible for their financial decisions.",
  },
  {
    h: "9. Intellectual Property",
    groups: [{ intro: "All content on Haratrading, including:", items: ["Logos", "Designs", "Text", "Graphics", "Software", "Trademarks", "Databases"] }],
    outro: "are owned by or licensed to Haratrading and protected by applicable intellectual property laws. You may not reproduce, distribute, modify, or commercially exploit any content without written permission.",
  },
  {
    h: "10. User Content",
    paragraphs: [
      "By submitting content to Haratrading, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, store, and display such content for operational purposes.",
      "You remain responsible for content you submit and warrant that it does not violate any law or third-party rights.",
    ],
  },
  {
    h: "11. Third-Party Services",
    paragraphs: ["Haratrading may integrate with third-party providers."],
    groups: [{ intro: "We do not control and are not responsible for:", items: ["Third-party websites", "Payment processors", "Financial institutions", "External software providers"] }],
    outro: "Use of third-party services is subject to their respective terms and policies.",
  },
  {
    h: "12. Suspension and Termination",
    groups: [{ intro: "We may suspend or terminate accounts immediately if:", items: ["These Terms are violated.", "Fraudulent activity is suspected.", "Regulatory requirements demand action.", "Security risks are identified."] }],
    outro: "Termination does not limit any legal rights or remedies available to Haratrading.",
  },
  {
    h: "13. Disclaimer of Warranties",
    paragraphs: ["Services are provided on an \"as is\" and \"as available\" basis."],
    groups: [{ intro: "To the maximum extent permitted by law, Haratrading disclaims all warranties, including:", items: ["Merchantability", "Fitness for a particular purpose", "Non-infringement", "Accuracy of information", "Availability of services"] }],
    outro: "We do not guarantee uninterrupted or error-free operation.",
  },
  {
    h: "14. Limitation of Liability",
    groups: [{ intro: "To the fullest extent permitted by law, Haratrading, its directors, employees, affiliates, and partners shall not be liable for:", items: ["Indirect damages", "Consequential damages", "Lost profits", "Loss of data", "Business interruption", "Investment losses"] }],
    outro: "Our total liability shall not exceed the amount paid by the user for the specific service giving rise to the claim during the twelve (12) months preceding the event.",
  },
  {
    h: "15. Indemnification",
    groups: [{ intro: "You agree to indemnify and hold harmless Haratrading, its affiliates, directors, officers, employees, and agents from any claims, damages, losses, liabilities, costs, or expenses arising from:", items: ["Your use of the platform.", "Violation of these Terms.", "Violation of applicable laws.", "Infringement of third-party rights."] }],
  },
  {
    h: "16. Force Majeure",
    groups: [{ intro: "Haratrading shall not be liable for delays or failures caused by events beyond reasonable control, including:", items: ["Natural disasters", "Power outages", "Internet disruptions", "Government actions", "Cyberattacks", "Labor disputes"] }],
  },
  {
    h: "17. Privacy",
    paragraphs: ["Your use of Haratrading is also governed by our Privacy Policy, which forms part of these Terms."],
  },
  {
    h: "18. Governing Law",
    paragraphs: ["These Terms shall be governed by and interpreted in accordance with the laws of the Federal Republic of Nigeria, without regard to conflict of law principles."],
  },
  {
    h: "19. Dispute Resolution",
    paragraphs: [
      "Any dispute arising from these Terms shall first be resolved through good-faith negotiations.",
      "Where resolution cannot be reached, disputes shall be submitted to the competent courts of Nigeria.",
      "Haratrading may also seek injunctive relief where necessary to protect its rights and intellectual property.",
    ],
  },
  {
    h: "20. Changes to These Terms",
    paragraphs: [
      "Haratrading may revise these Terms at any time.",
      "Updated versions will be published on the platform with a revised effective date.",
      "Continued use of the services after updates constitutes acceptance of the revised Terms.",
    ],
  },
];

export default function Terms() {
  return (
    <PublicShell>
      <section className="container py-16 md:py-24 max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">Haratrading · Effective Date: {EFFECTIVE_DATE}</p>
        <div className="mt-10 space-y-8 text-muted-foreground">
          {sections.map((s) => (
            <section key={s.h} className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">{s.h}</h2>
              {s.paragraphs?.map((p, i) => <p key={i}>{p}</p>)}
              {s.groups?.map((g, i) => (
                <div key={i} className="space-y-2">
                  {g.intro && <p>{g.intro}</p>}
                  <ul className="list-disc pl-6 space-y-1">
                    {g.items.map((it) => <li key={it}>{it}</li>)}
                  </ul>
                </div>
              ))}
              {s.outro && <p>{s.outro}</p>}
            </section>
          ))}

          <section className="space-y-3 rounded-xl border border-border/60 bg-card p-6">
            <h2 className="text-xl font-semibold text-foreground">21. Contact Information</h2>
            <div className="text-foreground">
              <div className="font-semibold">Haratrading</div>
              <a href="mailto:support@haratrading.com" className="inline-flex items-center gap-2 mt-1 text-primary hover:underline">
                <Mail className="h-4 w-4" /> support@haratrading.com
              </a>
            </div>
          </section>
        </div>
      </section>
    </PublicShell>
  );
}