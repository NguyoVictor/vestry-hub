import { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { PageTransition } from "@/components/ui/PageTransition";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { TABLES } from "@/lib/schema";
import { toast } from "sonner";
import { format } from "date-fns";
import { Search, QrCode, CheckCircle2, LogOut, Monitor, X, CheckSquare } from "lucide-react";
import { childGradient, calcAge } from "./types";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";

export default function CMCheckin() {
  const { tenantId, userId } = useChurch();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const today = new Date().toISOString().split("T")[0];

  const [serviceId, setServiceId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [qrOpen, setQrOpen] = useState(false);
  const [qrResult, setQrResult] = useState<{ status: "success" | "error" | "already_in"; message: string; childName?: string } | null>(null);

  // Today's services
  const { data: services = [] } = useQuery({
    queryKey: ["today-services", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.SERVICES).select("id, name, start_time").eq("tenant_id", tenantId!).eq("service_date", today).order("start_time");
      return data ?? [];
    },
    enabled: !!tenantId,
    staleTime: 60_000,
  });

  // Auto-select first service
  useEffect(() => { if (services.length && !serviceId) setServiceId(services[0].id); }, [services]);

  // Search children
  const { data: searchResults = [], isLoading: searching } = useQuery({
    queryKey: ["children-search", tenantId, search],
    queryFn: async () => {
      if (!search.trim()) return [];
      const q = search.toLowerCase();
      const { data } = await supabase.from(TABLES.CHILDREN)
        .select("*, class:children_classes(name), guardian_primary:members!children_guardian_primary_id_fkey(first_name, last_name)")
        .eq("tenant_id", tenantId!).eq("active", true);
      return (data ?? []).filter((c: any) =>
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
        `${c.guardian_primary?.first_name ?? ""} ${c.guardian_primary?.last_name ?? ""}`.toLowerCase().includes(q)
      );
    },
    enabled: !!tenantId && search.length >= 2,
    staleTime: 10_000,
  });

  // Checked in today
  const { data: checkedIn = [], isLoading: checkedInLoading } = useQuery({
    queryKey: ["checked-in-today", tenantId, serviceId],
    queryFn: async () => {
      let q = supabase.from(TABLES.CHILDREN_CHECKINS)
        .select("*, child:children(first_name, last_name, class:children_classes(name))")
        .eq("tenant_id", tenantId!)
        .gte("checked_in_at", today + "T00:00:00")
        .is("checked_out_at", null)
        .order("checked_in_at", { ascending: false });
      if (serviceId) q = q.eq("service_id", serviceId);
      const { data } = await q;
      return data ?? [];
    },
    enabled: !!tenantId,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  // Check if child is already checked in
  const isCheckedIn = (childId: string) => checkedIn.some((ci: any) => ci.child_id === childId);
  const getCheckinId = (childId: string) => checkedIn.find((ci: any) => ci.child_id === childId)?.id;

  const checkInMutation = useMutation({
    mutationFn: async ({ childId, method = "manual" }: { childId: string; method?: "manual" | "qr" }) => {
      const { error } = await supabase.from(TABLES.CHILDREN_CHECKINS).insert({
        tenant_id: tenantId!,
        child_id: childId,
        service_id: serviceId || null,
        checked_in_by: userId,
        check_in_method: method,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["checked-in-today"] });
      qc.invalidateQueries({ queryKey: ["cm-stats"] });
      toast.success("Child checked in");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const checkOutMutation = useMutation({
    mutationFn: async (checkinId: string) => {
      const { error } = await supabase.from(TABLES.CHILDREN_CHECKINS).update({ checked_out_at: new Date().toISOString(), checked_out_by: userId } as any).eq("id", checkinId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["checked-in-today"] });
      qc.invalidateQueries({ queryKey: ["cm-stats"] });
      toast.success("Child checked out");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <>
      <Helmet><title>Check-in — Children's Ministry</title></Helmet>
      <PageTransition>
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Check-in / Check-out</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage children arrivals and departures</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Service selector */}
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger className="h-9 w-52 border-slate-200 text-sm">
                <SelectValue placeholder="Select service..." />
              </SelectTrigger>
              <SelectContent>
                {services.length === 0 && <SelectItem value="none" disabled>No services today</SelectItem>}
                {services.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}{s.start_time ? ` · ${String(s.start_time).substring(0, 5)}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="gap-2 border-slate-200" onClick={() => navigate("/childrens-ministry/kiosk")}>
              <Monitor className="h-4 w-4" />Kiosk Mode
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Search & check in */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <p className="text-sm font-semibold text-slate-800 mb-4">Check In a Child</p>

              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by child name or guardian name..."
                  className="pl-9 h-10 border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 text-sm"
                />
              </div>

              {/* QR scan button */}
              <Button variant="outline" className="w-full gap-2 border-slate-200 h-10 text-sm" onClick={() => setQrOpen(true)}>
                <QrCode className="h-4 w-4" />Scan QR Code
              </Button>

              {/* Search results */}
              {search.length >= 2 && (
                <div className="mt-4 space-y-2">
                  {searching ? (
                    Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
                  ) : searchResults.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">No children found</p>
                  ) : searchResults.map((child: any) => {
                    const name = `${child.first_name} ${child.last_name}`;
                    const grad = childGradient(name);
                    const ini = `${child.first_name[0]}${child.last_name[0]}`.toUpperCase();
                    const age = calcAge(child.date_of_birth);
                    const alreadyIn = isCheckedIn(child.id);
                    const checkinId = getCheckinId(child.id);
                    return (
                      <div key={child.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50">
                        <div className={cn("h-10 w-10 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-sm shrink-0", grad)}>{ini}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800 text-sm">{name}</p>
                          <p className="text-xs text-slate-400">{age}y · {child.class?.name ?? "No class"}</p>
                          {child.guardian_primary && <p className="text-xs text-slate-400">{child.guardian_primary.first_name} {child.guardian_primary.last_name}</p>}
                        </div>
                        {alreadyIn ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />Checked In</span>
                            <Button size="sm" variant="outline" className="h-7 text-xs border-orange-200 text-orange-600 hover:bg-orange-50" onClick={() => checkOutMutation.mutate(checkinId!)}>Check Out</Button>
                          </div>
                        ) : (
                          <Button size="sm" className="h-7 text-xs bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => checkInMutation.mutate({ childId: child.id })}>Check In</Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Checked in today */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">Checked In Today</p>
              <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full">{checkedIn.length} children</span>
            </div>
            {checkedInLoading ? (
              <div className="p-4 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
            ) : checkedIn.length === 0 ? (
              <EmptyState icon={CheckSquare} title="No children checked in yet" description="Use search or QR scan to check in" className="py-12" />
            ) : (
              <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
                {checkedIn.map((ci: any) => {
                  const name = `${ci.child?.first_name ?? ""} ${ci.child?.last_name ?? ""}`.trim();
                  const grad = childGradient(name);
                  const ini = `${ci.child?.first_name?.[0] ?? ""}${ci.child?.last_name?.[0] ?? ""}`.toUpperCase();
                  return (
                    <div key={ci.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/60 transition-colors">
                      <div className={cn("h-9 w-9 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-xs shrink-0", grad)}>{ini}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-sm">{name}</p>
                        <p className="text-xs text-slate-400">{ci.child?.class?.name ?? "—"} · {format(new Date(ci.checked_in_at), "h:mm a")}</p>
                      </div>
                      <Button size="sm" variant="outline" className="h-7 text-xs border-orange-200 text-orange-600 hover:bg-orange-50 shrink-0" onClick={() => checkOutMutation.mutate(ci.id)}>
                        <LogOut className="h-3 w-3 mr-1" />Check Out
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </PageTransition>

      {/* QR Scanner Modal */}
      <QRScanModal
        open={qrOpen}
        onClose={() => { setQrOpen(false); setQrResult(null); }}
        tenantId={tenantId!}
        serviceId={serviceId}
        userId={userId}
        onCheckin={() => { qc.invalidateQueries({ queryKey: ["checked-in-today"] }); qc.invalidateQueries({ queryKey: ["cm-stats"] }); }}
      />
    </>
  );
}

// ─── QR Scanner Modal ─────────────────────────────────────────────────────────
function QRScanModal({ open, onClose, tenantId, serviceId, userId, onCheckin }: {
  open: boolean; onClose: () => void; tenantId: string; serviceId: string; userId: string; onCheckin: () => void;
}) {
  const [result, setResult] = useState<{ status: "success" | "error" | "already_in"; message: string; childName?: string } | null>(null);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) { setResult(null); return; }
    let html5QrCode: Html5Qrcode;
    try {
      html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;
      setScanning(true);
      html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (decodedText: string) => {
          html5QrCode.pause();
          await handleQRScan(decodedText);
          setTimeout(() => { html5QrCode.resume(); setResult(null); }, 3000);
        },
        () => {}
      ).catch(() => setScanning(false));
    } catch {
      setScanning(false);
    }

    return () => {
      scannerRef.current?.stop().catch(() => {});
    };
  }, [open]);

  const handleQRScan = async (qrData: string) => {
    try {
      navigator.vibrate?.(100);
      // Look up QR code
      const { data: qrRecord } = await supabase.from(TABLES.CHILDREN_QR_CODES)
        .select("*, child:children(first_name, last_name)")
        .eq("qr_data", qrData)
        .eq("tenant_id", tenantId)
        .gte("expires_at", new Date().toISOString())
        .maybeSingle();

      if (!qrRecord) {
        setResult({ status: "error", message: "QR code not found or expired. Try manual search instead." });
        return;
      }

      const childName = `${qrRecord.child?.first_name} ${qrRecord.child?.last_name}`;

      // Check if already checked in
      const { data: existing } = await supabase.from(TABLES.CHILDREN_CHECKINS)
        .select("id").eq("child_id", qrRecord.child_id).eq("tenant_id", tenantId)
        .gte("checked_in_at", new Date().toISOString().split("T")[0] + "T00:00:00")
        .is("checked_out_at", null).maybeSingle();

      if (existing) {
        setResult({ status: "already_in", message: `${childName} is already checked in.`, childName });
        return;
      }

      // Check in
      await supabase.from(TABLES.CHILDREN_CHECKINS).insert({
        tenant_id: tenantId,
        child_id: qrRecord.child_id,
        service_id: serviceId || qrRecord.service_id || null,
        checked_in_by: userId,
        check_in_method: "qr",
        qr_code_data: qrData,
      } as any);

      onCheckin();
      setResult({ status: "success", message: `${childName} checked in!`, childName });
    } catch {
      setResult({ status: "error", message: "Something went wrong. Try manual search." });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm font-jakarta rounded-2xl p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <QrCode className="h-5 w-5 text-orange-500" />Scan QR Code
          </DialogTitle>
          <p className="text-sm text-slate-500 mt-1">Point camera at child's QR code to check in</p>
        </DialogHeader>

        <div className="px-6 py-5">
          {/* Camera viewfinder */}
          <div className="relative rounded-xl overflow-hidden bg-slate-900 aspect-square mb-4">
            <div id="qr-reader" ref={containerRef} className="w-full h-full" />
            {/* Corner brackets overlay */}
            {!result && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-6 left-6 w-8 h-8 border-t-2 border-l-2 border-orange-400 rounded-tl" />
                <div className="absolute top-6 right-6 w-8 h-8 border-t-2 border-r-2 border-orange-400 rounded-tr" />
                <div className="absolute bottom-6 left-6 w-8 h-8 border-b-2 border-l-2 border-orange-400 rounded-bl" />
                <div className="absolute bottom-6 right-6 w-8 h-8 border-b-2 border-r-2 border-orange-400 rounded-br" />
              </div>
            )}
            {/* Result overlay */}
            {result && (
              <div className={cn("absolute inset-0 flex flex-col items-center justify-center gap-3 text-white", result.status === "success" ? "bg-emerald-600/90" : result.status === "already_in" ? "bg-amber-500/90" : "bg-red-600/90")}>
                <div className="text-5xl">{result.status === "success" ? "✅" : result.status === "already_in" ? "⚠️" : "❌"}</div>
                <p className="text-base font-semibold text-center px-4">{result.message}</p>
              </div>
            )}
          </div>

          {!scanning && !result && (
            <p className="text-xs text-slate-400 text-center">Camera access required. Please allow camera permissions.</p>
          )}
        </div>

        <div className="px-6 pb-6">
          <Button variant="outline" className="w-full border-slate-200" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
