import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemberPortal } from "@/contexts/MemberPortalContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";
import { ArrowLeft, Baby, Download, Share2, CheckCircle2, XCircle, QrCode } from "lucide-react";
import { cn } from "@/lib/utils";
import { TABLES } from "@/lib/schema";

function childGradient(name: string): string {
  const letter = (name?.[0] ?? "A").toUpperCase();
  const map: Record<string, string> = {
    A:"from-orange-400 to-orange-500", B:"from-orange-400 to-orange-500",
    C:"from-orange-400 to-orange-500", D:"from-orange-400 to-orange-500",
    E:"from-violet-500 to-purple-600", F:"from-violet-500 to-purple-600",
    G:"from-violet-500 to-purple-600", H:"from-violet-500 to-purple-600",
    I:"from-blue-400 to-blue-600",     J:"from-blue-400 to-blue-600",
    K:"from-blue-400 to-blue-600",     L:"from-blue-400 to-blue-600",
    M:"from-emerald-400 to-green-500", N:"from-emerald-400 to-green-500",
  };
  return map[letter] ?? "from-amber-400 to-yellow-500";
}

function calcAge(dob: string): string {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  if (age < 1) {
    const months = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
    return `${months}mo`;
  }
  return `${age}y`;
}

function downloadQR(childName: string, qrData: string) {
  const svg = document.getElementById(`qr-${qrData}`)?.querySelector("svg");
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
    a.download = `${childName.replace(/\s+/g, "-")}-checkin-qr.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
  };
  img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
}

export default function MemberChildren() {
  const member = useMemberPortal();
  const navigate = useNavigate();

  // Fetch children linked to this member as guardian
  const { data: children = [], isLoading: childrenLoading } = useQuery({
    queryKey: ["member-children", member.memberId],
    queryFn: async () => {
      const { data } = await supabase
        .from(TABLES.CHILDREN)
        .select("*, class:children_classes(name)")
        .eq("tenant_id", member.churchId)
        .eq("active", true)
        .or(`guardian_primary_id.eq.${member.memberId},guardian_secondary_id.eq.${member.memberId}`);
      return data ?? [];
    },
    staleTime: 60_000,
  });

  // Fetch upcoming QR codes for all children
  const { data: qrCodes = [], isLoading: qrLoading } = useQuery({
    queryKey: ["member-children-qr", member.memberId],
    queryFn: async () => {
      if (!children.length) return [];
      const childIds = children.map((c: any) => c.id);
      const { data } = await supabase
        .from(TABLES.CHILDREN_QR_CODES)
        .select("*, service:services(name, service_date, start_time)")
        .in("child_id", childIds)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: children.length > 0,
    staleTime: 30_000,
  });

  // Fetch attendance history per child
  const { data: checkins = [] } = useQuery({
    queryKey: ["member-children-checkins", member.memberId],
    queryFn: async () => {
      if (!children.length) return [];
      const childIds = children.map((c: any) => c.id);
      const { data } = await supabase
        .from(TABLES.CHILDREN_CHECKINS)
        .select("*, service:services(name, service_date)")
        .in("child_id", childIds)
        .eq("tenant_id", member.churchId)
        .order("checked_in_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
    enabled: children.length > 0,
    staleTime: 60_000,
  });

  const isLoading = childrenLoading || qrLoading;

  // Group QR codes by child
  const qrByChild: Record<string, any[]> = {};
  qrCodes.forEach((qr: any) => {
    if (!qrByChild[qr.child_id]) qrByChild[qr.child_id] = [];
    qrByChild[qr.child_id].push(qr);
  });

  // Group checkins by child
  const checkinsByChild: Record<string, any[]> = {};
  checkins.forEach((ci: any) => {
    if (!checkinsByChild[ci.child_id]) checkinsByChild[ci.child_id] = [];
    checkinsByChild[ci.child_id].push(ci);
  });

  return (
    <>
      <Helmet><title>My Children — {member.churchName}</title></Helmet>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/member")}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <ArrowLeft className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          </button>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{member.churchName}</p>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Baby className="h-4 w-4 text-orange-500" />My Children
            </h1>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-2xl" />)}
          </div>
        ) : children.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-10 text-center">
            <Baby className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No children linked to your account</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Contact your church admin to link your children to your profile.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {children.map((child: any) => {
              const name = `${child.first_name} ${child.last_name}`;
              const grad = childGradient(name);
              const ini = `${child.first_name[0]}${child.last_name[0]}`.toUpperCase();
              const childQRs = qrByChild[child.id] ?? [];
              const childCheckins = checkinsByChild[child.id] ?? [];

              return (
                <div key={child.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  {/* Child header */}
                  <div className="flex items-center gap-4 p-5 border-b border-slate-100 dark:border-slate-800">
                    <div className={cn("h-14 w-14 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-lg shrink-0", grad)}>
                      {ini}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white text-base">{name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {child.date_of_birth && (
                          <span className="text-xs text-slate-500">{calcAge(child.date_of_birth)} old</span>
                        )}
                        {child.class?.name && (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700">
                            {child.class.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Children QR Code section */}
                  <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 mb-3">
                      <QrCode className="h-4 w-4 text-orange-500" />
                      <p className="text-sm font-semibold text-slate-800 dark:text-white">Children QR Code</p>
                      <span className="text-xs text-slate-400">· For child service attendance</span>
                    </div>

                    {childQRs.length === 0 ? (
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-center">
                        <p className="text-xs text-slate-500 dark:text-slate-400">No upcoming service QR code</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                          QR code will appear when you confirm attendance for a service
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {childQRs.map((qr: any) => (
                          <div key={qr.id} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                            {/* QR Code */}
                            <div id={`qr-${qr.qr_data}`} className="flex justify-center mb-3">
                              <div className="bg-white p-3 rounded-xl shadow-sm">
                                <QRCodeSVG value={qr.qr_data} size={180} includeMargin level="H" />
                              </div>
                            </div>
                            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 text-center mb-0.5">
                              Show this at the children's desk
                            </p>
                            {qr.service && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                                {qr.service.name} · {format(new Date(qr.service.service_date), "EEE, d MMM yyyy")}
                              </p>
                            )}
                            <p className="text-[10px] text-slate-400 text-center mt-1">
                              Valid until end of service
                            </p>
                            {/* Actions */}
                            <div className="flex gap-2 mt-3">
                              <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs"
                                onClick={() => downloadQR(name, qr.qr_data)}>
                                <Download className="h-3.5 w-3.5" />Download QR
                              </Button>
                              <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs"
                                onClick={() => {
                                  if (navigator.share) navigator.share({ title: `${name} Check-in QR`, text: qr.qr_data });
                                  else { navigator.clipboard.writeText(qr.qr_data); }
                                }}>
                                <Share2 className="h-3.5 w-3.5" />Share
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Attendance history */}
                  <div className="p-5">
                    <p className="text-sm font-semibold text-slate-800 dark:text-white mb-3">Attendance History</p>
                    {childCheckins.length === 0 ? (
                      <p className="text-xs text-slate-400 dark:text-slate-500">No attendance records yet</p>
                    ) : (
                      <div className="space-y-2">
                        {childCheckins.slice(0, 10).map((ci: any) => (
                          <div key={ci.id} className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
                            <div>
                              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                {ci.service?.name ?? "Service"}
                              </p>
                              {ci.service?.service_date && (
                                <p className="text-[10px] text-slate-400">
                                  {format(new Date(ci.service.service_date), "d MMM yyyy")}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {ci.checked_out_at ? (
                                <span className="flex items-center gap-1 text-[10px] text-slate-500">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />Attended
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-[10px] text-orange-600">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-orange-500" />Checked In
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                        <p className="text-[10px] text-slate-400 pt-1">
                          Attended {childCheckins.length} service{childCheckins.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
