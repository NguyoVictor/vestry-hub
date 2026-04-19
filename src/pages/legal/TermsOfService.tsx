import { LegalLayout, LegalSection } from "./LegalLayout";

export default function TermsOfService() {
  return (
    <LegalLayout
      title="Terms of Service"
      subtitle="The terms and conditions governing your use of Vestry Hub"
      updated="April 19, 2026"
    >
      <LegalSection title="1. Acceptance of Terms">
        <p>
          By accessing or using Vestry Hub ("the Platform"), you agree to be bound by these Terms of Service ("Terms"). These Terms constitute a legally binding agreement between you (the church organisation or individual user) and Victor Nguyo ("the Developer", "we", "us").
        </p>
        <p>If you do not agree to these Terms, you must not use the Platform.</p>
      </LegalSection>

      <LegalSection title="2. Description of Service">
        <p>Vestry Hub is a multi-tenant church management software platform that provides tools for:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Member management and profiles</li>
          <li>Financial management (giving records, expenses, payroll)</li>
          <li>Event and service management</li>
          <li>Communications (announcements, messaging, SMS)</li>
          <li>Attendance tracking and reporting</li>
          <li>Staff and volunteer management</li>
          <li>Analytics and reporting</li>
          <li>Member portal access</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Account Registration">
        <p><strong>3.1</strong> You must provide accurate, complete, and current information during registration. You are responsible for maintaining the confidentiality of your account credentials.</p>
        <p><strong>3.2</strong> Each church organisation is assigned a unique tenant account. You are responsible for all activity that occurs under your account.</p>
        <p><strong>3.3</strong> You must be at least 18 years old and have the authority to bind your church organisation to these Terms.</p>
        <p><strong>3.4</strong> You must notify us immediately of any unauthorised use of your account at <a href="mailto:victornguyodev@gmail.com" className="text-orange-500 hover:underline">victornguyodev@gmail.com</a>.</p>
      </LegalSection>

      <LegalSection title="4. Acceptable Use">
        <p>You agree to use Vestry Hub only for lawful purposes and in accordance with these Terms. You must not:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Use the Platform for any illegal or unauthorised purpose</li>
          <li>Upload or transmit malicious code, viruses, or harmful content</li>
          <li>Attempt to gain unauthorised access to other tenants' data</li>
          <li>Reverse engineer, decompile, or disassemble any part of the Platform</li>
          <li>Use the Platform to harass, abuse, or harm any individual</li>
          <li>Violate any applicable laws or regulations</li>
          <li>Resell or sublicense access to the Platform without written permission</li>
          <li>Use automated tools to scrape or extract data from the Platform</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Data Ownership and Responsibility">
        <p><strong>5.1</strong> You retain full ownership of all data you input into Vestry Hub, including member data, financial records, and communications.</p>
        <p><strong>5.2</strong> You are the Data Controller for all personal data of your church members. You are responsible for ensuring you have the lawful basis to collect and process member data.</p>
        <p><strong>5.3</strong> You are responsible for obtaining appropriate consent from your members for data collection and communications.</p>
        <p><strong>5.4</strong> You must not input data that you do not have the right to process or that violates any individual's privacy rights.</p>
      </LegalSection>

      <LegalSection title="6. Subscription and Payment">
        <p><strong>6.1</strong> Vestry Hub offers subscription plans as described on the Platform. Pricing is subject to change with 30 days' notice.</p>
        <p><strong>6.2</strong> Subscriptions are billed in advance on a monthly or annual basis. All fees are non-refundable except as required by law.</p>
        <p><strong>6.3</strong> Failure to pay may result in suspension or termination of your account. We will provide reasonable notice before suspension.</p>
        <p><strong>6.4</strong> A free tier is available with limited features. We reserve the right to modify free tier limitations at any time.</p>
      </LegalSection>

      <LegalSection title="7. Intellectual Property">
        <p><strong>7.1</strong> Vestry Hub and all its content, features, and functionality are owned by Victor Nguyo and are protected by copyright, trademark, and other intellectual property laws.</p>
        <p><strong>7.2</strong> You are granted a limited, non-exclusive, non-transferable licence to use the Platform for your church's internal purposes.</p>
        <p><strong>7.3</strong> You retain all intellectual property rights in the content and data you upload to the Platform.</p>
      </LegalSection>

      <LegalSection title="8. Availability and Uptime">
        <p><strong>8.1</strong> We strive to maintain 99.5% uptime but do not guarantee uninterrupted access. Scheduled maintenance will be communicated in advance where possible.</p>
        <p><strong>8.2</strong> We are not liable for any losses arising from Platform downtime, data loss, or service interruptions beyond our reasonable control.</p>
      </LegalSection>

      <LegalSection title="9. Termination">
        <p><strong>9.1</strong> You may terminate your account at any time by contacting us. Upon termination, your data will be retained for 30 days before deletion, except where legal retention requirements apply.</p>
        <p><strong>9.2</strong> We may suspend or terminate your account immediately if you breach these Terms, engage in fraudulent activity, or fail to pay subscription fees.</p>
        <p><strong>9.3</strong> Upon termination, you may request a data export within 30 days. After this period, data will be permanently deleted.</p>
      </LegalSection>

      <LegalSection title="10. Limitation of Liability">
        <p>To the maximum extent permitted by law, Vestry Hub and the Developer shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or goodwill, arising from your use of the Platform.</p>
        <p>Our total liability to you for any claims arising from these Terms shall not exceed the amount you paid us in the 12 months preceding the claim.</p>
      </LegalSection>

      <LegalSection title="11. Disclaimer of Warranties">
        <p>The Platform is provided "as is" and "as available" without warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, or non-infringement.</p>
      </LegalSection>

      <LegalSection title="12. Governing Law">
        <p>These Terms are governed by the laws of Kenya. Any disputes shall be resolved through good-faith negotiation. If unresolved, disputes shall be submitted to the courts of Kenya.</p>
      </LegalSection>

      <LegalSection title="13. Changes to Terms">
        <p>We reserve the right to modify these Terms at any time. We will notify you of material changes via email or in-app notification at least 14 days before they take effect. Continued use after changes constitutes acceptance.</p>
      </LegalSection>

      <LegalSection title="14. Contact">
        <p>For questions about these Terms:</p>
        <ul className="list-none space-y-1">
          <li>📧 <a href="mailto:victornguyodev@gmail.com" className="text-orange-500 hover:underline">victornguyodev@gmail.com</a></li>
          <li>💬 <a href="https://wa.me/254727748200" className="text-orange-500 hover:underline">WhatsApp: +254 727 748 200</a></li>
        </ul>
      </LegalSection>
    </LegalLayout>
  );
}
