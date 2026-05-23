import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Helmet } from "react-helmet-async";

const PrivacyPolicy = () => {
  return (
    <>
      <Helmet>
        <title>Privacy Policy — Vestry Hub</title>
        <meta name="description" content="Read the Privacy Policy for Vestry Hub. We are committed to protecting your data in compliance with Kenya's Data Protection Act 2019." />
        <link rel="canonical" href="https://vestryhub.com/privacy" />
        <meta property="og:title" content="Privacy Policy — Vestry Hub" />
        <meta property="og:description" content="Read the Privacy Policy for Vestry Hub. We are committed to protecting your data in compliance with Kenya's Data Protection Act 2019." />
        <meta property="og:url" content="https://vestryhub.com/privacy" />
        <meta property="og:type" content="website" />
      </Helmet>
      
      <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="max-w-3xl mx-auto">
          {/* Back Navigation */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 mb-8 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>

          {/* Content */}
          <div className="prose prose-slate max-w-none">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
            <p className="text-lg text-slate-600 mb-8">Vestry Hub — Privacy Policy</p>
            <p className="text-sm text-slate-500 mb-12">Last updated: May 23, 2026</p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">1. Introduction</h2>
            <p className="text-slate-700 mb-4">
              1.1 Vestry Hub ("we", "us", "our") is committed to protecting your personal data. This Privacy Policy explains what data we collect, how we use it, and your rights in relation to it.
            </p>
            <p className="text-slate-700 mb-4">
              1.2 This Policy applies to all users of the Platform at vestryhub.com including church administrators, church members, and visitors.
            </p>
            <p className="text-slate-700 mb-4">
              1.3 This Policy is governed by Kenya's Data Protection Act 2019. We also apply principles aligned with the General Data Protection Regulation (GDPR) in anticipation of future global expansion.
            </p>
            <p className="text-slate-700 mb-6">
              1.4 By using the Platform, you consent to the practices described in this Policy.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">2. Data Controller Information</h2>
            <p className="text-slate-700 mb-4">
              2.1 Vestry Hub is the data controller for all personal data collected through the Platform.
            </p>
            <p className="text-slate-700 mb-4">
              2.2 Individual churches using the Platform act as data processors for the personal data of their members. Churches are responsible for ensuring they have a lawful basis for adding member data to the Platform.
            </p>
            <div className="text-slate-700 mb-6">
              <p>2.3 Contact details for the data controller:</p>
              <p>Vestry Hub</p>
              <p>Email: victornguyodev@gmail.com</p>
              <p>Website: vestryhub.com</p>
            </div>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">3. What Data We Collect</h2>
            <div className="text-slate-700 mb-4">
              <p className="font-medium">3.1 Church Administrator Data:</p>
              <ul className="list-disc pl-6 mt-2">
                <li>Full name</li>
                <li>Email address</li>
                <li>Password (stored in hashed form — we never store plain text passwords)</li>
                <li>Church organization name and details</li>
              </ul>
            </div>
            <div className="text-slate-700 mb-4">
              <p className="font-medium">3.2 Church Member Data:</p>
              <ul className="list-disc pl-6 mt-2">
                <li>Full name</li>
                <li>Email address</li>
                <li>Church Access Code used to join</li>
              </ul>
            </div>
            <div className="text-slate-700 mb-4">
              <p className="font-medium">3.3 Financial and Giving Data:</p>
              <ul className="list-disc pl-6 mt-2">
                <li>Giving records including amounts, dates, and transaction references</li>
                <li>M-Pesa transaction reference numbers (not credentials)</li>
              </ul>
            </div>
            <div className="text-slate-700 mb-4">
              <p className="font-medium">3.4 Technical and Usage Data:</p>
              <ul className="list-disc pl-6 mt-2">
                <li>Authentication logs and session data</li>
                <li>IP addresses</li>
                <li>Browser and device type</li>
                <li>Pages visited and features used within the Platform</li>
              </ul>
            </div>
            <p className="text-slate-700 mb-6">
              3.5 We do not collect sensitive personal data such as national ID numbers, biometric data, or health information.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">4. How We Use Your Data</h2>
            <p className="text-slate-700 mb-2">4.1 We use your data to:</p>
            <ul className="list-disc pl-6 mb-4 text-slate-700">
              <li>Create and manage your account</li>
              <li>Provide and improve the Platform's features</li>
              <li>Process and record giving and financial transactions</li>
              <li>Send transactional emails such as password resets, invitations, and confirmations</li>
              <li>Respond to support requests</li>
              <li>Ensure platform security and prevent fraud</li>
              <li>Comply with legal obligations under Kenyan law</li>
            </ul>
            <p className="text-slate-700 mb-4">
              4.2 We do not use your data for advertising purposes. We do not sell your data to third parties.
            </p>
            <p className="text-slate-700 mb-2">4.3 We process your data on the following lawful bases under the Kenya Data Protection Act 2019:</p>
            <ul className="list-disc pl-6 mb-6 text-slate-700">
              <li>Performance of a contract (providing the service you signed up for)</li>
              <li>Legitimate interests (platform security and improvement)</li>
              <li>Legal obligation (compliance with Kenyan law)</li>
              <li>Consent (where specifically requested)</li>
            </ul>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">5. Third Party Services</h2>
            <p className="text-slate-700 mb-4">
              <span className="font-medium">5.1 Supabase</span> We use Supabase for database storage, user authentication, and file storage. Your account credentials and platform data are stored on Supabase's infrastructure. Supabase is SOC 2 compliant. For more information visit supabase.com/privacy.
            </p>
            <p className="text-slate-700 mb-4">
              <span className="font-medium">5.2 Google OAuth</span> We offer optional sign-in via Google. If you choose this method, Google shares your name and email address with us. We do not receive your Google password. For more information visit policies.google.com/privacy.
            </p>
            <p className="text-slate-700 mb-4">
              <span className="font-medium">5.3 M-Pesa</span> We integrate with M-Pesa for giving and financial transactions. Vestry Hub does not store your M-Pesa PIN or any mobile money credentials. Only transaction reference numbers and amounts are stored for record-keeping purposes. M-Pesa is operated by Safaricom PLC. For more information visit safaricom.co.ke.
            </p>
            <p className="text-slate-700 mb-6">
              <span className="font-medium">5.4 Resend</span> We use Resend to deliver transactional emails such as password resets, invitations, and notifications. Your email address is shared with Resend solely for the purpose of delivering these emails. For more information visit resend.com/privacy.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">6. Data Sharing and Disclosure</h2>
            <p className="text-slate-700 mb-4">
              6.1 We do not sell, rent, or trade your personal data to any third party.
            </p>
            <p className="text-slate-700 mb-4">
              6.2 We may share your data with third party service providers listed in Section 5 solely to provide the Platform's functionality.
            </p>
            <p className="text-slate-700 mb-4">
              6.3 We may disclose your data if required to do so by law, court order, or government authority under Kenyan law.
            </p>
            <p className="text-slate-700 mb-4">
              6.4 Church administrators can view the data of members who have joined their church on the Platform. Members should be aware that their name and email are visible to their church admin.
            </p>
            <p className="text-slate-700 mb-6">
              6.5 In the event of a merger, acquisition, or sale of Vestry Hub, user data may be transferred as part of that transaction. We will notify users in advance of any such transfer.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">7. Data Retention</h2>
            <p className="text-slate-700 mb-4">
              7.1 We retain your personal data for as long as your account is active or as needed to provide the service.
            </p>
            <p className="text-slate-700 mb-4">
              7.2 If you delete your account, we will retain your data for 30 days to allow you to export it. After 30 days, your data is permanently and irreversibly deleted from our systems.
            </p>
            <p className="text-slate-700 mb-4">
              7.3 Financial and giving records may be retained for up to 7 years to comply with Kenyan financial record-keeping regulations, even after account deletion.
            </p>
            <p className="text-slate-700 mb-6">
              7.4 Church Data Export and Deletion: Church administrators may export all their church data including member records and financial data at any time from the Settings page. To request complete data deletion, contact us at victornguyodev@gmail.com. We will process deletion requests within 30 days.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">8. Your Rights Under the Kenya Data Protection Act 2019</h2>
            <p className="text-slate-700 mb-2">8.1 Under the Kenya Data Protection Act 2019, you have the following rights:</p>
            <ul className="list-disc pl-6 mb-4 text-slate-700">
              <li><span className="font-medium">Right of Access:</span> You have the right to request a copy of the personal data we hold about you.</li>
              <li><span className="font-medium">Right to Rectification:</span> You have the right to request correction of inaccurate or incomplete data.</li>
              <li><span className="font-medium">Right to Erasure:</span> You have the right to request deletion of your personal data subject to legal retention requirements.</li>
              <li><span className="font-medium">Right to Data Portability:</span> You have the right to receive your data in a structured, commonly used format.</li>
              <li><span className="font-medium">Right to Object:</span> You have the right to object to processing of your data where we rely on legitimate interests as our lawful basis.</li>
              <li><span className="font-medium">Right to Withdraw Consent:</span> Where processing is based on consent, you may withdraw it at any time.</li>
            </ul>
            <p className="text-slate-700 mb-4">
              8.2 To exercise any of these rights, contact us at victornguyodev@gmail.com. We will respond within 30 days.
            </p>
            <p className="text-slate-700 mb-6">
              8.3 You also have the right to lodge a complaint with the Office of the Data Protection Commissioner of Kenya at odpc.go.ke.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">9. Children and Minors</h2>
            <p className="text-slate-700 mb-4">
              9.1 The Platform is intended for use by adults aged 18 and above.
            </p>
            <p className="text-slate-700 mb-4">
              9.2 Users under the age of 18 may access the member portal only under the supervision of a church administrator or parent/guardian who takes responsibility for their use of the Platform.
            </p>
            <p className="text-slate-700 mb-6">
              9.3 We do not knowingly collect personal data from children under 13 without verifiable parental or guardian consent. If you believe we have collected data from a child under 13 without consent, contact us immediately at victornguyodev@gmail.com and we will delete it promptly.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">10. Security</h2>
            <p className="text-slate-700 mb-2">10.1 We take the security of your data seriously. We implement appropriate technical and organizational measures including:</p>
            <ul className="list-disc pl-6 mb-4 text-slate-700">
              <li>Passwords stored using industry-standard hashing via Supabase Auth</li>
              <li>Encrypted data transmission via HTTPS/TLS</li>
              <li>Role-based access controls within the Platform</li>
              <li>Regular security monitoring</li>
            </ul>
            <p className="text-slate-700 mb-6">
              10.2 No method of transmission over the internet is 100% secure. While we strive to protect your data, we cannot guarantee absolute security. In the event of a data breach that affects your rights and freedoms, we will notify affected users and the Office of the Data Protection Commissioner of Kenya as required by law.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">11. Cookies and Analytics</h2>
            <p className="text-slate-700 mb-4">
              11.1 Vestry Hub uses essential cookies to maintain your session and keep you logged in. These cookies are necessary for the Platform to function and cannot be disabled.
            </p>
            <p className="text-slate-700 mb-4">
              11.2 We may use analytics tools to understand how users interact with the Platform in aggregate. This data is anonymized and not linked to individual users.
            </p>
            <p className="text-slate-700 mb-6">
              11.3 We do not use advertising cookies or track you across other websites.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">12. Changes to This Policy</h2>
            <p className="text-slate-700 mb-4">
              12.1 We may update this Privacy Policy from time to time. We will notify you of significant changes via email or a prominent notice on the Platform at least 14 days before changes take effect.
            </p>
            <p className="text-slate-700 mb-4">
              12.2 The latest version of this Policy is always available at vestryhub.com/privacy.
            </p>
            <p className="text-slate-700 mb-6">
              12.3 Your continued use of the Platform after changes take effect constitutes acceptance of the updated Policy.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">13. Contact Information</h2>
            <p className="text-slate-700 mb-2">For any privacy-related questions, requests, or complaints, contact us at:</p>
            <div className="text-slate-700 mb-6">
              <p>Vestry Hub</p>
              <p>Email: victornguyodev@gmail.com</p>
              <p>Website: vestryhub.com</p>
              <p>Privacy Policy URL: vestryhub.com/privacy</p>
              <p>Terms URL: vestryhub.com/terms</p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
};

export default PrivacyPolicy;