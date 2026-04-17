import { useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES, COLS } from "@/lib/schema";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download, Copy, ArrowLeft, QrCode, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

const BASE_URL = import.meta.env.VITE_BASE_URL || "https://www.churchcentralcloud.com";

// ─── QR Card ──────────────────────────────────────────────────────────────────
function QRCard({ id, title, description, url }: { id: string; title: string; description: string; url: string | null }) {
  const qrRef = useRef<SVGSVGElement>(null);
  const [expanded, setExpanded] = useState(false);

  function copyLink() {
    if (!url) return;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  }

  function downloadQR() {
    if (!qrRef.current || !url) return;
    const svg = new XMLSerializer().serializeToString(qrRef.current);
    const canvas = document.createElement("canvas");
    canvas.width = 300; canvas.height = 300;
    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, 300, 300);
      ctx.drawImage(img, 0, 0, 300, 300);
      const a = document.createElement("a");
      a.download = `${id}-qr.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));
  }

  return (
    <div className="flex items-center justify-between py-3 px-1">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="h-8 w-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
          <QrCode className="h-4 w-4 text-orange-500" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{title}</p>
          <p className="text-xs text-slate-500 truncate">{description}</p>
        </div>
      </div>

      {url ? (
        <div className="flex items-center gap-2 shrink-0 ml-4">
          {/* Hidden QR for download */}
          <div className="hidden" id={`qr-${id}`}>
            <QRCodeSVG ref={qrRef} value={url} size={280} level="H" includeMargin />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setExpanded(e => !e)}
          >
            <QrCode className="h-3.5 w-3.5" />
            {title.split(" ")[0]} QR
          </Button>
        </div>
      ) : (
        <span className="text-xs text-slate-400 italic ml-4">Not configured</span>
      )}

      {/* Expanded QR panel */}
      {expanded && url && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setExpanded(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-slate-100">{title}</h3>
              <button onClick={() => setExpanded(false)} className="text-slate-400 hover:text-slate-600 transition-colors">✕</button>
            </div>
            <div className="flex flex-col items-center p-4 bg-white rounded-xl border border-slate-200">
              <QRCodeSVG ref={qrRef} value={url} size={200} level="H" includeMargin />
              <p className="text-xs text-slate-500 mt-2 text-center">{description}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Submission Link</p>
              <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-900">
                <span className="flex-1 text-xs font-mono text-slate-600 dark:text-slate-400 truncate">{url}</span>
                <button onClick={copyLink} className="text-slate-400 hover:text-slate-600 transition-colors shrink-0">
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={downloadQR}>
                <Download className="h-3.5 w-3.5" /> Download QR
              </Button>
              <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={copyLink}>
                <Copy className="h-3.5 w-3.5" /> Copy Link
              </Button>
            </div>
            <p className="text-xs text-slate-400 text-center">Share this link or QR code with members and visitors to collect testimonies.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────
function QRSection({ title, subtitle, items }: {
  title: string;
  subtitle: string;
  items: { id: string; title: string; description: string; url: string | null }[];
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
      <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-0.5">{title}</h3>
      <p className="text-xs text-slate-500 mb-3">{subtitle}</p>
      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {items.map(item => <QRCard key={item.id} {...item} />)}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function QRCodes() {
  const { tenantId } = useChurch();
  const navigate = useNavigate();

  const { data: tenant } = useQuery({
    queryKey: ["tenant-settings", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.TENANTS).select("*").eq(COLS.ID, tenantId).single();
      return data;
    },
    enabled: !!tenantId,
    staleTime: 60000,
  });

  const slug = tenant?.slug || tenantId;
  const churchCode = tenant?.church_code || "";
  const appSlug = (tenant as any)?.app_slug || slug;
  const websiteUrl = tenant?.website_url;

  const SECTIONS = [
    {
      title: "General Access",
      subtitle: "Publicly-facing pages for visitors and members",
      items: [
        { id: "church-page",    title: "Church Page",          description: "Main public page with church information",  url: `${BASE_URL}/church/${slug}` },
        { id: "member-reg",     title: "Member Registration",  description: "Allow visitors to sign up as new members",   url: `${BASE_URL}/member/join?code=${churchCode}` },
        { id: "member-app",     title: "Member App",           description: "Direct link to the member app",             url: `${BASE_URL}/app/${appSlug}` },
      ],
    },
    {
      title: "Giving & Finance",
      subtitle: "Donation and giving links",
      items: [
        { id: "online-giving",  title: "Online Giving",        description: "Allow members to give tithes and offerings", url: `${BASE_URL}/give/${slug}` },
        { id: "record-giving",  title: "Record Giving",        description: "Record cash, cheque, and manual giving entries", url: `${BASE_URL}/member/giving?code=${churchCode}` },
        { id: "expense-req",    title: "Expense Requisition",  description: "Members can submit expense requests for approval", url: `${BASE_URL}/member/expenses?code=${churchCode}` },
      ],
    },
    {
      title: "Events & Services",
      subtitle: "Event registration and service information",
      items: [
        { id: "events-page",    title: "Events Page",          description: "View and register for upcoming events",      url: `${BASE_URL}/member/events?code=${churchCode}` },
        { id: "live-stream",    title: "Live Stream",          description: "Watch live church services",                 url: `${BASE_URL}/member/live?code=${churchCode}` },
        { id: "sermons",        title: "Sermons",              description: "Access sermon library and recordings",       url: `${BASE_URL}/member/sermons?code=${churchCode}` },
      ],
    },
    {
      title: "Ministry & Volunteering",
      subtitle: "Volunteer and ministry sign-ups",
      items: [
        { id: "volunteer",      title: "Volunteer Sign-up",    description: "Register to serve in church ministries",    url: `${BASE_URL}/member/volunteer?code=${churchCode}` },
        { id: "training",       title: "Training Enrollment",  description: "Enrol in church training programs",         url: `${BASE_URL}/member/training?code=${churchCode}` },
        { id: "children",       title: "Children's Church",    description: "Children's ministry check-in",              url: `${BASE_URL}/member/children?code=${churchCode}` },
      ],
    },
    {
      title: "Support & Resources",
      subtitle: "Counselling, bookings, and resources",
      items: [
        { id: "counselling",    title: "Counselling Booking",  description: "Book pastoral counselling sessions",        url: `${BASE_URL}/member/counselling?code=${churchCode}` },
        { id: "facility",       title: "Facility Booking",     description: "Reserve church facilities and rooms",       url: `${BASE_URL}/member/facility?code=${churchCode}` },
        { id: "store",          title: "Resource Store",       description: "Access church resources and materials",     url: `${BASE_URL}/store/${slug}` },
        { id: "testimony",      title: "Testimony Submission", description: "Submit testimonies and prayer requests",    url: `${BASE_URL}/member/testimony?code=${churchCode}` },
        { id: "website",        title: "Church Website",       description: "Church's external website",                 url: websiteUrl || null },
      ],
    },
  ];

  return (
    <>
      <Helmet><title>QR Codes — Vestry</title></Helmet>

      <div className="max-w-3xl space-y-6 pb-10">
        {/* Back + Header */}
        <div>
          <button
            onClick={() => navigate("/settings/general")}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-9 w-9 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <QrCode className="h-5 w-5 text-orange-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">QR Codes</h1>
          </div>
          <p className="text-sm text-slate-500">Generate and share QR codes to provide easy access to your church's features and services.</p>
        </div>

        {/* Sections */}
        {SECTIONS.map(section => (
          <QRSection key={section.title} {...section} />
        ))}
      </div>
    </>
  );
}
