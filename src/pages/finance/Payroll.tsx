import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import NumberFlow from "@/components/finance/AnimatedNumber";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { usePayrollRealtime } from "@/hooks/useFinanceRealtime";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, Column } from "@/components/shared/DataTable";
import { FinanceStatCard } from "@/components/finance/FinanceStatCard";
import { MemberAvatar } from "@/components/shared/MemberAvatar";
import { PaymentMethodIcon } from "@/components/finance/PaymentMethodIcon";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "react-hot-toast";
import { logActivity } from "@/lib/activityLogger";
import { Banknote, Plus, Users, Calendar, TrendingUp, Sparkles, DollarSign, Clock, Building } from "lucide-react";
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

const Payroll = () => {
  const { tenantId, currency, userId } = useChurch();
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ member_id: "", job_title: "", employment_type: "full_time", gross_salary: "", net_salary: "", payment_method: "bank_transfer", bank_name: "", account_number: "", mpesa_number: "", start_date: new Date().toISOString().split("T")[0], notes: "" });

  // Real-time updates for payroll
  usePayrollRealtime(tenantId || '', () => {
    queryClient.invalidateQueries({ queryKey: ["payroll-staff"] });
  });

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ["payroll-staff", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("payroll_staff").select("*").eq("tenant_id", tenantId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
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
    if (!id) return "Unknown";
    const m = members.find((m: any) => m.id === id);
    return m ? `${m.first_name} ${m.last_name}` : "Unknown";
  };

  const totalPayroll = staff.filter((s: any) => s.status === "active").reduce((sum: number, s: any) => sum + Number(s.net_salary || 0), 0);
  const activeStaffCount = staff.filter((s: any) => s.status === "active").length;
  const employmentTypes = new Set(staff.map((s: any) => s.employment_type)).size;
  const averageSalary = activeStaffCount > 0 ? totalPayroll / activeStaffCount : 0;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const gross = parseFloat(form.gross_salary) || 0;
      const net = parseFloat(form.net_salary) || gross;
      const payload: any = { tenant_id: tenantId, member_id: form.member_id || null, job_title: form.job_title, employment_type: form.employment_type, gross_salary: gross, net_salary: net, payment_method: form.payment_method, bank_name: form.bank_name, account_number: form.account_number, mpesa_number: form.mpesa_number, start_date: form.start_date, notes: form.notes, deductions: [] };
      if (editingId) {
        const { error } = await supabase.from("payroll_staff").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("payroll_staff").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-staff"] });
      toast.success(editingId ? "Staff updated! 👤" : "Staff added to payroll! 💼", {
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
        logActivity({ churchId: tenantId!, actionType: "payroll_processed", description: `${form.job_title || "Staff"} was added to payroll`, entityType: "payroll" });
      }
      closeSheet();
    },
    onError: () => toast.error("Failed to save staff record", {
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

  const closeSheet = () => { setSheetOpen(false); setEditingId(null); setForm({ member_id: "", job_title: "", employment_type: "full_time", gross_salary: "", net_salary: "", payment_method: "bank_transfer", bank_name: "", account_number: "", mpesa_number: "", start_date: new Date().toISOString().split("T")[0], notes: "" }); };

  const columns: Column<any>[] = [
    { 
      key: "member_id", 
      header: "Staff Member", 
      sortable: true, 
      render: r => (
        <div className="flex items-center gap-3">
          <MemberAvatar name={getMemberName(r.member_id)} size="sm" />
          <div>
            <span className="text-sm font-medium text-gray-900">{getMemberName(r.member_id)}</span>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Building className="w-3 h-3" />
              {r.job_title || "—"}
            </p>
          </div>
        </div>
      ), 
      exportValue: r => getMemberName(r.member_id) 
    },
    { 
      key: "gross_salary", 
      header: "Gross Salary", 
      sortable: true, 
      render: r => (
        <div className="text-right">
          <NumberFlow 
            value={Number(r.gross_salary)} 
            format={{ 
              style: 'currency', 
              currency: currency || 'KES',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            }}
            transformTiming={{ duration: 800, easing: 'ease-out' }}
            className="text-sm font-medium text-gray-700"
          />
        </div>
      ), 
      exportValue: r => String(r.gross_salary) 
    },
    { 
      key: "net_salary", 
      header: "Net Salary", 
      sortable: true, 
      render: r => (
        <div className="text-right">
          <NumberFlow 
            value={Number(r.net_salary)} 
            format={{ 
              style: 'currency', 
              currency: currency || 'KES',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            }}
            transformTiming={{ duration: 1000, easing: 'ease-out' }}
            className="text-lg font-bold text-emerald-600"
          />
        </div>
      ), 
      exportValue: r => String(r.net_salary) 
    },
    { 
      key: "payment_method", 
      header: "Payment Method", 
      render: r => <PaymentMethodIcon method={r.payment_method || "cash"} /> 
    },
    { 
      key: "status", 
      header: "Status", 
      sortable: true, 
      render: r => <StatusBadge status={r.status || "active"} /> 
    },
  ];

  return (
    <>
      <Helmet><title>Payroll — Vestry</title></Helmet>
      
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
              className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-500 rounded-full blur-3xl"
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
            title="Payroll" 
            subtitle="Manage staff salaries and generate payslips" 
            action={
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  onClick={() => setSheetOpen(true)}
                  className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 shadow-lg shadow-blue-500/25"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Staff
                </Button>
              </motion.div>
            } 
          />
        </motion.div>

        {/* Premium Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: "Monthly Payroll", amount: totalPayroll, icon: Banknote, color: "from-green-500 to-emerald-600" },
            { title: "Active Staff", amount: activeStaffCount, icon: Users, color: "from-blue-500 to-cyan-600", isCount: true },
            { title: "Employment Types", amount: employmentTypes, icon: Calendar, color: "from-purple-500 to-indigo-600", isCount: true },
            { title: "Average Salary", amount: averageSalary, icon: TrendingUp, color: "from-amber-500 to-orange-600" }
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
              <div className="relative overflow-hidden rounded-2xl border-2 border-white/20 bg-gradient-to-br from-white/90 to-white/60 backdrop-blur-md shadow-xl shadow-black/5 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 p-6">
                {/* Glassmorphism overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                
                {/* Gradient orb */}
                <div className={`absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-r ${stat.color} opacity-20 rounded-full blur-2xl`} />
                
                <div className="relative">
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
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        {/* Premium Data Table */}
        <motion.div variants={cardVariants}>
          <div className="relative overflow-hidden rounded-3xl border-2 border-white/20 bg-gradient-to-br from-white/90 to-white/60 backdrop-blur-md shadow-xl shadow-black/5">
            {/* Glassmorphism overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            
            <div className="relative border-b border-gray-100/50 bg-gradient-to-r from-gray-50/80 to-white/40 backdrop-blur-sm p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center">
                  <Banknote className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-gray-700 to-gray-600 bg-clip-text text-transparent">
                  Payroll Staff
                </h3>
              </div>
            </div>
            
            <div className="relative p-0">
              <DataTable 
                data={staff} 
                columns={columns} 
                loading={isLoading} 
                getRowId={r => r.id} 
                searchPlaceholder="Search staff..." 
                emptyIcon={<Banknote className="h-12 w-12 text-gray-400" />} 
                emptyTitle="No payroll staff" 
                emptyDescription="Add your first staff member to get started with payroll"
                emptyCta={
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button 
                      onClick={() => setSheetOpen(true)}
                      className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 shadow-lg shadow-blue-500/25"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Staff
                    </Button>
                  </motion.div>
                }
              />
            </div>
          </div>
        </motion.div>
      </motion.div>
      {/* Premium Sheet Modal */}
      <Sheet open={sheetOpen} onOpenChange={v => { if (!v) closeSheet(); }}>
        <SheetContent className="overflow-y-auto bg-white/95 backdrop-blur-xl border-l-2 border-gray-100">
          <SheetHeader className="border-b border-gray-100 pb-4">
            <SheetTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              {editingId ? "Edit Staff" : "Add Staff to Payroll"}
            </SheetTitle>
          </SheetHeader>
          
          <div className="space-y-6 mt-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Label className="text-sm font-semibold text-gray-700 mb-3 block">Link to Member</Label>
              <Select value={form.member_id} onValueChange={v => setForm(p => ({ ...p, member_id: v }))}>
                <SelectTrigger className="h-12 rounded-2xl border-2 border-gray-100 focus:border-blue-300 bg-white/80 backdrop-blur-sm">
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
            
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Label className="text-sm font-semibold text-gray-700 mb-3 block">Job Title</Label>
              <Input 
                value={form.job_title} 
                onChange={e => setForm(p => ({ ...p, job_title: e.target.value }))}
                placeholder="e.g. Pastor, Administrator, Musician"
                className="h-12 rounded-2xl border-2 border-gray-100 focus:border-blue-300 bg-white/80 backdrop-blur-sm"
              />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Label className="text-sm font-semibold text-gray-700 mb-3 block">Employment Type</Label>
              <Select value={form.employment_type} onValueChange={v => setForm(p => ({ ...p, employment_type: v }))}>
                <SelectTrigger className="h-12 rounded-2xl border-2 border-gray-100 focus:border-blue-300 bg-white/80 backdrop-blur-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-2 border-gray-100 bg-white/95 backdrop-blur-xl">
                  {["full_time","part_time","contract","volunteer_stipend"].map(t => (
                    <SelectItem key={t} value={t} className="rounded-xl capitalize">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-blue-500" />
                        <span>{t.replace(/_/g, " ")}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </motion.div>
            
            <div className="grid grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Label className="text-sm font-semibold text-gray-700 mb-3 block">Gross Salary</Label>
                <Input 
                  type="number" 
                  value={form.gross_salary} 
                  onChange={e => setForm(p => ({ ...p, gross_salary: e.target.value }))}
                  placeholder="0.00"
                  className="h-12 rounded-2xl border-2 border-gray-100 focus:border-blue-300 bg-white/80 backdrop-blur-sm"
                />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Label className="text-sm font-semibold text-gray-700 mb-3 block">Net Salary</Label>
                <Input 
                  type="number" 
                  value={form.net_salary} 
                  onChange={e => setForm(p => ({ ...p, net_salary: e.target.value }))}
                  placeholder="Auto-calculated after deductions"
                  className="h-12 rounded-2xl border-2 border-gray-100 focus:border-blue-300 bg-white/80 backdrop-blur-sm"
                />
              </motion.div>
            </div>
            
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Label className="text-sm font-semibold text-gray-700 mb-3 block">Payment Method</Label>
              <Select value={form.payment_method} onValueChange={v => setForm(p => ({ ...p, payment_method: v }))}>
                <SelectTrigger className="h-12 rounded-2xl border-2 border-gray-100 focus:border-blue-300 bg-white/80 backdrop-blur-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-2 border-gray-100 bg-white/95 backdrop-blur-xl">
                  {["bank_transfer","mpesa","cash","cheque"].map(m => (
                    <SelectItem key={m} value={m} className="rounded-xl capitalize">
                      {m.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </motion.div>
            
            <AnimatePresence>
              {form.payment_method === "bank_transfer" && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -20 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -20 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  className="space-y-4"
                >
                  <div>
                    <Label className="text-sm font-semibold text-gray-700 mb-3 block">Bank Name</Label>
                    <Input 
                      value={form.bank_name} 
                      onChange={e => setForm(p => ({ ...p, bank_name: e.target.value }))}
                      className="h-12 rounded-2xl border-2 border-gray-100 focus:border-blue-300 bg-white/80 backdrop-blur-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-gray-700 mb-3 block">Account Number</Label>
                    <Input 
                      value={form.account_number} 
                      onChange={e => setForm(p => ({ ...p, account_number: e.target.value }))}
                      className="h-12 rounded-2xl border-2 border-gray-100 focus:border-blue-300 bg-white/80 backdrop-blur-sm"
                    />
                  </div>
                </motion.div>
              )}
              
              {form.payment_method === "mpesa" && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -20 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -20 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  <Label className="text-sm font-semibold text-gray-700 mb-3 block">M-Pesa Number</Label>
                  <Input 
                    value={form.mpesa_number} 
                    onChange={e => setForm(p => ({ ...p, mpesa_number: e.target.value }))}
                    placeholder="07XXXXXXXX"
                    className="h-12 rounded-2xl border-2 border-gray-100 focus:border-blue-300 bg-white/80 backdrop-blur-sm"
                  />
                </motion.div>
              )}
            </AnimatePresence>
            
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Label className="text-sm font-semibold text-gray-700 mb-3 block">Start Date</Label>
              <Input 
                type="date" 
                value={form.start_date} 
                onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
                className="h-12 rounded-2xl border-2 border-gray-100 focus:border-blue-300 bg-white/80 backdrop-blur-sm"
              />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Label className="text-sm font-semibold text-gray-700 mb-3 block">Notes</Label>
              <Textarea 
                value={form.notes} 
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Additional notes about this staff member..."
                className="min-h-[80px] rounded-2xl border-2 border-gray-100 focus:border-blue-300 bg-white/80 backdrop-blur-sm resize-none"
              />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button 
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 shadow-lg shadow-blue-500/25 font-semibold text-lg" 
                onClick={() => saveMutation.mutate()} 
                disabled={!form.gross_salary || saveMutation.isPending}
              >
                {saveMutation.isPending ? "Saving..." : editingId ? "Update Staff" : "Add to Payroll"}
              </Button>
            </motion.div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default Payroll;
