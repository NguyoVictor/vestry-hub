import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import NumberFlow from "@/components/finance/AnimatedNumber";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { useJournalEntriesRealtime } from "@/hooks/useFinanceRealtime";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "react-hot-toast";
import { BookMarked, Plus, Trash2, Sparkles, Calculator, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
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

const GeneralLedger = () => {
  const { tenantId, currency, userId } = useChurch();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [entryForm, setEntryForm] = useState({ description: "", reference: "", entry_date: new Date().toISOString().split("T")[0] });
  const [journalLines, setJournalLines] = useState([{ account_id: "", debit_amount: "", credit_amount: "" }, { account_id: "", debit_amount: "", credit_amount: "" }]);

  // Real-time updates for journal entries
  useJournalEntriesRealtime(tenantId || '', () => {
    queryClient.invalidateQueries({ queryKey: ["ledger-entries"] });
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["ledger-entries", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("ledger_entries").select("*").eq("tenant_id", tenantId!).order("entry_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["chart-of-accounts", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("chart_of_accounts").select("*").eq("tenant_id", tenantId!).order("account_code");
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  // Seed accounts if none exist
  const seedMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("seed_chart_of_accounts", { p_tenant_id: tenantId });
      if (error) throw error;
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] }); 
      toast.success("Chart of accounts created! 📊", {
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

  const addEntryMutation = useMutation({
    mutationFn: async () => {
      const totalDebit = journalLines.reduce((s, l) => s + (parseFloat(l.debit_amount) || 0), 0);
      const totalCredit = journalLines.reduce((s, l) => s + (parseFloat(l.credit_amount) || 0), 0);
      if (Math.abs(totalDebit - totalCredit) > 0.01) throw new Error("Debits must equal credits");

      // Insert individual ledger entries for each line
      const inserts = journalLines.filter(l => l.account_id && (l.debit_amount || l.credit_amount)).map(l => ({
        tenant_id: tenantId,
        description: entryForm.description,
        entry_date: entryForm.entry_date,
        debit_amount: parseFloat(l.debit_amount) || 0,
        credit_amount: parseFloat(l.credit_amount) || 0,
        fund_id: null,
        reference_type: entryForm.reference || null,
        created_by: userId,
      }));
      const { error } = await supabase.from("ledger_entries").insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["ledger-entries"] }); 
      toast.success("Journal entry posted! ✅", {
        duration: 4000,
        style: {
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white',
          borderRadius: '12px',
          padding: '16px',
          fontWeight: '600'
        }
      }); 
      setDialogOpen(false); 
      setEntryForm({ description: "", reference: "", entry_date: new Date().toISOString().split("T")[0] }); 
      setJournalLines([{ account_id: "", debit_amount: "", credit_amount: "" }, { account_id: "", debit_amount: "", credit_amount: "" }]); 
    },
    onError: (e: Error) => toast.error(e.message || "Failed to post entry", {
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

  const totalDebit = journalLines.reduce((s, l) => s + (parseFloat(l.debit_amount) || 0), 0);
  const totalCredit = journalLines.reduce((s, l) => s + (parseFloat(l.credit_amount) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const columns: Column<any>[] = [
    { key: "entry_date", header: "Date", sortable: true, render: r => <span className="text-sm">{r.entry_date ? format(new Date(r.entry_date), "dd MMM yyyy") : "—"}</span> },
    { key: "description", header: "Description", render: r => <span className="text-sm">{r.description}</span> },
    { key: "debit_amount", header: "Debit", sortable: true, render: r => Number(r.debit_amount) > 0 ? <span className="text-destructive">{formatCurrencyFull(Number(r.debit_amount), currency)}</span> : <span className="text-muted-foreground">—</span>, exportValue: r => String(r.debit_amount || 0) },
    { key: "credit_amount", header: "Credit", sortable: true, render: r => Number(r.credit_amount) > 0 ? <span className="text-emerald-600">{formatCurrencyFull(Number(r.credit_amount), currency)}</span> : <span className="text-muted-foreground">—</span>, exportValue: r => String(r.credit_amount || 0) },
    { key: "reference_type", header: "Reference", render: r => <span className="text-xs text-muted-foreground">{r.reference_type || "—"}</span> },
  ];

  const totalDebits = entries.reduce((s: number, e: any) => s + Number(e.debit_amount || 0), 0);
  const totalCredits = entries.reduce((s: number, e: any) => s + Number(e.credit_amount || 0), 0);

  return (
    <>
      <Helmet><title>General Ledger — Vestry</title></Helmet>
      
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
              className="absolute top-1/4 left-1/4 w-32 h-32 bg-gray-600 rounded-full blur-3xl"
            />
            <motion.div
              animate={{ 
                scale: [1, 1.3, 1],
                opacity: [0.1, 0.15, 0.1]
              }}
              transition={{ duration: 5, repeat: Infinity, delay: 2 }}
              className="absolute bottom-1/3 right-1/4 w-24 h-24 bg-slate-700 rounded-full blur-3xl"
            />
          </div>

          <PageHeader 
            title="General Ledger" 
            subtitle="Complete double-entry accounting records" 
            action={
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  onClick={() => { if (accounts.length === 0) seedMutation.mutate(); else setDialogOpen(true); }}
                  className="bg-gradient-to-r from-gray-600 to-slate-700 hover:from-gray-700 hover:to-slate-800 shadow-lg shadow-gray-500/25"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {accounts.length === 0 ? "Setup Chart of Accounts" : "Add Journal Entry"}
                </Button>
              </motion.div>
            } 
          />
        </motion.div>

        {/* Premium Balance Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {[
            { title: "Total Debits", amount: totalDebits, icon: TrendingDown, color: "from-red-500 to-rose-600", subtitle: "Debit entries" },
            { title: "Total Credits", amount: totalCredits, icon: TrendingUp, color: "from-emerald-500 to-green-600", subtitle: "Credit entries" }
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
              <Card className="relative overflow-hidden rounded-2xl border-2 border-white/20 bg-gradient-to-br from-white/90 to-white/60 backdrop-blur-md shadow-xl shadow-black/5 hover:shadow-2xl hover:shadow-gray-500/10 transition-all duration-500">
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

        {/* Premium Ledger Entries Table */}
        <motion.div variants={cardVariants}>
          <Card className="relative overflow-hidden rounded-3xl border-2 border-white/20 bg-gradient-to-br from-white/90 to-white/60 backdrop-blur-md shadow-xl shadow-black/5">
            {/* Glassmorphism overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            
            <CardHeader className="relative border-b border-gray-100/50 bg-gradient-to-r from-gray-50/80 to-white/40 backdrop-blur-sm">
              <CardTitle className="flex items-center space-x-3 text-xl">
                <div className="w-10 h-10 bg-gradient-to-br from-gray-600 to-slate-700 rounded-2xl flex items-center justify-center">
                  <BookMarked className="w-5 h-5 text-white" />
                </div>
                <span className="bg-gradient-to-r from-gray-700 to-gray-600 bg-clip-text text-transparent">
                  Journal Entries
                </span>
              </CardTitle>
            </CardHeader>
            
            <CardContent className="relative p-0">
              {entries.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center py-16 text-center"
                >
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                    <BookMarked className="w-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No ledger entries</h3>
                  <p className="text-gray-500 max-w-sm mx-auto mb-6">
                    {accounts.length === 0 
                      ? "Set up your chart of accounts to start recording transactions"
                      : "Post your first journal entry to get started with accounting"
                    }
                  </p>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button 
                      onClick={() => { if (accounts.length === 0) seedMutation.mutate(); else setDialogOpen(true); }}
                      className="bg-gradient-to-r from-gray-600 to-slate-700 hover:from-gray-700 hover:to-slate-800 shadow-lg shadow-gray-500/25"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {accounts.length === 0 ? "Setup Chart of Accounts" : "Add First Entry"}
                    </Button>
                  </motion.div>
                </motion.div>
              ) : (
                <div className="overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-gray-100/50 bg-gray-50/50">
                        <TableHead className="font-semibold text-gray-700">Date</TableHead>
                        <TableHead className="font-semibold text-gray-700">Description</TableHead>
                        <TableHead className="font-semibold text-gray-700">Debit</TableHead>
                        <TableHead className="font-semibold text-gray-700">Credit</TableHead>
                        <TableHead className="font-semibold text-gray-700">Reference</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {entries.map((entry: any, index: number) => (
                          <motion.tr
                            key={entry.id}
                            variants={tableRowVariants}
                            initial="hidden"
                            animate="visible"
                            transition={{ delay: index * 0.05 }}
                            className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                          >
                            <TableCell>
                              <span className="text-sm text-gray-600">
                                {entry.entry_date ? format(new Date(entry.entry_date), "dd MMM yyyy") : "—"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm font-medium text-gray-900">{entry.description}</span>
                            </TableCell>
                            <TableCell>
                              {Number(entry.debit_amount) > 0 ? (
                                <span className="text-lg font-bold text-red-600">
                                  <NumberFlow 
                                    value={Number(entry.debit_amount)} 
                                    format={{ 
                                      style: 'currency', 
                                      currency: currency || 'KES',
                                      minimumFractionDigits: 0,
                                      maximumFractionDigits: 0
                                    }}
                                    transformTiming={{ duration: 800, easing: 'ease-out' }}
                                  />
                                </span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {Number(entry.credit_amount) > 0 ? (
                                <span className="text-lg font-bold text-emerald-600">
                                  <NumberFlow 
                                    value={Number(entry.credit_amount)} 
                                    format={{ 
                                      style: 'currency', 
                                      currency: currency || 'KES',
                                      minimumFractionDigits: 0,
                                      maximumFractionDigits: 0
                                    }}
                                    transformTiming={{ duration: 800, easing: 'ease-out' }}
                                  />
                                </span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-xs text-gray-500">{entry.reference_type || "—"}</span>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, type: 'spring', stiffness: 300, damping: 25 }}
          >
            <DialogHeader className="pb-6">
              <DialogTitle className="text-xl font-semibold bg-gradient-to-r from-gray-700 to-slate-600 bg-clip-text text-transparent">
                Add Journal Entry
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="space-y-2"
                >
                  <Label className="text-sm font-medium text-gray-700">Description</Label>
                  <Input 
                    value={entryForm.description} 
                    onChange={e => setEntryForm(p => ({ ...p, description: e.target.value }))}
                    className="h-11 border-gray-200 focus:border-gray-500 focus:ring-2 focus:ring-gray-500/10 transition-all duration-200"
                    placeholder="Journal entry description"
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-2"
                >
                  <Label className="text-sm font-medium text-gray-700">Reference</Label>
                  <Input 
                    value={entryForm.reference} 
                    onChange={e => setEntryForm(p => ({ ...p, reference: e.target.value }))}
                    className="h-11 border-gray-200 focus:border-gray-500 focus:ring-2 focus:ring-gray-500/10 transition-all duration-200"
                    placeholder="Reference number"
                  />
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-2"
              >
                <Label className="text-sm font-medium text-gray-700">Date</Label>
                <Input 
                  type="date" 
                  value={entryForm.entry_date} 
                  onChange={e => setEntryForm(p => ({ ...p, entry_date: e.target.value }))}
                  className="h-11 border-gray-200 focus:border-gray-500 focus:ring-2 focus:ring-gray-500/10 transition-all duration-200"
                />
              </motion.div>

              <div className="space-y-4">
                <Label className="text-sm font-medium text-gray-700">Journal Lines</Label>
                <AnimatePresence>
                  {journalLines.map((line, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex gap-3 items-end p-4 bg-gray-50/50 rounded-xl border border-gray-100"
                    >
                      <div className="flex-1">
                        <Label className="text-xs text-gray-600 mb-1 block">Account</Label>
                        <Select 
                          value={line.account_id} 
                          onValueChange={v => { 
                            const newLines = [...journalLines]; 
                            newLines[index].account_id = v; 
                            setJournalLines(newLines); 
                          }}
                        >
                          <SelectTrigger className="h-10 text-sm border-gray-200">
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts.map((account: any) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.account_code} — {account.account_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="w-28">
                        <Label className="text-xs text-red-600 mb-1 block">Debit</Label>
                        <Input 
                          type="number" 
                          placeholder="0.00" 
                          value={line.debit_amount} 
                          onChange={e => { 
                            const newLines = [...journalLines]; 
                            newLines[index].debit_amount = e.target.value; 
                            if (e.target.value) newLines[index].credit_amount = ""; 
                            setJournalLines(newLines); 
                          }}
                          className="h-10 text-sm border-gray-200"
                        />
                      </div>
                      
                      <div className="w-28">
                        <Label className="text-xs text-emerald-600 mb-1 block">Credit</Label>
                        <Input 
                          type="number" 
                          placeholder="0.00" 
                          value={line.credit_amount} 
                          onChange={e => { 
                            const newLines = [...journalLines]; 
                            newLines[index].credit_amount = e.target.value; 
                            if (e.target.value) newLines[index].debit_amount = ""; 
                            setJournalLines(newLines); 
                          }}
                          className="h-10 text-sm border-gray-200"
                        />
                      </div>
                      
                      {journalLines.length > 2 && (
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-10 w-10 text-red-500 hover:text-red-600 hover:bg-red-50" 
                            onClick={() => setJournalLines(journalLines.filter((_, j) => j !== index))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </motion.div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setJournalLines([...journalLines, { account_id: "", debit_amount: "", credit_amount: "" }])}
                    className="border-gray-200 hover:border-gray-300"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Line
                  </Button>
                </motion.div>
              </div>

              {/* Balance Summary */}
              <div className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border border-gray-100">
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <p className="text-xs text-gray-600">Total Debits</p>
                    <p className="text-lg font-bold text-red-600">
                      <NumberFlow 
                        value={totalDebit} 
                        format={{ 
                          style: 'currency', 
                          currency: currency || 'KES',
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        }}
                        transformTiming={{ duration: 500, easing: 'ease-out' }}
                      />
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600">Total Credits</p>
                    <p className="text-lg font-bold text-emerald-600">
                      <NumberFlow 
                        value={totalCredit} 
                        format={{ 
                          style: 'currency', 
                          currency: currency || 'KES',
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        }}
                        transformTiming={{ duration: 500, easing: 'ease-out' }}
                      />
                    </p>
                  </div>
                </div>
                
                {isBalanced && totalDebit > 0 ? (
                  <div className="flex items-center space-x-2 text-emerald-600">
                    <Calculator className="w-4 h-4" />
                    <span className="text-sm font-medium">Balanced ✓</span>
                  </div>
                ) : totalDebit + totalCredit > 0 ? (
                  <div className="flex items-center space-x-2 text-red-600">
                    <Calculator className="w-4 h-4" />
                    <span className="text-sm font-medium">Unbalanced ⚠</span>
                  </div>
                ) : null}
              </div>

              {!isBalanced && totalDebit + totalCredit > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-red-50 border border-red-200 rounded-lg"
                >
                  <p className="text-sm text-red-700">
                    ⚠ Entry is unbalanced. Debits must equal credits to post this journal entry.
                  </p>
                </motion.div>
              )}

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button 
                  className="w-full h-12 bg-gradient-to-r from-gray-600 to-slate-700 hover:from-gray-700 hover:to-slate-800 shadow-lg shadow-gray-500/25 text-white font-semibold transition-all duration-200" 
                  onClick={() => addEntryMutation.mutate()} 
                  disabled={!entryForm.description || !isBalanced || totalDebit === 0 || addEntryMutation.isPending}
                >
                  {addEntryMutation.isPending ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Posting...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <BookMarked className="w-4 h-4" />
                      <span>Post Journal Entry</span>
                    </div>
                  )}
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GeneralLedger;
