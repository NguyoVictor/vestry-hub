import { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import NumberFlow from "@/components/finance/AnimatedNumber";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { useGivingRecordsRealtime } from "@/hooks/useFinanceRealtime";
import { PageHeader } from "@/components/layout/PageHeader";
import { TransactionBadge } from "@/components/finance/TransactionBadge";
import { PaymentMethodIcon } from "@/components/finance/PaymentMethodIcon";
import { MemberAvatar } from "@/components/shared/MemberAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "react-hot-toast";
import {
  CreditCard, TrendingUp, Calendar, DollarSign, Plus, Sparkles, Users,
  Smartphone, CheckCircle2, X, Clock, Loader2, RefreshCw, Shield,
  AlertCircle, Download, Heart, Zap
} from "lucide-react";
import { format, startOfMonth, startOfYear } from "date-fns";

const GIVING_CATEGORIES = ["tithe", "offering", "pledge_payment", "special_donation"] as const;
const PAYMENT_METHODS = ["cash", "mpesa", "bank_transfer", "cheque", "other"] as const;

// ── Shared animation variants ─────────────────────────────────────────────────
const pageVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
      staggerChildren: 0.08,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 32, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 25 },
  },
};

const tableRowVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring" as const, stiffness: 400, damping: 25 },
  },
};

// ── AdminGive constants ───────────────────────────────────────────────────────
const QUICK_AMOUNTS = [500, 1000, 2500, 5000];
const GIVE_CATEGORIES = ["tithe", "offering", "pledge_payment", "special_donation"];

const floatingVariants = {
  animate: {
    y: [-3, 3, -3],
    transition: { duration: 4, repeat: Infinity, ease: "easeInOut" as const },
  },
};

