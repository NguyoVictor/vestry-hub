import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import NumberFlow from "@/components/finance/AnimatedNumber";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { usePermissions } from '@/hooks/usePermissions';
import { ReadOnlyBanner } from '@/components/shared/ReadOnlyBanner';
import { PermissionButton } from '@/components/shared/PermissionButton';
import { PageHeader } from "@/components/layout/PageHeader";
import { PaymentMethodIcon } from "@/components/finance/PaymentMethodIcon";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "react-hot-toast";
import { ArrowUpRight, Plus, TrendingDown, Calendar, Sparkles, Send, Clock, CheckCircle } from "lucide-react";
import { format, startOfMonth, startOfYear } from "date-fns";
import { formatCurrencyFull } from "@/lib/format";

// Premium page animations
const pageVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { 
      duration: 0.6, 
      ease: [0.22, 1, 0.36, 1], 
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
      type: 'spring', 
      stiffness: 300, 
      damping: 25 
    } 
  }
}

const tableRowVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { 
      type: 'spring', 
      stiffness: 400, 
      damping: 25 
    } 
  }
}

const Payouts = () => {
  const { tenantId, currency, userId } = useChurch();
  const queryClient = useQueryClient();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('financial_records');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState({ recipient_name: "", amount: "", payment_method: "bank_transfer", payment_status: "pending", reference: "", notes: "", currency: "KES" });

  const { data: payouts = [], isLoading } = useQuery({
    queryKey: ["payouts", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("payouts").select("*").eq("tenant_id", tenantId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const monthTotal = payouts.filter((p: any) => new Date(p.created_at) >= startOfMonth(new Date())).reduce((s: number, p: any) => s + Number(p.amount), 0);
  const yearTotal = payouts.filter((p: any) => new Date(p.created_at) >= startOfYear(new Date())).reduce((s: number, p: any) => s + Number(p.amount), 0);
  const pendingCount = payouts.filter((p: any) => p.payment_status === "pending").length;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("payouts").insert({
        tenant_id: tenantId, recipient_name: form.recipient_name, amount: parseFloat(form.amount),
        payment_method: form.payment_method as any, payment_status: form.payment_status as any,
        reference: form.reference, notes: form.notes, currency, created_by: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["payouts"] }); 
      toast.success("Payout recorded successfully! 💸", {
        duration: 4000,
        style: {
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white',
          borderRadius: '12px',
          padding: '16px',
          fontWeight: '600'
        }
      }); 
      setSheetOpen(false); 
      setForm({ recipient_name: "", amount: "", payment_method: "bank_transfer", payment_status: "pending", reference: "", notes: "", currency: "KES" }); 
    },
    onError: () => toast.error("Failed to record payout", {
      duration: 4000,
      style: {
        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        color: 'white',
        borderRadius: '12px',
        padding: '16px',
        fontWeight: '600'
      }
    }),
  });

  const columns: Column<any>[] = [
    { key: "recipient_name", header: "Recipient", sortable: true, render: r => <span className="font-medium">{r.recipient_name}</span> },
    { key: "amount", header: "Amount", sortable: true, render: r => <span className="font-semibold text-destructive">{formatCurrencyFull(Number(r.amount), currency)}</span>, exportValue: r => String(r.amount) },
    { key: "payment_method", header: "Method", render: r => <PaymentMethodIcon method={r.payment_method || "cash"} /> },
    { key: "reference", header: "Reference", render: r => <span className="text-xs text-muted-foreground font-mono">{r.reference || "—"}</span> },
    { key: "created_at", header: "Date", sortable: true, render: r => <span className="text-sm text-muted-foreground">{r.created_at ? format(new Date(r.created_at), "dd MMM yyyy") : "—"}</span> },
    { key: "payment_status", header: "Status", sortable: true, render: r => <StatusBadge status={r.payment_status || "pending"} /> },
  ];

  return (
    <>
      <Helmet><title>Payouts — Vestry</title></Helmet>
      
      <motion.div 
        variants={pageVariants} 
        initial="hidden" 
        animate="visible"
        className="space-y-8"
      >
        {/* Premium Page Header */}
        <motion.div
          variants={cardVariants}
          className="relative"
        >
          {/* Background gradient orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.1, 0.2, 0.1]
              }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute top-1/4 left-1/4 w-32 h-32 bg-red-500 rounded-full blur-3xl"
            />
            <motion.div
              animate={{ 
                scale: [1, 1.3, 1],
                opacity: [0.1, 0.15, 0.1]
              }}
              transition={{ duration: 5, repeat: Infinity, delay: 2 }}
              className="absolute bottom-1/3 right-1/4 w-24 h-24 bg-orange-500 rounded-full blur-3xl"
            />
          </div>

          <PageHeader 
            title="Payouts" 
            subtitle="View and manage outgoing church payments and transfers" 
            action={
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <PermissionButton 
                  readOnly={readOnly}
                  onClick={() => setSheetOpen(true)}
                  className="bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 shadow-lg shadow-red-500/25"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Record Payout
                </PermissionButton>
              </motion.div>
            } 
          />
        </motion.div>

        {readOnly && <ReadOnlyBanner section="Financial Records" />}

        {/* Premium Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { title: "Payouts This Month", amount: monthTotal, icon: TrendingDown, color: "from-red-500 to-rose-600", subtitle: "Monthly outflow" },
            { title: "Payouts This Year", amount: yearTotal, icon: ArrowUpRight, color: "from-orange-500 to-amber-600", subtitle: "Annual outflow" },
            { title: "Pending Payouts", amount: pendingCount, icon: Clock, color: "from-yellow-500 to-amber-600", subtitle: "Awaiting processing", isCurrency: false }
          ].map((stat, index) => (
            <motion.div
              key={stat.title}
              variants={cardVariants}
              whileHover={{ 
                y: -4, 
                scale: 1.02,
                transition: { type: 'spring', stiffness: 400, damping: 25 }
              }}
            >
              <Card className="relative overflow-hidden rounded-2xl border-2 border-white/20 bg-gradient-to-br from-white/90 to-white/60 backdrop-blur-md shadow-xl shadow-black/5 hover:shadow-2xl hover:shadow-red-500/10 transition-all duration-500">
                {/* Glassmorphism overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                
                {/* Gradient orb */}
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
                      {stat.isCurrency === false ? (
                        <NumberFlow 
                          value={stat.amount} 
                          format={{ 
                            style: 'decimal',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                          }}
                          transformTiming={{ duration: 1500, easing: 'ease-out' }}
                        />
                      ) : (
                        <NumberFlow 
                          value={stat.amount} 
                          format={{ 
                            style: 'currency', 
                            currency: currency || 'KES',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                          }}
                          transformTiming={{ duration: 1500, easing: 'ease-out' }}
                        />
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{stat.subtitle}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Premium Payouts Table */}
        <motion.div variants={cardVariants}>
          <Card className="relative overflow-hidden rounded-3xl border-2 border-white/20 bg-gradient-to-br from-white/90 to-white/60 backdrop-blur-md shadow-xl shadow-black/5">
            {/* Glassmorphism overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            
            <CardHeader className="relative border-b border-gray-100/50 bg-gradient-to-r from-gray-50/80 to-white/40 backdrop-blur-sm">
              <CardTitle className="flex items-center space-x-3 text-xl">
                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl flex items-center justify-center">
                  <Send className="w-5 h-5 text-white" />
                </div>
                <span className="bg-gradient-to-r from-gray-700 to-gray-600 bg-clip-text text-transparent">
                  Recent Payouts
                </span>
              </CardTitle>
            </CardHeader>
            
            <CardContent className="relative p-0">
              {payouts.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center py-16 text-center"
                >
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                    <ArrowUpRight className="w-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No payouts recorded</h3>
                  <p className="text-gray-500 max-w-sm mx-auto mb-6">
                    Record your first payout to start tracking outgoing payments
                  </p>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <PermissionButton 
                      permission="financial_records"
                      readOnly={readOnly}
                      onClick={() => setSheetOpen(true)}
                      className="bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 shadow-lg shadow-red-500/25"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Record First Payout
                    </PermissionButton>
                  </motion.div>
                </motion.div>
              ) : (
                <div className="overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-gray-100/50 bg-gray-50/50">
                        <TableHead className="font-semibold text-gray-700">Recipient</TableHead>
                        <TableHead className="font-semibold text-gray-700">Amount</TableHead>
                        <TableHead className="font-semibold text-gray-700">Method</TableHead>
                        <TableHead className="font-semibold text-gray-700">Reference</TableHead>
                        <TableHead className="font-semibold text-gray-700">Date</TableHead>
                        <TableHead className="font-semibold text-gray-700">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {payouts.map((payout: any, index: number) => (
                          <motion.tr
                            key={payout.id}
                            variants={tableRowVariants}
                            initial="hidden"
                            animate="visible"
                            transition={{ delay: index * 0.05 }}
                            className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                          >
                            <TableCell>
                              <span className="font-medium text-gray-900">{payout.recipient_name}</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-lg font-bold text-red-600">
                                <NumberFlow 
                                  value={Number(payout.amount)} 
                                  format={{ 
                                    style: 'currency', 
                                    currency: currency || 'KES',
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0
                                  }}
                                  transformTiming={{ duration: 800, easing: 'ease-out' }}
                                />
                              </span>
                            </TableCell>
                            <TableCell>
                              <PaymentMethodIcon method={payout.payment_method || "cash"} />
                            </TableCell>
                            <TableCell>
                              <span className="text-xs text-gray-500 font-mono">
                                {payout.reference || "—"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-gray-600">
                                {payout.created_at ? format(new Date(payout.created_at), "dd MMM yyyy") : "—"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={payout.payment_status || "pending"} />
                            </TableCell>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-md">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, type: 'spring', stiffness: 300, damping: 25 }}
          >
            <SheetHeader className="pb-6">
              <SheetTitle className="text-xl font-semibold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                Record New Payout
              </SheetTitle>
            </SheetHeader>
            
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-2"
              >
                <Label className="text-sm font-medium text-gray-700">Recipient Name</Label>
                <Input 
                  value={form.recipient_name} 
                  onChange={e => setForm(p => ({ ...p, recipient_name: e.target.value }))}
                  className="h-11 border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/10 transition-all duration-200"
                  placeholder="Enter recipient name"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-2"
              >
                <Label className="text-sm font-medium text-gray-700">Amount ({currency})</Label>
                <Input 
                  type="number" 
                  value={form.amount} 
                  onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                  className="h-11 border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/10 transition-all duration-200"
                  placeholder="0.00"
                  step="0.01"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-2"
              >
                <Label className="text-sm font-medium text-gray-700">Payment Method</Label>
                <Select value={form.payment_method} onValueChange={v => setForm(p => ({ ...p, payment_method: v }))}>
                  <SelectTrigger className="h-11 border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["bank_transfer","mpesa","cash","cheque"].map(method => (
                      <SelectItem key={method} value={method}>
                        {method.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-2"
              >
                <Label className="text-sm font-medium text-gray-700">Reference</Label>
                <Input 
                  value={form.reference} 
                  onChange={e => setForm(p => ({ ...p, reference: e.target.value }))}
                  className="h-11 border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/10 transition-all duration-200"
                  placeholder="Transaction reference"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-2"
              >
                <Label className="text-sm font-medium text-gray-700">Status</Label>
                <Select value={form.payment_status} onValueChange={v => setForm(p => ({ ...p, payment_status: v }))}>
                  <SelectTrigger className="h-11 border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["processed","pending","failed","cancelled"].map(status => (
                      <SelectItem key={status} value={status}>
                        <div className="flex items-center space-x-2">
                          {status === 'processed' && <CheckCircle className="w-3 h-3 text-green-500" />}
                          {status === 'pending' && <Clock className="w-3 h-3 text-yellow-500" />}
                          {status === 'failed' && <ArrowUpRight className="w-3 h-3 text-red-500" />}
                          {status === 'cancelled' && <ArrowUpRight className="w-3 h-3 text-gray-500" />}
                          <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="space-y-2"
              >
                <Label className="text-sm font-medium text-gray-700">Notes</Label>
                <Textarea 
                  value={form.notes} 
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  className="min-h-[80px] border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/10 transition-all duration-200"
                  placeholder="Additional notes about this payout"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="pt-4"
              >
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button 
                    className="w-full h-12 bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 shadow-lg shadow-red-500/25 text-white font-semibold transition-all duration-200" 
                    onClick={() => saveMutation.mutate()} 
                    disabled={!form.recipient_name || !form.amount || saveMutation.isPending}
                  >
                    {saveMutation.isPending ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Saving...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Send className="w-4 h-4" />
                        <span>Record Payout</span>
                      </div>
                    )}
                  </Button>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default Payouts;
