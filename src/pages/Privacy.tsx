import { PublicShell } from "@/components/PublicShell";
import { Mail } from "lucide-react";

const EFFECTIVE_DATE = "June 2, 2023";

type Section = {
  h: string;
  p?: string;
  groups?: { title?: string; intro?: string; items: string[] }[];
  outro?: string;
};

const sections: Section[] = [
  {
    h: "1. Introduction",
    p: "Welcome to Haratrading (\"Company,\" \"we,\" \"our,\" or \"us\"). We respect your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, store, and protect information when you visit our website, use our services, or interact with our platform.",
    outro: "By accessing or using Haratrading's services, you agree to the collection and use of information in accordance with this Privacy Policy.",
  },
  {
    h: "2. Information We Collect",
    groups: [
      { title: "Personal Information", intro: "We may collect the following personal information:", items: ["Full name", "Email address", "Phone number", "Residential or business address", "Date of birth", "Government-issued identification documents", "Account credentials", "Payment and billing information"] },
      { title: "Business Information", intro: "Where applicable, we may collect:", items: ["Company name", "Business registration details", "Tax identification numbers", "Trading and transaction records"] },
      { title: "Technical Information", intro: "We may automatically collect:", items: ["IP address", "Browser type and version", "Device information", "Operating system", "Website usage data", "Cookies and tracking information"] },
    ],
  },
  {
    h: "3. How We Use Your Information",
    groups: [{ intro: "We may use collected information to:", items: ["Create and manage user accounts", "Provide our products and services", "Verify identity and prevent fraud", "Process transactions and payments", "Communicate with users", "Improve platform functionality", "Provide customer support", "Comply with legal and regulatory obligations", "Protect our rights and security", "Conduct analytics and business operations"] }],
  },
  {
    h: "4. Legal Basis for Processing",
    groups: [{ intro: "Where applicable, we process personal information based on:", items: ["User consent", "Contractual necessity", "Legal obligations", "Legitimate business interests", "Protection against fraud and abuse"] }],
  },
  {
    h: "5. Cookies and Tracking Technologies",
    groups: [{ intro: "Haratrading may use cookies, web beacons, and similar technologies to:", items: ["Improve website performance", "Remember user preferences", "Analyze website traffic", "Enhance security", "Deliver personalized experiences"] }],
    outro: "Users may disable cookies through browser settings, though certain features may become unavailable.",
  },
  {
    h: "6. Sharing of Information",
    p: "We do not sell personal information.",
    groups: [{ intro: "We may share information with:", items: ["Payment processors", "Cloud hosting providers", "Customer support providers", "Legal and regulatory authorities", "Professional advisers", "Business partners involved in service delivery"] }],
    outro: "Information may also be disclosed when required by law or to protect our legal rights.",
  },
  {
    h: "7. International Data Transfers",
    p: "Your information may be stored and processed in countries outside your jurisdiction. We take reasonable measures to ensure appropriate safeguards are in place for such transfers.",
  },
  {
    h: "8. Data Security",
    groups: [{ intro: "We implement reasonable technical, administrative, and organizational safeguards to protect personal information against:", items: ["Unauthorized access", "Loss", "Misuse", "Disclosure", "Alteration", "Destruction"] }],
    outro: "While we strive to protect information, no internet transmission or storage system can be guaranteed completely secure.",
  },
  {
    h: "9. Data Retention",
    groups: [{ intro: "We retain personal information only as long as necessary to:", items: ["Provide our services", "Meet legal obligations", "Resolve disputes", "Enforce agreements", "Maintain business records"] }],
    outro: "When information is no longer required, it will be securely deleted or anonymized.",
  },
  {
    h: "10. User Rights",
    groups: [{ intro: "Depending on applicable laws, users may have the right to:", items: ["Access personal information", "Correct inaccurate information", "Request deletion of information", "Restrict processing", "Object to processing", "Withdraw consent", "Request data portability"] }],
    outro: "Requests may be submitted through the contact details provided below.",
  },
  {
    h: "11. Third-Party Services",
    p: "Our platform may contain links to third-party websites or services. We are not responsible for the privacy practices or content of third-party platforms.",
    outro: "Users are encouraged to review the privacy policies of any third-party websites they visit.",
  },
  {
    h: "12. Children's Privacy",
    p: "Haratrading's services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children.",
    outro: "If we become aware that a child has provided personal information, we will take reasonable steps to remove such information.",
  },
  {
    h: "13. Regulatory Compliance",
    groups: [{ intro: "Haratrading aims to comply with applicable privacy and data protection laws, including but not limited to:", items: ["Nigeria Data Protection Act (NDPA)", "General Data Protection Regulation (GDPR), where applicable", "Other relevant international privacy regulations"] }],
  },
  {
    h: "14. Changes to This Privacy Policy",
    p: "We may update this Privacy Policy from time to time.",
    outro: "Any changes will be posted on this page with an updated effective date. Continued use of our services after updates constitutes acceptance of the revised policy.",
  },
];

export default function Privacy() {
  return (
    <PublicShell>
      <section className="container py-16 md:py-24 max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Effective Date: {EFFECTIVE_DATE}</p>
        <div className="mt-10 space-y-8 text-muted-foreground">
          {sections.map((s) => (
            <section key={s.h} className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">{s.h}</h2>
              {s.p && <p>{s.p}</p>}
              {s.groups?.map((g, i) => (
                <div key={i} className="space-y-2">
                  {g.title && <h3 className="font-semibold text-foreground">{g.title}</h3>}
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
            <h2 className="text-xl font-semibold text-foreground">15. Contact Information</h2>
            <p>If you have questions regarding this Privacy Policy or your personal information, please contact:</p>
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