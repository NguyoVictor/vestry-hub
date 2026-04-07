import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { FinanceStatCard } from "@/components/finance/FinanceStatCard";
import { DataTable, Column } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { PieChart, Plus, Trash2 } from "lucide-react";
import { formatCurrencyFull } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const BudgetManagement = () => {
  const { tenantId, currency } = useChurch();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [budgetName, setBudgetName] = useState("");
  const [lines, setLines] = useState<{ category: string; allocated_amount: string }[]>([{ category: "", allocated_amount: "" }]);

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
      const { data: budget, error } = await supabase.from("budgets").insert({ tenant_id: tenantId, name: budgetName } as any).select().single();
      if (error) throw error;
      const validLines = lines.filter(l => l.category && l.allocated_amount);
      if (validLines.length > 0) {
        const { error: lineErr } = await supabase.from("budget_categories").insert(validLines.map(l => ({ budget_id: budget.id, category: l.category, allocated_amount: parseFloat(l.allocated_amount) })));
        if (lineErr) throw lineErr;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["budgets"] }); queryClient.invalidateQueries({ queryKey: ["budget-categories"] }); toast.success("Budget created"); setDialogOpen(false); setBudgetName(""); setLines([{ category: "", allocated_amount: "" }]); },
    onError: () => toast.error("Failed to create budget"),
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
      <PageHeader title="Budget Management" subtitle="Plan and track your annual church budget" action={<Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Create Budget</Button></DialogTrigger>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto"><DialogHeader><DialogTitle>Create Budget</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label>Budget Name</Label><Input value={budgetName} onChange={e => setBudgetName(e.target.value)} placeholder="e.g. 2025 Annual Budget" /></div>
            <Label>Budget Lines</Label>
            {lines.map((l, i) => (
              <div key={i} className="flex gap-2">
                <Input placeholder="Category" value={l.category} onChange={e => { const n = [...lines]; n[i].category = e.target.value; setLines(n); }} />
                <Input type="number" placeholder="Amount" value={l.allocated_amount} onChange={e => { const n = [...lines]; n[i].allocated_amount = e.target.value; setLines(n); }} />
                {lines.length > 1 && <Button variant="ghost" size="icon" onClick={() => setLines(lines.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setLines([...lines, { category: "", allocated_amount: "" }])}><Plus className="h-4 w-4 mr-1" />Add Line</Button>
            <p className="text-sm text-muted-foreground">Total: {formatCurrencyFull(lines.reduce((s, l) => s + (parseFloat(l.allocated_amount) || 0), 0), currency)}</p>
            <Button className="w-full" onClick={() => createMutation.mutate()} disabled={!budgetName || createMutation.isPending}>{createMutation.isPending ? "Creating..." : "Create Budget"}</Button>
          </div>
        </DialogContent>
      </Dialog>} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <FinanceStatCard title="Total Budget" amount={totalBudget} icon={PieChart} />
        <FinanceStatCard title="Spent YTD" amount={totalSpent} icon={PieChart} />
        <FinanceStatCard title="Remaining" amount={totalBudget - totalSpent} icon={PieChart} />
        <Card><CardContent className="p-5 flex flex-col items-center justify-center"><p className="text-sm text-muted-foreground mb-1">Utilization</p><p className="text-3xl font-bold">{utilization}%</p><Progress value={Math.min(utilization, 100)} className="h-2 w-full mt-2" /></CardContent></Card>
      </div>

      {chartData.length > 0 && (
        <Card className="mb-6"><CardHeader><CardTitle className="text-lg">Budget vs Actual</CardTitle></CardHeader><CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={12} /><YAxis fontSize={12} /><Tooltip /><Legend />
              <Bar dataKey="Budgeted" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
              <Bar dataKey="Spent" fill="hsl(142 76% 36%)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent></Card>
      )}

      <DataTable data={categories} columns={catColumns} loading={isLoading} getRowId={r => r.id} searchPlaceholder="Search categories..." emptyIcon={<PieChart className="h-12 w-12 text-muted-foreground/30" />} emptyTitle="No budget categories" emptyDescription="Create a budget to get started" />
    </>
  );
};

export default BudgetManagement;