// ── AdminGive component ───────────────────────────────────────────────────────
function AdminGive() {
  const queryClient = useQueryClient();

  const [adminProfile, setAdminProfile] = useState<{
    id: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    tenant_id: string;
  } | null>(null);
  const [churchName, setChurchName] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("offering");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dedication, setDedication] = useState("");
  const [success, setSuccess] = useState<any>(null);
  const [stkPushState, setStkPushState] = useState<{
    isActive: boolean;
    checkoutRequestId?: string;
    givingRecordId?: string;
    countdown: number;
    terminalState?: "expired" | "cancelled" | "failed" | null;
  }>({ isActive: false, countdown: 90, terminalState: null });

  // Load admin profile on mount
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase
          .from("members")
          .select("id, first_name, last_name, phone, tenant_id")
          .eq("id", user.id)
          .single();
        if (!profile) return;
        setAdminProfile(profile);
        const { data: tenant } = await supabase
          .from("tenants")
          .select("name")
          .eq("id", profile.tenant_id)
          .single();
        setChurchName(tenant?.name || "");
      } finally {
        setProfileLoading(false);
      }
    })();
  }, []);

  // Auto-fill phone from profile
  useEffect(() => {
    if (adminProfile?.phone) setPhoneNumber(adminProfile.phone);
  }, [adminProfile?.phone]);

  // Countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (stkPushState.isActive && stkPushState.countdown > 0) {
      interval = setInterval(() => {
        setStkPushState(prev => ({ ...prev, countdown: prev.countdown - 1 }));
      }, 1000);
    } else if (stkPushState.countdown === 0 && !stkPushState.terminalState) {
      setStkPushState(prev => ({ ...prev, terminalState: "expired" }));
    }
    return () => clearInterval(interval);
  }, [stkPushState.isActive, stkPushState.countdown]);

  // postgres_changes fast-path listener
  useEffect(() => {
    if (!stkPushState.givingRecordId) return;
    const channel = supabase
      .channel(`admin-payment-${stkPushState.givingRecordId}`)
      .on("postgres_changes" as any, {
        event: "UPDATE",
        schema: "public",
        table: "giving_records",
        filter: `id=eq.${stkPushState.givingRecordId}`,
      }, (payload: any) => {
        const row = payload.new;
        const status: string = row.payment_status;
        if (status === "confirmed") {
          setStkPushState({ isActive: false, countdown: 90, terminalState: null });
          setSuccess({ amount: row.amount, giving_type: category, donation_date: new Date().toISOString(), mpesa_receipt: row.mpesa_receipt || null });
          queryClient.invalidateQueries({ queryKey: ["admin-give-history", adminProfile?.id] });
        } else if (status === "cancelled") {
          setStkPushState(prev => ({ ...prev, terminalState: "cancelled" }));
        } else if (status === "failed") {
          setStkPushState(prev => ({ ...prev, terminalState: "failed" }));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [stkPushState.givingRecordId, category, queryClient, adminProfile?.id]);

  // Polling fallback — queries row every 2s to guarantee UI reacts
  useEffect(() => {
    if (!stkPushState.isActive || !stkPushState.givingRecordId || stkPushState.terminalState) return;
    const recordId = stkPushState.givingRecordId;
    const interval = setInterval(async () => {
      const { data: row } = await supabase
        .from("giving_records")
        .select("payment_status, amount, mpesa_receipt")
        .eq("id", recordId)
        .single();
      if (!row) return;
      if (row.payment_status === "confirmed") {
        setStkPushState({ isActive: false, countdown: 90, terminalState: null });
        setSuccess({ amount: row.amount, giving_type: category, donation_date: new Date().toISOString(), mpesa_receipt: row.mpesa_receipt || null });
        queryClient.invalidateQueries({ queryKey: ["admin-give-history", adminProfile?.id] });
      } else if (row.payment_status === "cancelled") {
        setStkPushState(prev => ({ ...prev, terminalState: "cancelled" }));
      } else if (row.payment_status === "failed") {
        setStkPushState(prev => ({ ...prev, terminalState: "failed" }));
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [stkPushState.isActive, stkPushState.givingRecordId, stkPushState.terminalState, category, queryClient, adminProfile?.id]);

  // Giving history
  const { data: givingHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ["admin-give-history", adminProfile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("giving_records")
        .select("*")
        .eq("member_id", adminProfile!.id)
        .in("payment_status", ["confirmed", "cancelled"])
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!adminProfile?.id,
  });

  // Give mutation (M-Pesa only)
  const give = useMutation({
    mutationFn: async () => {
      if (!adminProfile) throw new Error("Profile not loaded");
      const cleanPhone = phoneNumber.replace(/\s+/g, "");
      if (!cleanPhone.match(/^(07|01|\+254|254)/)) throw new Error("Please enter a valid Kenyan phone number");

      const { data: tenantData, error: tenantError } = await supabase
        .from("tenants")
        .select("payhero_connected, name")
        .eq("id", adminProfile.tenant_id)
        .single();
      if (tenantError) throw new Error("Unable to verify payment configuration. Please try again.");
      if (!tenantData.payhero_connected) throw new Error("Payments not configured. Please set up M-Pesa donations in Settings → Payments.");

      const { data, error } = await supabase.functions.invoke("process-stk-push", {
        body: {
          amount: Number(amount),
          phone_number: cleanPhone,
          tenant_id: adminProfile.tenant_id,
          member_id: adminProfile.id,
          donor_name: `${adminProfile.first_name} ${adminProfile.last_name}`,
          giving_type: category,
          notes: dedication || null,
        },
      });
      if (error) throw new Error(error.message || "Payment initiation failed");
      if (!data || !data.success) throw new Error(data?.error || data?.details || "Payment initiation failed");
      return data;
    },
    onSuccess: (data) => {
      const checkoutId = data?.data?.CheckoutRequestID ?? data?.CheckoutRequestID;
      const recordId = data?.data?.giving_record_id ?? data?.giving_record_id;
      setStkPushState({ isActive: true, checkoutRequestId: checkoutId, givingRecordId: recordId, countdown: 90, terminalState: null });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to process payment", {
        duration: 6000,
        style: { background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)", color: "white", borderRadius: "12px", padding: "16px", fontWeight: "600" },
      });
      setStkPushState({ isActive: false, countdown: 90, terminalState: null });
    },
  });

  const generateReceipt = () => {
    if (!success || !adminProfile) return;
    const doc = new jsPDF({ format: "a5", unit: "mm" });
    const W = 148;

    doc.setFillColor(30, 27, 75);
    doc.rect(0, 0, W, 56, "F");
    doc.setFillColor(249, 115, 22);
    doc.rect(0, 56, W, 2.5, "F");

    const words = (churchName || "CH").trim().split(/\s+/);
    const initials = words.slice(0, 2).map((w: string) => w[0] || "").join("").toUpperCase();
    doc.setFillColor(124, 58, 237);
    doc.circle(W / 2, 17, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(initials.length > 1 ? 9 : 12);
    doc.setTextColor(255, 255, 255);
    doc.text(initials, W / 2, 20.5, { align: "center" });

    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(churchName || "Your Church", W / 2, 36, { align: "center", maxWidth: W - 20 });

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(167, 139, 250);
    doc.text("OFFICIAL GIVING RECEIPT", W / 2, 47, { align: "center" });

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128);
    doc.text("AMOUNT PAID", W / 2, 70, { align: "center" });

    const formattedAmount = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(success.amount));
    doc.setFontSize(26);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(22, 163, 74);
    doc.text(formattedAmount, W / 2, 83, { align: "center" });

    const categoryLabel = (success.giving_type || "").replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(124, 58, 237);
    doc.text(categoryLabel, W / 2, 91, { align: "center" });

    doc.setDrawColor(124, 58, 237);
    doc.setLineWidth(0.5);
    doc.line(14, 97, W - 14, 97);

    const lx = 16;
    const vx = W - 16;
    let y = 110;
    const gap = 15;

    const drawRow = (label: string, value: string, highlight = false) => {
      if (highlight && value) {
        doc.setFillColor(240, 253, 244);
        doc.setDrawColor(134, 239, 172);
        doc.setLineWidth(0.3);
        doc.roundedRect(lx - 2, y - 7, W - 28, 13, 2, 2, "FD");
      }
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(107, 114, 128);
      doc.text(label.toUpperCase(), lx, y);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      if (highlight) { doc.setTextColor(21, 128, 61); } else { doc.setTextColor(31, 41, 55); }
      doc.text(value || "—", vx, y + 5.5, { align: "right" });
      y += gap;
    };

    const donorName = `${adminProfile.first_name || ""} ${adminProfile.last_name || ""}`.trim();
    const dateStr = format(new Date(success.donation_date || new Date()), "dd MMM yyyy, HH:mm");
    drawRow("Donor Name", donorName);
    drawRow("Payment Method", "M-Pesa");
    if (success.mpesa_receipt) drawRow("M-Pesa Receipt No.", success.mpesa_receipt, true);
    drawRow("Date & Time", dateStr);
    drawRow("Category", categoryLabel);

    const footerTop = Math.max(y + 10, 173);
    doc.setFillColor(249, 115, 22);
    doc.rect(0, footerTop, W, 1.5, "F");
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(55, 65, 81);
    doc.text(`Thank you for your generous giving to ${churchName || "the church"}.`, W / 2, footerTop + 12, { align: "center", maxWidth: W - 20 });
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(156, 163, 175);
    doc.text("This is an official receipt. Please keep for your records.", W / 2, footerTop + 21, { align: "center" });

    const ref = success.mpesa_receipt || format(new Date(success.donation_date || new Date()), "yyyyMMdd");
    doc.save(`Vestry-Receipt-${ref}.pdf`);
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const maskPhoneNumber = (phone: string) => {
    if (phone.length < 4) return phone;
    return `${phone.slice(0, 4)}${"X".repeat(Math.max(0, phone.length - 6))}${phone.slice(-2)}`;
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto" />
          <p className="text-gray-500 text-sm">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!adminProfile) {
    return (
      <div className="text-center py-16 space-y-3">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto" />
        <p className="text-gray-500 font-medium">Could not load your member profile.</p>
        <p className="text-sm text-gray-400">Please ensure your admin account is linked to a member record.</p>
      </div>
    );
  }

  // Success screen
  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
        className="max-w-md mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 p-6"
      >
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
          className="relative"
        >
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-2xl shadow-emerald-500/30">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
          {[{ s: [1, 1.8, 1] as number[], o: [0.4, 0, 0.4] as number[], d: 0 }, { s: [1, 2.2, 1] as number[], o: [0.3, 0, 0.3] as number[], d: 0.5 }].map((p, i) => (
            <motion.div key={i} animate={{ scale: p.s, opacity: p.o }} transition={{ duration: 2, repeat: Infinity, delay: p.d }}
              className="absolute inset-0 rounded-full border-2 border-emerald-400" />
          ))}
        </motion.div>

        <div className="space-y-4">
          <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
            Gift Received! 🙌
          </motion.h2>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="space-y-2">
            <p className="text-5xl font-bold bg-gradient-to-r from-emerald-600 to-green-500 bg-clip-text text-transparent">
              <NumberFlow value={Number(success.amount)} format={{ style: "currency", currency: "KES", minimumFractionDigits: 0, maximumFractionDigits: 0 }} transformTiming={{ duration: 1500, easing: "ease-out" }} />
            </p>
            <p className="text-gray-600 font-medium">
              {success.giving_type?.replace(/_/g, " ")} • {format(new Date(success.donation_date), "dd MMM yyyy")}
            </p>
            {success.mpesa_receipt && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1 }}
                className="inline-flex items-center space-x-2 bg-green-50 px-4 py-2 rounded-2xl border border-green-200">
                <Shield className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-700 font-medium">Receipt: <span className="font-mono">{success.mpesa_receipt}</span></span>
              </motion.div>
            )}
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2, duration: 0.6 }} className="flex gap-4 w-full max-w-sm">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex-1">
            <Button variant="outline" className="w-full h-12 rounded-2xl border-2 border-gray-200 hover:border-gray-300 bg-white/80 backdrop-blur-sm font-semibold" onClick={generateReceipt}>
              <Download className="h-4 w-4 mr-2" />Receipt
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex-1">
            <Button className="w-full h-12 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-700 hover:to-indigo-600 shadow-lg shadow-purple-500/25 font-semibold text-white border-0" onClick={() => setSuccess(null)}>
              <RefreshCw className="h-4 w-4 mr-2" />Give Again
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    );
  }

  // STK push overlay
  if (stkPushState.isActive) {
    return (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-lg z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 100 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative bg-white/95 backdrop-blur-xl rounded-3xl p-10 max-w-sm w-full text-center space-y-8 shadow-2xl border border-white/20"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-white/10 rounded-3xl pointer-events-none" />
            <div className="absolute -top-8 -right-8 w-24 h-24 bg-green-500/30 rounded-full blur-2xl" />
            <div className="absolute -bottom-8 -left-8 w-20 h-20 bg-blue-500/20 rounded-full blur-2xl" />

            <div className="relative z-10 space-y-8">
              {stkPushState.terminalState ? (
                <motion.div key="terminal" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }} className="space-y-6 text-center">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                    className="mx-auto w-20 h-20 rounded-full flex items-center justify-center"
                    style={{ background: stkPushState.terminalState === "cancelled" ? "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)" : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)" }}>
                    {stkPushState.terminalState === "expired" && <Clock className="w-10 h-10 text-white" />}
                    {stkPushState.terminalState === "cancelled" && <X className="w-10 h-10 text-white" />}
                    {stkPushState.terminalState === "failed" && <AlertCircle className="w-10 h-10 text-white" />}
                  </motion.div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-gray-800">
                      {stkPushState.terminalState === "expired" && "Time elapsed"}
                      {stkPushState.terminalState === "cancelled" && "Payment cancelled"}
                      {stkPushState.terminalState === "failed" && "Payment failed"}
                    </h3>
                    <p className="text-gray-500 text-sm">
                      {stkPushState.terminalState === "expired" && "The payment request has expired. Please try again."}
                      {stkPushState.terminalState === "cancelled" && "You cancelled the M-Pesa payment request."}
                      {stkPushState.terminalState === "failed" && "The payment could not be processed. Please try again."}
                    </p>
                  </div>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button className="w-full h-12 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-700 hover:to-indigo-600 shadow-lg shadow-purple-500/25 font-semibold text-white border-0"
                      onClick={() => setStkPushState({ isActive: false, countdown: 90, terminalState: null })}>
                      <RefreshCw className="w-4 h-4 mr-2" />Try Again
                    </Button>
                  </motion.div>
                </motion.div>
              ) : (
                <>
                  <motion.div
                    animate={{ scale: [1, 1.15, 1], rotate: [0, 8, -8, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="relative"
                  >
                    <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-green-500/30">
                      <Smartphone className="w-10 h-10 text-white" />
                    </div>
                    <motion.div animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }} transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 rounded-3xl border-2 border-green-400" />
                    <motion.div animate={{ scale: [1, 2.2, 1], opacity: [0.4, 0, 0.4] }} transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                      className="absolute inset-0 rounded-3xl border-2 border-green-300" />
                  </motion.div>

                  <div className="space-y-4">
                    <motion.h3 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                      className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      Check your phone 📱
                    </motion.h3>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="space-y-2">
                      <p className="text-gray-600">We sent a payment request to</p>
                      <div className="inline-flex items-center space-x-2 bg-green-50 px-4 py-2 rounded-2xl border border-green-200">
                        <Smartphone className="w-4 h-4 text-green-600" />
                        <span className="font-mono font-bold text-green-700">{maskPhoneNumber(phoneNumber)}</span>
                      </div>
                      <p className="text-sm text-gray-500">Enter your M-Pesa PIN to complete your gift</p>
                    </motion.div>
                  </div>

                  <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}
                    className="flex items-center justify-center space-x-3 p-4 bg-amber-50/80 rounded-2xl border border-amber-200/50 backdrop-blur-sm">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: "linear" }}>
                      <Clock className="w-5 h-5 text-amber-600" />
                    </motion.div>
                    <span className="font-mono text-lg font-bold text-amber-700">{formatCountdown(stkPushState.countdown)}</span>
                    <span className="text-sm text-amber-600 font-medium">remaining</span>
                  </motion.div>

                  <div className="space-y-4">
                    {stkPushState.countdown < 120 && (
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                        <Button variant="outline" size="sm" onClick={() => give.mutate()} disabled={give.isPending}
                          className="w-full h-12 rounded-2xl border-2 border-gray-200 hover:border-gray-300 bg-white/80 backdrop-blur-sm font-medium">
                          {give.isPending ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Resending...</>) : (<><RefreshCw className="w-4 h-4 mr-2" />Didn't receive it? Resend</>)}
                        </Button>
                      </motion.div>
                    )}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
                      <Button variant="ghost" size="sm" onClick={() => setStkPushState({ isActive: false, countdown: 90, terminalState: null })}
                        className="w-full text-gray-500 hover:text-gray-700 hover:bg-gray-100/50 rounded-2xl h-12 font-medium">
                        <X className="w-4 h-4 mr-2" />Cancel Payment
                      </Button>
                    </motion.div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      </>
    );
  }

  // Main form
  return (
    <motion.div variants={pageVariants} initial="hidden" animate="visible" className="max-w-md mx-auto space-y-8">
      {/* Header */}
      <motion.div variants={cardVariants} className="relative text-center space-y-4 py-6">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div variants={floatingVariants} animate="animate" className="absolute top-4 left-1/4 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl" />
          <motion.div variants={floatingVariants} animate="animate" style={{ animationDelay: "2s" }} className="absolute top-8 right-1/3 w-20 h-20 bg-pink-500/10 rounded-full blur-2xl" />
        </div>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, delay: 0.2 }}
          className="relative inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg shadow-purple-500/25 mb-4">
          <Heart className="h-8 w-8 text-white" />
          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }} className="absolute inset-0 rounded-2xl bg-purple-400/30 blur-md" />
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Give to {churchName}
        </motion.h1>
      </motion.div>

      {/* Form */}
      <motion.div variants={cardVariants}>
        <Card className="relative rounded-3xl overflow-hidden border-2 border-white/20 bg-gradient-to-br from-white/90 to-white/60 backdrop-blur-md shadow-xl shadow-black/5">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
          <CardContent className="relative p-8 space-y-8">

            {/* Quick amounts */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Label className="text-sm font-semibold text-gray-700 mb-4 block">Amount</Label>
              <div className="grid grid-cols-4 gap-3 mb-4">
                {QUICK_AMOUNTS.map((a, index) => (
                  <motion.button key={a}
                    initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 + index * 0.05 }} whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}
                    onClick={() => setAmount(String(a))}
                    className={`py-3 rounded-2xl text-sm font-semibold border-2 transition-all duration-300 ${amount === String(a) ? "bg-gradient-to-r from-purple-600 to-indigo-500 text-white border-purple-600 shadow-lg shadow-purple-500/25" : "border-gray-200 hover:border-purple-200 hover:bg-purple-50/50 bg-white/60 backdrop-blur-sm"}`}>
                    <NumberFlow value={a} format={{ style: "currency", currency: "KES", minimumFractionDigits: 0, maximumFractionDigits: 0 }} transformTiming={{ duration: 600 }} />
                  </motion.button>
                ))}
              </div>
              <div className="relative">
                <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Custom amount"
                  className="h-14 text-xl text-center rounded-2xl border-2 border-gray-100 focus:border-purple-300 bg-white/80 backdrop-blur-sm shadow-inner" min="1" />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/5 to-indigo-500/5 pointer-events-none" />
              </div>
            </motion.div>

            {/* Category */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700">Giving Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-12 rounded-2xl border-2 border-gray-100 focus:border-purple-300 bg-white/80 backdrop-blur-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-2xl border-2 border-gray-100 bg-white/95 backdrop-blur-xl">
                  {GIVE_CATEGORIES.map(c => (
                    <SelectItem key={c} value={c} className="capitalize rounded-xl">
                      <div className="flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-purple-500" />
                        <span>{c.replace(/_/g, " ")}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </motion.div>

            {/* M-Pesa info */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700">Payment Method</Label>
              <div className="p-4 bg-green-50/80 rounded-2xl border border-green-200/50 backdrop-blur-sm">
                <div className="flex items-start space-x-3">
                  <Smartphone className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-green-700">M-Pesa STK Push</p>
                    <p className="text-xs text-green-600">You'll receive a payment request on your phone</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Phone number */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="space-y-3">
              <Label htmlFor="adminPhoneNumber" className="text-sm font-semibold text-gray-700">M-Pesa Number</Label>
              <div className="relative">
                <Input id="adminPhoneNumber" type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)}
                  placeholder="0712345678"
                  className="h-12 rounded-2xl border-2 border-gray-100 focus:border-green-300 bg-white/80 backdrop-blur-sm pl-12" />
                <Smartphone className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-600" />
              </div>
              <p className="text-xs text-gray-500 flex items-center space-x-1">
                <Shield className="w-3 h-3" />
                <span>You'll receive a secure payment prompt on this number</span>
              </p>
            </motion.div>

            {/* Dedication */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85 }} className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700">
                Dedication / Note <span className="text-gray-400 font-normal">(optional)</span>
              </Label>
              <Input value={dedication} onChange={e => setDedication(e.target.value)}
                placeholder="e.g. In memory of John, For building fund"
                className="h-12 rounded-2xl border-2 border-gray-100 focus:border-purple-300 bg-white/80 backdrop-blur-sm" />
            </motion.div>

            {/* Submit */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                className="w-full h-14 rounded-2xl text-base font-semibold bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-700 hover:to-indigo-600 shadow-xl shadow-purple-500/25 border-0 text-white"
                onClick={() => give.mutate()}
                disabled={!amount || Number(amount) <= 0 || give.isPending || !phoneNumber}>
                {give.isPending ? (
                  <><Loader2 className="w-5 h-5 mr-3 animate-spin" />Sending STK Push...</>
                ) : (
                  <><Heart className="w-5 h-5 mr-3" />Give {amount ? (
                    <NumberFlow value={Number(amount)} format={{ style: "currency", currency: "KES", minimumFractionDigits: 0, maximumFractionDigits: 0 }} transformTiming={{ duration: 400 }} />
                  ) : "Now"}</>
                )}
              </Button>
            </motion.div>

          </CardContent>
        </Card>
      </motion.div>

      {/* Recent giving history */}
      <motion.div variants={cardVariants} className="space-y-4">
        <h2 className="text-lg font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">My Recent Giving</h2>
        {historyLoading ? (
          <Skeleton className="h-40 w-full rounded-3xl" />
        ) : givingHistory.length === 0 ? (
          <Card className="rounded-3xl border-2 border-dashed border-gray-200 bg-gradient-to-br from-gray-50/80 to-white/40 backdrop-blur-sm">
            <CardContent className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 font-medium">No giving history yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {givingHistory.map((g: any, index: number) => (
              <motion.div key={g.id} initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 1.3 + index * 0.1, type: "spring", stiffness: 300, damping: 25 }}>
                <Card className="relative overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-white/90 to-white/60 backdrop-blur-md shadow-lg shadow-black/5">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                  <CardContent className="relative p-5">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                          <p className="text-sm font-semibold capitalize text-gray-800">{g.giving_type?.replace(/_/g, " ")}</p>
                          {g.payment_method === "mpesa" && (
                            <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs border border-green-200">
                              <Smartphone className="w-3 h-3 mr-1" />M-Pesa
                            </Badge>
                          )}
                          {g.payment_status && (
                            <Badge variant="secondary" className={`text-xs border ${g.payment_status === "confirmed" ? "bg-green-100 text-green-700 border-green-200" : g.payment_status === "cancelled" ? "bg-gray-100 text-gray-600 border-gray-200" : "bg-red-100 text-red-700 border-red-200"}`}>
                              {g.payment_status === "confirmed" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                              {g.payment_status === "cancelled" && <X className="w-3 h-3 mr-1" />}
                              {g.payment_status}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          {new Date(g.created_at || g.donation_date).toLocaleString('en-KE', {
                            timeZone: 'Africa/Nairobi',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })} • {g.payment_method}
                        </p>
                      </div>
                      <span className="text-lg font-bold text-emerald-600">
                        <NumberFlow value={Number(g.amount)} format={{ style: "currency", currency: g.currency || "KES", minimumFractionDigits: 0, maximumFractionDigits: 0 }} transformTiming={{ duration: 800, easing: "ease-out" }} />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ── GiveOnline (admin overview) ───────────────────────────────────────────────
const GiveOnline = () => {
  const { tenantId, currency, userId } = useChurch();
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [form, setForm] = useState({ member_id: "", amount: "", giving_type: "offering", payment_method: "cash", payment_reference: "", given_at: new Date().toISOString().split("T")[0], notes: "" });

  useGivingRecordsRealtime(tenantId || "", () => {
    queryClient.invalidateQueries({ queryKey: ["giving-stats"] });
    queryClient.invalidateQueries({ queryKey: ["recent-giving"] });
  });

  const { data: stats } = useQuery({
    queryKey: ["giving-stats", tenantId],
    queryFn: async () => {
      const now = new Date();
      const monthStart = startOfMonth(now).toISOString();
      const yearStart = startOfYear(now).toISOString();
      const todayStr = now.toISOString().split("T")[0];
      const [todayRes, monthRes, yearRes] = await Promise.all([
        supabase.from("giving_records").select("amount").eq("tenant_id", tenantId!).eq("payment_status", "confirmed").gte("given_at", todayStr),
        supabase.from("giving_records").select("amount").eq("tenant_id", tenantId!).eq("payment_status", "confirmed").gte("given_at", monthStart.split("T")[0]),
        supabase.from("giving_records").select("amount").eq("tenant_id", tenantId!).eq("payment_status", "confirmed").gte("given_at", yearStart.split("T")[0]),
      ]);
      const sum = (d: any) => (d.data || []).reduce((s: number, r: any) => s + Number(r.amount), 0);
      const monthData = monthRes.data || [];
      return { today: sum(todayRes), month: sum(monthRes), year: sum(yearRes), avg: monthData.length > 0 ? sum(monthRes) / monthData.length : 0 };
    },
    enabled: !!tenantId,
  });

  const { data: recentGiving = [] } = useQuery({
    queryKey: ["recent-giving", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("giving_records").select("*, donor_name, is_anonymous").eq("tenant_id", tenantId!).eq("payment_status", "confirmed").order("created_at", { ascending: false }).limit(10);
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["members-list", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("members").select("id, first_name, last_name").eq("tenant_id", tenantId!).order("first_name");
      return data || [];
    },
    enabled: !!tenantId,
  });

  const recordMutation = useMutation({
    mutationFn: async () => {
      const recordId = crypto.randomUUID();
      if (!tenantId) throw new Error("Tenant ID is required");
      if (!userId) throw new Error("User ID is required");
      if (!form.amount || parseFloat(form.amount) <= 0) throw new Error("Valid amount is required");
      const payload = {
        id: recordId,
        tenant_id: tenantId,
        member_id: isAnonymous ? null : (form.member_id || null),
        amount: parseFloat(form.amount),
        giving_type: form.giving_type,
        payment_method: form.payment_method,
        given_at: form.given_at,
        recorded_by: userId,
        currency: currency || "KES",
      };
      if (isAnonymous || !form.member_id) delete payload.member_id;
      const { error } = await supabase.from("giving_records").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["giving-stats"] });
      queryClient.invalidateQueries({ queryKey: ["recent-giving"] });
      toast.success("Giving recorded successfully! 🎉", { duration: 4000, style: { background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", color: "white", borderRadius: "12px", padding: "16px", fontWeight: "600" } });
      setSheetOpen(false);
      setForm({ member_id: "", amount: "", giving_type: "offering", payment_method: "cash", payment_reference: "", given_at: new Date().toISOString().split("T")[0], notes: "" });
    },
    onError: (error: any) => {
      toast.error(`Failed to record giving: ${error.message || error.details || "Unknown error"}`, { duration: 6000, style: { background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)", color: "white", borderRadius: "12px", padding: "16px", fontWeight: "600" } });
    },
  });

  return (
    <>
      <Helmet><title>Give Online — Vestry</title></Helmet>

      <motion.div variants={pageVariants} initial="hidden" animate="visible" className="space-y-6">
        <Tabs defaultValue="overview">
          {/* Tab switcher */}
          <motion.div variants={cardVariants} className="mb-2">
            <TabsList className="h-11 bg-gray-100/80 rounded-2xl p-1 backdrop-blur-sm">
              <TabsTrigger value="overview" className="rounded-xl font-medium text-sm px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-purple-700">
                Overview
              </TabsTrigger>
              <TabsTrigger value="give" className="rounded-xl font-medium text-sm px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-purple-700">
                Give
              </TabsTrigger>
            </TabsList>
          </motion.div>

          {/* ── Overview tab ── */}
          <TabsContent value="overview" className="space-y-8 mt-0">
            {/* Page Header */}
            <motion.div variants={cardVariants} className="relative">
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }} transition={{ duration: 4, repeat: Infinity }}
                  className="absolute top-1/4 left-1/4 w-32 h-32 bg-purple-500 rounded-full blur-3xl" />
                <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.15, 0.1] }} transition={{ duration: 5, repeat: Infinity, delay: 2 }}
                  className="absolute bottom-1/3 right-1/4 w-24 h-24 bg-green-500 rounded-full blur-3xl" />
              </div>
              <PageHeader
                title="Give Online"
                subtitle="Accept digital offerings and tithes from your congregation"
                action={
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button onClick={() => setSheetOpen(true)} className="bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-700 hover:to-indigo-600 shadow-lg shadow-purple-500/25">
                      <Plus className="h-4 w-4 mr-2" />Record Giving
                    </Button>
                  </motion.div>
                }
              />
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: "Total Giving Today", amount: stats?.today || 0, icon: DollarSign, color: "from-green-500 to-emerald-600" },
                { title: "Total This Month", amount: stats?.month || 0, icon: TrendingUp, color: "from-blue-500 to-cyan-600" },
                { title: "Total This Year", amount: stats?.year || 0, icon: Calendar, color: "from-purple-500 to-indigo-600" },
                { title: "Average Gift", amount: stats?.avg || 0, icon: CreditCard, color: "from-amber-500 to-orange-600", subtitle: "This month" },
              ].map((stat) => (
                <motion.div key={stat.title} variants={cardVariants} whileHover={{ y: -4, scale: 1.02, transition: { type: "spring", stiffness: 400, damping: 25 } }}>
                  <Card className="relative overflow-hidden rounded-2xl border-2 border-white/20 bg-gradient-to-br from-white/90 to-white/60 backdrop-blur-md shadow-xl shadow-black/5 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-500">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                    <div className={`absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-r ${stat.color} opacity-20 rounded-full blur-2xl`} />
                    <CardContent className="relative p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-r ${stat.color} flex items-center justify-center shadow-lg`}>
                          <stat.icon className="w-6 h-6 text-white" />
                        </div>
                        <Sparkles className="w-5 h-5 text-gray-400" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                        <div className="text-2xl font-bold text-gray-900">
                          <NumberFlow value={stat.amount} format={{ style: "currency", currency: currency || "KES", minimumFractionDigits: 0, maximumFractionDigits: 0 }} transformTiming={{ duration: 1500, easing: "ease-out" }} />
                        </div>
                        {stat.subtitle && <p className="text-xs text-gray-500">{stat.subtitle}</p>}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Recent Donations */}
            <motion.div variants={cardVariants}>
              <Card className="relative overflow-hidden rounded-3xl border-2 border-white/20 bg-gradient-to-br from-white/90 to-white/60 backdrop-blur-md shadow-xl shadow-black/5">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                <CardHeader className="relative border-b border-gray-100/50 bg-gradient-to-r from-gray-50/80 to-white/40 backdrop-blur-sm">
                  <CardTitle className="flex items-center space-x-3 text-xl">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-white" />
                    </div>
                    <span className="bg-gradient-to-r from-gray-700 to-gray-600 bg-clip-text text-transparent">Recent Donations</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative p-0">
                  {recentGiving.length === 0 ? (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center py-16 text-center">
                      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                        <CreditCard className="w-10 h-10 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">No donations yet</h3>
                      <p className="text-gray-500 max-w-sm mx-auto mb-6">Record your first giving to get started with tracking donations</p>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button onClick={() => setSheetOpen(true)} className="bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-700 hover:to-indigo-600 shadow-lg shadow-purple-500/25">
                          <Plus className="w-4 h-4 mr-2" />Record First Giving
                        </Button>
                      </motion.div>
                    </motion.div>
                  ) : (
                    <div className="overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-b border-gray-100/50 bg-gray-50/50">
                            <TableHead className="font-semibold text-gray-700">Donor</TableHead>
                            <TableHead className="font-semibold text-gray-700">Amount</TableHead>
                            <TableHead className="font-semibold text-gray-700">Category</TableHead>
                            <TableHead className="font-semibold text-gray-700">Method</TableHead>
                            <TableHead className="font-semibold text-gray-700">Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <AnimatePresence>
                            {recentGiving.map((r: any, index: number) => {
                              const m = members.find((mb: any) => mb.id === r.member_id);
                              const memberName = m ? `${m.first_name} ${m.last_name}` : null;
                              const displayName = memberName || r.donor_name || 'Anonymous';
                              const isAnonymous = r.is_anonymous;
                              
                              return (
                                <motion.tr key={r.id} variants={tableRowVariants} initial="hidden" animate="visible"
                                  transition={{ delay: index * 0.05 }} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                  <TableCell>
                                    {displayName !== 'Anonymous' ? (
                                      <div className="flex items-center gap-3">
                                        <MemberAvatar name={displayName} size="sm" />
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-medium">{displayName}</span>
                                          {isAnonymous && (
                                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">
                                              Anonymous
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                          <Users className="w-4 h-4 text-gray-400" />
                                        </div>
                                        <span className="text-gray-500 italic">Anonymous</span>
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <span className="text-lg font-bold text-emerald-600">
                                      <NumberFlow value={Number(r.amount)} format={{ style: "currency", currency: currency || "KES", minimumFractionDigits: 0, maximumFractionDigits: 0 }} transformTiming={{ duration: 800, easing: "ease-out" }} />
                                    </span>
                                  </TableCell>
                                  <TableCell><TransactionBadge type={r.giving_type} /></TableCell>
                                  <TableCell><PaymentMethodIcon method={r.payment_method} /></TableCell>
                                  <TableCell className="text-sm text-gray-600">
                                    {r.created_at ? new Date(r.created_at).toLocaleString('en-KE', {
                                      timeZone: 'Africa/Nairobi',
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      hour12: true
                                    }) : "—"}
                                  </TableCell>
                                </motion.tr>
                              );
                            })}
                          </AnimatePresence>
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Record Giving Sheet */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetContent className="overflow-y-auto">
                <SheetHeader><SheetTitle>Record Giving</SheetTitle></SheetHeader>
                <div className="space-y-4 mt-4">
                  <div className="flex items-center gap-2">
                    <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
                    <Label>Anonymous donation</Label>
                  </div>
                  {!isAnonymous && (
                    <div>
                      <Label>Donor</Label>
                      <Select value={form.member_id} onValueChange={v => setForm(p => ({ ...p, member_id: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                        <SelectContent>{members.map((mb: any) => <SelectItem key={mb.id} value={mb.id}>{mb.first_name} {mb.last_name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                  <div><Label>Amount</Label><Input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" /></div>
                  <div>
                    <Label>Category</Label>
                    <Select value={form.giving_type} onValueChange={v => setForm(p => ({ ...p, giving_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{GIVING_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Payment Method</Label>
                    <Select value={form.payment_method} onValueChange={v => setForm(p => ({ ...p, payment_method: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {form.payment_method === "mpesa" && <div><Label>M-Pesa Reference</Label><Input value={form.payment_reference} onChange={e => setForm(p => ({ ...p, payment_reference: e.target.value }))} /></div>}
                  <div><Label>Date</Label><Input type="date" value={form.given_at} onChange={e => setForm(p => ({ ...p, given_at: e.target.value }))} /></div>
                  <Button className="w-full" onClick={() => recordMutation.mutate()} disabled={!form.amount || recordMutation.isPending}>
                    {recordMutation.isPending ? "Recording..." : "Record Giving"}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </TabsContent>

          {/* ── Give tab ── */}
          <TabsContent value="give" className="mt-0">
            <AdminGive />
          </TabsContent>
        </Tabs>
      </motion.div>
    </>
  );
};

export default GiveOnline;
