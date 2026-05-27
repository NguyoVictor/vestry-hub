import { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useMemberPortal } from "@/contexts/MemberPortalContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import NumberFlow from "@/components/finance/AnimatedNumber";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { formatCurrencyFull } from "@/lib/format";
import {
  Heart,
  CheckCircle2,
  Download,
  RefreshCw,
  Smartphone,
  Loader2,
  X,
  Clock,
  Sparkles,
  DollarSign,
  Zap,
  Shield,
  AlertCircle
} from "lucide-react";

const QUICK_AMOUNTS = [500, 1000, 2500, 5000];
const CATEGORIES = ["tithe", "offering", "pledge_payment", "special_donation"];

// Premium page animations
const pageVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
      staggerChildren: 0.08
    }
  }
}

const cardVariants = {
  hidden: { opacity: 0, y: 32, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 25
    }
  }
}

const floatingVariants = {
  animate: {
    y: [-3, 3, -3],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut" as const
    }
  }
}

export default function MemberGive() {
  const member = useMemberPortal();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("offering");
  const [paymentMethod, setPaymentMethod] = useState("mpesa");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dedication, setDedication] = useState("");
  const [success, setSuccess] = useState<any>(null);
  const [stkPushState, setStkPushState] = useState<{
    isActive: boolean;
    checkoutRequestId?: string;
    givingRecordId?: string;
    countdown: number;
    terminalState?: 'expired' | 'cancelled' | 'failed' | null;
  }>({ isActive: false, countdown: 90, terminalState: null });

  // Auto-fill phone number from member profile
  useEffect(() => {
    if (member.phone) {
      setPhoneNumber(member.phone);
    }
  }, [member.phone]);

  // STK Push countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (stkPushState.isActive && stkPushState.countdown > 0) {
      interval = setInterval(() => {
        setStkPushState(prev => ({
          ...prev,
          countdown: prev.countdown - 1
        }));
      }, 1000);
    } else if (stkPushState.countdown === 0 && !stkPushState.terminalState) {
      setStkPushState(prev => ({ ...prev, terminalState: 'expired' }));
    }
    return () => clearInterval(interval);
  }, [stkPushState.isActive, stkPushState.countdown]);

  // Listen for payment outcome via postgres_changes on the specific giving_records row.
  // The webhook always UPDATEs the row (never deletes), so this fires reliably.
  // void_reason carries the granular reason: 'cancelled' | 'expired' | 'failed'.
  useEffect(() => {
    if (!stkPushState.givingRecordId) return;

    const channel = supabase
      .channel(`payment-status-${stkPushState.givingRecordId}`)
      .on(
        'postgres_changes' as any,
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'giving_records',
          filter: `id=eq.${stkPushState.givingRecordId}`,
        },
        (payload: any) => {
          const row = payload.new;
          const status: string = row.payment_status;

          if (status === 'confirmed') {
            setStkPushState({ isActive: false, countdown: 90, terminalState: null });
            setSuccess({
              amount: row.amount,
              giving_type: category,
              donation_date: new Date().toISOString(),
              mpesa_receipt: row.mpesa_receipt || null,
            });
            queryClient.invalidateQueries({ queryKey: ['member-giving', member.memberId] });
            queryClient.invalidateQueries({ queryKey: ['member-all-giving', member.memberId] });
          } else if (status === 'cancelled') {
            setStkPushState(prev => ({ ...prev, terminalState: 'cancelled' }));
          } else if (status === 'failed') {
            setStkPushState(prev => ({ ...prev, terminalState: 'failed' }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [stkPushState.givingRecordId, category, queryClient, member.memberId]);

  // Polling fallback — queries the row every 2s to guarantee the UI reacts
  // even when the Realtime subscription hasn't established before the webhook fires.
  useEffect(() => {
    if (!stkPushState.isActive || !stkPushState.givingRecordId || stkPushState.terminalState) return;

    const recordId = stkPushState.givingRecordId;

    const interval = setInterval(async () => {
      const { data: row } = await supabase
        .from('giving_records')
        .select('payment_status, amount, mpesa_receipt')
        .eq('id', recordId)
        .single();

      if (!row) return;

      if (row.payment_status === 'confirmed') {
        setStkPushState({ isActive: false, countdown: 90, terminalState: null });
        setSuccess({
          amount: row.amount,
          giving_type: category,
          donation_date: new Date().toISOString(),
          mpesa_receipt: row.mpesa_receipt || null,
        });
        queryClient.invalidateQueries({ queryKey: ['member-giving', member.memberId] });
        queryClient.invalidateQueries({ queryKey: ['member-all-giving', member.memberId] });
      } else if (row.payment_status === 'cancelled') {
        setStkPushState(prev => ({ ...prev, terminalState: 'cancelled' }));
      } else if (row.payment_status === 'failed') {
        setStkPushState(prev => ({ ...prev, terminalState: 'failed' }));
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [stkPushState.isActive, stkPushState.givingRecordId, stkPushState.terminalState, category, queryClient, member.memberId]);

  const { data: givingHistory = [], isLoading } = useQuery({
    queryKey: ["member-giving", member.memberId],
    queryFn: async () => {
      const { data } = await supabase
        .from("giving_records")
        .select("*")
        .eq("member_id", member.memberId)
        .in("payment_status", ["confirmed", "cancelled"])
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const give = useMutation({
    mutationFn: async () => {
      if (paymentMethod === "mpesa") {
        // Validate phone number
        const cleanPhone = phoneNumber.replace(/\s+/g, '');
        if (!cleanPhone.match(/^(07|01|\+254|254)/)) {
          throw new Error("Please enter a valid Kenyan phone number");
        }

        // CRITICAL: Check if church has configured PayHero channel BEFORE attempting STK push
        console.log('Checking PayHero channel configuration for church:', member.churchId);
        
        const { data: tenantData, error: tenantError } = await supabase
          .from('tenants')
          .select('payhero_connected, name')
          .eq('id', member.churchId)
          .single();

        if (tenantError) {
          console.error('Failed to fetch church data:', tenantError);
          throw new Error('Unable to verify payment configuration. Please try again.');
        }

        if (!tenantData.payhero_connected) {
          throw new Error('Payments not configured. Please contact church admin to set up M-Pesa donations in Settings → Payments.');
        }

        // Call process-stk-push Edge Function
        const { data, error } = await supabase.functions.invoke('process-stk-push', {
          body: {
            amount: Number(amount),
            phone_number: cleanPhone,
            tenant_id: member.churchId,
            member_id: member.memberId,
            donor_name: `${member.firstName} ${member.lastName}`,
            giving_type: category,
            notes: dedication || null
          }
        });

        console.log('Payment initiation response:', { data, error });

        if (error) {
          console.error('Payment initiation error:', error);
          throw new Error(error.message || 'Payment initiation failed');
        }
        
        if (!data || !data.success) {
          console.error('Payment failed:', data);
          throw new Error(data?.error || data?.details || 'Payment initiation failed');
        }
        
        return data;
      } else {
        // Cash payment - direct insert
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await supabase.from("giving_records").insert({
          tenant_id: member.churchId,
          member_id: member.memberId,
          amount: Number(amount),
          giving_type: category as any,
          payment_method: paymentMethod as any,
          payment_status: 'confirmed' as any,
          given_at: new Date().toISOString(),
          notes: dedication || null,
          currency: "KES",
        } as any).select().single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data) => {
      if (paymentMethod === 'mpesa') {
        const checkoutId = data?.data?.CheckoutRequestID ?? data?.CheckoutRequestID;
        const recordId = data?.data?.giving_record_id ?? data?.giving_record_id;
        setStkPushState({
          isActive: true,
          checkoutRequestId: checkoutId,
          givingRecordId: recordId,
          countdown: 90,
          terminalState: null
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ['member-giving', member.memberId] });
        setSuccess(data);
        setAmount('');
        setDedication('');
      }
    },
    onError: (error: any) => {
      console.error('Payment error:', error);
      
      // Handle specific error cases with clear messaging
      let errorMessage = error.message || "Failed to process payment";
      let toastStyle = {
        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        color: 'white',
        borderRadius: '12px',
        padding: '16px',
        fontWeight: '600'
      };

      if (error.message?.includes('Payments not configured')) {
        errorMessage = "💳 Church admin needs to set up M-Pesa payments first. Please contact your church admin.";
        toastStyle.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
      } else if (error.message?.includes('Payment setup in progress')) {
        errorMessage = "⏳ Payment setup is in progress. Please try again in a few minutes or contact church admin.";
        toastStyle.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
      } else if (error.message?.includes('service temporarily unavailable')) {
        errorMessage = "💳 Payment service is temporarily unavailable. Please try again in a few minutes or contact support.";
        toastStyle.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
      } else if (error.message?.includes('Invalid phone number')) {
        errorMessage = "📱 Please check your phone number and try again.";
      } else if (error.message?.includes('Payment channel unavailable')) {
        errorMessage = "🔄 M-Pesa service is currently unavailable. Please try again later.";
        toastStyle.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
      }

      toast.error(errorMessage, {
        duration: 6000,
        style: toastStyle
      });
      setStkPushState({ isActive: false, countdown: 90, terminalState: null });
    },
  });

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const maskPhoneNumber = (phone: string) => {
    if (phone.length < 4) return phone;
    const start = phone.slice(0, 4);
    const end = phone.slice(-2);
    const middle = 'X'.repeat(phone.length - 6);
    return `${start}${middle}${end}`;
  };

  const generateReceipt = () => {
    if (!success) return;

    const doc = new jsPDF({ format: 'a5', unit: 'mm' });
    const W = 148;

    // ── Dark header background ────────────────────────────────────────────────
    doc.setFillColor(30, 27, 75); // deep indigo #1e1b4b
    doc.rect(0, 0, W, 56, 'F');

    // Orange accent bar at bottom of header
    doc.setFillColor(249, 115, 22); // #f97316
    doc.rect(0, 56, W, 2.5, 'F');

    // Church initials avatar circle
    const words = (member.churchName || 'CH').trim().split(/\s+/);
    const initials = words.slice(0, 2).map((w) => w[0] || '').join('').toUpperCase();
    doc.setFillColor(124, 58, 237); // #7c3aed
    doc.circle(W / 2, 17, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(initials.length > 1 ? 9 : 12);
    doc.setTextColor(255, 255, 255);
    doc.text(initials, W / 2, 20.5, { align: 'center' });

    // Church name
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(member.churchName || 'Your Church', W / 2, 36, { align: 'center', maxWidth: W - 20 });

    // Subtitle
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(167, 139, 250); // light purple #a78bfa
    doc.text('OFFICIAL GIVING RECEIPT', W / 2, 47, { align: 'center' });

    // ── Amount section ────────────────────────────────────────────────────────
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128); // gray
    doc.text('AMOUNT PAID', W / 2, 70, { align: 'center' });

    const formattedAmount = new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(success.amount));

    doc.setFontSize(26);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 163, 74); // green #16a34a
    doc.text(formattedAmount, W / 2, 83, { align: 'center' });

    const categoryLabel = (success.giving_type || '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(124, 58, 237); // purple
    doc.text(categoryLabel, W / 2, 91, { align: 'center' });

    // ── Purple section divider ────────────────────────────────────────────────
    doc.setDrawColor(124, 58, 237);
    doc.setLineWidth(0.5);
    doc.line(14, 97, W - 14, 97);

    // ── Details rows ──────────────────────────────────────────────────────────
    const lx = 16;
    const vx = W - 16;
    let y = 110;
    const gap = 15;

    const drawRow = (label: string, value: string, highlight = false) => {
      if (highlight && value) {
        doc.setFillColor(240, 253, 244); // very light green
        doc.setDrawColor(134, 239, 172);
        doc.setLineWidth(0.3);
        doc.roundedRect(lx - 2, y - 7, W - 28, 13, 2, 2, 'FD');
      }
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(107, 114, 128);
      doc.text(label.toUpperCase(), lx, y);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      if (highlight) {
        doc.setTextColor(21, 128, 61); // dark green for highlighted
      } else {
        doc.setTextColor(31, 41, 55);
      }
      doc.text(value || '—', vx, y + 5.5, { align: 'right' });
      y += gap;
    };

    const donorName = `${member.firstName || ''} ${member.lastName || ''}`.trim();
    const dateStr = format(new Date(success.donation_date || new Date()), 'dd MMM yyyy, HH:mm');

    drawRow('Donor Name', donorName);
    drawRow('Payment Method', 'M-Pesa');
    if (success.mpesa_receipt) drawRow('M-Pesa Receipt No.', success.mpesa_receipt, true);
    drawRow('Date & Time', dateStr);
    drawRow('Category', categoryLabel);

    // ── Footer ────────────────────────────────────────────────────────────────
    const footerTop = Math.max(y + 10, 173);

    doc.setFillColor(249, 115, 22); // orange accent
    doc.rect(0, footerTop, W, 1.5, 'F');

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(55, 65, 81);
    doc.text(
      `Thank you for your generous giving to ${member.churchName || 'the church'}.`,
      W / 2,
      footerTop + 12,
      { align: 'center', maxWidth: W - 20 }
    );

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(156, 163, 175);
    doc.text(
      'This is an official receipt. Please keep for your records.',
      W / 2,
      footerTop + 21,
      { align: 'center' }
    );

    // ── Save ──────────────────────────────────────────────────────────────────
    const ref = success.mpesa_receipt || format(new Date(success.donation_date || new Date()), 'yyyyMMdd');
    doc.save(`Vestry-Receipt-${ref}.pdf`);
  };

  // Premium Success Screen
  if (success) {
    return (
      <>
        <Helmet><title>Give Online — Vestry</title></Helmet>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-md mx-auto flex flex-col items-center justify-center min-h-[70vh] text-center space-y-8 p-6"
        >
          {/* Floating background elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.1, 0.2, 0.1]
              }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute top-1/4 left-1/4 w-32 h-32 bg-green-500 rounded-full blur-3xl"
            />
            <motion.div
              animate={{ 
                scale: [1, 1.3, 1],
                opacity: [0.1, 0.15, 0.1]
              }}
              transition={{ duration: 5, repeat: Infinity, delay: 2 }}
              className="absolute bottom-1/3 right-1/4 w-24 h-24 bg-purple-500 rounded-full blur-3xl"
            />
          </div>

          {/* Animated Success Icon */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ 
              type: 'spring', 
              stiffness: 200, 
              damping: 15,
              delay: 0.2 
            }}
            className="relative"
          >
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-2xl shadow-emerald-500/30">
              <CheckCircle2 className="w-12 h-12 text-white" />
            </div>
            
            {/* Success rings */}
            <motion.div
              animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-full border-4 border-emerald-400"
            />
            <motion.div
              animate={{ scale: [1, 1.8, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
              className="absolute inset-0 rounded-full border-4 border-emerald-300"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="space-y-4"
          >
            <h2 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
              Thank you for your generosity! 🙏
            </h2>
            <div className="space-y-2">
              <p className="text-2xl font-bold text-emerald-600">
                <NumberFlow 
                  value={Number(success.amount)} 
                  format={{ 
                    style: 'currency', 
                    currency: 'KES',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  }}
                  transformTiming={{ duration: 1500, easing: 'ease-out' }}
                />
              </p>
              <p className="text-gray-600 font-medium">
                {success.giving_type?.replace(/_/g, " ")} • {format(new Date(success.donation_date), "dd MMM yyyy")}
              </p>
              {success.mpesa_receipt && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1 }}
                  className="inline-flex items-center space-x-2 bg-green-50 px-4 py-2 rounded-2xl border border-green-200"
                >
                  <Shield className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-700 font-medium">
                    Receipt: <span className="font-mono">{success.mpesa_receipt}</span>
                  </span>
                </motion.div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            className="flex gap-4 w-full max-w-sm"
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex-1"
            >
              <Button
                variant="outline"
                className="w-full h-12 rounded-2xl border-2 border-gray-200 hover:border-gray-300 bg-white/80 backdrop-blur-sm font-semibold"
                onClick={generateReceipt}
              >
                <Download className="h-4 w-4 mr-2" />
                Receipt
              </Button>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex-1"
            >
              <Button 
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-700 hover:to-indigo-600 shadow-lg shadow-purple-500/25 font-semibold text-white border-0" 
                onClick={() => setSuccess(null)}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Give Again
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      </>
    );
  }

  // Premium STK Push Waiting Screen
  if (stkPushState.isActive) {
    return (
      <>
        <Helmet><title>Complete Payment — Vestry</title></Helmet>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-lg z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 100 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="relative bg-white/95 backdrop-blur-xl rounded-3xl p-10 max-w-sm w-full text-center space-y-8 shadow-2xl border border-white/20"
          >
            {/* Glassmorphism overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-white/10 rounded-3xl pointer-events-none" />
            
            {/* Floating gradient orbs */}
            <div className="absolute -top-8 -right-8 w-24 h-24 bg-green-500/30 rounded-full blur-2xl" />
            <div className="absolute -bottom-8 -left-8 w-20 h-20 bg-blue-500/20 rounded-full blur-2xl" />

            <div className="relative z-10 space-y-8">
              {stkPushState.terminalState ? (
                <motion.div
                  key="terminal"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  className="space-y-6 text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                    className="mx-auto w-20 h-20 rounded-full flex items-center justify-center"
                    style={{
                      background: stkPushState.terminalState === 'cancelled'
                        ? 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)'
                        : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                    }}
                  >
                    {stkPushState.terminalState === 'expired' && <Clock className="w-10 h-10 text-white" />}
                    {stkPushState.terminalState === 'cancelled' && <X className="w-10 h-10 text-white" />}
                    {stkPushState.terminalState === 'failed' && <AlertCircle className="w-10 h-10 text-white" />}
                  </motion.div>

                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-gray-800">
                      {stkPushState.terminalState === 'expired' && 'Time elapsed'}
                      {stkPushState.terminalState === 'cancelled' && 'Payment cancelled'}
                      {stkPushState.terminalState === 'failed' && 'Payment failed'}
                    </h3>
                    <p className="text-gray-500 text-sm">
                      {stkPushState.terminalState === 'expired' && 'The payment request has expired. Please try again.'}
                      {stkPushState.terminalState === 'cancelled' && 'You cancelled the M-Pesa payment request.'}
                      {stkPushState.terminalState === 'failed' && 'The payment could not be processed. Please try again.'}
                    </p>
                  </div>

                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      className="w-full h-12 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-700 hover:to-indigo-600 shadow-lg shadow-purple-500/25 font-semibold text-white border-0"
                      onClick={() => setStkPushState({ isActive: false, countdown: 90, terminalState: null })}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Try Again
                    </Button>
                  </motion.div>
                </motion.div>
              ) : (
              <>
              {/* Animated Phone Icon */}
              <motion.div
                animate={{ 
                  scale: [1, 1.15, 1],
                  rotate: [0, 8, -8, 0]
                }}
                transition={{ 
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="relative"
              >
                <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-green-500/30">
                  <Smartphone className="w-10 h-10 text-white" />
                </div>
                
                {/* Pulsing rings */}
                <motion.div
                  animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 rounded-3xl border-2 border-green-400"
                />
                <motion.div
                  animate={{ scale: [1, 2.2, 1], opacity: [0.4, 0, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                  className="absolute inset-0 rounded-3xl border-2 border-green-300"
                />
              </motion.div>

              <div className="space-y-4">
                <motion.h3
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent"
                >
                  Check your phone 📱
                </motion.h3>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-2"
                >
                  <p className="text-gray-600">
                    We sent a payment request to
                  </p>
                  <div className="inline-flex items-center space-x-2 bg-green-50 px-4 py-2 rounded-2xl border border-green-200">
                    <Smartphone className="w-4 h-4 text-green-600" />
                    <span className="font-mono font-bold text-green-700">
                      {maskPhoneNumber(phoneNumber)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    Enter your M-Pesa PIN to complete your gift
                  </p>
                </motion.div>
              </div>

              {/* Countdown Timer */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
                className="flex items-center justify-center space-x-3 p-4 bg-amber-50/80 rounded-2xl border border-amber-200/50 backdrop-blur-sm"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                >
                  <Clock className="w-5 h-5 text-amber-600" />
                </motion.div>
                <span className="font-mono text-lg font-bold text-amber-700">
                  {formatCountdown(stkPushState.countdown)}
                </span>
                <span className="text-sm text-amber-600 font-medium">remaining</span>
              </motion.div>

              {/* Action Buttons */}
              <div className="space-y-4">
                {stkPushState.countdown < 120 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => give.mutate()}
                      disabled={give.isPending}
                      className="w-full h-12 rounded-2xl border-2 border-gray-200 hover:border-gray-300 bg-white/80 backdrop-blur-sm font-medium"
                    >
                      {give.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Resending...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Didn't receive it? Resend
                        </>
                      )}
                    </Button>
                  </motion.div>
                )}
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStkPushState({ isActive: false, countdown: 90, terminalState: null })}
                    className="w-full text-gray-500 hover:text-gray-700 hover:bg-gray-100/50 rounded-2xl h-12 font-medium"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel Payment
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

  return (
    <>
      <Helmet><title>Give Online — Vestry</title></Helmet>
      <motion.div 
        variants={pageVariants} 
        initial="hidden" 
        animate="visible"
        className="max-w-md mx-auto space-y-8"
      >
        {/* Premium Header */}
        <motion.div 
          variants={cardVariants}
          className="relative text-center space-y-4 py-6"
        >
          {/* Background Gradient Orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              variants={floatingVariants}
              animate="animate"
              className="absolute top-4 left-1/4 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl"
            />
            <motion.div
              variants={floatingVariants}
              animate="animate"
              style={{ animationDelay: '2s' }}
              className="absolute top-8 right-1/3 w-20 h-20 bg-pink-500/10 rounded-full blur-2xl"
            />
          </div>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, delay: 0.2 }}
            className="relative inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg shadow-purple-500/25 mb-4"
          >
            <Heart className="h-8 w-8 text-white" />
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-2xl bg-purple-400/30 blur-md"
            />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent"
          >
            Give to {member.churchName}
          </motion.h1>
        </motion.div>

        {/* Premium Giving Form */}
        <motion.div variants={cardVariants}>
          <Card className="relative rounded-3xl overflow-hidden border-2 border-white/20 bg-gradient-to-br from-white/90 to-white/60 backdrop-blur-md shadow-xl shadow-black/5">
            {/* Glassmorphism overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            
            <CardContent className="relative p-8 space-y-8">
              {/* Quick amounts with premium styling */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Label className="text-sm font-semibold text-gray-700 mb-4 block">Amount</Label>
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {QUICK_AMOUNTS.map((a, index) => (
                    <motion.button 
                      key={a} 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 + index * 0.05 }}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setAmount(String(a))} 
                      className={`py-3 rounded-2xl text-sm font-semibold border-2 transition-all duration-300 ${
                        amount === String(a) 
                          ? "bg-gradient-to-r from-purple-600 to-indigo-500 text-white border-purple-600 shadow-lg shadow-purple-500/25" 
                          : "border-gray-200 hover:border-purple-200 hover:bg-purple-50/50 bg-white/60 backdrop-blur-sm"
                      }`}
                    >
                      <NumberFlow 
                        value={a} 
                        format={{ 
                          style: 'currency', 
                          currency: 'KES',
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0
                        }}
                        transformTiming={{ duration: 600 }}
                      />
                    </motion.button>
                  ))}
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="Custom amount"
                    className="h-14 text-xl text-center rounded-2xl border-2 border-gray-100 focus:border-purple-300 bg-white/80 backdrop-blur-sm shadow-inner"
                    min="1"
                  />
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/5 to-indigo-500/5 pointer-events-none" />
                </div>
              </motion.div>

              {/* Category Selection */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="space-y-3"
              >
                <Label className="text-sm font-semibold text-gray-700">Giving Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-12 rounded-2xl border-2 border-gray-100 focus:border-purple-300 bg-white/80 backdrop-blur-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-2 border-gray-100 bg-white/95 backdrop-blur-xl">
                    {CATEGORIES.map(c => (
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

              {/* Payment Method Selection */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="space-y-3"
              >
                <Label className="text-sm font-semibold text-gray-700">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="h-12 rounded-2xl border-2 border-gray-100 focus:border-purple-300 bg-white/80 backdrop-blur-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-2 border-gray-100 bg-white/95 backdrop-blur-xl">
                    <SelectItem value="mpesa">
                      <div className="flex items-center space-x-2">
                        <Smartphone className="w-4 h-4 text-green-600" />
                        <span>M-Pesa</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="cash">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="w-4 h-4 text-blue-600" />
                        <span>Cash</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="bank_transfer">
                      <div className="flex items-center space-x-2">
                        <Zap className="w-4 h-4 text-purple-600" />
                        <span>Bank Transfer</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Payment method info */}
                {paymentMethod === "mpesa" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 bg-green-50/80 rounded-2xl border border-green-200/50 backdrop-blur-sm"
                  >
                    <div className="flex items-start space-x-3">
                      <Smartphone className="w-5 h-5 text-green-600 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-green-700">M-Pesa STK Push</p>
                        <p className="text-xs text-green-600">You'll receive a payment request on your phone</p>
                      </div>
                    </div>
                  </motion.div>
                )}
                
                {paymentMethod === "cash" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 bg-blue-50/80 rounded-2xl border border-blue-200/50 backdrop-blur-sm"
                  >
                    <div className="flex items-start space-x-3">
                      <DollarSign className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-blue-700">Cash Payment</p>
                        <p className="text-xs text-blue-600">Record a cash payment made to the church</p>
                      </div>
                    </div>
                  </motion.div>
                )}
                
                {paymentMethod === "bank_transfer" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 bg-purple-50/80 rounded-2xl border border-purple-200/50 backdrop-blur-sm"
                  >
                    <div className="flex items-start space-x-3">
                      <Zap className="w-5 h-5 text-purple-600 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-purple-700">Bank Transfer</p>
                        <p className="text-xs text-purple-600">Direct bank transfer to church account</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>

              {/* M-Pesa Phone Number Field */}
              <AnimatePresence>
                {paymentMethod === "mpesa" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -20 }}
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -20 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="space-y-3 pt-2"
                  >
                    <Label htmlFor="phoneNumber" className="text-sm font-semibold text-gray-700">
                      M-Pesa Number
                    </Label>
                    <div className="relative">
                      <Input
                        id="phoneNumber"
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="0712345678"
                        className="h-12 rounded-2xl border-2 border-gray-100 focus:border-green-300 bg-white/80 backdrop-blur-sm pl-12"
                      />
                      <Smartphone className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-600" />
                    </div>
                    <p className="text-xs text-gray-500 flex items-center space-x-1">
                      <Shield className="w-3 h-3" />
                      <span>You'll receive a secure payment prompt on this number</span>
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {paymentMethod === "cash" && (
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-gray-500 mt-2 p-3 bg-gray-50/80 rounded-2xl border border-gray-200/50"
                >
                  💰 Bring your envelope on Sunday. Your giving will be recorded by our finance team.
                </motion.p>
              )}

              {/* Dedication Field */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="space-y-3"
              >
                <Label className="text-sm font-semibold text-gray-700">
                  Dedication / Note <span className="text-gray-400 font-normal">(optional)</span>
                </Label>
                <Input 
                  value={dedication} 
                  onChange={e => setDedication(e.target.value)} 
                  placeholder="e.g. In memory of John, For special project" 
                  className="h-12 rounded-2xl border-2 border-gray-100 focus:border-purple-300 bg-white/80 backdrop-blur-sm" 
                />
              </motion.div>

              {/* Submit Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button 
                  className="w-full h-14 rounded-2xl text-base font-semibold bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-700 hover:to-indigo-600 shadow-xl shadow-purple-500/25 border-0 text-white" 
                  onClick={() => give.mutate()} 
                  disabled={
                    !amount || 
                    Number(amount) <= 0 || 
                    give.isPending ||
                    (paymentMethod === "mpesa" && !phoneNumber)
                  }
                >
                  {give.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                      {paymentMethod === "mpesa" ? "Sending STK Push..." : "Processing..."}
                    </>
                  ) : (
                    <>
                      <Heart className="w-5 h-5 mr-3" />
                      Give {amount ? (
                        <NumberFlow 
                          value={Number(amount)} 
                          format={{ 
                            style: 'currency', 
                            currency: 'KES',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                          }}
                          transformTiming={{ duration: 400 }}
                        />
                      ) : ""}
                    </>
                  )}
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Premium Giving History */}
        <motion.div
          variants={cardVariants}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <motion.h2
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.1 }}
              className="text-lg font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent"
            >
              Recent Giving
            </motion.h2>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.2 }}
            >
              <Link 
                to="/member/giving-history" 
                className="text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors"
              >
                View All →
              </Link>
            </motion.div>
          </div>

          {isLoading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.3 }}
            >
              <Skeleton className="h-40 w-full rounded-3xl" />
            </motion.div>
          ) : givingHistory.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.3 }}
            >
              <Card className="rounded-3xl border-2 border-dashed border-gray-200 bg-gradient-to-br from-gray-50/80 to-white/40 backdrop-blur-sm">
                <CardContent className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Heart className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500 font-medium">No giving history yet</p>
                  <p className="text-xs text-gray-400 mt-1">Your generosity will appear here</p>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {givingHistory.map((g: any, index: number) => (
                <motion.div
                  key={g.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ 
                    delay: 1.3 + index * 0.1,
                    type: 'spring',
                    stiffness: 300,
                    damping: 25
                  }}
                  whileHover={{ 
                    y: -2, 
                    scale: 1.02,
                    transition: { type: 'spring', stiffness: 400, damping: 25 }
                  }}
                  className="group"
                >
                  <Card className="relative overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-white/90 to-white/60 backdrop-blur-md shadow-lg shadow-black/5 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300">
                    {/* Glassmorphism overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                    
                    <CardContent className="relative p-5">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-3">
                            <motion.p 
                              className="text-sm font-semibold capitalize text-gray-800"
                              whileHover={{ scale: 1.05 }}
                            >
                              {g.giving_type?.replace(/_/g, " ")}
                            </motion.p>
                            
                            {g.payment_method === 'mpesa' && (
                              <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs border border-green-200">
                                <Smartphone className="w-3 h-3 mr-1" />
                                M-Pesa
                              </Badge>
                            )}
                            
                            {g.payment_status && (
                              <Badge
                                variant="secondary"
                                className={`text-xs border ${
                                  g.payment_status === 'confirmed'
                                    ? 'bg-green-100 text-green-700 border-green-200'
                                    : g.payment_status === 'cancelled'
                                    ? 'bg-gray-100 text-gray-600 border-gray-200'
                                    : 'bg-red-100 text-red-700 border-red-200'
                                }`}
                              >
                                {g.payment_status === 'confirmed' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                {g.payment_status === 'cancelled' && <X className="w-3 h-3 mr-1" />}
                                {g.payment_status}
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-xs text-gray-500 flex items-center space-x-2">
                            <span>
                              {new Date(g.created_at || g.donation_date).toLocaleString('en-KE', {
                                timeZone: 'Africa/Nairobi',
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </span>
                            <span>•</span>
                            <span className="capitalize">{g.payment_method}</span>
                          </p>
                        </div>
                        
                        <motion.span 
                          className="text-lg font-bold text-emerald-600"
                          whileHover={{ scale: 1.1 }}
                          transition={{ type: 'spring', stiffness: 400 }}
                        >
                          <NumberFlow 
                            value={Number(g.amount)} 
                            format={{ 
                              style: 'currency', 
                              currency: g.currency || 'KES',
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0
                            }}
                            transformTiming={{ duration: 800, easing: 'ease-out' }}
                          />
                        </motion.span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </>
  );
}
