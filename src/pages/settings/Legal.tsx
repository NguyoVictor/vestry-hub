import { useState, useRef, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES } from "@/lib/schema";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Eye, Download, PenLine, CheckCircle2, X } from "lucide-react";
import { format } from "date-fns";

// ─── Agreement content ────────────────────────────────────────────────────────
const AGREEMENTS = [
  {
    key: "eula",
    title: "End User License Agreement (EULA)",
    shortTitle: "EULA",
    version: "Version 1.0 • Effective Dec 11, 2025",
    content: `END USER LICENSE AGREEMENT (EULA)
Version 1.0 — Effective December 11, 2025

This End User License Agreement ("Agreement") is a legal agreement between you ("User", "You", or "Your") and Vestry Hub, operated by Victor Nguyo ("Developer", "We", "Us", or "Our"), for the use of the Vestry Hub church management software platform and related services ("Software").

BY ACCESSING OR USING THE SOFTWARE, YOU AGREE TO BE BOUND BY THIS AGREEMENT. IF YOU DO NOT AGREE, DO NOT USE THE SOFTWARE.

1. LICENSE GRANT

1.1 Subject to the terms of this Agreement, We grant You a limited, non-exclusive, non-transferable, revocable licence to access and use the Software solely for Your church's internal administrative operations.

1.2 This licence does not include the right to: (a) sublicence, sell, resell, or transfer the Software; (b) modify, adapt, or create derivative works; (c) reverse engineer, decompile, or disassemble the Software; (d) use the Software for any unlawful purpose; (e) access the Software to build a competing product.

1.3 The licence is granted per church organisation (tenant). Each tenant operates in complete data isolation from all other tenants.

2. SUBSCRIPTION AND PAYMENT

2.1 Access to the Software requires a valid subscription. Subscription fees are billed in advance on a monthly or annual basis as selected at registration.

2.2 All fees are non-refundable except as required by applicable law or as expressly stated in our refund policy.

2.3 We reserve the right to modify pricing with 30 days' written notice. Continued use after the effective date constitutes acceptance of the new pricing.

2.4 Failure to pay subscription fees may result in suspension of access. We will provide reasonable notice before suspension.

3. DATA OWNERSHIP AND PRIVACY

3.1 You retain full ownership of all data you input into the Software, including member data, financial records, and communications.

3.2 You are the Data Controller for all personal data of your church members. We act as Data Processor on your behalf in accordance with our Privacy Policy and Data Processing Agreement.

3.3 We will not sell, share, or use your church's data for any purpose other than providing the Software services.

3.4 Upon termination, you may request a full data export within 30 days. After this period, data will be permanently deleted.

4. INTELLECTUAL PROPERTY

4.1 The Software, including all content, features, and functionality, is owned by Victor Nguyo and protected by copyright, trademark, and other intellectual property laws.

4.2 You retain all intellectual property rights in the content and data you upload to the Software.

4.3 You grant Us a limited licence to process your data solely for the purpose of providing the Software services.

5. ACCEPTABLE USE

5.1 You agree to use the Software only for lawful purposes and in accordance with this Agreement.

5.2 You must not: (a) use the Software to harass, abuse, or harm any individual; (b) upload malicious code or harmful content; (c) attempt to gain unauthorised access to other tenants' data; (d) use automated tools to scrape or extract data.

6. DISCLAIMERS AND LIMITATION OF LIABILITY

6.1 THE SOFTWARE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED.

6.2 TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING FROM YOUR USE OF THE SOFTWARE.

6.3 Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim.

7. TERMINATION

7.1 This Agreement is effective until terminated. You may terminate by discontinuing use and closing your account.

7.2 We may terminate this Agreement immediately if you breach any of its terms.

7.3 Upon termination, all licences granted herein immediately cease.

8. GOVERNING LAW

8.1 This Agreement is governed by the laws of Kenya. Any disputes shall be resolved through good-faith negotiation, and if unresolved, through the courts of Kenya.

9. CHANGES TO THIS AGREEMENT

9.1 We reserve the right to modify this Agreement at any time. We will notify you of material changes at least 14 days before they take effect. Continued use constitutes acceptance.

10. CONTACT

For questions about this Agreement: victornguyodev@gmail.com | WhatsApp: +254 727 748 200`,
  },
  {
    key: "msa",
    title: "Master Subscription Agreement (MSA)",
    shortTitle: "MSA",
    version: "Version 1.0 • Effective Dec 11, 2025",
    content: `MASTER SUBSCRIPTION AGREEMENT (MSA)
Version 1.0 — Effective December 11, 2025

This Master Subscription Agreement ("Agreement") governs the relationship between Vestry Hub (operated by Victor Nguyo, "Provider") and the church organisation ("Customer") subscribing to the Vestry Hub platform ("Service").

1. DEFINITIONS

1.1 "Service" means the Vestry Hub cloud-based church management software platform, including all features, modules, and updates.

1.2 "Customer Data" means all data submitted by Customer or its users to the Service.

1.3 "Subscription Term" means the period for which Customer has paid for access to the Service.

1.4 "Authorised Users" means individuals authorised by Customer to access the Service under Customer's account.

1.5 "Tenant" means Customer's isolated instance within the multi-tenant Service architecture.

2. SUBSCRIPTION AND ACCESS

2.1 Provider grants Customer a non-exclusive, non-transferable right to access and use the Service during the Subscription Term, subject to the terms of this Agreement.

2.2 Customer is responsible for all activities conducted under its account and for ensuring Authorised Users comply with this Agreement.

2.3 Customer shall not: (a) allow access by more users than permitted under the subscription plan; (b) share login credentials between multiple individuals; (c) use the Service for any purpose other than internal church administration.

3. FEES AND PAYMENT

3.1 Customer agrees to pay all fees specified in the applicable subscription plan. Fees are due in advance and non-refundable except as required by law.

3.2 Provider reserves the right to change fees upon 30 days' written notice. If Customer does not agree to the new fees, Customer may terminate the Agreement before the new fees take effect.

3.3 Overdue payments may result in suspension of access. Provider will provide 7 days' notice before suspension.

3.4 All fees are exclusive of applicable taxes. Customer is responsible for all taxes arising from this Agreement.

4. SERVICE LEVELS AND SUPPORT

4.1 Provider will use commercially reasonable efforts to make the Service available 99.5% of the time, excluding scheduled maintenance and circumstances beyond Provider's reasonable control.

4.2 Provider will provide email and WhatsApp support during business hours (Monday–Friday, 9am–6pm EAT).

4.3 Provider will notify Customer of scheduled maintenance at least 24 hours in advance where possible.

5. DATA PROTECTION AND SECURITY

5.1 Customer is the Data Controller for all Customer Data. Provider acts as Data Processor on Customer's behalf.

5.2 Provider will implement and maintain appropriate technical and organisational security measures to protect Customer Data, including 256-bit AES encryption at rest and TLS 1.3 in transit.

5.3 Provider will notify Customer of any confirmed data breach affecting Customer Data within 72 hours of discovery.

5.4 Provider will not access Customer Data except as necessary to provide the Service or as required by law.

5.5 A Data Processing Agreement (DPA) is available upon request and is incorporated into this Agreement by reference.

6. CONFIDENTIALITY

6.1 Each party agrees to keep confidential all non-public information disclosed by the other party and to use such information only for the purposes of this Agreement.

6.2 Confidentiality obligations do not apply to information that: (a) is or becomes publicly available; (b) was already known to the receiving party; (c) is required to be disclosed by law.

7. INTELLECTUAL PROPERTY

7.1 Provider retains all intellectual property rights in the Service. Customer retains all intellectual property rights in Customer Data.

7.2 Customer grants Provider a limited licence to process Customer Data solely to provide the Service.

8. WARRANTIES AND DISCLAIMERS

8.1 Provider warrants that the Service will perform materially in accordance with its documentation during the Subscription Term.

8.2 EXCEPT AS EXPRESSLY SET FORTH HEREIN, THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND.

9. LIMITATION OF LIABILITY

9.1 NEITHER PARTY SHALL BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES.

9.2 Provider's total liability shall not exceed the fees paid by Customer in the 12 months preceding the claim.

10. TERM AND TERMINATION

10.1 This Agreement commences on the date Customer first accesses the Service and continues until terminated.

10.2 Either party may terminate this Agreement with 30 days' written notice.

10.3 Provider may terminate immediately upon Customer's material breach of this Agreement.

10.4 Upon termination, Customer's access will be revoked and Customer Data will be retained for 30 days before deletion.

11. GENERAL

11.1 This Agreement constitutes the entire agreement between the parties regarding its subject matter.

11.2 This Agreement is governed by the laws of Kenya.

11.3 If any provision is found unenforceable, the remaining provisions continue in full force.

12. CONTACT

Provider: Victor Nguyo | victornguyodev@gmail.com | WhatsApp: +254 727 748 200`,
  },
  {
    key: "saas",
    title: "SaaS Licensing & Subscription Agreement",
    shortTitle: "SaaS Agreement",
    version: "Version 1.0 • Effective Dec 11, 2025",
    content: `SAAS LICENSING & SUBSCRIPTION AGREEMENT
Version 1.0 — Effective December 11, 2025

This SaaS Licensing & Subscription Agreement ("Agreement") is entered into between Vestry Hub (operated by Victor Nguyo, "Licensor") and the subscribing church organisation ("Licensee") for access to the Vestry Hub software-as-a-service platform.

1. SAAS LICENCE

1.1 Licensor grants Licensee a non-exclusive, non-transferable, subscription-based licence to access and use the Vestry Hub platform ("Platform") via the internet during the Subscription Term.

1.2 The Platform includes the following modules (subject to subscription plan): Member Management, Financial Management, Events & Services, Communications, Attendance Tracking, Staff & Volunteer Management, Analytics & Reporting, Member Portal, and all future updates and enhancements.

1.3 The licence is limited to Licensee's internal church administration purposes. Commercial resale or sublicensing is strictly prohibited.

2. SUBSCRIPTION TIERS

2.1 Free Tier: Access to core features with member limits as specified on the Platform. No payment required.

2.2 Standard Tier: Full access to all standard modules for churches up to the specified member limit. Billed monthly or annually.

2.3 Enterprise Tier: Full access to all modules including advanced analytics, multi-branch management, custom integrations, and priority support. Custom pricing available.

2.4 Licensor reserves the right to modify tier features and limits with 30 days' notice.

3. MULTI-TENANT ARCHITECTURE

3.1 The Platform operates on a multi-tenant architecture. Each Licensee is assigned a unique Tenant ID that ensures complete data isolation from all other tenants.

3.2 Licensor implements Row-Level Security (RLS) at the database level to prevent cross-tenant data access.

3.3 Licensee acknowledges that the Platform is shared infrastructure and agrees not to attempt to access other tenants' data.

4. PLATFORM UPDATES AND MODIFICATIONS

4.1 Licensor may update, modify, or enhance the Platform at any time. Licensor will use reasonable efforts to notify Licensee of significant changes.

4.2 Licensor may discontinue features with 60 days' notice. Critical features will not be discontinued without reasonable alternatives being provided.

4.3 Licensee acknowledges that the Platform is continuously developed and new features may be added to higher subscription tiers.

5. INTEGRATIONS AND THIRD-PARTY SERVICES

5.1 The Platform integrates with third-party services including but not limited to: Supabase (database), Resend (email), Africa's Talking (SMS), Sentry (error monitoring), and PostHog (analytics).

5.2 Licensee's use of integrated third-party services is subject to those services' own terms and conditions.

5.3 Licensor is not responsible for the availability or performance of third-party services.

6. DATA PROCESSING AND GDPR COMPLIANCE

6.1 Licensor processes Licensee's data as a Data Processor under GDPR, UK GDPR, and applicable data protection laws.

6.2 Licensor maintains compliance with EU GDPR, UK GDPR, and US privacy regulations (CCPA, CPRA) as documented in the Platform's Privacy Policy and Data Compliance documentation.

6.3 Licensor will process Licensee's data only in accordance with Licensee's documented instructions and applicable law.

6.4 Licensor will implement appropriate technical and organisational measures to ensure data security, including encryption, access controls, and regular security assessments.

7. MEMBER PORTAL AND SELF-REGISTRATION

7.1 The Platform includes a Member Portal feature that allows church members to access their own data, submit requests, and interact with church communications.

7.2 Licensee is responsible for obtaining appropriate consent from members before enabling Member Portal access.

7.3 The self-registration feature allows members to register via a unique church link. Licensee controls whether this feature is enabled.

8. FINANCIAL FEATURES AND PAYMENT PROCESSING

8.1 The Platform includes giving management, expense tracking, payroll, and financial reporting features.

8.2 Online payment processing is facilitated through integrated payment gateways (PesaPal, IntaSend). Licensor is not a payment processor and is not responsible for payment gateway failures.

8.3 Licensee is responsible for compliance with applicable financial regulations, tax laws, and reporting requirements in their jurisdiction.

9. INTELLECTUAL PROPERTY AND BRANDING

9.1 All intellectual property rights in the Platform belong to Victor Nguyo. Licensee receives only the limited licence described herein.

9.2 Licensee may not remove or alter any branding, copyright notices, or proprietary markings from the Platform.

9.3 Licensor may use Licensee's church name and logo solely for the purpose of providing the Service (e.g., displaying the church name within the Platform).

10. SERVICE AVAILABILITY AND SLA

10.1 Licensor targets 99.5% monthly uptime for the Platform, excluding scheduled maintenance windows.

10.2 Scheduled maintenance will be communicated at least 24 hours in advance via in-app notification or email.

10.3 In the event of unplanned downtime exceeding 4 hours, Licensor will provide a status update within 2 hours of detection.

11. SUPPORT AND TRAINING

11.1 Licensor provides support via email (victornguyodev@gmail.com) and WhatsApp (+254 727 748 200) during business hours (Monday–Friday, 9am–6pm EAT).

11.2 Documentation and user guides are available within the Platform.

11.3 Enterprise tier customers are entitled to priority support with a 4-hour response time SLA.

12. TERMINATION AND DATA EXPORT

12.1 Either party may terminate this Agreement with 30 days' written notice.

12.2 Upon termination, Licensee may request a full data export in CSV/JSON format within 30 days.

12.3 After the 30-day export window, all Licensee data will be permanently deleted from the Platform.

12.4 Financial records required by law will be retained for the legally mandated period.

13. GOVERNING LAW AND DISPUTE RESOLUTION

13.1 This Agreement is governed by the laws of Kenya.

13.2 Disputes shall first be addressed through good-faith negotiation. If unresolved within 30 days, disputes shall be submitted to binding arbitration in Nairobi, Kenya.

14. ENTIRE AGREEMENT

14.1 This Agreement, together with the Privacy Policy, Data Policy, and EULA, constitutes the entire agreement between the parties regarding the Platform.

14.2 This Agreement supersedes all prior agreements, representations, and understandings.

15. CONTACT

Licensor: Victor Nguyo | victornguyodev@gmail.com | WhatsApp: +254 727 748 200`,
  },
] as const;

