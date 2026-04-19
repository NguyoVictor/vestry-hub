import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, ArrowLeft, Shield } from "lucide-react";

// ─── Shared helpers ───────────────────────────────────────────────────────────
function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="space-y-4">
      <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">{title}</h2>
      {children}
    </section>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function Check({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm text-slate-600">
      <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
      {children}
    </li>
  );
}

function Pill({ color, children }: { color: "blue" | "green" | "orange" | "purple"; children: React.ReactNode }) {
  const map = {
    blue:   "bg-blue-50 text-blue-700 border-blue-200",
    green:  "bg-emerald-50 text-emerald-700 border-emerald-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${map[color]}`}>
      {children}
    </span>
  );
}

function AccordionItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        className="w-full flex items-center justify-between py-4 text-left text-sm font-medium text-slate-800 hover:text-orange-600 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        {question}
        {open ? <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" /> : <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />}
      </button>
      <div className={`overflow-hidden transition-all duration-200 ${open ? "max-h-96 pb-4" : "max-h-0"}`}>
        <p className="text-sm text-slate-500 leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DataCompliance() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* ── Header ── */}
      <div style={{ background: "linear-gradient(135deg, #f0eeff 0%, #fff3ec 100%)" }} className="border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-lg font-bold text-slate-800">Vestry Hub</span>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-orange-500 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          </div>
          <div className="text-center space-y-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <Shield className="h-3.5 w-3.5" /> ✓ GDPR Compliant
            </span>
            <h1 className="text-3xl font-bold text-slate-800">Data Compliance & GDPR Documentation</h1>
            <p className="text-sm text-slate-500 max-w-2xl mx-auto">
              Comprehensive documentation of our compliance with UK GDPR, EU GDPR, and US data protection regulations. Your trust is our priority.
            </p>
            <p className="text-xs text-slate-400">Last updated: April 19, 2026</p>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-12">

        {/* Section 1 */}
        <Section title="🛡 Regulatory Compliance Frameworks">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* EU */}
            <Card>
              <p className="text-2xl mb-1">🇪🇺</p>
              <p className="text-sm font-bold text-slate-800 mb-3">General Data Protection Regulation (GDPR)</p>
              <ul className="space-y-1.5">
                {["Article 5 – Principles of Processing","Article 6 – Lawful Basis for Processing","Article 7 – Conditions for Consent","Articles 13-14 – Data Subject Rights","Articles 25-32 – Data Protection by Design","Articles 33-34 – Breach Notification","Articles 44-49 – International Transfers"].map(i => <Check key={i}>{i}</Check>)}
              </ul>
            </Card>
            {/* UK */}
            <Card>
              <p className="text-2xl mb-1">🇬🇧</p>
              <p className="text-sm font-bold text-slate-800 mb-3">UK GDPR & Data Protection Act 2018</p>
              <ul className="space-y-1.5">
                {["UK GDPR – Post Brexit Data Protection","Data Protection Act 2018 Compliance","ICO Guidance Adherence","UK Adequacy Decision Compliance","Standard Contractual Clauses (SCCs)","International Data Transfer Agreement (IDTA)"].map(i => <Check key={i}>{i}</Check>)}
              </ul>
            </Card>
            {/* US */}
            <Card>
              <p className="text-2xl mb-1">🇺🇸</p>
              <p className="text-sm font-bold text-slate-800 mb-3">Multi-State Privacy Compliance</p>
              <ul className="space-y-1.5">
                {["California Consumer Privacy Act (CCPA)","California Privacy Rights Act (CPRA)","Virginia Consumer Data Protection Act (VCDPA)","Colorado Privacy Act (CPA)","Connecticut Data Privacy Act (CTDPA)","Religious Organization Exemptions"].map(i => <Check key={i}>{i}</Check>)}
              </ul>
            </Card>
          </div>
        </Section>

        {/* Section 2 */}
        <Section title="👤 Data Subject Rights (GDPR Articles 12–23)">
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {["Right","Description","GDPR Article","Response Time"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ["Right to Access","Receive a copy of personal data we hold about you","Article 15","30 days"],
                  ["Right to Rectification","Request correction of inaccurate or incomplete data","Article 16","30 days"],
                  ["Right to Erasure","Request deletion of personal data (Right to be Forgotten)","Article 17","30 days"],
                  ["Right to Restrict Processing","Request limitation of how we use your data","Article 18","30 days"],
                  ["Right to Data Portability","Receive your data in a structured machine-readable format","Article 20","30 days"],
                  ["Right to Object","Object to processing based on legitimate interests","Article 21","Immediate"],
                  ["Rights Related to Automated Decision-Making","Protection against solely automated decisions with legal effects","Article 22","30 days"],
                ].map(([right, desc, article, time], i) => (
                  <tr key={right} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{right}</td>
                    <td className="px-4 py-3 text-slate-500">{desc}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{article}</td>
                    <td className="px-4 py-3">
                      <Pill color={time === "Immediate" ? "green" : "blue"}>{time}</Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 space-y-2">
            <p className="text-sm font-semibold text-blue-800">How to Exercise Your Rights</p>
            <p className="text-xs text-blue-700">To exercise any of these rights, please contact our Data Protection Officer:</p>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>Email: <a href="mailto:victornguyodev@gmail.com" className="text-orange-500 hover:underline">victornguyodev@gmail.com</a></li>
              <li>Subject Line: "Data Subject Request - [Right Type]"</li>
              <li>Required: Proof of identity (government-issued ID)</li>
            </ul>
          </div>
        </Section>

        {/* Section 3 */}
        <Section title="📋 Lawful Bases for Processing (GDPR Article 6)">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { title: "Consent", desc: "Explicit informed consent for specific processing activities", examples: ["Marketing communications","Newsletter subscriptions","Third-party data sharing"] },
              { title: "Contract Performance", desc: "Processing necessary to fulfil our service agreement", examples: ["Account management","Service delivery","Payment processing"] },
              { title: "Legal Obligation", desc: "Processing required by law or regulatory requirements", examples: ["Tax record keeping","Financial reporting","Audit compliance"] },
              { title: "Legitimate Interests", desc: "Processing for legitimate business interests, balanced against your rights", examples: ["Security monitoring","Fraud prevention","Service improvement"] },
            ].map(({ title, desc, examples }) => (
              <Card key={title}>
                <p className="text-sm font-bold text-slate-800 mb-1">{title}</p>
                <p className="text-xs text-slate-500 mb-3">{desc}</p>
                <p className="text-xs font-semibold text-slate-600 mb-1">Examples:</p>
                <ul className="space-y-0.5">
                  {examples.map(e => <li key={e} className="text-xs text-slate-500 flex items-center gap-1.5"><span className="text-orange-400">•</span>{e}</li>)}
                </ul>
              </Card>
            ))}
          </div>
        </Section>

        {/* Section 4 */}
        <Section title="🗓 Data Retention Schedule">
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {["Data Category","Examples","Retention Period","Lawful Basis"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ["Identity Data","Name, email, phone number, profile photo","Duration of account + 1 year","blue","Contract Performance"],
                  ["Church Membership Data","Membership status, groups, attendance records","Duration of membership + 3 years","blue","Contract Performance"],
                  ["Financial Data","Giving records, payment methods, transaction history","7 years (legal requirement)","orange","Legal Obligation"],
                  ["Communications Data","Email logs, notifications, communication history","3 years from last interaction","green","Legitimate Interests"],
                  ["Children's Data","CRM profiles, medical notes, authorized pickups","Duration of enrollment + 5 years","blue","Contract Performance"],
                  ["Usage Data","Login history, feature usage, error logs","3 years","green","Legitimate Interests"],
                ].map(([cat, ex, period, color, basis], i) => (
                  <tr key={cat} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{cat}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{ex}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-xs">{period}</td>
                    <td className="px-4 py-3"><Pill color={color as "blue"|"green"|"orange"|"purple"}>{basis}</Pill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </Section>

        {/* Section 5 */}
        <Section title="🔒 Security Measures (GDPR Article 32)">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: "Technical Measures", color: "text-orange-500", items: ["256-bit AES encryption at rest","TLS 1.3 encryption for data in transit","Multi-factor authentication (MFA)","Regular penetration testing","Automated vulnerability scanning","Intrusion detection systems","Database encryption and access controls","Secure key management (HSM)"] },
              { title: "Organizational Measures", color: "text-purple-500", items: ["Role-based access controls (RBAC)","Principle of least privilege","Regular security training","Background checks for personnel","Incident response procedures","Business continuity planning","Vendor security assessments","Data protection impact assessments (DPIAs)"] },
              { title: "Physical Measures", color: "text-blue-500", items: ["SOC 2 Type II certified data centers","24/7 physical security monitoring","Biometric access controls","Environmental controls","Redundant power systems","Fire suppression systems","Geographic redundancy","Disaster recovery facilities"] },
            ].map(({ title, color, items }) => (
              <Card key={title}>
                <p className={`text-sm font-bold mb-3 ${color}`}>{title}</p>
                <ul className="space-y-1.5">
                  {items.map(i => <Check key={i}>{i}</Check>)}
                </ul>
              </Card>
            ))}
          </div>
        </Section>

        {/* Section 6 */}
        <Section title="🏢 Multi-Tenant Data Isolation">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <p className="text-sm font-bold text-slate-800 mb-3">Architectural Safeguards</p>
              <div className="space-y-3">
                {[
                  { label: "Church-Level Isolation", desc: "Each church operates with its own Tenant Security ID (TSID) to prevent cross-tenant access" },
                  { label: "Branch-Level Isolation", desc: "Additional isolation by branch, all for multi-location churches" },
                  { label: "Audit Logging", desc: "All data access is logged for compliance and security review" },
                ].map(({ label, desc }) => (
                  <div key={label} className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5 shrink-0">✅</span>
                    <div><p className="text-xs font-semibold text-slate-700">{label}</p><p className="text-xs text-slate-500">{desc}</p></div>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <p className="text-sm font-bold text-slate-800 mb-3">Access Control</p>
              <div className="space-y-3">
                {[
                  { label: "Role-Based Access Control", desc: "Granular permissions for admins, pastors, deacons, and member roles" },
                  { label: "Feature-Level Permissions", desc: "Fine-tune permissions to specific features and report-specific queries" },
                  { label: "Profile Field Visibility", desc: "Configure access to sensitive member data fields" },
                  { label: "Principle of Least Privilege", desc: "Users only access data necessary for their role" },
                ].map(({ label, desc }) => (
                  <div key={label} className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5 shrink-0">✅</span>
                    <div><p className="text-xs font-semibold text-slate-700">{label}</p><p className="text-xs text-slate-500">{desc}</p></div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </Section>

        {/* Section 7 */}
        <Section title="🌍 International Data Transfers (GDPR Chapter V)">
          <div className="space-y-3">
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
              <p className="text-sm font-semibold text-blue-800 mb-1">🇺🇸 EU-US Data Transfers</p>
              <p className="text-xs text-blue-700 leading-relaxed">We utilise Standard Contractual Clauses (SCCs) approved by the European Commission for transfers to the United States, supplemented by additional technical and organisational safeguards as required by the Schrems II decision.</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-800 mb-1">🇬🇧 UK-International Access</p>
              <p className="text-xs text-slate-600 leading-relaxed">For transfers from the UK, we use the International Data Transfer Agreement (IDTA) in UK Addendum to the EU SCCs, in compliance with ICO guidance and the UK GDPR.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { title: "Transfer Impact Assessments", desc: "Regular third-party transfer risk assessments" },
              { title: "Contractual Protections", desc: "Strong agreements with all sub-processors" },
              { title: "Exemption in Transit", desc: "Data encryption across all cross-border transfers" },
              { title: "Regular Reviews", desc: "Annual assessment of transfer mechanisms" },
            ].map(({ title, desc }) => (
              <div key={title} className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                <div><p className="text-xs font-semibold text-slate-700">{title}</p><p className="text-xs text-slate-500">{desc}</p></div>
              </div>
            ))}
          </div>
        </Section>

        {/* Section 8 */}
        <Section title="⚠ Data Breach Notification (GDPR Articles 33–34)">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <span className="h-3 w-3 rounded-full bg-red-500 shrink-0" />
                <p className="text-sm font-bold text-slate-800">Supervisory Authority Notification</p>
              </div>
              <p className="text-xs font-semibold text-orange-600 mb-3">72 hours — Maximum time to notify relevant supervisory authority</p>
              <ul className="space-y-1.5">
                {["Nature of breach and categories of data affected","Approximate number of data subjects affected","Likely consequences of the breach","Containment and mitigation measures"].map(i => <Check key={i}>{i}</Check>)}
              </ul>
            </Card>
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <span className="h-3 w-3 rounded-full bg-red-500 shrink-0" />
                <p className="text-sm font-bold text-slate-800">Data Subject Notification</p>
              </div>
              <p className="text-xs font-semibold text-orange-600 mb-3">Without delay — When breach is likely to result in high risk</p>
              <ul className="space-y-1.5">
                {["Clear, plain language communication","Description of likely consequences","Steps taken and recommended actions"].map(i => <Check key={i}>{i}</Check>)}
              </ul>
            </Card>
          </div>
        </Section>

        {/* Section 9 — FAQ */}
        <Section title="❓ Frequently Asked Questions">
          <Card>
            {[
              { q: "Who is the Data Controller?", a: "Each church using Vestry Hub is the Data Controller for their members' personal data. Vestry Hub acts as a Data Processor, processing data on behalf of churches according to their instructions and our Data Processing Agreement (DPA)." },
              { q: "How do you handle special category data?", a: "Religious affiliation data is considered special category data under GDPR Article 9. We process this data based on explicit consent and the religious organization exemption (Article 9(2)(d)). Enhanced security measures are applied to all special category data." },
              { q: "What happens when I delete my account?", a: "Upon account deletion, we immediately remove access to your data. Personal data is deleted within 30 days, except where retention is required by law (e.g., financial records for 7 years). You will receive confirmation once deletion is complete." },
              { q: "Do you use automated decision-making?", a: "We do not use automated decision-making that produces legal effects or similarly significant effects on individuals (Article 22). Our AI features are used for assistance and suggestions only, with human oversight for all significant decisions." },
              { q: "How can churches request a Data Processing Agreement?", a: "A standard Data Processing Agreement (DPA) is available upon request. Contact the developer at victornguyodev@gmail.com to receive a copy. Custom DPA terms may be negotiated for Enterprise tier customers." },
              { q: "Are you certified under any privacy frameworks?", a: "Our infrastructure providers maintain SOC 2 Type II certification. We conduct annual third-party security assessments and maintain comprehensive documentation of our GDPR compliance measures. We are committed to transparency in our data protection practices." },
            ].map(({ q, a }) => <AccordionItem key={q} question={q} answer={a} />)}
          </Card>
        </Section>

        {/* Section 10 — DPO Contact */}
        <Section title="Data Protection Officer Contact">
          <p className="text-sm text-slate-500">For any questions about how we handle your data, to exercise your data subject rights, or to report a data protection concern, please contact our Data Protection Officer:</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <Card>
              <p className="text-2xl mb-2">📧</p>
              <p className="text-xs font-semibold text-slate-700 mb-1">Email</p>
              <a href="mailto:victornguyodev@gmail.com" className="text-xs text-orange-500 hover:underline break-all">victornguyodev@gmail.com</a>
              <p className="text-xs text-slate-400 mt-1">Response Time: Within 72 hours</p>
            </Card>
            <Card>
              <p className="text-2xl mb-2">💬</p>
              <p className="text-xs font-semibold text-slate-700 mb-1">WhatsApp</p>
              <a href="https://wa.me/254727748200" target="_blank" rel="noopener noreferrer" className="text-xs text-orange-500 hover:underline">+254 727 748 200</a>
              <p className="text-xs text-slate-400 mt-1">Available: Mon–Fri, 9am–6pm EAT</p>
            </Card>
            <Card>
              <p className="text-2xl mb-2">📍</p>
              <p className="text-xs font-semibold text-slate-700 mb-1">Postal Address</p>
              <p className="text-xs text-slate-500">Available on request</p>
            </Card>
          </div>
        </Section>

        {/* Section 11 — Related Documents */}
        <div className="flex flex-wrap gap-4 justify-center pt-2">
          {["🔗 Privacy Policy","🔗 Terms of Service","🔗 Data Policy"].map(label => (
            <a key={label} href="#" className="text-sm text-orange-500 hover:underline font-medium">{label}</a>
          ))}
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200 bg-slate-50 py-6 text-center space-y-1">
        <p className="text-xs text-slate-500">© {new Date().getFullYear()} Vestry Hub. All rights reserved.</p>
        <p className="text-xs text-slate-400 italic">This document is for informational purposes and does not constitute legal advice.</p>
      </footer>
    </div>
  );
}
