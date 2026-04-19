import { LegalLayout, LegalSection } from "./LegalLayout";

export default function PrivacyPolicy() {
  return (
    <LegalLayout
      title="Privacy Policy"
      subtitle="How Vestry Hub collects, uses, and protects your personal data"
      updated="April 19, 2026"
    >
      <LegalSection title="1. Introduction">
        <p>
          Vestry Hub ("we", "our", "us") is a church management software platform operated by Victor Nguyo ("the Developer"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform at <strong>vestry.app</strong> and any associated services.
        </p>
        <p>
          By using Vestry Hub, you agree to the collection and use of information in accordance with this policy. If you do not agree, please discontinue use of the platform.
        </p>
      </LegalSection>

      <LegalSection title="2. Who We Are">
        <p><strong>Data Processor:</strong> Vestry Hub (Victor Nguyo) — processes data on behalf of churches.</p>
        <p><strong>Data Controller:</strong> Each church organisation using Vestry Hub is the Data Controller for their members' personal data.</p>
        <p><strong>Contact:</strong> <a href="mailto:victornguyodev@gmail.com" className="text-orange-500 hover:underline">victornguyodev@gmail.com</a> | <a href="https://wa.me/254727748200" className="text-orange-500 hover:underline">WhatsApp: +254 727 748 200</a></p>
      </LegalSection>

      <LegalSection title="3. Information We Collect">
        <p><strong>3.1 Information you provide directly:</strong></p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Account registration details (name, email address, password)</li>
          <li>Church profile information (church name, address, contact details, logo)</li>
          <li>Member data entered by church administrators (names, contact details, dates of birth, gender, marital status, giving records, attendance records)</li>
          <li>Financial transaction data (giving amounts, payment references)</li>
          <li>Communications content (announcements, messages, prayer requests)</li>
        </ul>
        <p><strong>3.2 Information collected automatically:</strong></p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Login events and session data</li>
          <li>Device type, browser type, and IP address</li>
          <li>Feature usage and activity logs</li>
          <li>Error reports and diagnostic data</li>
        </ul>
        <p><strong>3.3 Special category data:</strong> Religious affiliation data is considered special category data under GDPR Article 9. We process this data solely for the purpose of church administration under the religious organisation exemption (Article 9(2)(d)) and explicit consent.</p>
      </LegalSection>

      <LegalSection title="4. How We Use Your Information">
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>To provide, operate, and maintain the Vestry Hub platform</li>
          <li>To process financial transactions and generate giving records</li>
          <li>To send service-related notifications and communications</li>
          <li>To generate attendance reports and analytics for church administrators</li>
          <li>To improve platform features and user experience</li>
          <li>To comply with legal obligations (tax records, financial reporting)</li>
          <li>To detect and prevent fraud, abuse, and security incidents</li>
          <li>To respond to support requests and enquiries</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Lawful Basis for Processing">
        <p>We process personal data under the following lawful bases (GDPR Article 6):</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li><strong>Contract Performance:</strong> Processing necessary to deliver the services you have subscribed to</li>
          <li><strong>Legitimate Interests:</strong> Security monitoring, fraud prevention, platform improvement</li>
          <li><strong>Legal Obligation:</strong> Financial record retention, tax compliance</li>
          <li><strong>Consent:</strong> Marketing communications, optional features</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Data Sharing and Disclosure">
        <p>We do not sell, trade, or rent your personal data to third parties. We may share data with:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li><strong>Supabase (PostgreSQL):</strong> Database hosting and authentication — EU/US data centres with SOC 2 Type II certification</li>
          <li><strong>Resend:</strong> Transactional email delivery</li>
          <li><strong>Africa's Talking:</strong> SMS delivery (when configured by the church)</li>
          <li><strong>Sentry:</strong> Error monitoring and crash reporting</li>
          <li><strong>PostHog:</strong> Product analytics (anonymised)</li>
          <li><strong>Law enforcement:</strong> When required by applicable law or court order</li>
        </ul>
        <p>All third-party processors are bound by Data Processing Agreements and are required to maintain appropriate security standards.</p>
      </LegalSection>

      <LegalSection title="7. Data Retention">
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li><strong>Account data:</strong> Retained for the duration of the subscription plus 1 year after termination</li>
          <li><strong>Member data:</strong> Retained for the duration of membership plus 3 years</li>
          <li><strong>Financial records:</strong> Retained for 7 years per legal requirements</li>
          <li><strong>Communications data:</strong> Retained for 3 years from last interaction</li>
          <li><strong>Children's data:</strong> Retained for the duration of enrolment plus 5 years</li>
        </ul>
      </LegalSection>

      <LegalSection title="8. Your Rights">
        <p>Under GDPR and applicable data protection laws, you have the right to:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li><strong>Access:</strong> Request a copy of your personal data (Article 15)</li>
          <li><strong>Rectification:</strong> Request correction of inaccurate data (Article 16)</li>
          <li><strong>Erasure:</strong> Request deletion of your data (Article 17)</li>
          <li><strong>Restriction:</strong> Request limitation of processing (Article 18)</li>
          <li><strong>Portability:</strong> Receive your data in a machine-readable format (Article 20)</li>
          <li><strong>Object:</strong> Object to processing based on legitimate interests (Article 21)</li>
        </ul>
        <p>To exercise any of these rights, contact us at <a href="mailto:victornguyodev@gmail.com" className="text-orange-500 hover:underline">victornguyodev@gmail.com</a> with proof of identity.</p>
      </LegalSection>

      <LegalSection title="9. Security">
        <p>We implement industry-standard security measures including:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>256-bit AES encryption at rest and TLS 1.3 in transit</li>
          <li>Multi-factor authentication (MFA) support</li>
          <li>Role-based access controls (RBAC)</li>
          <li>Regular security assessments and penetration testing</li>
          <li>Automated vulnerability scanning</li>
        </ul>
        <p>In the event of a data breach affecting your rights, we will notify the relevant supervisory authority within 72 hours and affected individuals without undue delay.</p>
      </LegalSection>

      <LegalSection title="10. Cookies">
        <p>Vestry Hub uses essential cookies for authentication and session management. We do not use advertising or tracking cookies. Analytics data is collected in an anonymised form via PostHog.</p>
      </LegalSection>

      <LegalSection title="11. Children's Privacy">
        <p>Vestry Hub is not directed at children under 13. Churches may manage children's ministry records on behalf of parents/guardians who have provided explicit consent. Enhanced security measures apply to all children's data.</p>
      </LegalSection>

      <LegalSection title="12. International Transfers">
        <p>Your data may be processed in countries outside your own. We ensure appropriate safeguards are in place including Standard Contractual Clauses (SCCs) for EU/UK transfers and the International Data Transfer Agreement (IDTA) for UK transfers.</p>
      </LegalSection>

      <LegalSection title="13. Changes to This Policy">
        <p>We may update this Privacy Policy periodically. We will notify you of significant changes via email or an in-app notification. Continued use of the platform after changes constitutes acceptance of the updated policy.</p>
      </LegalSection>

      <LegalSection title="14. Contact Us">
        <p>For privacy-related enquiries:</p>
        <ul className="list-none space-y-1">
          <li>📧 <a href="mailto:victornguyodev@gmail.com" className="text-orange-500 hover:underline">victornguyodev@gmail.com</a></li>
          <li>💬 <a href="https://wa.me/254727748200" className="text-orange-500 hover:underline">WhatsApp: +254 727 748 200</a></li>
        </ul>
      </LegalSection>
    </LegalLayout>
  );
}
