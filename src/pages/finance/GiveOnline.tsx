import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import NumberFlow from "@/components/finance/AnimatedNumber";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { useGivingRecordsRealtime } from "@/hooks/useFinanceRealtime";
import { PageHeader } from "@/components/layout/PageHeader";
import { FinanceStatCard } from "@/components/finance/FinanceStatCard";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "react-hot-toast";
import { CreditCard, TrendingUp, Calendar, DollarSign, Plus, Sparkles, Users, Target } from "lucide-react";
import { format, startOfMonth, startOfYear } from "date-fns";
import { formatCurrencyFull } from "@/lib/format";

const GIVING_CATEGORIES = ["tithe", "offering", "building_fund", "welfare", "missions", "special", "other"] as const;
const PAYMENT_METHODS = ["cash", "mpesa", "bank_transfer", "cheque", "other"] as const;

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

const GiveOnline = () => {
  const { tenantId, currency, userId } = useChurch();
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [form, setForm] = useState({ member_id: "", amount: "", giving_type: "offering", payment_method: "cash", payment_reference: "", given_at: new Date().toISOString().split("T")[0], notes: "" });

  // Real-time updates for giving records
  useGivingRecordsRealtime(tenantId || '', () => {
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
      return {
        today: sum(todayRes),
        month: sum(monthRes),
        year: sum(yearRes),
        avg: monthData.length > 0 ? sum(monthRes) / monthData.length : 0,
      };
    },
    enabled: !!tenantId,
  });

  const { data: recentGiving = [] } = useQuery({
    queryKey: ["recent-giving", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("giving_records").select("*").eq("tenant_id", tenantId!).eq("payment_status", "confirmed").order("given_at", { ascending: false }).limit(10);
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
      // Generate a unique ID manually to avoid potential conflicts
      const recordId = crypto.randomUUID();
      
      // Validate required fields
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
        currency: currency || 'KES',
      };
      
      // Remove null member_id if anonymous to avoid foreign key issues
      if (isAnonymous || !form.member_id) {
        delete payload.member_id;
      }
      
      console.log("Inserting giving record:", payload);
      
      const { error } = await supabase.from("giving_records").insert(payload);
      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["giving-stats"] });
      queryClient.invalidateQueries({ queryKey: ["recent-giving"] });
      toast.success("Giving recorded successfully! 🎉", {
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
      setForm({ member_id: "", amount: "", giving_type: "offering", payment_method: "cash", payment_reference: "", given_at: new Date().toISOString().split("T")[0], notes: "" });
    },
    onError: (error: any) => {
      console.error("Giving record error:", error);
      toast.error(`Failed to record giving: ${error.message || error.details || 'Unknown error'}`, {
        duration: 6000,
        style: {
          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          color: 'white',
          borderRadius: '12px',
          padding: '16px',
          fontWeight: '600'
        }
      });
    },
  });

  return (
    <>
      <Helmet><title>Give Online — Vestry</title></Helmet>
      
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
              className="absolute top-1/4 left-1/4 w-32 h-32 bg-purple-500 rounded-full blur-3xl"
            />
            <motion.div
              animate={{ 
                scale: [1, 1.3, 1],
                opacity: [0.1, 0.15, 0.1]
              }}
              transition={{ duration: 5, repeat: Infinity, delay: 2 }}
              className="absolute bottom-1/3 right-1/4 w-24 h-24 bg-green-500 rounded-full blur-3xl"
            />
          </div>

          <PageHeader 
            title="Give Online" 
            subtitle="Accept digital offerings and tithes from your congregation" 
            action={
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  onClick={() => setSheetOpen(true)}
                  className="bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-700 hover:to-indigo-600 shadow-lg shadow-purple-500/25"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Record Giving
                </Button>
              </motion.div>
            } 
          />
        </motion.div>

        {/* Premium Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: "Total Giving Today", amount: stats?.today || 0, icon: DollarSign, color: "from-green-500 to-emerald-600" },
            { title: "Total This Month", amount: stats?.month || 0, icon: TrendingUp, color: "from-blue-500 to-cyan-600" },
            { title: "Total This Year", amount: stats?.year || 0, icon: Calendar, color: "from-purple-500 to-indigo-600" },
            { title: "Average Gift", amount: stats?.avg || 0, icon: CreditCard, color: "from-amber-500 to-orange-600", subtitle: "This month" }
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
              <Card className="relative overflow-hidden rounded-2xl border-2 border-white/20 bg-gradient-to-br from-white/90 to-white/60 backdrop-blur-md shadow-xl shadow-black/5 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-500">
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
                    </div>
                    {stat.subtitle && (
                      <p className="text-xs text-gray-500">{stat.subtitle}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Premium Recent Donations Card */}
        <motion.div variants={cardVariants}>
          <Card className="relative overflow-hidden rounded-3xl border-2 border-white/20 bg-gradient-to-br from-white/90 to-white/60 backdrop-blur-md shadow-xl shadow-black/5">
            {/* Glassmorphism overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            
            <CardHeader className="relative border-b border-gray-100/50 bg-gradient-to-r from-gray-50/80 to-white/40 backdrop-blur-sm">
              <CardTitle className="flex items-center space-x-3 text-xl">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <span className="bg-gradient-to-r from-gray-700 to-gray-600 bg-clip-text text-transparent">
                  Recent Donations
                </span>
              </CardTitle>
            </CardHeader>
            
            <CardContent className="relative p-0">
              {recentGiving.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center py-16 text-center"
                >
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                    <CreditCard className="w-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No donations yet</h3>
                  <p className="text-gray-500 max-w-sm mx-auto mb-6">
                    Record your first giving to get started with tracking donations
                  </p>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button 
                      onClick={() => setSheetOpen(true)}
                      className="bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-700 hover:to-indigo-600 shadow-lg shadow-purple-500/25"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Record First Giving
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
                          const member = members.find((m: any) => m.id === r.member_id);
                          return (
                            <motion.tr
                              key={r.id}
                              variants={tableRowVariants}
                              initial="hidden"
                              animate="visible"
                              transition={{ delay: index * 0.05 }}
                              className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                            >
                              <TableCell>
                                {member ? (
                                  <div className="flex items-center gap-3">
                                    <MemberAvatar name={`${member.first_name} ${member.last_name}`} size="sm" />
                                    <span className="text-sm font-medium">{member.first_name} {member.last_name}</span>
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
                                  <NumberFlow 
                                    value={Number(r.amount)} 
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
                              <TableCell><TransactionBadge type={r.giving_type} /></TableCell>
                              <TableCell><PaymentMethodIcon method={r.payment_method} /></TableCell>
                              <TableCell className="text-sm text-gray-600">
                                {r.given_at ? format(new Date(r.given_at), "dd MMM yyyy") : "—"}
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
      </motion.div>

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
                  <SelectContent>{members.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div><Label>Amount</Label><Input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" /></div>
            <div><Label>Category</Label>
              <Select value={form.giving_type} onValueChange={v => setForm(p => ({ ...p, giving_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{GIVING_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Payment Method</Label>
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
    </>
  );
};

export default GiveOnline;
