import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import NumberFlow from "@/components/finance/AnimatedNumber";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { useExpensesRealtime } from "@/hooks/useFinanceRealtime";
import { usePermissions } from '@/hooks/usePermissions';
import { ReadOnlyBanner } from '@/components/shared/ReadOnlyBanner';
import { PermissionButton } from '@/components/shared/PermissionButton';
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "react-hot-toast";
import { FileText, Plus, MoreHorizontal, Pencil, CheckCircle, Trash2, AlertTriangle, Clock, Sparkles, Receipt, Calendar, DollarSign } from "lucide-react";
import { format } from "date-fns";
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

const AccountsPayable = () => {
  const { tenantId, currency, userId } = useChurch();
  const queryClient = useQueryClient();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('financial_records');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ vendor_name: "", description: "", amount: "", due_date: "", currency: "KES" });

  // Real-time updates for expenses/payables
  useExpensesRealtime(tenantId || '', () => {
    queryClient.invalidateQueries({ queryKey: ["accounts-payable"] });
  });

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["accounts-payable", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("accounts_payable").select("*").eq("tenant_id", tenantId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const outstanding = invoices.filter((i: any) => i.payment_status !== "paid").reduce((s: number, i: any) => s + Number(i.amount), 0);
  const overdue = invoices.filter((i: any) => i.payment_status !== "paid" && i.due_date && new Date(i.due_date) < new Date()).reduce((s: number, i: any) => s + Number(i.amount), 0);
  const dueThisWeek = invoices.filter((i: any) => { if (i.payment_status === "paid" || !i.due_date) return false; const d = new Date(i.due_date); const now = new Date(); const week = new Date(now.getTime() + 7 * 86400000); return d >= now && d <= week; }).reduce((s: number, i: any) => s + Number(i.amount), 0);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = { tenant_id: tenantId, vendor_name: form.vendor_name, description: form.description, amount: parseFloat(form.amount), due_date: form.due_date || null, currency: form.currency, created_by: userId };
      if (editingId) {
        const { error } = await supabase.from("accounts_payable").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("accounts_payable").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["accounts-payable"] }); 
      toast.success(editingId ? "Invoice updated successfully! 📝" : "Invoice added successfully! 📋", {
        duration: 4000,
        style: {
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white',
          borderRadius: '12px',
          padding: '16px',
          fontWeight: '600'
        }
      }); 
      closeSheet(); 
    },
    onError: () => toast.error("Failed to save invoice", {
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

  const markPaidMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("accounts_payable").update({ payment_status: "paid" } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["accounts-payable"] }); 
      toast.success("Marked as paid! ✅", {
        duration: 4000,
        style: {
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white',
          borderRadius: '12px',
          padding: '16px',
          fontWeight: '600'
        }
      }); 
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("accounts_payable").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["accounts-payable"] }); 
      toast.success("Invoice deleted! 🗑️", {
        duration: 4000,
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

  const closeSheet = () => { setSheetOpen(false); setEditingId(null); setForm({ vendor_name: "", description: "", amount: "", due_date: "", currency: "KES" }); };

  const columns: Column<any>[] = [
    { key: "vendor_name", header: "Vendor", sortable: true, render: r => <span className="font-medium">{r.vendor_name}</span> },
    { key: "description", header: "Description", render: r => <span className="text-sm text-muted-foreground">{r.description || "—"}</span> },
    { key: "amount", header: "Amount", sortable: true, render: r => <span className="font-semibold">{formatCurrencyFull(Number(r.amount), currency)}</span>, exportValue: r => String(r.amount) },
    { key: "due_date", header: "Due Date", sortable: true, render: r => { const isOverdue = r.due_date && new Date(r.due_date) < new Date() && r.payment_status !== "paid"; return <span className={`text-sm ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>{r.due_date ? format(new Date(r.due_date), "dd MMM yyyy") : "—"}</span>; } },
    { key: "payment_status", header: "Status", sortable: true, render: r => <StatusBadge status={r.payment_status || "pending"} /> },
    { key: "actions", header: "", render: r => (
      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {r.payment_status !== "paid" && <DropdownMenuItem disabled={readOnly} onClick={() => markPaidMutation.mutate(r.id)}><CheckCircle className="h-4 w-4 mr-2" />Mark as Paid</DropdownMenuItem>}
          <DropdownMenuItem disabled={readOnly} onClick={() => { setEditingId(r.id); setForm({ vendor_name: r.vendor_name, description: r.description || "", amount: String(r.amount), due_date: r.due_date || "", currency: r.currency || "KES" }); setSheetOpen(true); }}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
          <DropdownMenuItem disabled={readOnly} className="text-destructive" onClick={() => deleteMutation.mutate(r.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )},
  ];

  return (
    <>
      <Helmet><title>Accounts Payable — Vestry</title></Helmet>
      
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
              className="absolute top-1/4 left-1/4 w-32 h-32 bg-amber-500 rounded-full blur-3xl"
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
            title="Accounts Payable" 
            subtitle="Manage vendor invoices and upcoming payments" 
            action={
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <PermissionButton 
                  readOnly={readOnly}
                  onClick={() => setSheetOpen(true)}
                  className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-lg shadow-amber-500/25"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Invoice
                </PermissionButton>
              </motion.div>
            } 
          />
        </motion.div>

        {readOnly && <ReadOnlyBanner section="Financial Records" />}

        {/* Premium Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { title: "Total Outstanding", amount: outstanding, icon: FileText, color: "from-amber-500 to-orange-600", subtitle: "Unpaid invoices" },
            { title: "Due This Week", amount: dueThisWeek, icon: Clock, color: "from-blue-500 to-cyan-600", subtitle: "Urgent payments" },
            { title: "Overdue", amount: overdue, icon: AlertTriangle, color: "from-red-500 to-rose-600", subtitle: "Past due date" }
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
              <Card className="relative overflow-hidden rounded-2xl border-2 border-white/20 bg-gradient-to-br from-white/90 to-white/60 backdrop-blur-md shadow-xl shadow-black/5 hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-500">
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
                    <p className="text-xs text-gray-500">{stat.subtitle}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Premium Invoices Table */}
        <motion.div variants={cardVariants}>
          <Card className="relative overflow-hidden rounded-3xl border-2 border-white/20 bg-gradient-to-br from-white/90 to-white/60 backdrop-blur-md shadow-xl shadow-black/5">
            {/* Glassmorphism overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            
            <CardHeader className="relative border-b border-gray-100/50 bg-gradient-to-r from-gray-50/80 to-white/40 backdrop-blur-sm">
              <CardTitle className="flex items-center space-x-3 text-xl">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-white" />
                </div>
                <span className="bg-gradient-to-r from-gray-700 to-gray-600 bg-clip-text text-transparent">
                  Vendor Invoices
                </span>
              </CardTitle>
            </CardHeader>
            
            <CardContent className="relative p-0">
              {invoices.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center py-16 text-center"
                >
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                    <FileText className="w-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No invoices yet</h3>
                  <p className="text-gray-500 max-w-sm mx-auto mb-6">
                    Add your first vendor invoice to start tracking payables
                  </p>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <PermissionButton 
                      permission="financial_records"
                      readOnly={readOnly}
                      onClick={() => setSheetOpen(true)}
                      className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-lg shadow-amber-500/25"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Invoice
                    </PermissionButton>
                  </motion.div>
                </motion.div>
              ) : (
                <div className="overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-gray-100/50 bg-gray-50/50">
                        <TableHead className="font-semibold text-gray-700">Vendor</TableHead>
                        <TableHead className="font-semibold text-gray-700">Description</TableHead>
                        <TableHead className="font-semibold text-gray-700">Amount</TableHead>
                        <TableHead className="font-semibold text-gray-700">Due Date</TableHead>
                        <TableHead className="font-semibold text-gray-700">Status</TableHead>
                        <TableHead className="font-semibold text-gray-700">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {invoices.map((invoice: any, index: number) => {
                          const isOverdue = invoice.due_date && new Date(invoice.due_date) < new Date() && invoice.payment_status !== "paid";
                          return (
                            <motion.tr
                              key={invoice.id}
                              variants={tableRowVariants}
                              initial="hidden"
                              animate="visible"
                              transition={{ delay: index * 0.05 }}
                              className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                            >
                              <TableCell>
                                <span className="font-medium text-gray-900">{invoice.vendor_name}</span>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-gray-600">{invoice.description || "—"}</span>
                              </TableCell>
                              <TableCell>
                                <span className="text-lg font-bold text-amber-600">
                                  <NumberFlow 
                                    value={Number(invoice.amount)} 
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
                                <span className={`text-sm ${isOverdue ? "text-red-600 font-medium" : "text-gray-600"}`}>
                                  {invoice.due_date ? format(new Date(invoice.due_date), "dd MMM yyyy") : "—"}
                                </span>
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={invoice.payment_status || "pending"} />
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                      <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </motion.div>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {invoice.payment_status !== "paid" && (
                                      <DropdownMenuItem disabled={readOnly} onClick={() => markPaidMutation.mutate(invoice.id)}>
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Mark as Paid
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem disabled={readOnly} onClick={() => { 
                                      setEditingId(invoice.id); 
                                      setForm({ 
                                        vendor_name: invoice.vendor_name, 
                                        description: invoice.description || "", 
                                        amount: String(invoice.amount), 
                                        due_date: invoice.due_date || "", 
                                        currency: invoice.currency || "KES" 
                                      }); 
                                      setSheetOpen(true); 
                                    }}>
                                      <Pencil className="h-4 w-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      disabled={readOnly}
                                      className="text-red-600" 
                                      onClick={() => deleteMutation.mutate(invoice.id)}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
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
      <Sheet open={sheetOpen} onOpenChange={v => { if (!v) closeSheet(); }}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-md">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, type: 'spring', stiffness: 300, damping: 25 }}
          >
            <SheetHeader className="pb-6">
              <SheetTitle className="text-xl font-semibold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                {editingId ? "Edit Invoice" : "Add New Invoice"}
              </SheetTitle>
            </SheetHeader>
            
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-2"
              >
                <Label className="text-sm font-medium text-gray-700">Vendor Name</Label>
                <Input 
                  value={form.vendor_name} 
                  onChange={e => setForm(p => ({ ...p, vendor_name: e.target.value }))}
                  className="h-11 border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 transition-all duration-200"
                  placeholder="Enter vendor name"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-2"
              >
                <Label className="text-sm font-medium text-gray-700">Description</Label>
                <Textarea 
                  value={form.description} 
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  className="min-h-[80px] border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 transition-all duration-200"
                  placeholder="Invoice description or notes"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-2"
              >
                <Label className="text-sm font-medium text-gray-700">Amount ({currency})</Label>
                <Input 
                  type="number" 
                  value={form.amount} 
                  onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                  className="h-11 border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 transition-all duration-200"
                  placeholder="0.00"
                  step="0.01"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-2"
              >
                <Label className="text-sm font-medium text-gray-700">Due Date</Label>
                <Input 
                  type="date" 
                  value={form.due_date} 
                  onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
                  className="h-11 border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 transition-all duration-200"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="pt-4"
              >
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button 
                    className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-lg shadow-amber-500/25 text-white font-semibold transition-all duration-200" 
                    onClick={() => saveMutation.mutate()} 
                    disabled={!form.vendor_name || !form.amount || saveMutation.isPending}
                  >
                    {saveMutation.isPending ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Saving...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4" />
                        <span>{editingId ? "Update Invoice" : "Add Invoice"}</span>
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

export default AccountsPayable;
