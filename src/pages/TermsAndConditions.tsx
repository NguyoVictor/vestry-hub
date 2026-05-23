import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Helmet } from "react-helmet-async";

const TermsAndConditions = () => {
  return (
    <>
      <Helmet>
        <title>Terms and Conditions — Vestry Hub</title>
        <meta name="description" content="Read the Terms and Conditions for using Vestry Hub, the church management platform for African churches. Governed by the laws of Kenya." />
        <link rel="canonical" href="https://vestryhub.com/terms" />
        <meta property="og:title" content="Terms and Conditions — Vestry Hub" />
        <meta property="og:description" content="Read the Terms and Conditions for using Vestry Hub, the church management platform for African churches." />
        <meta property="og:url" content="https://vestryhub.com/terms" />
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
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Terms and Conditions</h1>
            <p className="text-lg text-slate-600 mb-8">Vestry Hub — Terms and Conditions</p>
            <p className="text-sm text-slate-500 mb-12">Last updated: May 23, 2026</p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">1. Acceptance of Terms</h2>
            <p className="text-slate-700 mb-4">
              1.1 By accessing or using Vestry Hub ("the Platform", "we", "us", "our") at vestryhub.com, you agree to be bound by these Terms and Conditions ("Terms"). If you do not agree, do not use the Platform.
            </p>
            <p className="text-slate-700 mb-4">
              1.2 These Terms apply to all users including church administrators, church members, and visitors to the Platform.
            </p>
            <p className="text-slate-700 mb-6">
              1.3 By clicking "Create Account", "Sign In", or otherwise using the Platform, you confirm that you have read, understood, and agreed to these Terms.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">2. Description of Service</h2>
            <p className="text-slate-700 mb-4">
              2.1 Vestry Hub is a cloud-based church management platform that enables churches to manage members, track giving and finances, plan services, send communications, and operate a member portal.
            </p>
            <p className="text-slate-700 mb-4">
              2.2 The Platform is offered on a subscription basis. Features available to you depend on the plan your church has subscribed to.
            </p>
            <p className="text-slate-700 mb-6">
              2.3 We reserve the right to modify, suspend, or discontinue any feature of the Platform at any time with reasonable notice.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">3. Account Registration and Church Access Codes</h2>
            <p className="text-slate-700 mb-4">
              3.1 Church administrators must register an account using a valid email address and create a secure password. You are responsible for maintaining the confidentiality of your login credentials.
            </p>
            <p className="text-slate-700 mb-4">
              3.2 Upon registration, each church is assigned a unique Church Access Code. This code is used by church members to join the church's member portal. You are responsible for keeping this code secure and distributing it only to authorized members.
            </p>
            <p className="text-slate-700 mb-4">
              3.3 You must provide accurate, current, and complete information during registration. You agree to update your information if it changes.
            </p>
            <p className="text-slate-700 mb-4">
              3.4 You may not share your account credentials with others or create accounts on behalf of another person without their authorization.
            </p>
            <p className="text-slate-700 mb-6">
              3.5 We reserve the right to suspend or terminate accounts that provide false information or violate these Terms.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">4. Acceptable Use</h2>
            <p className="text-slate-700 mb-4">
              4.1 You agree to use the Platform only for lawful purposes and in a manner consistent with all applicable laws and regulations.
            </p>
            <p className="text-slate-700 mb-2">4.2 You must not:</p>
            <ul className="list-disc pl-6 mb-4 text-slate-700">
              <li>Use the Platform to harass, abuse, or harm any person</li>
              <li>Upload or transmit any malicious code, viruses, or harmful content</li>
              <li>Attempt to gain unauthorized access to any part of the Platform or its infrastructure</li>
              <li>Use the Platform to send unsolicited communications (spam)</li>
              <li>Scrape, copy, or reproduce any part of the Platform without written permission</li>
              <li>Use the Platform for any purpose other than legitimate church management</li>
            </ul>
            <p className="text-slate-700 mb-6">
              4.3 Vestry Hub reserves the right to investigate and take appropriate action against any user who violates this section, including account suspension or termination.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">5. Subscription and Payments</h2>
            <p className="text-slate-700 mb-4">
              5.1 Vestry Hub offers a free tier and paid subscription plans. Details of current plans and pricing are available at vestryhub.com.
            </p>
            <p className="text-slate-700 mb-4">
              5.2 Paid subscriptions are billed on the cycle stated at the time of purchase (monthly or annually). Fees are non-refundable except where required by applicable law.
            </p>
            <p className="text-slate-700 mb-4">
              5.3 We reserve the right to change subscription pricing with at least 30 days notice. Continued use of the Platform after a price change constitutes acceptance of the new pricing.
            </p>
            <p className="text-slate-700 mb-4">
              5.4 Failure to pay subscription fees may result in downgrade to the free tier or suspension of your account.
            </p>
            <p className="text-slate-700 mb-6">
              5.5 All prices are listed in Kenyan Shillings (KES) unless otherwise stated.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">6. M-Pesa Transactions</h2>
            <p className="text-slate-700 mb-4">
              6.1 Vestry Hub integrates with M-Pesa to facilitate giving and financial transactions within the Platform. This integration is provided by Safaricom PLC and is subject to Safaricom's own terms and conditions.
            </p>
            <p className="text-slate-700 mb-4">
              6.2 Vestry Hub does not store, process, or have access to your M-Pesa PIN, mobile money credentials, or any sensitive payment authentication data. All payment authentication is handled directly by Safaricom's secure systems.
            </p>
            <p className="text-slate-700 mb-4">
              6.3 Vestry Hub records transaction references, amounts, and timestamps for giving and financial reporting purposes only.
            </p>
            <p className="text-slate-700 mb-4">
              6.4 Vestry Hub is not liable for any failed, delayed, or disputed M-Pesa transactions. Any disputes regarding M-Pesa transactions should be directed to Safaricom customer support.
            </p>
            <p className="text-slate-700 mb-6">
              6.5 Churches are responsible for ensuring that their use of the giving features complies with applicable financial regulations in their jurisdiction.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">7. Intellectual Property</h2>
            <p className="text-slate-700 mb-4">
              7.1 All content, features, and functionality on the Platform including but not limited to software, text, graphics, logos, and design are the exclusive property of Vestry Hub and are protected by applicable intellectual property laws.
            </p>
            <p className="text-slate-700 mb-4">
              7.2 You are granted a limited, non-exclusive, non-transferable license to use the Platform for its intended purpose during your subscription period.
            </p>
            <p className="text-slate-700 mb-4">
              7.3 You retain ownership of all data you upload to the Platform including member records, financial data, and church information. By uploading data, you grant Vestry Hub a limited license to process and store that data solely for the purpose of providing the service.
            </p>
            <p className="text-slate-700 mb-6">
              7.4 You may not copy, modify, distribute, sell, or lease any part of the Platform or its content without our prior written consent.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">8. Termination</h2>
            <p className="text-slate-700 mb-4">
              8.1 You may terminate your account at any time by contacting us at victornguyodev@gmail.com or through the account settings page.
            </p>
            <p className="text-slate-700 mb-4">
              8.2 We reserve the right to suspend or terminate your account immediately and without notice if you breach these Terms, engage in fraudulent activity, or use the Platform in a manner that causes harm to others.
            </p>
            <p className="text-slate-700 mb-4">
              8.3 Upon termination, your right to access the Platform ceases immediately. We will retain your data for 30 days after termination to allow data export, after which it will be permanently deleted.
            </p>
            <p className="text-slate-700 mb-6">
              8.4 Sections 7, 9, and 10 of these Terms survive termination.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">9. Limitation of Liability</h2>
            <p className="text-slate-700 mb-4">
              9.1 To the fullest extent permitted by Kenyan law, Vestry Hub shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the Platform.
            </p>
            <p className="text-slate-700 mb-4">
              9.2 Vestry Hub's total liability to you for any claims arising from these Terms or your use of the Platform shall not exceed the amount you paid to Vestry Hub in the three months preceding the claim.
            </p>
            <p className="text-slate-700 mb-4">
              9.3 Vestry Hub does not warrant that the Platform will be uninterrupted, error-free, or free from viruses or other harmful components. We provide the Platform on an "as is" and "as available" basis.
            </p>
            <p className="text-slate-700 mb-6">
              9.4 Nothing in these Terms limits liability for death, personal injury caused by negligence, or any other liability that cannot be excluded under applicable law.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">10. Governing Law</h2>
            <p className="text-slate-700 mb-4">
              10.1 These Terms are governed by and construed in accordance with the laws of Kenya.
            </p>
            <p className="text-slate-700 mb-4">
              10.2 Any disputes arising from these Terms or your use of the Platform shall be subject to the exclusive jurisdiction of the courts of Kenya.
            </p>
            <p className="text-slate-700 mb-6">
              10.3 If any provision of these Terms is found to be unenforceable under Kenyan law, that provision shall be modified to the minimum extent necessary to make it enforceable, and the remaining provisions shall continue in full force.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">11. Changes to Terms</h2>
            <p className="text-slate-700 mb-4">
              11.1 We reserve the right to update these Terms at any time. We will notify users of significant changes via email or a prominent notice on the Platform at least 14 days before the changes take effect.
            </p>
            <p className="text-slate-700 mb-4">
              11.2 Your continued use of the Platform after changes take effect constitutes your acceptance of the updated Terms.
            </p>
            <p className="text-slate-700 mb-6">
              11.3 The latest version of these Terms is always available at vestryhub.com/terms.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">12. Contact Information</h2>
            <p className="text-slate-700 mb-2">For any questions regarding these Terms, please contact us at:</p>
            <div className="text-slate-700 mb-6">
              <p>Vestry Hub</p>
              <p>Email: victornguyodev@gmail.com</p>
              <p>Website: vestryhub.com</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TermsAndConditions;