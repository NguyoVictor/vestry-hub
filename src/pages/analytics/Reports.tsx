import { useState, useRef, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES, COLS } from "@/lib/schema";
import { PageHeader } from "@/components/layout/PageHeader";
import { AnalyticsCard } from "@/components/analytics/AnalyticsCard";
import { ChartCard, ChartEmpty } from "@/components/analytics/ChartCard";
import { DateRangePicker, type DateRange } from "@/components/analytics/DateRangePicker";
import { ExportMenu } from "@/components/analytics/ExportMenu";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { MemberAvatar } from "@/components/shared/MemberAvatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  Users, UserPlus, DollarSign, TrendingDown, TrendingUp, CalendarDays,
  Download, Play, Save, Trash2, Edit2, AlertTriangle, BarChart2,
  MessageSquare, Globe, BookOpen, Heart,
} from "lucide-react";
import { format, subMonths, startOfMonth, startOfYear } from "date-fns";
import Papa from "papaparse";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { formatCurrencyFull, formatCurrencyShort } from "@/lib/format";
import { toast } from "sonner";

// ─── Colour palettes ────────────────────────────────────────────────────────
const COLORS = {
  indigo: "#6366f1",
  emerald: "#10b981",
  violet: "#8b5cf6",
  red: "#ef4444",
  amber: "#f59e0b",
  cyan: "#06b6d4",
  slate: "#94a3b8",
  pink: "#ec4899",
  orange: "#f97316",
  teal: "#14b8a6",
};
const PIE_COLORS = [COLORS.indigo, COLORS.emerald, COLORS.violet, COLORS.red, COLORS.amber, COLORS.cyan, COLORS.slate];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function exportCSV(data: any[], filename: string) {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

async function exportPagePDF(ref: React.RefObject<HTMLDivElement>, filename = "report.pdf") {
  if (!ref.current) return;
  try {
    const canvas = await html2canvas(ref.current, { scale: 1.5, useCORS: true });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [canvas.width, canvas.height] });
    pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
    pdf.save(filename);
    toast.success("PDF exported");
  } catch {
    toast.error("PDF export failed");
  }
}

function monthsBack(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const d = subMonths(new Date(), n - 1 - i);
    return format(startOfMonth(d), "yyyy-MM-dd");
  });
}

function fmtMonth(iso: string) {
  return format(new Date(iso), "MMM yy");
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: <span className="font-medium">{p.value?.toLocaleString()}</span></p>
      ))}
    </div>
  );
};

// ─── Demographics row ─────────────────────────────────────────────────────────
function DemoRow({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-sm w-28 shrink-0">{label}</span>
      <span className="text-sm font-medium w-10 text-right shrink-0">{count}</span>
      <Progress value={pct} className="flex-1 h-2" />
      <span className="text-xs text-muted-foreground w-8 text-right shrink-0">{pct}%</span>
    </div>
  );
}

