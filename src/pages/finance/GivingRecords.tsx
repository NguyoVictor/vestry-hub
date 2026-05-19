import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import NumberFlow from "@/components/finance/AnimatedNumber";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { useGivingRecordsRealtime } from "@/hooks/useFinanceRealtime";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, Column } from "@/components/shared/DataTable";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "react-hot-toast";
import { Receipt, MoreHorizontal, Plus, Pencil, Trash2, TrendingUp, Calendar, DollarSign, Users, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { formatCurrencyFull } from "@/lib/format";

import { logActivity } from "@/lib/activityLogger";

interface GivingRow { id: string; member_id: string | null; amount: number; giving_type: string; payment_method: string; given_at: string; recorded_by: string | null; created_at: string; }

const GIVING_CATEGORIES = ["tithe", "offering", "building_fund", "welfare", "missions", "special", "other"];
const PAYMENT_METHODS = ["cash", "mpesa", "bank_transfer", "card", "cheque", "other"];

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

const GivingRecords = () => {
  const { tenantId, currency, userId } = useChurch();
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [form, setForm] = useState({ member_id: "", amount: "", giving_type: "offering", payment_method: "cash", given_at: new Date().toISOString().split("T")[0] });

  // Real-time updates for giving records
  useGivingRecordsRealtime(tenantId || '', () => {
    queryClient.invalidateQueries({ queryKey: ["giving-records"] });
  });

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["giving-records", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("giving_records").select("*").eq("tenant_id", tenantId!).order("given_at", { ascending: false });
      if (error) throw error;
      return (data || []) as GivingRow[];
    },
    enabled: !!tenantId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["members-list", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("members").select("id, first_name, last_name").eq("tenant_id", tenantId!);
      return data || [];
    },
    enabled: !!tenantId,
  });

  const getMemberName = (id: string | null) => {
    if (!id) return null;
    const m = members.find((m: any) => m.id === id);
    return m ? `${m.first_name} ${m.last_name}` : null;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        tenant_id: tenantId,
        member_id: isAnonymous ? null : form.member_id || null,
        amount: parseFloat(form.amount),
        giving_type: form.giving_type as any,
        payment_method: form.payment_method as any,
        given_at: form.given_at,
        recorded_by: userId,
        currency,
      };
      if (editingId) {
        const { error } = await supabase.from("giving_records").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("giving_records").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["giving-records"] });
      toast.success(editingId ? "Record updated! 📝" : "Giving recorded! 🎉", {
        duration: 4000,
        style: {
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white',
          borderRadius: '12px',
          padding: '16px',
          fontWeight: '600'
        }
      });
      if (!editingId) {
        logActivity({ churchId: tenantId!, actionType: "new_donation", description: `A ${form.giving_type.replace(/_/g, " ")} of ${form.amount} was recorded`, entityType: "donation" });
      }
      closeSheet();
    },
    onError: () => toast.error("Failed to save record", {
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("giving_records").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["giving-records"] }); 
      toast.success("Record deleted! 🗑️", {
        duration: 3000,
        style: {
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          color: 'white',
          borderRadius: '12px',
          padding: '16px',
          fontWeight: '600'
        }
      });
    },
  });

  const closeSheet = () => { setSheetOpen(false); setEditingId(null); setIsAnonymous(false); setForm({ member_id: "", amount: "", giving_type: "offering", payment_method: "cash", given_at: new Date().toISOString().split("T")[0] }); };

  const openEdit = (r: GivingRow) => {
    setEditingId(r.id);
    setIsAnonymous(!r.member_id);
    setForm({ member_id: r.member_id || "", amount: String(r.amount), giving_type: r.giving_type, payment_method: r.payment_method, given_at: r.given_at });
    setSheetOpen(true);
  };

  const totalFiltered = records.reduce((s, r) => s + Number(r.amount), 0);
  const averageGift = records.length > 0 ? totalFiltered / records.length : 0;
  const anonymousCount = records.filter(r => !r.member_id).length;

  const columns: Column<GivingRow>[] = [
    { 
      key: "member_id", 
      header: "Donor", 
      sortable: true, 
      render: (r) => { 
        const name = getMemberName(r.member_id); 
        return name ? (
          <div className="flex items-center gap-3">
            <MemberAvatar name={name} size="sm" />
            <span className="text-sm font-medium">{name}</span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
              <Users className="w-4 h-4 text-gray-400" />
            </div>
            <span className="text-gray-500 italic text-sm">Anonymous</span>
          </div>
        ); 
      }, 
      exportValue: (r) => getMemberName(r.member_id) || "Anonymous" 
    },
    { 
      key: "amount", 
      header: "Amount", 
      sortable: true, 
      render: (r) => (
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
      ), 
      exportValue: (r) => String(r.amount) 
    },
    { 
      key: "giving_type", 
      header: "Category", 
      sortable: true, 
      render: (r) => <TransactionBadge type={r.giving_type} /> 
    },
    { 
      key: "payment_method", 
      header: "Method", 
      render: (r) => <PaymentMethodIcon method={r.payment_method} /> 
    },
    { 
      key: "given_at", 
      header: "Date", 
      sortable: true, 
      render: (r) => (
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">
            {r.given_at ? format(new Date(r.given_at), "dd MMM yyyy") : "—"}
          </span>
        </div>
      )
    },
    { 
      key: "actions", 
      header: "", 
      render: (r) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-gray-100">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </motion.div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-2xl border-2 border-gray-100 bg-white/95 backdrop-blur-xl">
            <DropdownMenuItem onClick={() => openEdit(r)} className="rounded-xl">
              <Pencil className="h-4 w-4 mr-2" />Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600 rounded-xl" onClick={() => deleteMutation.mutate(r.id)}>
              <Trash2 className="h-4 w-4 mr-2" />Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  ];

  return (
    <>
      <Helmet><title>Giving Records — Vestry</title></Helmet>
      
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
              className="absolute top-1/4 left-1/4 w-32 h-32 bg-emerald-500 rounded-full blur-3xl"
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

          <PageHeader 
            title="Giving Records" 
            subtitle="View, search and export your complete donation history" 
            action={
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  onClick={() => setSheetOpen(true)}
                  className="bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-700 hover:to-green-600 shadow-lg shadow-emerald-500/25"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Record Giving
                </Button>
              </motion.div>
            } 
          />
        </motion.div>

        {/* Premium Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: "Total Donations", amount: totalFiltered, icon: DollarSign, color: "from-emerald-500 to-green-600" },
            { title: "Total Records", amount: records.length, icon: Receipt, color: "from-blue-500 to-cyan-600", isCount: true },
            { title: "Average Gift", amount: averageGift, icon: TrendingUp, color: "from-purple-500 to-indigo-600" },
            { title: "Anonymous Gifts", amount: anonymousCount, icon: Users, color: "from-amber-500 to-orange-600", isCount: true }
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
              <Card className="relative overflow-hidden rounded-2xl border-2 border-white/20 bg-gradient-to-br from-white/90 to-white/60 backdrop-blur-md shadow-xl shadow-black/5 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-500">
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
                      {stat.isCount ? (
                        <NumberFlow 
                          value={stat.amount} 
                          transformTiming={{ duration: 1000, easing: 'ease-out' }}
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
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

      <Card className="mb-4"><CardContent className="p-3 flex gap-6 text-sm">
        <span className="text-muted-foreground">Showing <strong>{records.length}</strong> donations</span>
        <span className="text-muted-foreground">Total: <strong className="text-emerald-600">{formatCurrencyFull(totalFiltered, currency)}</strong></span>
        {records.length > 0 && <span className="text-muted-foreground">Avg: <strong>{formatCurrencyFull(totalFiltered / records.length, currency)}</strong></span>}
      </CardContent></Card>

        {/* Premium Data Table */}
        <motion.div variants={cardVariants}>
          <Card className="relative overflow-hidden rounded-3xl border-2 border-white/20 bg-gradient-to-br from-white/90 to-white/60 backdrop-blur-md shadow-xl shadow-black/5">
            {/* Glassmorphism overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            
            <CardHeader className="relative border-b border-gray-100/50 bg-gradient-to-r from-gray-50/80 to-white/40 backdrop-blur-sm">
              <CardTitle className="flex items-center space-x-3 text-xl">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-white" />
                </div>
                <span className="bg-gradient-to-r from-gray-700 to-gray-600 bg-clip-text text-transparent">
                  All Giving Records
                </span>
              </CardTitle>
            </CardHeader>
            
            <CardContent className="relative p-0">
              <DataTable 
                data={records} 
                columns={columns} 
                loading={isLoading} 
                getRowId={r => r.id} 
                searchPlaceholder="Search donations..." 
                emptyIcon={<Receipt className="h-12 w-12 text-gray-400" />} 
                emptyTitle="No giving records" 
                emptyDescription="Record your first donation to get started" 
                emptyCta={
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button 
                      onClick={() => setSheetOpen(true)}
                      className="bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-700 hover:to-green-600 shadow-lg shadow-emerald-500/25"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Record First Giving
                    </Button>
                  </motion.div>
                }
              />
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Premium Sheet Modal */}
      <Sheet open={sheetOpen} onOpenChange={v => { if (!v) closeSheet(); }}>
        <SheetContent className="overflow-y-auto bg-white/95 backdrop-blur-xl border-l-2 border-gray-100">
          <SheetHeader className="border-b border-gray-100 pb-4">
            <SheetTitle className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
              {editingId ? "Edit Record" : "Record Giving"}
            </SheetTitle>
          </SheetHeader>
          
          <div className="space-y-6 mt-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-3 p-4 bg-gray-50/80 rounded-2xl"
            >
              <Switch 
                checked={isAnonymous} 
                onCheckedChange={setIsAnonymous}
                className="data-[state=checked]:bg-emerald-600"
              />
              <Label className="font-medium">Anonymous donation</Label>
            </motion.div>
            {!isAnonymous && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -20 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                <Label className="text-sm font-semibold text-gray-700 mb-3 block">Donor</Label>
                <Select value={form.member_id} onValueChange={v => setForm(p => ({ ...p, member_id: v }))}>
                  <SelectTrigger className="h-12 rounded-2xl border-2 border-gray-100 focus:border-emerald-300 bg-white/80 backdrop-blur-sm">
                    <SelectValue placeholder="Select member" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-2 border-gray-100 bg-white/95 backdrop-blur-xl">
                    {members.map((m: any) => (
                      <SelectItem key={m.id} value={m.id} className="rounded-xl">
                        {m.first_name} {m.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </motion.div>
            )}
            
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Label className="text-sm font-semibold text-gray-700 mb-3 block">Amount</Label>
              <div className="relative">
                <Input 
                  type="number" 
                  value={form.amount} 
                  onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                  placeholder="0.00"
                  className="h-14 text-xl text-center rounded-2xl border-2 border-gray-100 focus:border-emerald-300 bg-white/80 backdrop-blur-sm shadow-inner"
                />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-500/5 to-green-500/5 pointer-events-none" />
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Label className="text-sm font-semibold text-gray-700 mb-3 block">Category</Label>
              <Select value={form.giving_type} onValueChange={v => setForm(p => ({ ...p, giving_type: v }))}>
                <SelectTrigger className="h-12 rounded-2xl border-2 border-gray-100 focus:border-emerald-300 bg-white/80 backdrop-blur-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-2 border-gray-100 bg-white/95 backdrop-blur-xl">
                  {GIVING_CATEGORIES.map(c => (
                    <SelectItem key={c} value={c} className="rounded-xl capitalize">
                      <div className="flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-emerald-500" />
                        <span>{c.replace(/_/g, " ")}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Label className="text-sm font-semibold text-gray-700 mb-3 block">Payment Method</Label>
              <Select value={form.payment_method} onValueChange={v => setForm(p => ({ ...p, payment_method: v }))}>
                <SelectTrigger className="h-12 rounded-2xl border-2 border-gray-100 focus:border-emerald-300 bg-white/80 backdrop-blur-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-2 border-gray-100 bg-white/95 backdrop-blur-xl">
                  {PAYMENT_METHODS.map(m => (
                    <SelectItem key={m} value={m} className="rounded-xl capitalize">
                      {m.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Label className="text-sm font-semibold text-gray-700 mb-3 block">Date</Label>
              <Input 
                type="date" 
                value={form.given_at} 
                onChange={e => setForm(p => ({ ...p, given_at: e.target.value }))}
                className="h-12 rounded-2xl border-2 border-gray-100 focus:border-emerald-300 bg-white/80 backdrop-blur-sm"
              />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button 
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-700 hover:to-green-600 shadow-lg shadow-emerald-500/25 font-semibold text-lg" 
                onClick={() => saveMutation.mutate()} 
                disabled={!form.amount || saveMutation.isPending}
              >
                {saveMutation.isPending ? "Saving..." : editingId ? "Update Record" : "Record Giving"}
              </Button>
            </motion.div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default GivingRecords;
