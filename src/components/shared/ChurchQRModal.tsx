import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Download, Share2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES } from "@/lib/schema";

const BASE_URL = import.meta.env.VITE_BASE_URL || window.location.origin;

interface ChurchQRModalProps {
  open: boolean;
  onClose: () => void;
}

export function ChurchQRModal({ open, onClose }: ChurchQRModalProps) {
  const { tenantId, name: churchName } = useChurch();
  const [copied, setCopied] = useState<string | null>(null);

  // Fetch church_code from tenants table — this is the single source of truth
  const { data: tenant, isLoading } = useQuery({
    queryKey: ["tenant-church-code", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.TENANTS)
        .select("church_code, slug, name")
        .eq("id", tenantId!)
        .single();
      if (error) throw error;
      return data as { church_code: string; slug: string | null; name: string };
    },
    enabled: !!tenantId && open,
    staleTime: 60_000,
  });

  const churchCode = tenant?.church_code ?? "";
  const churchSlug = tenant?.slug ?? tenantId;

  const tabs = [
    {
      id: "member_registration",
      label: "Member QR",
      url: `${BASE_URL}/member/join?code=${churchCode}&type=member`,
      description: "Scan to register as a member",
      howTo: [
        "Display at church entrances",
        "Include on membership materials",
        "Share via WhatsApp, SMS, or email",
        "New members fill form on their phones",
        "They will be placed under Pending Approval",
      ],
    },
    {
      id: "visitor_registration",
      label: "Visitor QR",
      url: `${BASE_URL}/member/join?code=${churchCode}&type=visitor`,
      description: "Scan to register as a visitor",
      howTo: [
        "Display at church entrances for first-time visitors",
        "Visitor info goes directly to the Visitors page",
        "Follow up with visitors from the Visitors page",
        "Convert visitors to members when ready",
      ],
    },
    {
      id: "member_login",
      label: "Login QR",
      url: `${BASE_URL}/member/login?code=${churchCode}`,
      description: "Scan to sign in to the member portal",
      howTo: [
        "Share with existing members",
        "Pre-fills the church code on login page",
        "Members still need their email to sign in",
      ],
    },
    {
      id: "giving",
      label: "Giving QR",
      url: `${BASE_URL}/give/${churchSlug}`,
      description: "Scan to give online",
      howTo: [
        "Display during offering time",
        "Include on bulletins and screens",
        "Anyone can scan to give online",
      ],
    },
  ];

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
    toast.success("Copied to clipboard");
  };

  const downloadQR = (id: string) => {
    const container = document.getElementById(`qr-${id}`);
    const svg = container?.querySelector("svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    canvas.width = 300; canvas.height = 300;
    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, 300, 300);
      ctx.drawImage(img, 0, 0, 300, 300);
      const a = document.createElement("a");
      a.download = `vestry-qr-${id}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const share = (url: string) => {
    if (navigator.share) navigator.share({ title: churchName, url });
    else copy(url, "share");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Church QR Codes & Access</DialogTitle>
        </DialogHeader>

        {/* Church Access Code */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">
            Your Church Access Code
          </p>
          {isLoading ? (
            <Skeleton className="h-8 w-40" />
          ) : (
            <div className="flex items-center gap-3">
              <span className="flex-1 text-2xl font-bold font-mono tracking-widest text-indigo-600">
                {churchCode || "—"}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copy(churchCode, "code")}
                disabled={!churchCode}
                className="shrink-0"
              >
                {copied === "code" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
          <p className="text-xs text-indigo-600/70">
            Members and visitors use this code to register or sign in to the portal.
            Manage it in <strong>Settings → Access Control</strong>.
          </p>
        </div>

        {/* QR Tabs */}
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-52 w-full" />
          </div>
        ) : (
          <Tabs defaultValue="member_registration">
            <TabsList className="w-full grid grid-cols-4">
              {tabs.map(t => (
                <TabsTrigger key={t.id} value={t.id} className="text-xs px-1">
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {tabs.map(t => (
              <TabsContent key={t.id} value={t.id} className="space-y-4">
                <div
                  id={`qr-${t.id}`}
                  className="flex flex-col items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800"
                >
                  <QRCodeSVG value={t.url} size={180} includeMargin />
                  <p className="text-xs text-muted-foreground">{t.description}</p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Link</p>
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2">
                    <span className="flex-1 text-xs font-mono text-slate-600 dark:text-slate-400 truncate">
                      {t.url}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0"
                      onClick={() => copy(t.url, t.id)}
                    >
                      {copied === t.id ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5"
                    onClick={() => downloadQR(t.id)}
                  >
                    <Download className="h-3.5 w-3.5" />Download QR
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5"
                    onClick={() => share(t.url)}
                  >
                    <Share2 className="h-3.5 w-3.5" />Share Link
                  </Button>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">How to use</p>
                  <ul className="text-xs text-slate-500 space-y-0.5">
                    {t.howTo.map((tip, i) => (
                      <li key={i}>• {tip}</li>
                    ))}
                  </ul>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