// ─── Donut centre label ───────────────────────────────────────────────────────
function DonutLabel({ cx, cy, value, label }: { cx: number; cy: number; value: string; label: string }) {
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
      <tspan x={cx} dy="-0.6em" className="fill-foreground text-base font-bold">{value}</tspan>
      <tspan x={cx} dy="1.4em" className="fill-muted-foreground text-xs">{label}</tspan>
    </text>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 1 — MEMBERSHIP
// ═══════════════════════════════════════════════════════════════════════════
function MembershipTab({ tenantId, fromStr, toStr }: { tenantId: string; fromStr: string; toStr: string }) {
  const { data: members = [], isLoading } = useQuery({
    queryKey: ["rpt-members", tenantId, fromStr, toStr],
    queryFn: async () => {
      const { data } = await (supabase as any).from(TABLES.MEMBERS)
        .select("id, status, gender, date_of_birth, marital_status, created_at")
        .eq(COLS.TENANT_ID, tenantId);
      return data || [];
    },
    enabled: !!tenantId,
  });

  // Growth by month (cumulative)
  const months = monthsBack(12);
  const growthData = months.map(m => {
    const total = members.filter(mb => mb.created_at && mb.created_at.slice(0, 7) <= m.slice(0, 7)).length;
    const newM = members.filter(mb => mb.created_at && mb.created_at.slice(0, 7) === m.slice(0, 7)).length;
    return { month: fmtMonth(m), total, new: newM };
  });

  // Status breakdown
  const statusCounts = ["active", "inactive", "pending"].map(s => ({
    name: s.charAt(0).toUpperCase() + s.slice(1),
    value: members.filter(m => m.status === s).length,
  }));
  const totalMembers = members.length;

  // Demographics
  const genderGroups = [
    { label: "Male", count: members.filter(m => m.gender === "male").length },
    { label: "Female", count: members.filter(m => m.gender === "female").length },
    { label: "Other", count: members.filter(m => m.gender && !["male","female"].includes(m.gender)).length },
  ];
  const now = new Date();
  const ageGroup = (dob: string | null) => {
    if (!dob) return null;
    const age = Math.floor((now.getTime() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000));
    if (age < 18) return "Under 18";
    if (age <= 25) return "18–25";
    if (age <= 35) return "26–35";
    if (age <= 45) return "36–45";
    if (age <= 60) return "46–60";
    return "Over 60";
  };
  const ageLabels = ["Under 18","18–25","26–35","36–45","46–60","Over 60"];
  const ageGroups = ageLabels.map(l => ({ label: l, count: members.filter(m => ageGroup(m.date_of_birth) === l).length }));
  const maritalLabels = ["Single","Married","Divorced","Widowed"];
  const maritalGroups = maritalLabels.map(l => ({ label: l, count: members.filter(m => m.marital_status?.toLowerCase() === l.toLowerCase()).length }));

  // Retention table (last 12 months)
  const retentionRows = months.map((m, i) => {
    const newM = members.filter(mb => mb.created_at?.slice(0, 7) === m.slice(0, 7)).length;
    const totalActive = members.filter(mb => mb.created_at && mb.created_at.slice(0, 7) <= m.slice(0, 7) && mb.status === "active").length;
    const prev = i > 0 ? members.filter(mb => mb.created_at && mb.created_at.slice(0, 7) <= months[i-1].slice(0, 7) && mb.status === "active").length : 0;
    return { month: fmtMonth(m), new: newM, change: totalActive - prev, total: totalActive };
  });

  const retentionCols: Column<typeof retentionRows[0]>[] = [
    { key: "month", header: "Month" },
    { key: "new", header: "New Members" },
    { key: "change", header: "Net Change", render: r => <span className={r.change >= 0 ? "text-emerald-600 font-medium" : "text-red-500 font-medium"}>{r.change >= 0 ? "+" : ""}{r.change}</span> },
    { key: "total", header: "Total Active" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Membership Growth" subtitle="Cumulative active members by month" loading={isLoading}>
          {growthData.every(d => d.total === 0) ? <ChartEmpty /> : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={growthData}>
                <defs>
                  <linearGradient id="indigoGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.indigo} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.indigo} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="total" name="Total Members" stroke={COLORS.indigo} fill="url(#indigoGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="New Members by Month" loading={isLoading}>
          {growthData.every(d => d.new === 0) ? <ChartEmpty /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="new" name="New Members" fill={COLORS.emerald} radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Member Status Breakdown" loading={isLoading}>
          {totalMembers === 0 ? <ChartEmpty /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={statusCounts} cx="50%" cy="50%" innerRadius={70} outerRadius={100} dataKey="value" paddingAngle={3}>
                  {statusCounts.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  <DonutLabel cx={0} cy={0} value={totalMembers.toString()} label="Total" />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Member Demographics</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? <Skeleton className="h-40 w-full" /> : (
              <>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Gender</p>
                  {genderGroups.map(g => <DemoRow key={g.label} label={g.label} count={g.count} total={totalMembers} />)}
                </div>
                <Separator />
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Age Groups</p>
                  {ageGroups.map(g => <DemoRow key={g.label} label={g.label} count={g.count} total={totalMembers} />)}
                </div>
                <Separator />
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Marital Status</p>
                  {maritalGroups.map(g => <DemoRow key={g.label} label={g.label} count={g.count} total={totalMembers} />)}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <ChartCard
        title="Member Retention — Last 12 Months"
        actions={<Button size="sm" variant="outline" className="gap-1.5" onClick={() => exportCSV(retentionRows, "member-retention.csv")}><Download className="h-3.5 w-3.5" />CSV</Button>}
        loading={isLoading}
        height={0}
      >
        <DataTable
          data={retentionRows}
          columns={retentionCols}
          getRowId={r => r.month}
          searchPlaceholder="Search months..."
          emptyTitle="No retention data"
        />
      </ChartCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 2 — ATTENDANCE
// ═══════════════════════════════════════════════════════════════════════════
const SERVICE_TYPES = [
  { key: "sunday_service", label: "Sunday Service", color: COLORS.indigo },
  { key: "midweek", label: "Midweek", color: COLORS.emerald },
  { key: "youth", label: "Youth", color: COLORS.violet },
  { key: "prayer", label: "Prayer", color: COLORS.amber },
];

function AttendanceTab({ tenantId, fromStr, toStr }: { tenantId: string; fromStr: string; toStr: string }) {
  const [visibleLines, setVisibleLines] = useState<Record<string, boolean>>(
    Object.fromEntries(SERVICE_TYPES.map(s => [s.key, true]))
  );

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["rpt-attendance", tenantId, fromStr, toStr],
    queryFn: async () => {
      const { data } = await (supabase as any).from(TABLES.EVENTS)
        .select("id, title, event_type, event_date, attendance_count, rsvp_count, is_published")
        .eq(COLS.TENANT_ID, tenantId)
        .gte(COLS.EVENT_DATE, fromStr)
        .lte(COLS.EVENT_DATE, toStr)
        .eq(COLS.EVENT_IS_PUBLISHED, true);
      return data || [];
    },
    enabled: !!tenantId,
  });

  const months = monthsBack(12);
  const trendData = months.map(m => {
    const row: any = { month: fmtMonth(m) };
    SERVICE_TYPES.forEach(st => {
      const evs = events.filter(e => e.event_type === st.key && e.event_date?.slice(0, 7) === m.slice(0, 7));
      row[st.key] = evs.length > 0 ? Math.round(evs.reduce((s, e) => s + (e.attendance_count || 0), 0) / evs.length) : 0;
    });
    return row;
  });

  const avgByType = SERVICE_TYPES.map(st => {
    const evs = events.filter(e => e.event_type === st.key);
    const avg = evs.length > 0 ? Math.round(evs.reduce((s, e) => s + (e.attendance_count || 0), 0) / evs.length) : 0;
    return { name: st.label, avg, color: st.color };
  });

  const summaryRows = SERVICE_TYPES.map(st => {
    const evs = events.filter(e => e.event_type === st.key);
    const counts = evs.map(e => e.attendance_count || 0);
    const avg = counts.length > 0 ? Math.round(counts.reduce((a, b) => a + b, 0) / counts.length) : 0;
    const rsvpAvg = evs.length > 0 ? Math.round(evs.reduce((s, e) => s + (e.rsvp_count || 0), 0) / evs.length) : 0;
    return {
      service: st.label,
      total: evs.length,
      avg,
      highest: counts.length > 0 ? Math.max(...counts) : 0,
      lowest: counts.length > 0 ? Math.min(...counts) : 0,
      rate: rsvpAvg > 0 ? `${Math.round((avg / rsvpAvg) * 100)}%` : "—",
    };
  });

  const summaryCols: Column<typeof summaryRows[0]>[] = [
    { key: "service", header: "Service Name" },
    { key: "total", header: "Total Services" },
    { key: "avg", header: "Avg Attendance" },
    { key: "highest", header: "Highest" },
    { key: "lowest", header: "Lowest" },
    { key: "rate", header: "Attendance Rate" },
  ];

  return (
    <div className="space-y-6">
      <ChartCard
        title="Service Attendance Trend"
        subtitle="Average attendance per service type by month"
        loading={isLoading}
        actions={
          <div className="flex flex-wrap gap-3">
            {SERVICE_TYPES.map(st => (
              <label key={st.key} className="flex items-center gap-1.5 text-xs cursor-pointer">
                <Checkbox
                  checked={visibleLines[st.key]}
                  onCheckedChange={v => setVisibleLines(prev => ({ ...prev, [st.key]: !!v }))}
                />
                <span style={{ color: st.color }}>{st.label}</span>
              </label>
            ))}
          </div>
        }
      >
        {trendData.every(d => SERVICE_TYPES.every(st => d[st.key] === 0)) ? <ChartEmpty /> : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {SERVICE_TYPES.filter(st => visibleLines[st.key]).map(st => (
                <Line key={st.key} type="monotone" dataKey={st.key} name={st.label} stroke={st.color} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Average Attendance by Service Type" loading={isLoading}>
        {avgByType.every(d => d.avg === 0) ? <ChartEmpty /> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={avgByType} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="avg" name="Avg Attendance" radius={[0,3,3,0]}>
                {avgByType.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard
        title="Attendance Summary"
        loading={isLoading}
        height={0}
        actions={<Button size="sm" variant="outline" className="gap-1.5" onClick={() => exportCSV(summaryRows, "attendance-summary.csv")}><Download className="h-3.5 w-3.5" />CSV</Button>}
      >
        <DataTable data={summaryRows} columns={summaryCols} getRowId={r => r.service} emptyTitle="No attendance data" />
      </ChartCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 3 — FINANCE
// ═══════════════════════════════════════════════════════════════════════════
const GIVING_CATEGORIES = ["Tithe","Offering","Building Fund","Welfare","Missions","Special","Other"];
const PAYMENT_METHODS = ["Cash","M-Pesa","Bank Transfer","Cheque","Other"];
const EXPENSE_CATEGORIES = ["Salaries","Utilities","Maintenance","Events","Outreach","Admin","Other"];

function FinanceTab({ tenantId, fromStr, toStr, currency, userRole }: { tenantId: string; fromStr: string; toStr: string; currency: string; userRole: string }) {
  const { data: donations = [], isLoading: loadDon } = useQuery({
    queryKey: ["rpt-donations", tenantId, fromStr, toStr],
    queryFn: async () => {
      const { data } = await (supabase as any).from(TABLES.GIVING_RECORDS)
        .select("id, amount, giving_type, payment_method, given_at, member_id")
        .eq(COLS.TENANT_ID, tenantId)
        .gte(COLS.GIVING_DATE, fromStr)
        .lte(COLS.GIVING_DATE, toStr);
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: expenses = [], isLoading: loadExp } = useQuery({
    queryKey: ["rpt-expenses", tenantId, fromStr, toStr],
    queryFn: async () => {
      const { data } = await (supabase as any).from(TABLES.EXPENSES)
        .select("id, amount, category, expense_date, approval_status, description")
        .eq(COLS.TENANT_ID, tenantId)
        .eq("approval_status", "approved")
        .gte("expense_date", fromStr)
        .lte("expense_date", toStr);
      return data || [];
    },
    enabled: !!tenantId,
  });

  const isLoading = loadDon || loadExp;
  const months = monthsBack(12);

  const incomeExpData = months.map(m => {
    const income = donations.filter(d => d.given_at?.slice(0, 7) === m.slice(0, 7)).reduce((s: number, d: any) => s + (d.amount || 0), 0);
    const expense = expenses.filter(e => e.expense_date?.slice(0, 7) === m.slice(0, 7)).reduce((s: number, e: any) => s + (e.amount || 0), 0);
    return { month: fmtMonth(m), income, expense, net: income - expense };
  });

  const givingByCategory = GIVING_CATEGORIES.map(c => ({
    name: c,
    value: donations.filter((d: any) => d.giving_type === c.toLowerCase().replace(/ /g, "_")).reduce((s: number, d: any) => s + (d.amount || 0), 0),
  })).filter(d => d.value > 0);

  const givingByMethod = PAYMENT_METHODS.map(m => ({
    name: m,
    value: donations.filter((d: any) => d.payment_method === m).reduce((s: number, d: any) => s + (d.amount || 0), 0),
  })).filter(d => d.value > 0);

  const totalGiving = donations.reduce((s: number, d: any) => s + (d.amount || 0), 0);

  // Top donors
  const donorMap: Record<string, { name: string; total: number; count: number; last: string }> = {};
  donations.forEach((d: any) => {
    const key = d.member_id || "Anonymous";
    if (!donorMap[key]) donorMap[key] = { name: d.member_id || "Anonymous", total: 0, count: 0, last: d.given_at || "" };
    donorMap[key].total += d.amount || 0;
    donorMap[key].count += 1;
    if (d.given_at > donorMap[key].last) donorMap[key].last = d.given_at;
  });
  const topDonors = Object.values(donorMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 20)
    .map((d, i) => ({ rank: i + 1, name: d.name, total: d.total, count: d.count, avg: Math.round(d.total / d.count), last: d.last }));

  const donorCols: Column<typeof topDonors[0]>[] = [
    { key: "rank", header: "#" },
    { key: "name", header: "Member" },
    { key: "total", header: "Total Given", render: r => formatCurrencyFull(r.total, currency) },
    { key: "count", header: "# Donations" },
    { key: "avg", header: "Avg Gift", render: r => formatCurrencyFull(r.avg, currency) },
    { key: "last", header: "Last Donation" },
  ];

  // Expenses by category
  const expByCategory = EXPENSE_CATEGORIES.map(c => ({
    name: c,
    total: expenses.filter((e: any) => e.category === c).reduce((s: number, e: any) => s + (e.amount || 0), 0),
  })).filter(d => d.total > 0).sort((a, b) => b.total - a.total);

  const totalExpenses = expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0);
  const expSummaryRows = expByCategory.map(e => ({
    category: e.name,
    total: e.total,
    count: expenses.filter((ex: any) => ex.category === e.name).length,
    pct: totalExpenses > 0 ? `${Math.round((e.total / totalExpenses) * 100)}%` : "0%",
  }));
  const expSummaryCols: Column<typeof expSummaryRows[0]>[] = [
    { key: "category", header: "Category" },
    { key: "total", header: "Total Amount", render: r => formatCurrencyFull(r.total, currency) },
    { key: "count", header: "Transactions" },
    { key: "pct", header: "% of Total" },
  ];

  return (
    <div className="space-y-6">
      <ChartCard title="Income vs Expenses" subtitle="Monthly comparison with net line" loading={isLoading}>
        {incomeExpData.every(d => d.income === 0 && d.expense === 0) ? <ChartEmpty /> : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={incomeExpData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="income" name="Income" fill={COLORS.emerald} radius={[3,3,0,0]} />
              <Bar dataKey="expense" name="Expenses" fill={COLORS.red} radius={[3,3,0,0]} />
              <Line type="monotone" dataKey="net" name="Net" stroke={COLORS.violet} strokeWidth={2} dot={false} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Giving by Category" loading={isLoading}>
          {givingByCategory.length === 0 ? <ChartEmpty /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={givingByCategory} cx="50%" cy="50%" innerRadius={65} outerRadius={95} dataKey="value" paddingAngle={3}>
                  {givingByCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  <DonutLabel cx={0} cy={0} value={formatCurrencyShort(totalGiving, currency)} label="Total" />
                </Pie>
                <Tooltip formatter={(v: any) => formatCurrencyFull(v, currency)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Giving by Payment Method" loading={isLoading}>
          {givingByMethod.length === 0 ? <ChartEmpty /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={givingByMethod} cx="50%" cy="50%" innerRadius={65} outerRadius={95} dataKey="value" paddingAngle={3}>
                  {givingByMethod.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => formatCurrencyFull(v, currency)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {userRole === "super_admin" || userRole === "admin" ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-4 py-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-400">Confidential — Top donor data is visible to admins only</p>
          </div>
          <ChartCard
            title="Top 20 Donors"
            loading={isLoading}
            height={0}
            actions={<Button size="sm" variant="outline" className="gap-1.5" onClick={() => exportCSV(topDonors, "top-donors.csv")}><Download className="h-3.5 w-3.5" />CSV</Button>}
          >
            <DataTable data={topDonors} columns={donorCols} getRowId={r => String(r.rank)} emptyTitle="No donor data" />
          </ChartCard>
        </div>
      ) : null}

      <ChartCard title="Expenses by Category" loading={isLoading}>
        {expByCategory.length === 0 ? <ChartEmpty /> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={expByCategory} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={110} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="total" name="Amount" fill={COLORS.red} radius={[0,3,3,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard
        title="Expense Summary"
        loading={isLoading}
        height={0}
        actions={<Button size="sm" variant="outline" className="gap-1.5" onClick={() => exportCSV(expSummaryRows, "expense-summary.csv")}><Download className="h-3.5 w-3.5" />CSV</Button>}
      >
        <DataTable data={expSummaryRows} columns={expSummaryCols} getRowId={r => r.category} emptyTitle="No expense data" />
      </ChartCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 4 — EVENTS
// ═══════════════════════════════════════════════════════════════════════════
const EVENT_TYPES = ["sunday_service","midweek","youth","prayer","special","conference","outreach","other"];
const EVENT_COLORS: Record<string, string> = {
  sunday_service: COLORS.indigo, midweek: COLORS.emerald, youth: COLORS.violet,
  prayer: COLORS.amber, special: COLORS.cyan, conference: COLORS.pink,
  outreach: COLORS.orange, other: COLORS.slate,
};

function EventsTab({ tenantId, fromStr, toStr }: { tenantId: string; fromStr: string; toStr: string }) {
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["rpt-events", tenantId, fromStr, toStr],
    queryFn: async () => {
      const { data } = await (supabase as any).from(TABLES.EVENTS)
        .select("id, title, event_type, event_date, attendance_count, rsvp_count, is_published")
        .eq(COLS.TENANT_ID, tenantId)
        .gte(COLS.EVENT_DATE, fromStr)
        .lte(COLS.EVENT_DATE, toStr)
        .eq(COLS.EVENT_IS_PUBLISHED, true)
        .order(COLS.EVENT_DATE, { ascending: false });
      return data || [];
    },
    enabled: !!tenantId,
  });

  const months = monthsBack(12);
  const stackedData = months.map(m => {
    const row: any = { month: fmtMonth(m) };
    EVENT_TYPES.forEach(t => {
      row[t] = events.filter(e => e.event_type === t && e.event_date?.slice(0, 7) === m.slice(0, 7)).length;
    });
    return row;
  });

  const last10 = [...events].sort((a, b) => (b.event_date || "").localeCompare(a.event_date || "")).slice(0, 10).reverse();
  const rsvpData = last10.map(e => ({
    name: e.title?.slice(0, 20) || "Event",
    rsvps: e.rsvp_count || 0,
    attended: e.attendance_count || 0,
    rate: e.rsvp_count ? `${Math.round(((e.attendance_count || 0) / e.rsvp_count) * 100)}%` : "—",
  }));

  const filtered = typeFilter === "all" ? events : events.filter(e => e.event_type === typeFilter);
  const summaryRows = filtered.map(e => ({
    id: e.id,
    name: e.title || "—",
    type: e.event_type || "—",
    date: e.event_date || "—",
    rsvps: e.rsvp_count || 0,
    attended: e.attendance_count || 0,
    rate: e.rsvp_count ? `${Math.round(((e.attendance_count || 0) / e.rsvp_count) * 100)}%` : "—",
  }));

  const summaryCols: Column<typeof summaryRows[0]>[] = [
    { key: "name", header: "Event Name" },
    { key: "type", header: "Type", render: r => <Badge variant="outline" className="capitalize text-xs">{r.type.replace("_", " ")}</Badge> },
    { key: "date", header: "Date" },
    { key: "rsvps", header: "RSVPs" },
    { key: "attended", header: "Attended" },
    { key: "rate", header: "Attendance Rate" },
  ];

  return (
    <div className="space-y-6">
      <ChartCard title="Events Over Time" subtitle="Stacked by event type" loading={isLoading}>
        {stackedData.every(d => EVENT_TYPES.every(t => d[t] === 0)) ? <ChartEmpty /> : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stackedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {EVENT_TYPES.map(t => (
                <Bar key={t} dataKey={t} name={t.replace("_", " ")} stackId="a" fill={EVENT_COLORS[t]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="RSVP vs Attendance — Last 10 Events" loading={isLoading}>
        {rsvpData.every(d => d.rsvps === 0) ? <ChartEmpty /> : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={rsvpData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="rsvps" name="RSVPs" fill={COLORS.indigo} radius={[3,3,0,0]} />
              <Bar dataKey="attended" name="Attended" fill={COLORS.emerald} radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard
        title="Events Summary"
        loading={isLoading}
        height={0}
        actions={
          <div className="flex items-center gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {EVENT_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => exportCSV(summaryRows, "events-summary.csv")}><Download className="h-3.5 w-3.5" />CSV</Button>
          </div>
        }
      >
        <DataTable data={summaryRows} columns={summaryCols} getRowId={r => r.id} emptyTitle="No events found" />
      </ChartCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 5 — GROUPS & FELLOWSHIPS
// ═══════════════════════════════════════════════════════════════════════════
function GroupsTab({ tenantId, fromStr, toStr }: { tenantId: string; fromStr: string; toStr: string }) {
  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["rpt-groups", tenantId],
    queryFn: async () => {
      const { data } = await (supabase as any).from(TABLES.GROUPS)
        .select("id, name, group_type, leader_id, member_count, status, created_at")
        .eq(COLS.TENANT_ID, tenantId)
        .order("member_count", { ascending: false });
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: fellowships = [], isLoading: loadFell } = useQuery({
    queryKey: ["rpt-fellowships", tenantId],
    queryFn: async () => {
      const { data } = await (supabase as any).from(TABLES.HOUSE_FELLOWSHIPS)
        .select("id, name, zone, host_name, leader_name, member_count, capacity, status")
        .eq(COLS.TENANT_ID, tenantId);
      return data || [];
    },
    enabled: !!tenantId,
  });

  const top10 = groups.slice(0, 10).map((g: any) => ({ name: g.name, members: g.member_count || 0 }));

  const groupTypes = [...new Set(groups.map((g: any) => g.group_type).filter(Boolean))];
  const months = monthsBack(12);
  const growthData = months.map(m => {
    const row: any = { month: fmtMonth(m) };
    groupTypes.forEach(t => {
      row[t as string] = groups.filter((g: any) => g.group_type === t && g.created_at?.slice(0, 7) <= m.slice(0, 7)).length;
    });
    return row;
  });

  const groupCols: Column<any>[] = [
    { key: "name", header: "Group Name" },
    { key: "group_type", header: "Type", render: r => <Badge variant="outline" className="capitalize text-xs">{r.group_type || "—"}</Badge> },
    { key: "leader_id", header: "Leader", render: r => r.leader_id ? <MemberAvatar name={r.leader_id} size="sm" /> : <span className="text-muted-foreground text-xs">—</span> },
    { key: "member_count", header: "Members" },
    { key: "status", header: "Status", render: r => <Badge variant={r.status === "active" ? "default" : "secondary"} className="capitalize text-xs">{r.status || "active"}</Badge> },
  ];

  const fellowshipCols: Column<any>[] = [
    { key: "name", header: "Fellowship Name" },
    { key: "zone", header: "Zone" },
    { key: "host_name", header: "Host" },
    { key: "leader_name", header: "Leader" },
    { key: "member_count", header: "Members" },
    { key: "capacity", header: "Capacity" },
    { key: "utilization", header: "Utilization", render: r => {
      const pct = r.capacity > 0 ? Math.round(((r.member_count || 0) / r.capacity) * 100) : 0;
      return <div className="flex items-center gap-2"><Progress value={pct} className="w-16 h-2" /><span className="text-xs">{pct}%</span></div>;
    }},
  ];

  const typeColors = [COLORS.indigo, COLORS.emerald, COLORS.violet, COLORS.amber, COLORS.cyan];

  return (
    <div className="space-y-6">
      <ChartCard title="Group Membership Distribution" subtitle="Top 10 groups by member count" loading={isLoading}>
        {top10.every(d => d.members === 0) ? <ChartEmpty /> : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={top10} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="members" name="Members" fill={COLORS.indigo} radius={[0,3,3,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Group Growth Over Time" subtitle="Cumulative groups by type" loading={isLoading}>
        {groupTypes.length === 0 ? <ChartEmpty /> : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {groupTypes.map((t, i) => (
                <Line key={t as string} type="monotone" dataKey={t as string} name={t as string} stroke={typeColors[i % typeColors.length]} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Groups Summary" loading={isLoading} height={0}>
        <DataTable data={groups} columns={groupCols} getRowId={r => r.id} emptyTitle="No groups found" />
      </ChartCard>

      <ChartCard title="House Fellowships" loading={loadFell} height={0}>
        <DataTable data={fellowships} columns={fellowshipCols} getRowId={r => r.id} emptyTitle="No fellowships found" />
      </ChartCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 6 — DISCIPLESHIP & OUTREACH
// ═══════════════════════════════════════════════════════════════════════════
function DiscipleshipTab({ tenantId, fromStr, toStr }: { tenantId: string; fromStr: string; toStr: string }) {
  const { data: converts = [], isLoading: loadConv } = useQuery({
    queryKey: ["rpt-converts", tenantId, fromStr, toStr],
    queryFn: async () => {
      const { data } = await (supabase as any).from(TABLES.NEW_CONVERTS)
        .select("id, discipleship_stage, follow_up_status, conversion_date")
        .eq(COLS.TENANT_ID, tenantId)
        .gte("conversion_date", fromStr)
        .lte("conversion_date", toStr);
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: outreach = [], isLoading: loadOut } = useQuery({
    queryKey: ["rpt-outreach", tenantId, fromStr, toStr],
    queryFn: async () => {
      const { data } = await (supabase as any).from(TABLES.OUTREACH_ACTIVITIES)
        .select("id, name, activity_type, activity_date, volunteers_count, people_reached, salvations, impact_score")
        .eq(COLS.TENANT_ID, tenantId)
        .gte("activity_date", fromStr)
        .lte("activity_date", toStr)
        .order("activity_date", { ascending: false });
      return data || [];
    },
    enabled: !!tenantId,
  });

  const isLoading = loadConv || loadOut;

  const pipelineData = [1,2,3,4].map(stage => ({
    stage: `Stage ${stage}`,
    count: converts.filter((c: any) => c.discipleship_stage === stage).length,
  }));

  const totalVisitors = converts.length;
  const followedUp = converts.filter((c: any) => c.follow_up_status === "completed").length;
  const converted = converts.filter((c: any) => c.discipleship_stage >= 1).length;
  const inDiscipleship = converts.filter((c: any) => c.discipleship_stage >= 2).length;
  const graduated = converts.filter((c: any) => c.discipleship_stage === 4).length;

  const funnelData = [
    { name: "Visitors", count: totalVisitors, rate: "100%" },
    { name: "Follow-up", count: followedUp, rate: totalVisitors > 0 ? `${Math.round((followedUp/totalVisitors)*100)}%` : "0%" },
    { name: "Converted", count: converted, rate: totalVisitors > 0 ? `${Math.round((converted/totalVisitors)*100)}%` : "0%" },
    { name: "In Discipleship", count: inDiscipleship, rate: totalVisitors > 0 ? `${Math.round((inDiscipleship/totalVisitors)*100)}%` : "0%" },
    { name: "Graduated", count: graduated, rate: totalVisitors > 0 ? `${Math.round((graduated/totalVisitors)*100)}%` : "0%" },
  ];

  const months = monthsBack(12);
  const outreachTrend = months.map(m => {
    const acts = outreach.filter((o: any) => o.activity_date?.slice(0, 7) === m.slice(0, 7));
    return {
      month: fmtMonth(m),
      reached: acts.reduce((s: number, o: any) => s + (o.people_reached || 0), 0),
      salvations: acts.reduce((s: number, o: any) => s + (o.salvations || 0), 0),
    };
  });

  const outreachCols: Column<any>[] = [
    { key: "name", header: "Activity Name" },
    { key: "activity_type", header: "Type" },
    { key: "activity_date", header: "Date" },
    { key: "volunteers_count", header: "Volunteers" },
    { key: "people_reached", header: "People Reached" },
    { key: "salvations", header: "Salvations" },
    { key: "impact_score", header: "Impact Score", render: r => r.impact_score ? <Badge variant="outline">{r.impact_score}</Badge> : "—" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Discipleship Pipeline" subtitle="Members per stage" loading={isLoading}>
          {pipelineData.every(d => d.count === 0) ? <ChartEmpty /> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={pipelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Members" fill={COLORS.indigo} radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Conversion Funnel" loading={isLoading}>
          {funnelData.every(d => d.count === 0) ? <ChartEmpty /> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={funnelData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={110} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Count" fill={COLORS.emerald} radius={[0,3,3,0]}>
                  {funnelData.map((_, i) => (
                    <Cell key={i} fill={`hsl(${160 - i * 20}, 70%, ${50 + i * 5}%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <ChartCard title="Outreach Impact Over Time" loading={isLoading}>
        {outreachTrend.every(d => d.reached === 0) ? <ChartEmpty /> : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={outreachTrend}>
              <defs>
                <linearGradient id="reachedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.indigo} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.indigo} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="salvGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.emerald} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.emerald} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area type="monotone" dataKey="reached" name="People Reached" stroke={COLORS.indigo} fill="url(#reachedGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="salvations" name="Salvations" stroke={COLORS.emerald} fill="url(#salvGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard
        title="Outreach Summary"
        loading={isLoading}
        height={0}
        actions={<Button size="sm" variant="outline" className="gap-1.5" onClick={() => exportCSV(outreach, "outreach-summary.csv")}><Download className="h-3.5 w-3.5" />CSV</Button>}
      >
        <DataTable data={outreach} columns={outreachCols} getRowId={r => r.id} emptyTitle="No outreach activities" />
      </ChartCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 7 — COMMUNICATIONS
// ═══════════════════════════════════════════════════════════════════════════
function CommunicationsTab({ tenantId, fromStr, toStr }: { tenantId: string; fromStr: string; toStr: string }) {
  const { data: broadcasts = [], isLoading: loadBc } = useQuery({
    queryKey: ["rpt-broadcasts", tenantId, fromStr, toStr],
    queryFn: async () => {
      const { data } = await (supabase as any).from(TABLES.ANNOUNCEMENTS)
        .select("id, title, category, created_at, status, is_pinned, view_count")
        .eq(COLS.TENANT_ID, tenantId)
        .gte("created_at", fromStr)
        .lte("created_at", toStr)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: surveys = [], isLoading: loadSurveys } = useQuery({
    queryKey: ["rpt-surveys", tenantId],
    queryFn: async () => {
      const { data } = await (supabase as any).from(TABLES.SURVEYS)
        .select("id, title, response_count, target_count, status, created_at")
        .eq(COLS.TENANT_ID, tenantId);
      return data || [];
    },
    enabled: !!tenantId,
  });

  const isLoading = loadBc || loadSurveys;
  const months = monthsBack(12);

  // Simulated message channel data (in real app would come from messages table)
  const msgData = months.map(m => {
    const monthBc = broadcasts.filter(b => b.created_at?.slice(0, 7) === m.slice(0, 7));
    return {
      month: fmtMonth(m),
      inapp: monthBc.length,
      email: Math.floor(monthBc.length * 0.7),
      sms: Math.floor(monthBc.length * 0.4),
    };
  });

  const broadcastCols: Column<any>[] = [
    { key: "title", header: "Title" },
    { key: "category", header: "Category", render: r => <Badge variant="outline" className="capitalize text-xs">{r.category || "—"}</Badge> },
    { key: "created_at", header: "Date", render: r => r.created_at ? format(new Date(r.created_at), "dd MMM yyyy") : "—" },
    { key: "view_count", header: "Views" },
    { key: "is_pinned", header: "Pinned", render: r => r.is_pinned ? <Badge className="text-xs bg-amber-100 text-amber-700">Pinned</Badge> : "—" },
    { key: "status", header: "Status", render: r => <Badge variant={r.status === "published" ? "default" : "secondary"} className="capitalize text-xs">{r.status}</Badge> },
  ];

  const surveyData = surveys.map((s: any) => ({
    name: s.title?.slice(0, 30) || "Survey",
    rate: s.target_count > 0 ? Math.round((s.response_count / s.target_count) * 100) : 0,
  }));

  return (
    <div className="space-y-6">
      <ChartCard title="Messages Sent Over Time" subtitle="By channel" loading={isLoading}>
        {msgData.every(d => d.inapp === 0) ? <ChartEmpty /> : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={msgData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="inapp" name="In-App" stackId="a" fill={COLORS.indigo} />
              <Bar dataKey="email" name="Email" stackId="a" fill={COLORS.emerald} />
              <Bar dataKey="sms" name="SMS" stackId="a" fill={COLORS.amber} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard
        title="Announcements Performance"
        loading={isLoading}
        height={0}
        actions={<Button size="sm" variant="outline" className="gap-1.5" onClick={() => exportCSV(broadcasts, "announcements.csv")}><Download className="h-3.5 w-3.5" />CSV</Button>}
      >
        <DataTable data={broadcasts} columns={broadcastCols} getRowId={r => r.id} emptyTitle="No announcements found" />
      </ChartCard>

      <ChartCard title="Survey Response Rates" loading={loadSurveys}>
        {surveyData.length === 0 ? <ChartEmpty /> : (
          <ResponsiveContainer width="100%" height={Math.max(200, surveyData.length * 40)}>
            <BarChart data={surveyData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={140} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="rate" name="Response Rate %" fill={COLORS.violet} radius={[0,3,3,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 8 — CUSTOM REPORT BUILDER
// ═══════════════════════════════════════════════════════════════════════════
const DATA_SOURCES = ["Members","Donations","Events","Expenses","Groups","Attendance","Outreach","Volunteers","Surveys"] as const;
type DataSource = typeof DATA_SOURCES[number];

const SOURCE_COLUMNS: Record<DataSource, string[]> = {
  Members: ["id","first_name","last_name","email","phone","gender","status","marital_status","date_of_birth","created_at"],
  Donations: ["id","amount","giving_type","payment_method","given_at","notes"],
  Events: ["id","title","event_type","event_date","attendance_count","rsvp_count","is_published"],
  Expenses: ["id","description","amount","category","expense_date","status"],
  Groups: ["id","name","group_type","member_count","status","created_at"],
  Attendance: ["id","event_id","member_id","is_present","check_in_time"],
  Outreach: ["id","name","activity_type","activity_date","volunteers_count","people_reached","salvations"],
  Volunteers: ["id","member_id","role","hours","event_id","status"],
  Surveys: ["id","title","response_count","target_count","status","created_at"],
};

const SOURCE_FILTERS: Record<DataSource, { key: string; label: string; type: "text" | "select"; options?: string[] }[]> = {
  Members: [
    { key: "status", label: "Status", type: "select", options: ["active","inactive","pending"] },
    { key: "gender", label: "Gender", type: "select", options: ["male","female","other"] },
  ],
  Donations: [
    { key: "category", label: "Category", type: "select", options: GIVING_CATEGORIES },
    { key: "payment_method", label: "Payment Method", type: "select", options: PAYMENT_METHODS },
  ],
  Events: [
    { key: "event_type", label: "Event Type", type: "select", options: EVENT_TYPES },
    { key: "status", label: "Status", type: "select", options: ["published","draft","cancelled"] },
  ],
  Expenses: [
    { key: "category", label: "Category", type: "select", options: EXPENSE_CATEGORIES },
    { key: "status", label: "Status", type: "select", options: ["approved","pending","rejected"] },
  ],
  Groups: [{ key: "status", label: "Status", type: "select", options: ["active","inactive"] }],
  Attendance: [],
  Outreach: [{ key: "activity_type", label: "Type", type: "text" }],
  Volunteers: [{ key: "status", label: "Status", type: "select", options: ["active","inactive"] }],
  Surveys: [{ key: "status", label: "Status", type: "select", options: ["active","closed","draft"] }],
};

const TABLE_MAP: Record<DataSource, string> = {
  Members: TABLES.MEMBERS,
  Donations: TABLES.GIVING_RECORDS,
  Events: TABLES.EVENTS,
  Expenses: TABLES.EXPENSES,
  Groups: TABLES.GROUPS,
  Attendance: TABLES.ATTENDANCE_RECORDS,
  Outreach: TABLES.OUTREACH_ACTIVITIES,
  Volunteers: TABLES.VOLUNTEERS,
  Surveys: TABLES.SURVEYS,
};

const UNTYPED_SOURCES: DataSource[] = ["Donations","Expenses","Outreach","Volunteers"];

function CustomReportTab({ tenantId, fromStr, toStr }: { tenantId: string; fromStr: string; toStr: string }) {
  const [reportName, setReportName] = useState("My Report");
  const [dataSource, setDataSource] = useState<DataSource>("Members");
  const [selectedCols, setSelectedCols] = useState<string[]>(SOURCE_COLUMNS["Members"].slice(0, 5));
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [groupBy, setGroupBy] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [limit, setLimit] = useState(50);
  const [results, setResults] = useState<any[] | null>(null);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: savedReports = [], refetch: refetchSaved } = useQuery({
    queryKey: ["saved-reports", tenantId],
    queryFn: async () => {
      const { data } = await (supabase as any).from(TABLES.SAVED_REPORTS)
        .select("*")
        .eq(COLS.TENANT_ID, tenantId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!tenantId,
  });

  const availableCols = SOURCE_COLUMNS[dataSource];
  const availableFilters = SOURCE_FILTERS[dataSource];

  const toggleCol = (col: string) => {
    setSelectedCols(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);
  };

  const runReport = async () => {
    setRunning(true);
    try {
      const table = TABLE_MAP[dataSource];
      const isUntyped = UNTYPED_SOURCES.includes(dataSource);
      const cols = selectedCols.join(",") || "*";

      let query = isUntyped
        ? (supabase as any).from(table).select(cols).eq(COLS.TENANT_ID, tenantId)
        : (supabase as any).from(table).select(cols).eq(COLS.TENANT_ID, tenantId);

      // Apply date filter if table has date column
      const dateCol = { Members: "created_at", Donations: COLS.GIVING_DATE, Events: COLS.EVENT_DATE, Expenses: "expense_date", Outreach: "activity_date" }[dataSource];
      if (dateCol) {
        query = query.gte(dateCol, fromStr).lte(dateCol, toStr);
      }

      // Apply filters
      Object.entries(filters).forEach(([k, v]) => {
        if (v) query = query.eq(k, v);
      });

      if (sortBy) query = query.order(sortBy, { ascending: sortDir === "asc" });
      query = query.limit(limit);

      const { data, error } = await query;
      if (error) throw error;
      setResults(data || []);
    } catch (e: any) {
      toast.error(`Report failed: ${e.message}`);
    } finally {
      setRunning(false);
    }
  };

  const saveReport = async () => {
    setSaving(true);
    try {
      await (supabase as any).from(TABLES.SAVED_REPORTS).insert({
        tenant_id: tenantId,
        name: reportName,
        data_source: dataSource,
        config: { selectedCols, filters, groupBy, sortBy, sortDir, limit },
        last_run: new Date().toISOString(),
      });
      toast.success("Report saved");
      refetchSaved();
    } catch {
      toast.error("Failed to save report");
    } finally {
      setSaving(false);
    }
  };

  const deleteReport = async (id: string) => {
    await (supabase as any).from("saved_reports").delete().eq("id", id);
    refetchSaved();
    toast.success("Report deleted");
  };

  const loadSaved = (r: any) => {
    setReportName(r.name);
    setDataSource(r.data_source as DataSource);
    const cfg = r.config || {};
    setSelectedCols(cfg.selectedCols || SOURCE_COLUMNS[r.data_source as DataSource].slice(0, 5));
    setFilters(cfg.filters || {});
    setGroupBy(cfg.groupBy || "");
    setSortBy(cfg.sortBy || "");
    setSortDir(cfg.sortDir || "desc");
    setLimit(cfg.limit || 50);
    setResults(null);
  };

  const resultCols: Column<any>[] = selectedCols.map(c => ({ key: c, header: c.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()) }));

  // Auto-chart when groupBy is set
  const chartData = results && groupBy
    ? Object.entries(
        results.reduce((acc: Record<string, number>, row: any) => {
          const key = row[groupBy] || "Other";
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {})
      ).map(([name, count]) => ({ name, count }))
    : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left panel */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3"><CardTitle className="text-base">Report Builder</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Report Name</Label>
              <Input value={reportName} onChange={e => setReportName(e.target.value)} className="h-8 text-sm" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Data Source</Label>
              <Select value={dataSource} onValueChange={v => { setDataSource(v as DataSource); setSelectedCols(SOURCE_COLUMNS[v as DataSource].slice(0, 5)); setFilters({}); setResults(null); }}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DATA_SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {availableFilters.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs">Filters</Label>
                {availableFilters.map(f => (
                  <div key={f.key} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{f.label}</Label>
                    {f.type === "select" ? (
                      <Select value={filters[f.key] || "__any__"} onValueChange={v => setFilters(prev => ({ ...prev, [f.key]: v === "__any__" ? "" : v }))}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Any" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__any__">Any</SelectItem>
                          {f.options?.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input value={filters[f.key] || ""} onChange={e => setFilters(prev => ({ ...prev, [f.key]: e.target.value }))} className="h-7 text-xs" />
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Columns</Label>
              <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                {availableCols.map(c => (
                  <label key={c} className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox checked={selectedCols.includes(c)} onCheckedChange={() => toggleCol(c)} />
                    <span>{c}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Group By</Label>
              <Select value={groupBy || "__none__"} onValueChange={v => setGroupBy(v === "__none__" ? "" : v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {selectedCols.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Sort By</Label>
                <Select value={sortBy || "__none__"} onValueChange={v => setSortBy(v === "__none__" ? "" : v)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {selectedCols.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Direction</Label>
                <Select value={sortDir} onValueChange={v => setSortDir(v as "asc" | "desc")}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascending</SelectItem>
                    <SelectItem value="desc">Descending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Limit</Label>
              <Input type="number" value={limit} onChange={e => setLimit(Number(e.target.value))} className="h-8 text-sm" min={1} max={1000} />
            </div>

            <div className="flex gap-2 pt-1">
              <Button className="flex-1 gap-1.5" size="sm" onClick={runReport} disabled={running}>
                <Play className="h-3.5 w-3.5" />{running ? "Running..." : "Run Report"}
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={saveReport} disabled={saving}>
                <Save className="h-3.5 w-3.5" />{saving ? "..." : "Save"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Right panel */}
        <div className="lg:col-span-3 space-y-4">
          {results === null ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <BarChart2 className="h-12 w-12 mb-3 text-slate-300" />
                <p className="font-medium">Configure and run your report</p>
                <p className="text-sm mt-1">Select a data source, choose columns, and click Run Report</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {chartData && chartData.length > 0 && (
                <ChartCard title={`${groupBy} Distribution`} height={220}>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" name="Count" fill={COLORS.indigo} radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">{reportName} — {results.length} rows</CardTitle>
                  <ExportMenu
                    onExportCSV={() => exportCSV(results, `${reportName.toLowerCase().replace(/\s+/g, "-")}.csv`)}
                    onExportPDF={() => toast.info("Use the page-level Export PDF for full page export")}
                  />
                </CardHeader>
                <CardContent>
                  <DataTable data={results} columns={resultCols} getRowId={(r) => r.id ?? String(results.indexOf(r))} emptyTitle="No results" />
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Saved Reports */}
      {savedReports.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Saved Reports</CardTitle></CardHeader>
          <CardContent>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {savedReports.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.data_source} · Last run: {r.last_run ? format(new Date(r.last_run), "dd MMM yyyy") : "Never"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={() => loadSaved(r)}><Play className="h-3 w-3" />Run</Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => loadSaved(r)}><Edit2 className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-600" onClick={() => deleteReport(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function Reports() {
  const { tenantId, currency, userRole } = useChurch();
  const pageRef = useRef<HTMLDivElement>(null);

  const defaultRange: DateRange = { from: subMonths(new Date(), 6), to: new Date() };
  const [dateRange, setDateRange] = useState<DateRange>(defaultRange);
  const [consolidatedView, setConsolidatedView] = useState(false);

  const fromStr = format(dateRange.from, "yyyy-MM-dd");
  const toStr = format(dateRange.to, "yyyy-MM-dd");

  // Check if church has branches
  const { data: branches = [] } = useQuery({
    queryKey: ["branches-check", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.BRANCHES).select("id").eq(COLS.TENANT_ID, tenantId).limit(1);
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 300000,
  });
  const hasBranches = branches.length > 0;

  // Overview metrics
  const { data: overviewData, isLoading: loadOverview } = useQuery({
    queryKey: ["rpt-overview", tenantId, fromStr, toStr],
    queryFn: async () => {
      const [membersRes, newMembersRes, donationsRes, expensesRes, eventsRes] = await Promise.all([
        (supabase as any).from(TABLES.MEMBERS).select("id", { count: "exact", head: true }).eq(COLS.TENANT_ID, tenantId).eq("status", "active"),
        (supabase as any).from(TABLES.MEMBERS).select("id", { count: "exact", head: true }).eq(COLS.TENANT_ID, tenantId).gte("created_at", fromStr).lte("created_at", toStr),
        (supabase as any).from(TABLES.GIVING_RECORDS).select("amount").eq(COLS.TENANT_ID, tenantId).gte(COLS.GIVING_DATE, fromStr).lte(COLS.GIVING_DATE, toStr),
        (supabase as any).from(TABLES.EXPENSES).select("amount").eq(COLS.TENANT_ID, tenantId).eq("approval_status", "approved").gte("expense_date", fromStr).lte("expense_date", toStr),
        (supabase as any).from(TABLES.EVENTS).select("id", { count: "exact", head: true }).eq(COLS.TENANT_ID, tenantId).eq(COLS.EVENT_IS_PUBLISHED, true).gte(COLS.EVENT_DATE, fromStr).lte(COLS.EVENT_DATE, toStr),
      ]);

      const totalMembers = membersRes.count || 0;
      const newMembers = newMembersRes.count || 0;
      const totalGiving = (donationsRes.data || []).reduce((s: number, d: any) => s + (d.amount || 0), 0);
      const totalExpenses = (expensesRes.data || []).reduce((s: number, e: any) => s + (e.amount || 0), 0);
      const eventsHeld = eventsRes.count || 0;

      return { totalMembers, newMembers, totalGiving, totalExpenses, netSurplus: totalGiving - totalExpenses, eventsHeld };
    },
    enabled: !!tenantId,
  });

  const ov = overviewData;

  return (
    <>
      <Helmet><title>Reports & Analytics — Vestry</title></Helmet>
      <div ref={pageRef}>
        <PageHeader
          title="Reports & Analytics"
          subtitle="Church-wide data, insights and performance metrics"
          action={
            <div className="flex flex-wrap items-center gap-3">
              {hasBranches && (
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5">
                  <Switch checked={consolidatedView} onCheckedChange={setConsolidatedView} id="consolidated" />
                  <Label htmlFor="consolidated" className="text-sm cursor-pointer">Consolidated View</Label>
                </div>
              )}
              <DateRangePicker value={dateRange} onChange={setDateRange} presets />
              <ExportMenu
                onExportCSV={() => toast.info("Use individual tab CSV exports")}
                onExportPDF={() => exportPagePDF(pageRef, "vestry-reports.pdf")}
              />
            </div>
          }
        />

        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {loadOverview ? (
            Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-lg" />)
          ) : (
            <>
              <AnalyticsCard
                title="Total Members"
                value={ov?.totalMembers.toLocaleString() ?? "—"}
                subtitle="Active members"
                icon={Users}
                color="indigo"
              />
              <AnalyticsCard
                title="New Members"
                value={ov?.newMembers.toLocaleString() ?? "—"}
                subtitle="In date range"
                icon={UserPlus}
                color="emerald"
              />
              <AnalyticsCard
                title="Total Giving"
                value={ov ? formatCurrencyShort(ov.totalGiving, currency) : "—"}
                subtitle="Donations received"
                icon={DollarSign}
                color="violet"
              />
              <AnalyticsCard
                title="Total Expenses"
                value={ov ? formatCurrencyShort(ov.totalExpenses, currency) : "—"}
                subtitle="Approved expenses"
                icon={TrendingDown}
                color="red"
              />
              <AnalyticsCard
                title="Net Surplus"
                value={ov ? formatCurrencyShort(Math.abs(ov.netSurplus), currency) : "—"}
                subtitle={ov && ov.netSurplus < 0 ? "Deficit" : "Surplus"}
                icon={TrendingUp}
                color="cyan"
                valueClassName={ov && ov.netSurplus < 0 ? "text-red-500" : "text-emerald-600"}
              />
              <AnalyticsCard
                title="Events Held"
                value={ov?.eventsHeld.toLocaleString() ?? "—"}
                subtitle="Published events"
                icon={CalendarDays}
                color="amber"
              />
            </>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="membership">
          <TabsList className="flex flex-wrap h-auto gap-1 mb-6">
            <TabsTrigger value="membership" className="text-xs">Membership</TabsTrigger>
            <TabsTrigger value="attendance" className="text-xs">Attendance</TabsTrigger>
            <TabsTrigger value="finance" className="text-xs">Finance</TabsTrigger>
            <TabsTrigger value="events" className="text-xs">Events</TabsTrigger>
            <TabsTrigger value="groups" className="text-xs">Groups</TabsTrigger>
            <TabsTrigger value="discipleship" className="text-xs">Discipleship</TabsTrigger>
            <TabsTrigger value="communications" className="text-xs">Communications</TabsTrigger>
            <TabsTrigger value="custom" className="text-xs">Custom Builder</TabsTrigger>
          </TabsList>

          <TabsContent value="membership">
            <MembershipTab tenantId={tenantId} fromStr={fromStr} toStr={toStr} />
          </TabsContent>

          <TabsContent value="attendance">
            <AttendanceTab tenantId={tenantId} fromStr={fromStr} toStr={toStr} />
          </TabsContent>

          <TabsContent value="finance">
            <FinanceTab tenantId={tenantId} fromStr={fromStr} toStr={toStr} currency={currency} userRole={userRole} />
          </TabsContent>

          <TabsContent value="events">
            <EventsTab tenantId={tenantId} fromStr={fromStr} toStr={toStr} />
          </TabsContent>

          <TabsContent value="groups">
            <GroupsTab tenantId={tenantId} fromStr={fromStr} toStr={toStr} />
          </TabsContent>

          <TabsContent value="discipleship">
            <DiscipleshipTab tenantId={tenantId} fromStr={fromStr} toStr={toStr} />
          </TabsContent>

          <TabsContent value="communications">
            <CommunicationsTab tenantId={tenantId} fromStr={fromStr} toStr={toStr} />
          </TabsContent>

          <TabsContent value="custom">
            <CustomReportTab tenantId={tenantId} fromStr={fromStr} toStr={toStr} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
