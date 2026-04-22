import { useState, useEffect, useRef, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES } from "@/lib/schema";
import { toast } from "sonner";
import { format } from "date-fns";
import { QrCode, Search, X, CheckCircle2, AlertTriangle, XCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { childGradient, calcAge } from "./types";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";

type KioskScreen = "home" | "scan" | "search" | "exit_pin";
type ScanResult = { status: "success" | "error" | "already_in"; childName?: string; message: string } | null;

export default function CMKiosk() {
  const { tenantId, userId, name: churchName, logoUrl } = useChurch();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const today = new Date().toISOString().split("T")[0];

  const [screen, setScreen] = useState<KioskScreen>("home");
  const [scanResult, setScanResult] = useState<ScanResult>(null);
  const [search, setSearch] = useState("");
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [idleTimer, setIdleTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [isIdle, setIsIdle] = useState(false);
  const scannerRef = useRef<any>(null);

  // Settings
  const { data: settings } = useQuery({
    queryKey: ["cm-settings", tenantId],
    queryFn: async () => { const { data } = await supabase.from(TABLES.CHILDREN_MINISTRY_SETTINGS).select("*").eq("tenant_id", tenantId!).maybeSingle(); return data; },
    enabled: !!tenantId, staleTime: 300_000,
  });

  const kioskPin = settings?.kiosk_pin ?? "1234";
  const idleTimeout = (settings?.kiosk_idle_timeout_minutes ?? 1) * 60 * 1000;
  const autoReturn = (settings?.kiosk_auto_return_seconds ?? 3) * 1000;

  // Today's service
  const { data: todayService } = useQuery({
    queryKey: ["today-service-kiosk", tenantId],
    queryFn: async () => { const { data } = await supabase.from(TABLES.SERVICES).select("id, name, start_time").eq("tenant_id", tenantId!).eq("service_date", today).limit(1).maybeSingle(); return data; },
    enabled: !!tenantId, staleTime: 60_000,
  });

  // Search results
  const { data: searchResults = [] } = useQuery({
    queryKey: ["kiosk-search", tenantId, search],
    queryFn: async () => {
      if (search.length < 2) return [];
      const { data } = await supabase.from(TABLES.CHILDREN).select("*, class:children_classes(name), guardian_primary:members!children_guardian_primary_id_fkey(first_name, last_name)").eq("tenant_id", tenantId!).eq("active", true);
      return (data ?? []).filter((c: any) => `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase()));
    },
    enabled: !!tenantId && screen === "search" && search.length >= 2,
    staleTime: 10_000,
  });

  // Checked in today
  const { data: checkedInIds = new Set<string>() } = useQuery({
    queryKey: ["kiosk-checked-in", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.CHILDREN_CHECKINS).select("child_id").eq("tenant_id", tenantId!).gte("checked_in_at", today + "T00:00:00").is("checked_out_at", null);
      return new Set((data ?? []).map((ci: any) => ci.child_id));
    },
    enabled: !!tenantId, staleTime: 15_000, refetchInterval: 30_000,
  });

  // Reset idle timer on any interaction
  const resetIdle = useCallback(() => {
    setIsIdle(false);
    if (idleTimer) clearTimeout(idleTimer);
    const t = setTimeout(() => setIsIdle(true), idleTimeout);
    setIdleTimer(t);
  }, [idleTimeout]);

  useEffect(() => {
    resetIdle();
    window.addEventListener("click", resetIdle);
    window.addEventListener("keydown", resetIdle);
    window.addEventListener("touchstart", resetIdle);
    return () => {
      window.removeEventListener("click", resetIdle);
      window.removeEventListener("keydown", resetIdle);
      window.removeEventListener("touchstart", resetIdle);
      if (idleTimer) clearTimeout(idleTimer);
    };
  }, [resetIdle]);

  // Start QR scanner when entering scan screen
  useEffect(() => {
    if (screen !== "scan") { scannerRef.current?.stop().catch(() => {}); return; }
    let scanner: Html5Qrcode;
    try {
      scanner = new Html5Qrcode("kiosk-qr-reader");
      scannerRef.current = scanner;
      scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 280, height: 280 } },
        async (qrData: string) => {
          scanner.pause();
          await handleQRScan(qrData);
        },
        () => {}
      ).catch(() => {});
    } catch {
      // camera not available
    }
    return () => { scannerRef.current?.stop().catch(() => {}); };
  }, [screen]);

  const checkInMutation = useMutation({
    mutationFn: async ({ childId, method }: { childId: string; method: "manual" | "qr" }) => {
      const { error } = await supabase.from(TABLES.CHILDREN_CHECKINS).insert({ tenant_id: tenantId!, child_id: childId, service_id: todayService?.id ?? null, checked_in_by: userId, check_in_method: method } as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["kiosk-checked-in"] }); qc.invalidateQueries({ queryKey: ["cm-stats"] }); },
  });

  const handleQRScan = async (qrData: string) => {
    navigator.vibrate?.(100);
    const { data: qrRecord } = await supabase.from(TABLES.CHILDREN_QR_CODES).select("*, child:children(first_name, last_name)").eq("qr_data", qrData).eq("tenant_id", tenantId!).gte("expires_at", new Date().toISOString()).maybeSingle();
    if (!qrRecord) { setScanResult({ status: "error", message: "QR code not found or expired" }); setTimeout(() => { setScanResult(null); scannerRef.current?.resume(); }, autoReturn); return; }
    const childName = `${qrRecord.child?.first_name} ${qrRecord.child?.last_name}`;
    if (checkedInIds.has(qrRecord.child_id)) { setScanResult({ status: "already_in", childName, message: `${childName} is already checked in` }); setTimeout(() => { setScanResult(null); scannerRef.current?.resume(); }, autoReturn); return; }
    await checkInMutation.mutateAsync({ childId: qrRecord.child_id, method: "qr" });
    setScanResult({ status: "success", childName, message: `${childName} checked in!` });
    setTimeout(() => { setScanResult(null); setScreen("home"); }, autoReturn);
  };

  const handleManualCheckin = async (childId: string) => {
    await checkInMutation.mutateAsync({ childId, method: "manual" });
    toast.success("Checked in!");
    qc.invalidateQueries({ queryKey: ["kiosk-checked-in"] });
  };

  const handlePinSubmit = () => {
    if (pin === kioskPin) { navigate("/childrens-ministry"); }
    else { setPinError(true); setPin(""); setTimeout(() => setPinError(false), 2000); }
  };

  // ── Idle screen ──────────────────────────────────────────────────────────────
  if (isIdle) return (
    <div className="fixed inset-0 bg-gradient-to-br from-orange-500 to-orange-600 flex flex-col items-center justify-center gap-6 text-white cursor-pointer" onClick={() => setIsIdle(false)}>
      <div className="text-8xl animate-pulse">✝️</div>
      <h1 className="text-4xl font-bold text-center">{churchName}</h1>
      <p className="text-xl text-orange-100 text-center max-w-md">Welcome! Please scan your QR code or search by name to check in your child</p>
      <p className="text-sm text-orange-200 mt-4">Tap anywhere to continue</p>
    </div>
  );

  // ── Exit PIN screen ──────────────────────────────────────────────────────────
  if (screen === "exit_pin") return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-xs text-center font-jakarta shadow-2xl">
        <p className="text-lg font-bold text-slate-900 mb-2">Enter Admin PIN</p>
        <p className="text-sm text-slate-500 mb-6">Enter the 4-digit PIN to exit kiosk mode</p>
        <div className="flex justify-center gap-3 mb-4">
          {[0,1,2,3].map(i => (
            <div key={i} className={cn("h-12 w-12 rounded-xl border-2 flex items-center justify-center text-2xl font-bold", pinError ? "border-red-400 bg-red-50" : pin.length > i ? "border-orange-500 bg-orange-50 text-orange-600" : "border-slate-200 bg-slate-50")}>
              {pin.length > i ? "●" : ""}
            </div>
          ))}
        </div>
        {pinError && <p className="text-sm text-red-500 mb-3">Incorrect PIN</p>}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((k, i) => (
            <button key={i} disabled={k === ""} onClick={() => {
              if (k === "⌫") setPin(p => p.slice(0, -1));
              else if (typeof k === "number" && pin.length < 4) { const np = pin + k; setPin(np); if (np.length === 4) setTimeout(() => { if (np === kioskPin) navigate("/childrens-ministry"); else { setPinError(true); setPin(""); setTimeout(() => setPinError(false), 2000); } }, 100); }
            }}
              className={cn("h-14 rounded-xl text-xl font-semibold transition-colors", k === "" ? "invisible" : "bg-slate-100 hover:bg-slate-200 text-slate-800 active:scale-95")}>
              {k}
            </button>
          ))}
        </div>
        <Button variant="ghost" className="w-full text-slate-500" onClick={() => { setScreen("home"); setPin(""); }}>Cancel</Button>
      </div>
    </div>
  );

  // ── Main kiosk layout ────────────────────────────────────────────────────────
  return (
    <>
      <Helmet><title>Kiosk — Children's Ministry</title></Helmet>
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col font-jakarta overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-white/10">
          <div className="flex items-center gap-4">
            {logoUrl ? <img src={logoUrl} className="h-10 w-10 rounded-full object-cover" alt="" /> : <div className="h-10 w-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold">{churchName[0]}</div>}
            <div>
              <p className="text-white font-bold text-lg">{churchName}</p>
              <p className="text-slate-400 text-sm">Children's Check-in</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-white font-semibold">{format(new Date(), "EEEE, d MMMM")}</p>
              {todayService && <p className="text-slate-400 text-sm">{todayService.name}</p>}
            </div>
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white border border-white/20 hover:border-white/40" onClick={() => setScreen("exit_pin")}>
              Exit Kiosk
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          {screen === "home" && (
            <div className="w-full max-w-lg space-y-4">
              <p className="text-center text-white/60 text-sm uppercase tracking-widest mb-8">How would you like to check in?</p>
              <button onClick={() => setScreen("scan")} className="w-full bg-orange-500 hover:bg-orange-600 active:scale-[0.98] transition-all rounded-2xl p-8 flex flex-col items-center gap-4 text-white shadow-lg shadow-orange-500/30">
                <QrCode className="h-16 w-16" />
                <div className="text-center">
                  <p className="text-2xl font-bold">Scan QR Code</p>
                  <p className="text-orange-200 mt-1">Use your child's QR code</p>
                </div>
              </button>
              <button onClick={() => setScreen("search")} className="w-full bg-white/10 hover:bg-white/20 active:scale-[0.98] transition-all rounded-2xl p-8 flex flex-col items-center gap-4 text-white border border-white/20">
                <Search className="h-16 w-16" />
                <div className="text-center">
                  <p className="text-2xl font-bold">Search by Name</p>
                  <p className="text-white/60 mt-1">Find child by name</p>
                </div>
              </button>
            </div>
          )}

          {screen === "scan" && (
            <div className="w-full max-w-sm space-y-4">
              <p className="text-center text-white text-xl font-semibold">Hold QR code up to camera</p>
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-square">
                <div id="kiosk-qr-reader" className="w-full h-full" />
                {!scanResult && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-8 left-8 w-12 h-12 border-t-4 border-l-4 border-orange-400 rounded-tl-lg" />
                    <div className="absolute top-8 right-8 w-12 h-12 border-t-4 border-r-4 border-orange-400 rounded-tr-lg" />
                    <div className="absolute bottom-8 left-8 w-12 h-12 border-b-4 border-l-4 border-orange-400 rounded-bl-lg" />
                    <div className="absolute bottom-8 right-8 w-12 h-12 border-b-4 border-r-4 border-orange-400 rounded-br-lg" />
                  </div>
                )}
                {scanResult && (
                  <div className={cn("absolute inset-0 flex flex-col items-center justify-center gap-4 text-white", scanResult.status === "success" ? "bg-emerald-600/95" : scanResult.status === "already_in" ? "bg-amber-500/95" : "bg-red-600/95")}>
                    <div className="text-7xl">{scanResult.status === "success" ? "✅" : scanResult.status === "already_in" ? "⚠️" : "❌"}</div>
                    <p className="text-2xl font-bold text-center px-6">{scanResult.message}</p>
                  </div>
                )}
              </div>
              <Button variant="ghost" className="w-full text-white/60 hover:text-white" onClick={() => setScreen("home")}>
                <ArrowLeft className="h-4 w-4 mr-2" />Back
              </Button>
            </div>
          )}

          {screen === "search" && (
            <div className="w-full max-w-lg space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Type child's name..." className="pl-12 h-16 text-xl bg-white border-0 rounded-2xl shadow-lg" autoFocus />
                {search && <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>}
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {searchResults.map((child: any) => {
                  const name = `${child.first_name} ${child.last_name}`;
                  const grad = childGradient(name);
                  const ini = `${child.first_name[0]}${child.last_name[0]}`.toUpperCase();
                  const alreadyIn = checkedInIds.has(child.id);
                  return (
                    <div key={child.id} className="bg-white rounded-2xl p-5 flex items-center gap-4 shadow-sm">
                      <div className={cn("h-14 w-14 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-xl shrink-0", grad)}>{ini}</div>
                      <div className="flex-1">
                        <p className="text-lg font-bold text-slate-900">{name}</p>
                        <p className="text-sm text-slate-500">{calcAge(child.date_of_birth)}y · {child.class?.name ?? "No class"}</p>
                      </div>
                      {alreadyIn ? (
                        <span className="flex items-center gap-1.5 text-emerald-600 font-semibold text-sm"><CheckCircle2 className="h-5 w-5" />Checked In</span>
                      ) : (
                        <Button className="h-12 px-6 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-base rounded-xl" onClick={() => handleManualCheckin(child.id)}>Check In</Button>
                      )}
                    </div>
                  );
                })}
              </div>
              <Button variant="ghost" className="w-full text-white/60 hover:text-white" onClick={() => { setScreen("home"); setSearch(""); }}>
                <ArrowLeft className="h-4 w-4 mr-2" />Back
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
