import { LegalLayout, LegalSection } from "./LegalLayout";

export default function DataPolicy() {
  return (
    <LegalLayout
      title="Data Policy"
      subtitle="How Vestry Hub handles, stores, and protects church and member data"
      updated="April 19, 2026"
    >
      <LegalSection title="1. Overview">
        <p>
          This Data Policy describes the technical and organisational measures Vestry Hub implements to ensure the security, integrity, and availability of all data processed on the Platform. It supplements our Privacy Policy and Terms of Service.
        </p>
        <p>
          Vestry Hub is built on a multi-tenant architecture where each church organisation ("tenant") operates in complete data isolation from all other tenants.
        </p>
      </LegalSection>

      <LegalSection title="2. Data Architecture">
        <p><strong>2.1 Multi-Tenant Isolation</strong></p>
        <p>Every piece of data in Vestry Hub is tagged with a unique <code className="bg-slate-100 px-1 rounded text-xs">tenant_id</code>. Row-Level Security (RLS) policies enforced at the database level ensure that queries can only return data belonging to the authenticated tenant. Cross-tenant data access is architecturally impossible.</p>

        <p><strong>2.2 Database Infrastructure</strong></p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Hosted on Supabase (PostgreSQL) with SOC 2 Type II certified infrastructure</li>
          <li>Automatic daily backups with point-in-time recovery</li>
          <li>Data replicated across multiple availability zones</li>
          <li>All database connections encrypted with TLS 1.3</li>
        </ul>

        <p><strong>2.3 Authentication</strong></p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Supabase Auth with JWT-based session management</li>
          <li>Passwords hashed using bcrypt with salt rounds</li>
          <li>Multi-factor authentication (MFA) available for all accounts</li>
          <li>Session tokens expire after 1 hour of inactivity</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Data Categories and Classification">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50">
                {["Category","Examples","Sensitivity","Encryption"].map(h => (
                  <th key={h} className="text-left px-3 py-2 border border-slate-200 font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Identity Data","Names, emails, phone numbers","Standard","At rest + in transit"],
                ["Financial Data","Giving records, payment references","High","At rest + in transit"],
                ["Special Category","Religious affiliation, health notes","Very High","At rest + in transit + field-level"],
                ["Children's Data","Minor profiles, medical notes","Very High","At rest + in transit + field-level"],
                ["Authentication Data","Password hashes, MFA secrets","Critical","Hashed (bcrypt) + encrypted"],
                ["Usage Data","Login events, feature usage","Low","In transit"],
              ].map(([cat, ex, sens, enc], i) => (
                <tr key={cat} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                  <td className="px-3 py-2 border border-slate-200 font-medium">{cat}</td>
                  <td className="px-3 py-2 border border-slate-200 text-slate-500">{ex}</td>
                  <td className="px-3 py-2 border border-slate-200">{sens}</td>
                  <td className="px-3 py-2 border border-slate-200 text-slate-500">{enc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </LegalSection>

      <LegalSection title="4. Access Controls">
        <p><strong>4.1 Role-Based Access Control (RBAC)</strong></p>
        <p>Vestry Hub implements granular role-based permissions. Each user is assigned a role that determines which features and data they can access:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li><strong>Super Admin:</strong> Full access to all data and settings</li>
          <li><strong>Church Admin:</strong> Full access except billing and account deletion</li>
          <li><strong>Branch Admin:</strong> Access limited to their assigned branch</li>
          <li><strong>Department Head:</strong> Access to department-specific features</li>
          <li><strong>Volunteer:</strong> Read-only access to assigned tasks and events</li>
          <li><strong>Member:</strong> Access to Member Portal only</li>
        </ul>

        <p><strong>4.2 Feature-Level Permissions</strong></p>
        <p>Administrators can configure granular permissions per role for each feature module (Full / Read Only / No Access). Individual user overrides are also supported.</p>

        <p><strong>4.3 Principle of Least Privilege</strong></p>
        <p>All users are granted the minimum level of access required for their role. Access is reviewed when roles change.</p>
      </LegalSection>

      <LegalSection title="5. Data Processing Agreements">
        <p>Vestry Hub acts as a Data Processor on behalf of each church (Data Controller). A Data Processing Agreement (DPA) is available upon request and covers:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Subject matter and duration of processing</li>
          <li>Nature and purpose of processing</li>
          <li>Type of personal data and categories of data subjects</li>
          <li>Obligations and rights of the Data Controller</li>
          <li>Sub-processor list and management</li>
          <li>Security measures and breach notification procedures</li>
          <li>Data deletion and return procedures</li>
        </ul>
        <p>To request a DPA, contact <a href="mailto:victornguyodev@gmail.com" className="text-orange-500 hover:underline">victornguyodev@gmail.com</a>.</p>
      </LegalSection>

      <LegalSection title="6. Sub-Processors">
        <p>We use the following sub-processors to deliver our services:</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50">
                {["Sub-Processor","Purpose","Location","Safeguard"].map(h => (
                  <th key={h} className="text-left px-3 py-2 border border-slate-200 font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Supabase","Database, Auth, Storage","EU/US","SCCs + DPA"],
                ["Resend","Transactional email","US","SCCs + DPA"],
                ["Africa's Talking","SMS delivery","Kenya/Africa","DPA"],
                ["Sentry","Error monitoring","US","SCCs + DPA"],
                ["PostHog","Product analytics","EU","SCCs + DPA"],
              ].map(([sp, pur, loc, safe], i) => (
                <tr key={sp} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                  <td className="px-3 py-2 border border-slate-200 font-medium">{sp}</td>
                  <td className="px-3 py-2 border border-slate-200 text-slate-500">{pur}</td>
                  <td className="px-3 py-2 border border-slate-200">{loc}</td>
                  <td className="px-3 py-2 border border-slate-200 text-slate-500">{safe}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </LegalSection>

      <LegalSection title="7. Backup and Recovery">
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Automated daily backups with 30-day retention</li>
          <li>Point-in-time recovery available for the last 7 days</li>
          <li>Backups encrypted with AES-256</li>
          <li>Recovery Time Objective (RTO): 4 hours</li>
          <li>Recovery Point Objective (RPO): 24 hours</li>
          <li>Disaster recovery tested quarterly</li>
        </ul>
      </LegalSection>

      <LegalSection title="8. Incident Response">
        <p>In the event of a security incident or data breach:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Incident is contained and assessed within 4 hours of detection</li>
          <li>Affected tenants are notified within 24 hours</li>
          <li>Supervisory authority notified within 72 hours if required by GDPR</li>
          <li>Full incident report provided within 14 days</li>
          <li>Post-incident review and remediation completed within 30 days</li>
        </ul>
      </LegalSection>

      <LegalSection title="9. Data Portability and Export">
        <p>Church administrators can request a full data export at any time. Exports include:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>All member profiles and contact information</li>
          <li>Complete giving and financial records</li>
          <li>Event and attendance history</li>
          <li>Group memberships and communications</li>
        </ul>
        <p>Data is exported in machine-readable formats (CSV, JSON) in compliance with GDPR Article 20 (Right to Data Portability). Export requests are processed within 30 days and require identity verification.</p>
      </LegalSection>

      <LegalSection title="10. Data Deletion">
        <p>Upon account termination or deletion request:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Access is revoked immediately</li>
          <li>Personal data deleted within 30 days</li>
          <li>Financial records retained for 7 years per legal requirements</li>
          <li>Backups purged within 90 days</li>
          <li>Written confirmation of deletion provided upon request</li>
        </ul>
      </LegalSection>

      <LegalSection title="11. Compliance Monitoring">
        <p>We maintain ongoing compliance through:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Annual third-party security assessments</li>
          <li>Regular review of sub-processor compliance</li>
          <li>Continuous monitoring of regulatory changes (GDPR, UK GDPR, CCPA)</li>
          <li>Staff training on data protection best practices</li>
          <li>Data Protection Impact Assessments (DPIAs) for high-risk processing</li>
        </ul>
      </LegalSection>

      <LegalSection title="12. Contact">
        <p>For data-related enquiries, DPA requests, or to report a concern:</p>
        <ul className="list-none space-y-1">
          <li>📧 <a href="mailto:victornguyodev@gmail.com" className="text-orange-500 hover:underline">victornguyodev@gmail.com</a></li>
          <li>💬 <a href="https://wa.me/254727748200" className="text-orange-500 hover:underline">WhatsApp: +254 727 748 200</a></li>
        </ul>
      </LegalSection>
    </LegalLayout>
  );
}
