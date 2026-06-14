import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { usePermissions } from '@/hooks/usePermissions';
import { useChurch } from "@/contexts/ChurchContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  ShieldCheck, Download, Eye, FileText, Users, DollarSign,
  CalendarDays, UsersRound, UserSearch, Wrench, RefreshCw,
  ExternalLink, AlertTriangle,
} from "lucide-react";

export default function Privacy() {
  const { name: churchName, userFirstName, userLastName, userEmail, tenantId } = useChurch();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('church_settings');
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const adminName = `${userFirstName ?? ""} ${userLastName ?? ""}`.trim() || "Admin";

  const handleSubmitRequest = async () => {
    if (readOnly) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("data-download-request", {
        body: {
          churchName: churchName ?? "Unknown Church",
          adminName,
          adminEmail: userEmail ?? "—",
          adminPhone: "—",
          submittedAt: new Date().toLocaleString("en-GB", { timeZone: "Africa/Nairobi" }),
        },
      });
      if (error) throw error;
      setDownloadModalOpen(false);
      toast.success("Your request has been submitted. We'll contact you personally to verify before processing. 🔒");
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed to submit request. Please contact us directly.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Helmet><title>Privacy & Data — Vestry</title></Helmet>

      <div className="max-w-2xl space-y-5">

        {/* ── Card 1: Compliance ── */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 shrink-0">
              <ShieldCheck className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Privacy & Data Compliance</p>
              <p className="text-xs text-slate-500">Manage your data in compliance with GDPR, UK GDPR, and US privacy regulations</p>
            </div>
          </div>

          {/* Compliance pills */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-emerald-500 text-sm">✅</span>
                <span className="text-xs font-semibold text-emerald-700">GDPR Compliant</span>
              </div>
              <p className="text-[10px] text-emerald-600">EU General Data Protection Regulation</p>
            </div>
            <div className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-2.5">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-purple-500 text-sm">✅</span>
                <span className="text-xs font-semibold text-purple-700">UK GDPR Compliant</span>
              </div>
              <p className="text-[10px] text-purple-600">UK Data Protection Act 2018</p>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-blue-500 text-sm">✅</span>
                <span className="text-xs font-semibold text-blue-700">US Privacy Compliant</span>
              </div>
              <p className="text-[10px] text-blue-600">CCPA, CPRA & State Laws</p>
            </div>
          </div>

          <a
            href="/data-compliance"
            className="inline-flex items-center gap-1 text-xs text-orange-500 hover:underline font-medium"
          >
            View Full Compliance Documentation
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {/* ── Card 2: Data Download ── */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 shrink-0">
              <Download className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Data Download Request (Right to Portability)</p>
              <p className="text-xs text-slate-500">Request a download of all your church data. Requires platform owner approval before processing.</p>
            </div>
          </div>

          {/* Data included */}
          <div className="rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Data included in download:</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: Users,        label: "Member profiles" },
                { icon: DollarSign,   label: "Giving records" },
                { icon: CalendarDays, label: "Events" },
                { icon: UsersRound,   label: "Groups" },
                { icon: UserSearch,   label: "Visitors" },
                { icon: Wrench,       label: "Services" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <Icon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Approval warning */}
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-700">Approval Required</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Data download requests are reviewed manually by the platform owner before processing. You will be notified once your request has been reviewed.
              </p>
            </div>
          </div>

          <Button
            className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
            onClick={() => setDownloadModalOpen(true)}
          >
            <Download className="h-4 w-4" />
            Request Data Download
          </Button>
        </div>

        {/* ── Card 3: Audit Log ── */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 shrink-0">
                <Eye className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Data Access Audit Log</p>
                <p className="text-xs text-slate-500">Track all data access and modifications for compliance purposes</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>

          {/* Empty state */}
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
            <Eye className="h-10 w-10 text-slate-200" />
            <p className="text-sm font-medium">No audit logs available</p>
            <p className="text-xs">Data access events will appear here</p>
          </div>
        </div>

        {/* ── Card 4: Data Processing Information ── */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 shrink-0">
              <FileText className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Data Processing Information</p>
            </div>
          </div>

          <div className="space-y-4 divide-y divide-slate-100 dark:divide-slate-700">
            {/* Data Controller */}
            <div className="pt-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">Data Controller</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Your church is the Data Controller for all member personal data. Vestry Hub acts as a Data Processor on your behalf.
              </p>
            </div>

            {/* Lawful Basis */}
            <div className="pt-4">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">Lawful Basis</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Data is processed under legitimate interests for church administration and consent for communications. Religious affiliation data is protected under Article 9(2)(d).
              </p>
            </div>

            {/* Data Retention */}
            <div className="pt-4">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">Data Retention</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Member data is retained for the duration of membership plus 3 years. Financial records are retained for 7 years per legal requirements.
              </p>
            </div>

            {/* Contact DPO */}
            <div className="pt-4">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">Contact Data Protection Officer</p>
              <p className="text-xs text-slate-500 mb-2">For privacy concerns or to exercise your data rights, contact:</p>
              <div className="flex flex-col gap-1.5">
                <a
                  href="mailto:victornguyodev@gmail.com"
                  className="text-xs text-orange-500 hover:underline"
                >
                  ✉️ victornguyodev@gmail.com
                </a>
                <a
                  href="https://wa.me/254727748200"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-orange-500 hover:underline"
                >
                  💬 WhatsApp: +254 727 748 200
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Data Download Confirmation Modal ── */}
      <Dialog open={downloadModalOpen} onOpenChange={v => !v && setDownloadModalOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Request Data Download</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500 leading-relaxed">
            This will submit a request to download all your church data. The request will be sent to the platform owner for approval. You will be personally contacted to verify your identity before the download is released.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setDownloadModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white"
              onClick={handleSubmitRequest}
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