type AgreementKey = typeof AGREEMENTS[number]["key"];

interface Signature {
  id: string;
  agreement_key: string;
  signer_name: string;
  signer_title: string;
  signer_email: string;
  signed_at: string;
}

// ─── View Modal ───────────────────────────────────────────────────────────────
function ViewModal({ agreement, onClose }: { agreement: typeof AGREEMENTS[number] | null; onClose: () => void }) {
  if (!agreement) return null;
  return (
    <Dialog open={!!agreement} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0">
        <div className="flex items-start justify-between p-6 pb-3 border-b border-slate-100">
          <div>
            <DialogTitle className="text-lg font-bold text-slate-800">{agreement.title}</DialogTitle>
            <p className="text-xs text-slate-400 mt-0.5">{agreement.version.replace("Dec 11, 2025", "December 11, 2025")}</p>
          </div>
          <button onClick={onClose} className="rounded-full border border-slate-200 p-1.5 text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors ml-4 shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <pre className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap font-sans">{agreement.content}</pre>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sign Modal ───────────────────────────────────────────────────────────────
function SignModal({
  agreement, onClose, onSigned, tenantId, churchName, defaultEmail,
}: {
  agreement: typeof AGREEMENTS[number] | null;
  onClose: () => void;
  onSigned: (key: AgreementKey) => void;
  tenantId: string;
  churchName: string;
  defaultEmail: string;
}) {
  const [signerName, setSignerName] = useState("");
  const [signerTitle, setSignerTitle] = useState("");
  const [email, setEmail] = useState(defaultEmail);
  const [sigTab, setSigTab] = useState<"type" | "draw">("type");
  const [typedSig, setTypedSig] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const signatureDate = format(new Date(), "MMMM d, yyyy 'at' h:mm a");

  // Canvas drawing
  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDraw = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const sigValid = sigTab === "type" ? typedSig.trim().length > 0 : hasDrawn;
  const canSubmit = signerName.trim() && signerTitle.trim() && email.trim() && sigValid && confirmed;

  const handleSubmit = async () => {
    if (!agreement || !canSubmit) return;
    setSubmitting(true);
    try {
      let sigData = typedSig.trim();
      if (sigTab === "draw" && canvasRef.current) {
        sigData = canvasRef.current.toDataURL("image/png");
      }
      const { error } = await supabase.from(TABLES.LEGAL_SIGNATURES).upsert({
        tenant_id: tenantId,
        agreement_key: agreement.key,
        agreement_name: agreement.title,
        signer_name: signerName.trim(),
        signer_title: signerTitle.trim(),
        signer_email: email.trim(),
        signature_data: sigData,
        signature_type: sigTab,
        signed_at: new Date().toISOString(),
      } as never, { onConflict: "tenant_id,agreement_key" });
      if (error) throw error;

      // Send notification email
      await supabase.functions.invoke("legal-signature-notify", {
        body: {
          agreementName: agreement.title,
          churchName,
          signerName: signerName.trim(),
          signerTitle: signerTitle.trim(),
          signerEmail: email.trim(),
          signedAt: new Date().toLocaleString("en-GB", { timeZone: "Africa/Nairobi" }),
          ipAddress: null,
        },
      });

      toast.success("✅ Agreement signed successfully. Your signature has been recorded.");
      onSigned(agreement.key as AgreementKey);
      onClose();
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed to submit signature.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!agreement) return null;

  return (
    <Dialog open={!!agreement} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-3 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 shrink-0">
              <PenLine className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-800">Digitally Sign {agreement.title}</DialogTitle>
              <p className="text-xs text-slate-400 mt-0.5">Review the agreement, fill in your details, and provide your digital signature below</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 ml-4 shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Agreement preview */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 max-h-48 overflow-y-auto">
            <pre className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap font-sans">{agreement.content.substring(0, 800)}...</pre>
          </div>

          {/* Signer details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Full Legal Name <span className="text-red-500">*</span></Label>
              <Input placeholder="John Smith" value={signerName} onChange={e => setSignerName(e.target.value)} className="focus:ring-orange-400 focus:border-orange-400" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Title / Position <span className="text-red-500">*</span></Label>
              <Input placeholder="Senior Pastor / Church Administrator" value={signerTitle} onChange={e => setSignerTitle(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Email Address <span className="text-red-500">*</span></Label>
            <Input type="email" placeholder="john@example.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 flex items-center gap-2">
            <span className="text-slate-400 text-sm">📅</span>
            <div>
              <p className="text-xs text-slate-400">Signature Date</p>
              <p className="text-sm font-medium text-slate-700">{signatureDate}</p>
            </div>
          </div>

          {/* Signature */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Digital Signature <span className="text-red-500">*</span></Label>
            <div className="flex rounded-lg border border-slate-200 overflow-hidden">
              {(["type", "draw"] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setSigTab(tab)}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${sigTab === tab ? "bg-white text-slate-800 shadow-sm" : "bg-slate-50 text-slate-500 hover:bg-slate-100"}`}
                >
                  {tab === "type" ? "✏ Type Signature" : "✍ Draw Signature"}
                </button>
              ))}
            </div>

            {sigTab === "type" ? (
              <div className="space-y-1">
                <input
                  type="text"
                  placeholder="Type your full name here"
                  value={typedSig}
                  onChange={e => setTypedSig(e.target.value)}
                  className="w-full rounded-lg border-2 border-dashed border-orange-300 bg-amber-50 px-4 py-4 text-center text-xl text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-orange-400"
                  style={{ fontFamily: "'Dancing Script', cursive" }}
                />
                <p className="text-xs text-slate-400 text-center">Type your full legal name exactly as entered above to create your digital signature</p>
              </div>
            ) : (
              <div className="space-y-2">
                <canvas
                  ref={canvasRef}
                  width={560}
                  height={150}
                  className="w-full rounded-lg border-2 border-dashed border-orange-300 bg-amber-50 cursor-crosshair touch-none"
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={stopDraw}
                  onMouseLeave={stopDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={stopDraw}
                />
                <button type="button" onClick={clearCanvas} className="text-xs text-slate-400 hover:text-slate-600 underline">Clear</button>
              </div>
            )}
          </div>

          {/* Confirmation */}
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => setConfirmed(c => !c)}
              className={`mt-0.5 h-5 w-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${confirmed ? "border-orange-500 bg-orange-500" : "border-slate-300"}`}
            >
              {confirmed && <div className="h-2 w-2 rounded-full bg-white" />}
            </button>
            <p className="text-xs text-slate-600 leading-relaxed">
              I confirm that I have read, understood, and agree to be bound by the terms and conditions of this <strong>{agreement.title}</strong>. I represent that I have the authority to sign on behalf of my church/organisation. I understand that this digital signature is legally binding and the signed document will be transmitted to Vestry Hub and cannot be edited or revoked.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-6 py-4 space-y-3">
          <p className="text-xs text-slate-400 text-center">By clicking 'Sign & Submit', your signature will be recorded with timestamp and IP address for verification purposes.</p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button
              className={`gap-2 ${canSubmit ? "bg-orange-500 hover:bg-orange-600 text-white" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
            >
              {submitting ? "Signing..." : "Sign & Submit"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function LegalPage() {
  const { tenantId, name: churchName, userEmail, userFirstName, userLastName } = useChurch();
  const qc = useQueryClient();
  const [viewAgreement, setViewAgreement] = useState<typeof AGREEMENTS[number] | null>(null);
  const [signAgreement, setSignAgreement] = useState<typeof AGREEMENTS[number] | null>(null);

  const { data: signatures = [] } = useQuery<Signature[]>({
    queryKey: ["legal-signatures", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.LEGAL_SIGNATURES)
        .select("id, agreement_key, signer_name, signer_title, signer_email, signed_at")
        .eq("tenant_id", tenantId);
      if (error) throw error;
      return (data ?? []) as Signature[];
    },
    staleTime: 60_000,
  });

  const signedKeys = new Set(signatures.map(s => s.agreement_key));
  const allSigned = AGREEMENTS.every(a => signedKeys.has(a.key));

  const handleSigned = (key: AgreementKey) => {
    qc.invalidateQueries({ queryKey: ["legal-signatures", tenantId] });
    setSignAgreement(null);
  };

  const handleDownload = async (agreement: typeof AGREEMENTS[number]) => {
    toast.info("📄 Downloading PDF...");
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const margin = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const maxWidth = pageWidth - margin * 2;

      // Header
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text("Vestry Hub", margin, 15);
      doc.text(churchName ?? "", pageWidth - margin, 15, { align: "right" });
      doc.setDrawColor(220);
      doc.line(margin, 18, pageWidth - margin, 18);

      // Title
      doc.setFontSize(16);
      doc.setTextColor(30);
      doc.setFont("helvetica", "bold");
      doc.text(agreement.title, margin, 30);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120);
      doc.text(agreement.version.replace("Dec 11, 2025", "December 11, 2025"), margin, 37);

      // Content
      doc.setFontSize(9);
      doc.setTextColor(50);
      const lines = doc.splitTextToSize(agreement.content, maxWidth);
      let y = 48;
      for (const line of lines) {
        if (y > 275) {
          doc.addPage();
          y = 20;
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text("Vestry Hub — Confidential", margin, 10);
          doc.setFontSize(9);
          doc.setTextColor(50);
        }
        doc.text(line, margin, y);
        y += 4.5;
      }

      // Signature block if signed
      const sig = signatures.find(s => s.agreement_key === agreement.key);
      if (sig) {
        doc.addPage();
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30);
        doc.text("DIGITAL SIGNATURE RECORD", margin, 30);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80);
        const sigLines = [
          `Agreement: ${agreement.title}`,
          `Signed By: ${sig.signer_name}`,
          `Title: ${sig.signer_title}`,
          `Email: ${sig.signer_email}`,
          `Signed At: ${new Date(sig.signed_at).toLocaleString("en-GB")}`,
          `Church: ${churchName}`,
        ];
        sigLines.forEach((l, i) => doc.text(l, margin, 42 + i * 8));
      }

      doc.save(`Vestry Hub - ${agreement.shortTitle} - ${churchName ?? "Church"}.pdf`);
    } catch (err) {
      toast.error("Failed to generate PDF.");
    }
  };

  return (
    <>
      <Helmet><title>Legal — Vestry</title></Helmet>
      {/* Dancing Script for typed signatures */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&display=swap" />

      <div className="max-w-3xl">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-4">
          {/* Card header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 shrink-0">
                <FileText className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Legal Agreements</p>
                <p className="text-xs text-slate-500">Review and digitally sign the required legal agreements for your church</p>
              </div>
            </div>
            {/* Status pill */}
            {allSigned ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 shrink-0">
                <CheckCircle2 className="h-3.5 w-3.5" /> All Signed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600 shrink-0">
                ⏳ Pending Signatures
              </span>
            )}
          </div>

          {/* Agreement rows */}
          <div className="space-y-3">
            {AGREEMENTS.map(agreement => {
              const isSigned = signedKeys.has(agreement.key);
              const sig = signatures.find(s => s.agreement_key === agreement.key);
              return (
                <div
                  key={agreement.key}
                  className={`rounded-xl border p-4 flex items-center justify-between gap-4 transition-colors ${
                    isSigned
                      ? "border-l-4 border-l-emerald-400 border-slate-200 bg-emerald-50/20 dark:bg-emerald-900/10"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 shrink-0">
                      <FileText className="h-4 w-4 text-orange-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{agreement.title}</p>
                      <p className="text-xs text-slate-400">{agreement.version}</p>
                      {isSigned && sig && (
                        <p className="text-xs text-emerald-600 mt-0.5">
                          Signed by {sig.signer_name} on {format(new Date(sig.signed_at), "MMM d, yyyy")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setViewAgreement(agreement)}>
                      <Eye className="h-3.5 w-3.5" /> View
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => handleDownload(agreement)}>
                      <Download className="h-3.5 w-3.5" /> Download
                    </Button>
                    {isSigned ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Read & Signed
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5 text-xs"
                        onClick={() => setSignAgreement(agreement)}
                      >
                        <PenLine className="h-3.5 w-3.5" /> Sign Digitally
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <ViewModal agreement={viewAgreement} onClose={() => setViewAgreement(null)} />
      <SignModal
        agreement={signAgreement}
        onClose={() => setSignAgreement(null)}
        onSigned={handleSigned}
        tenantId={tenantId}
        churchName={churchName ?? ""}
        defaultEmail={userEmail ?? ""}
      />
    </>
  );
}
