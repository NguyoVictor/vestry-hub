import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import NumberFlow from "@/components/finance/AnimatedNumber";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { useBudgetRealtime } from "@/hooks/useFinanceRealtime";
import { PageHeader } from "@/components/layout/PageHeader";
import { usePermissions } from '@/hooks/usePermissions';
import { ReadOnlyBanner } from '@/components/shared/ReadOnlyBanner';
import { PermissionButton } from '@/components/shared/PermissionButton';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "react-hot-toast";
import { PieChart, Plus, Trash2, Sparkles, Target, TrendingUp, AlertTriangle, BarChart3 } from "lucide-react";
import { formatCurrencyFull } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

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

const BudgetManagement = () => {
  const { tenantId, currency } = useChurch();
  const queryClient = useQueryClient();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('financial_records');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [budgetName, setBudgetName] = useState("");
  const [lines, setLines] = useState<{ category: string; allocated_amount: string }[]>([{ category: "", allocated_amount: "" }]);

  // Real-time updates for budget data
  useBudgetRealtime(tenantId || '', () => {
    queryClient.invalidateQueries({ queryKey: ["budgets"] });
    queryClient.invalidateQueries({ queryKey: ["budget-categories"] });
  });

  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ["budgets", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("budgets").select("*").eq("tenant_id", tenantId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["budget-categories", tenantId],
    queryFn: async () => {
      // Get budget IDs for this tenant first, then get their categories
      const { data: tenantBudgets } = await supabase.from("budgets").select("id").eq("tenant_id", tenantId!);
      if (!tenantBudgets?.length) return [];
      const budgetIds = tenantBudgets.map(b => b.id);
      const { data } = await supabase.from("budget_categories").select("*").in("budget_id", budgetIds);
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses-for-budget", tenantId],
    queryFn: async () => {
      const { data } = await (supabase.from("expenses").select("category, amount") as any).eq("tenant_id", tenantId!).eq("approval_status", "approved");
      return data || [];
    },
    enabled: !!tenantId,
  });

  const totalBudget = categories.reduce((s: number, c: any) => s + Number(c.allocated_amount || 0), 0);
  const totalSpent = expenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  const utilization = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  const spentByCategory: Record<string, number> = {};
  expenses.forEach((e: any) => { spentByCategory[e.category || "other"] = (spentByCategory[e.category || "other"] || 0) + Number(e.amount); });

  const chartData = categories.map((c: any) => ({
    name: c.category?.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()) || "Other",
    Budgeted: Number(c.allocated_amount),
    Spent: spentByCategory[c.category] || 0,
  }));

  const createMutation = useMutation({
    mutationFn: async () => {
      if (readOnly) return;
      const { data: budget, error } = await supabase.from("budgets").insert({ tenant_id: tenantId, name: budgetName } as any).select().single();
      if (error) throw error;
      const validLines = lines.filter(l => l.category && l.allocated_amount);
      if (validLines.length > 0) {
        const { error: lineErr } = await supabase.from("budget_categories").insert(validLines.map(l => ({ budget_id: budget.id, category: l.category, allocated_amount: parseFloat(l.allocated_amount) })));
        if (lineErr) throw lineErr;
      }
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["budgets"] }); 
      queryClient.invalidateQueries({ queryKey: ["budget-categories"] }); 
      toast.success("Budget created successfully! 📊", {
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
      setBudgetName(""); 
      setLines([{ category: "", allocated_amount: "" }]); 
    },
    onError: () => toast.error("Failed to create budget", {
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

  const catColumns: Column<any>[] = [
    { key: "category", header: "Category", sortable: true, render: r => <span className="font-medium">{r.category?.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}</span> },
    { key: "allocated_amount", header: "Budget", sortable: true, render: r => formatCurrencyFull(Number(r.allocated_amount), currency) },
    { key: "spent", header: "Spent", render: r => formatCurrencyFull(spentByCategory[r.category] || 0, currency) },
    { key: "remaining", header: "Remaining", render: r => { const rem = Number(r.allocated_amount) - (spentByCategory[r.category] || 0); return <span className={rem < 0 ? "text-destructive font-semibold" : ""}>{formatCurrencyFull(rem, currency)}</span>; } },
    { key: "utilization", header: "Utilization", render: r => { const pct = Number(r.allocated_amount) > 0 ? Math.round(((spentByCategory[r.category] || 0) / Number(r.allocated_amount)) * 100) : 0; return <div className="flex items-center gap-2 w-32"><Progress value={Math.min(pct, 100)} className="h-2" /><span className="text-xs text-muted-foreground">{pct}%</span></div>; } },
  ];

  return (
    <>
      <Helmet><title>Budget Management — Vestry</title></Helmet>
      
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
              className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-600 rounded-full blur-3xl"
            />
            <motion.div
              animate={{ 
                scale: [1, 1.3, 1],
                opacity: [0.1, 0.15, 0.1]
              }}
              transition={{ duration: 5, repeat: Infinity, delay: 2 }}
              className="absolute bottom-1/3 right-1/4 w-24 h-24 bg-cyan-500 rounded-full blur-3xl"
            />
          </div>

          <PageHeader 
            title="Budget Management" 
            subtitle="Plan and track your annual church budget" 
            action={
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <PermissionButton readOnly={readOnly} className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 shadow-lg shadow-blue-500/25">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Budget
                    </PermissionButton>
                  </motion.div>
                </DialogTrigger>
                
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2, type: 'spring', stiffness: 300, damping: 25 }}
                  >
                    <DialogHeader className="pb-6">
                      <DialogTitle className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                        Create New Budget
                      </DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-6">
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="space-y-2"
                      >
                        <Label className="text-sm font-medium text-gray-700">Budget Name</Label>
                        <Input 
                          value={budgetName} 
                          onChange={e => setBudgetName(e.target.value)} 
                          placeholder="e.g. 2025 Annual Budget"
                          className="h-11 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all duration-200"
                        />
                      </motion.div>

                      <div className="space-y-4">
                        <Label className="text-sm font-medium text-gray-700">Budget Categories</Label>
                        <AnimatePresence>
                          {lines.map((line, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ delay: index * 0.05 }}
                              className="flex gap-3 items-end p-4 bg-blue-50/50 rounded-xl border border-blue-100"
                            >
                              <div className="flex-1">
                                <Label className="text-xs text-gray-600 mb-1 block">Category</Label>
                                <Input 
                                  placeholder="e.g. Worship, Outreach, Administration" 
                                  value={line.category} 
                                  onChange={e => { 
                                    const newLines = [...lines]; 
                                    newLines[index].category = e.target.value; 
                                    setLines(newLines); 
                                  }}
                                  className="h-10 text-sm border-gray-200"
                                />
                              </div>
                              
                              <div className="w-32">
                                <Label className="text-xs text-blue-600 mb-1 block">Amount ({currency})</Label>
                                <Input 
                                  type="number" 
                                  placeholder="0.00" 
                                  value={line.allocated_amount} 
                                  onChange={e => { 
                                    const newLines = [...lines]; 
                                    newLines[index].allocated_amount = e.target.value; 
                                    setLines(newLines); 
                                  }}
                                  className="h-10 text-sm border-gray-200"
                                />
                              </div>
                              
                              {lines.length > 1 && (
                                <motion.div
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-10 w-10 text-red-500 hover:text-red-600 hover:bg-red-50" 
                                    onClick={() => setLines(lines.filter((_, j) => j !== index))}
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
                            onClick={() => setLines([...lines, { category: "", allocated_amount: "" }])}
                            className="border-blue-200 hover:border-blue-300 text-blue-600"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Category
                          </Button>
                        </motion.div>
                      </div>

                      {/* Budget Total */}
                      <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-100">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Total Budget:</span>
                          <span className="text-xl font-bold text-blue-600">
                            <NumberFlow 
                              value={lines.reduce((s, l) => s + (parseFloat(l.allocated_amount) || 0), 0)} 
                              format={{ 
                                style: 'currency', 
                                currency: currency || 'KES',
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0
                              }}
                              transformTiming={{ duration: 500, easing: 'ease-out' }}
                            />
                          </span>
                        </div>
                      </div>

                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button 
                          className="w-full h-12 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 shadow-lg shadow-blue-500/25 text-white font-semibold transition-all duration-200" 
                          onClick={() => createMutation.mutate()} 
                          disabled={!budgetName || createMutation.isPending}
                        >
                          {createMutation.isPending ? (
                            <div className="flex items-center space-x-2">
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span>Creating...</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <Target className="w-4 h-4" />
                              <span>Create Budget</span>
                            </div>
                          )}
                        </Button>
                      </motion.div>
                    </div>
                  </motion.div>
                </DialogContent>
              </Dialog>
            } 
          />
          {readOnly && <ReadOnlyBanner section="Financial Records" />}
        </motion.div>

        {/* Premium Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: "Total Budget", amount: totalBudget, icon: Target, color: "from-blue-500 to-cyan-600", subtitle: "Annual allocation" },
            { title: "Spent YTD", amount: totalSpent, icon: TrendingUp, color: "from-emerald-500 to-green-600", subtitle: "Year to date" },
            { title: "Remaining", amount: totalBudget - totalSpent, icon: PieChart, color: "from-purple-500 to-indigo-600", subtitle: "Available funds" },
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
              <Card className="relative overflow-hidden rounded-2xl border-2 border-white/20 bg-gradient-to-br from-white/90 to-white/60 backdrop-blur-md shadow-xl shadow-black/5 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500">
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
          
          {/* Utilization Card */}
          <motion.div
            variants={cardVariants}
            whileHover={{ 
              y: -4, 
              scale: 1.02,
              transition: { type: 'spring', stiffness: 400, damping: 25 }
            }}
          >
            <Card className="relative overflow-hidden rounded-2xl border-2 border-white/20 bg-gradient-to-br from-white/90 to-white/60 backdrop-blur-md shadow-xl shadow-black/5 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-r from-amber-500 to-orange-600 opacity-20 rounded-full blur-2xl" />
              
              <CardContent className="relative p-6 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 flex items-center justify-center shadow-lg mb-4">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <p className="text-sm font-medium text-gray-600 mb-2">Budget Utilization</p>
                <div className="text-3xl font-bold text-gray-900 mb-3">
                  <NumberFlow 
                    value={utilization} 
                    format={{ 
                      style: 'decimal',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    }}
                    transformTiming={{ duration: 1000, easing: 'ease-out' }}
                  />%
                </div>
                <Progress 
                  value={Math.min(utilization, 100)} 
                  className="h-3 w-full bg-gray-100"
                />
                {utilization > 90 && (
                  <div className="flex items-center mt-2 text-amber-600">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    <span className="text-xs">Near limit</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Premium Budget vs Actual Chart */}
        {chartData.length > 0 && (
          <motion.div variants={cardVariants}>
            <Card className="relative overflow-hidden rounded-3xl border-2 border-white/20 bg-gradient-to-br from-white/90 to-white/60 backdrop-blur-md shadow-xl shadow-black/5">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
              
              <CardHeader className="relative border-b border-gray-100/50 bg-gradient-to-r from-gray-50/80 to-white/40 backdrop-blur-sm">
                <CardTitle className="flex items-center space-x-3 text-xl">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <span className="bg-gradient-to-r from-gray-700 to-gray-600 bg-clip-text text-transparent">
                    Budget vs Actual Spending
                  </span>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="relative p-6">
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="name" 
                      fontSize={12} 
                      stroke="#64748b"
                      tick={{ fill: '#64748b' }}
                    />
                    <YAxis 
                      fontSize={12} 
                      stroke="#64748b"
                      tick={{ fill: '#64748b' }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Legend />
                    <Bar 
                      dataKey="Budgeted" 
                      fill="url(#budgetGradient)" 
                      radius={[4,4,0,0]} 
                      name="Budgeted Amount"
                    />
                    <Bar 
                      dataKey="Spent" 
                      fill="url(#spentGradient)" 
                      radius={[4,4,0,0]} 
                      name="Actual Spent"
                    />
                    <defs>
                      <linearGradient id="budgetGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#06b6d4" />
                      </linearGradient>
                      <linearGradient id="spentGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#059669" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Premium Budget Categories Table */}
        <motion.div variants={cardVariants}>
          <Card className="relative overflow-hidden rounded-3xl border-2 border-white/20 bg-gradient-to-br from-white/90 to-white/60 backdrop-blur-md shadow-xl shadow-black/5">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            
            <CardHeader className="relative border-b border-gray-100/50 bg-gradient-to-r from-gray-50/80 to-white/40 backdrop-blur-sm">
              <CardTitle className="flex items-center space-x-3 text-xl">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <span className="bg-gradient-to-r from-gray-700 to-gray-600 bg-clip-text text-transparent">
                  Budget Categories
                </span>
              </CardTitle>
            </CardHeader>
            
            <CardContent className="relative p-0">
              {categories.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center py-16 text-center"
                >
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                    <PieChart className="w-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No budget categories</h3>
                  <p className="text-gray-500 max-w-sm mx-auto mb-6">
                    Create your first budget to start tracking spending by category
                  </p>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <PermissionButton 
                      permission="financial_records"
                      readOnly={readOnly}
                      onClick={() => setDialogOpen(true)}
                      className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 shadow-lg shadow-blue-500/25"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Budget
                    </PermissionButton>
                  </motion.div>
                </motion.div>
              ) : (
                <div className="overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-gray-100/50 bg-gray-50/50">
                        <TableHead className="font-semibold text-gray-700">Category</TableHead>
                        <TableHead className="font-semibold text-gray-700">Budget</TableHead>
                        <TableHead className="font-semibold text-gray-700">Spent</TableHead>
                        <TableHead className="font-semibold text-gray-700">Remaining</TableHead>
                        <TableHead className="font-semibold text-gray-700">Progress</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {categories.map((category: any, index: number) => {
                          const spent = spentByCategory[category.category] || 0;
                          const remaining = Number(category.allocated_amount) - spent;
                          const utilization = Number(category.allocated_amount) > 0 
                            ? Math.round((spent / Number(category.allocated_amount)) * 100) 
                            : 0;
                          
                          return (
                            <motion.tr
                              key={category.id}
                              variants={tableRowVariants}
                              initial="hidden"
                              animate="visible"
                              transition={{ delay: index * 0.05 }}
                              className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                            >
                              <TableCell>
                                <span className="font-medium text-gray-900">
                                  {category.category?.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="text-lg font-bold text-blue-600">
                                  <NumberFlow 
                                    value={Number(category.allocated_amount)} 
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
                                <span className="text-lg font-bold text-emerald-600">
                                  <NumberFlow 
                                    value={spent} 
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
                                <span className={`text-lg font-bold ${remaining < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                  <NumberFlow 
                                    value={remaining} 
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
                                <div className="flex items-center gap-3 w-36">
                                  <Progress 
                                    value={Math.min(utilization, 100)} 
                                    className={`h-3 flex-1 ${utilization > 100 ? 'bg-red-100' : 'bg-gray-100'}`}
                                  />
                                  <span className={`text-sm font-medium min-w-[40px] ${
                                    utilization > 100 ? 'text-red-600' : 
                                    utilization > 90 ? 'text-amber-600' : 
                                    'text-gray-600'
                                  }`}>
                                    {utilization}%
                                  </span>
                                </div>
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
    </>
  );
};

export default BudgetManagement;
