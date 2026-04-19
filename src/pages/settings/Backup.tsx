import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useChurch } from "@/contexts/ChurchContext";
import { supabase } from "@/integrations/supabase/client";
import { TABLES, COLS } from "@/lib/schema";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Database, Layers, Users, DollarSign, CalendarDays, Heart,
  Building2, Package, Shield, MessageSquare, GraduationCap,
  Landmark, FileSpreadsheet, FileJson, Download,
} from "lucide-react";
import { format } from "date-fns";

// ─── Category definitions ─────────────────────────────────────────────────────
interface Category {
  key: string;
  icon: React.ElementType;
  label: string;
  items: string[];
  tableCount: number;
  fetcher: (tenantId: string) => Promise<Record<string, unknown>[]>;
}

const CATEGORIES: Category[] = [
  {
    key: "members",
    icon: Users,
    label: "Members & People",
    items: ["Member Profiles", "Visitors", "New Converts", "Families", "Discipleship Milestones"],
    tableCount: 5,
    fetcher: async (tid) => {
      const { data } = await supabase.from(TABLES.MEMBERS).select("*").eq(COLS.TENANT_ID, tid);
      return (data ?? []).map(r => ({
        "First Name": r.first_name, "Last Name": r.last_name, "Email Address": r.email,
        "Phone Number": r.phone, "Gender": r.gender, "Date of Birth": r.date_of_birth,
        "Status": r.status, "Date Joined": r.join_date, "Marital Status": r.marital_status,
        "Occupation": r.occupation, "City": r.city,
      }));
    },
  },
  {
    key: "finance",
    icon: DollarSign,
    label: "Finances & Giving",
    items: ["Giving Records", "Online Donations", "Pledges", "Pledge Campaigns", "Expenses", "Expense Categories"],
    tableCount: 6,
    fetcher: async (tid) => {
      const { data } = await supabase.from(TABLES.GIVING_RECORDS).select("*").eq(COLS.TENANT_ID, tid);
      return (data ?? []).map(r => ({
        "Donor Name": r.donor_name, "Amount": r.amount, "Giving Type": r.giving_type,
        "Date": r.given_at, "Receipt Number": r.receipt_number, "Notes": r.notes,
      }));
    },
  },
  {
    key: "events",
    icon: CalendarDays,
    label: "Events & Services",
    items: ["Events", "Services", "Attendance Records", "Event Registrations"],
    tableCount: 4,
    fetcher: async (tid) => {
      const { data } = await supabase.from(TABLES.EVENTS).select("*").eq(COLS.TENANT_ID, tid);
      return (data ?? []).map(r => ({
        "Title": r.title, "Event Date": r.event_date, "Start Time": r.start_time,
        "End Time": r.end_time, "Location": r.location, "Is Published": r.is_published,
        "Capacity Limit": r.capacity_limit,
      }));
    },
  },
  {
    key: "groups",
    icon: Heart,
    label: "Groups & Ministries",
    items: ["Groups", "Group Members", "Group Events", "Group Attendance"],
    tableCount: 4,
    fetcher: async (tid) => {
      const { data } = await supabase.from(TABLES.GROUPS).select("*").eq(COLS.TENANT_ID, tid);
      return (data ?? []).map(r => ({
        "Group Name": r.name, "Description": r.description, "Type": r.type,
        "Status": r.status, "Leader ID": r.leader_id, "Created At": r.created_at,
      }));
    },
  },
  {
    key: "facilities",
    icon: Building2,
    label: "Facilities & Bookings",
    items: ["Facilities", "Facility Bookings", "Facility Resources", "Facility Incidents"],
    tableCount: 4,
    fetcher: async (tid) => {
      const { data } = await supabase.from(TABLES.FACILITIES).select("*").eq(COLS.TENANT_ID, tid);
      return (data ?? []).map(r => ({
        "Facility Name": r.name, "Type": r.type, "Capacity": r.capacity,
        "Location": r.location, "Status": r.status,
      }));
    },
  },
  {
    key: "assets",
    icon: Package,
    label: "Assets & Inventory",
    items: ["Assets", "Asset Categories", "Asset Release Requests", "Asset Maintenance Logs"],
    tableCount: 4,
    fetcher: async (tid) => {
      const { data } = await supabase.from(TABLES.CHURCH_ASSETS).select("*").eq(COLS.TENANT_ID, tid);
      return (data ?? []).map(r => ({
        "Asset Name": r.name, "Category": r.category, "Serial Number": r.serial_number,
        "Status": r.status, "Condition": r.condition, "Purchase Date": r.purchase_date,
        "Purchase Value": r.purchase_value,
      }));
    },
  },
  {
    key: "children",
    icon: Shield,
    label: "Children's Ministry",
    items: ["Child Profiles", "Child Check-ins", "Child Check-outs", "Child Incidents", "Classes", "Teachers"],
    tableCount: 6,
    fetcher: async (tid) => {
      const { data } = await supabase.from(TABLES.MEMBERS).select("*")
        .eq(COLS.TENANT_ID, tid).eq("member_type", "child");
      return (data ?? []).map(r => ({
        "First Name": r.first_name, "Last Name": r.last_name, "Date of Birth": r.date_of_birth,
        "Gender": r.gender, "Status": r.status,
      }));
    },
  },
  {
    key: "communications",
    icon: MessageSquare,
    label: "Communications",
    items: ["Announcements", "Communication Logs", "Push Subscriptions"],
    tableCount: 3,
    fetcher: async (tid) => {
      const { data } = await supabase.from(TABLES.ANNOUNCEMENTS).select("*").eq(COLS.TENANT_ID, tid);
      return (data ?? []).map(r => ({
        "Title": r.title, "Content": r.content, "Published At": r.published_at,
        "Status": r.status, "Author ID": r.author_id,
      }));
    },
  },
  {
    key: "training",
    icon: GraduationCap,
    label: "Training & Courses",
    items: ["Training Courses", "Training Enrollments", "Training Lessons"],
    tableCount: 3,
    fetcher: async (tid) => {
      const { data } = await supabase.from(TABLES.TRAINING_COURSES).select("*").eq(COLS.TENANT_ID, tid);
      return (data ?? []).map(r => ({
        "Course Title": r.title, "Description": r.description, "Status": r.status,
        "Created At": r.created_at,
      }));
    },
  },
  {
    key: "structure",
    icon: Landmark,
    label: "Church Structure",
    items: ["Branches", "Hierarchy Levels", "Staff Records", "Staff Positions"],
    tableCount: 4,
    fetcher: async (tid) => {
      const { data } = await supabase.from(TABLES.BRANCHES).select("*").eq(COLS.TENANT_ID, tid);
      return (data ?? []).map(r => ({
        "Branch Name": r.name, "Location": r.location, "Status": r.status,
        "Pastor": r.pastor_name, "Created At": r.created_at,
      }));
    },
  },
];

const ALL_KEYS = CATEGORIES.map(c => c.key);
const TOTAL_TABLES = CATEGORIES.reduce((s, c) => s + c.tableCount, 0);

// ─── Category card ────────────────────────────────────────────────────────────
function CategoryCard({ cat, selected, onToggle }: {
  cat: Category; selected: boolean; onToggle: () => void;
}) {
  const Icon = cat.icon;
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`text-left rounded-xl border-2 p-4 transition-all ${
        selected
          ? "border-orange-400 bg-orange-50/40 dark:bg-orange-900/10"
          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300"
      }`}
    >
      <div className="flex items-start gap-2 mb-2">
        {/* Circle toggle */}
        <div className={`mt-0.5 h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
          selected ? "border-orange-500 bg-orange-500" : "border-slate-300"
        }`}>
          {selected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
        </div>
        <div className="flex items-center gap-1.5">
          <Icon className={`h-4 w-4 shrink-0 ${selected ? "text-orange-500" : "text-slate-400"}`} />
          <span className={`text-sm font-semibold ${selected ? "text-slate-800 dark:text-slate-100" : "text-slate-600 dark:text-slate-300"}`}>
            {cat.label}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 ml-6">
        {cat.items.map(item => (
          <span key={item} className="text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-700 rounded px-1.5 py-0.5">
            {item}
          </span>
        ))}
      </div>
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function BackupPage() {
  const { tenantId, name: churchName, userFirstName, userLastName } = useChurch();
  const [selected, setSelected] = useState<Set<string>>(new Set(ALL_KEYS));
  const [exporting, setExporting] = useState<"excel" | "json" | null>(null);
  const [noSelectionWarning, setNoSelectionWarning] = useState(false);

  const toggle = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
    setNoSelectionWarning(false);
  };

  const selectedCategories = CATEGORIES.filter(c => selected.has(c.key));
  const selectedTableCount = selectedCategories.reduce((s, c) => s + c.tableCount, 0);

  const dateStr = format(new Date(), "yyyy-MM-dd");
  const fileName = `Vestry Hub Backup - ${churchName ?? "Church"} - ${dateStr}`;

  const fetchAllData = async () => {
    const result: Record<string, Record<string, unknown>[]> = {};
    for (const cat of selectedCategories) {
      try {
        result[cat.label] = await cat.fetcher(tenantId);
      } catch {
        result[cat.label] = [];
      }
    }
    return result;
  };

  const handleExcelExport = async () => {
    if (selected.size === 0) { setNoSelectionWarning(true); return; }
    setExporting("excel");
    try {
      const { utils, writeFile } = await import("xlsx");
      const data = await fetchAllData();
      const wb = utils.book_new();
      for (const [sheetName, rows] of Object.entries(data)) {
        const ws = rows.length > 0
          ? utils.json_to_sheet(rows)
          : utils.aoa_to_sheet([Object.keys(rows[0] ?? {})]);
        utils.book_append_sheet(wb, ws, sheetName.substring(0, 31)); // Excel sheet name max 31 chars
      }
      writeFile(wb, `${fileName}.xlsx`);
      toast.success("✅ Export complete! Your file has been downloaded.");
    } catch (err: unknown) {
      toast.error(`❌ Export failed. Please try again or contact support.`);
      console.error(err);
    } finally {
      setExporting(null);
    }
  };

  const handleJsonExport = async () => {
    if (selected.size === 0) { setNoSelectionWarning(true); return; }
    setExporting("json");
    try {
      const data = await fetchAllData();
      const payload = {
        export_info: {
          platform: "Vestry Hub",
          church_name: churchName ?? "Unknown Church",
          exported_at: new Date().toISOString(),
          exported_by: `${userFirstName ?? ""} ${userLastName ?? ""}`.trim() || "Admin",
          version: "1.0",
        },
        data,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("✅ Export complete! Your file has been downloaded.");
    } catch (err: unknown) {
      toast.error("❌ Export failed. Please try again or contact support.");
      console.error(err);
    } finally {
      setExporting(null);
    }
  };

  return (
    <>
      <Helmet><title>Backup — Vestry</title></Helmet>

      <div className="max-w-4xl space-y-5">

        {/* ── Card 1: Header ── */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 shrink-0">
              <Database className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Church Data Backup</p>
              <p className="text-xs text-slate-500">Export all your church data for backup, migration, or compliance purposes</p>
            </div>
          </div>
          <div className="rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 shrink-0">
              <Layers className="h-4 w-4 text-orange-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Comprehensive Data Export</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Select the data categories you want to include in your backup. Export as Excel (multiple sheets) or JSON format.
              </p>
            </div>
          </div>
        </div>

        {/* ── Card 2: Select Categories ── */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Select Data Categories</p>
              <p className="text-xs text-slate-500">Choose which data to include in your backup</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => { setSelected(new Set(ALL_KEYS)); setNoSelectionWarning(false); }}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelected(new Set())}>
                Deselect All
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {CATEGORIES.map(cat => (
              <CategoryCard
                key={cat.key}
                cat={cat}
                selected={selected.has(cat.key)}
                onToggle={() => toggle(cat.key)}
              />
            ))}
          </div>

          {/* No selection warning */}
          {noSelectionWarning && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-xs text-amber-700">
              ⚠ Please select at least one data category to export.
            </div>
          )}

          {/* Summary */}
          <p className="text-xs text-slate-400">
            <span className="font-semibold text-slate-600 dark:text-slate-300">{selected.size}</span> categories selected •{" "}
            <span className="font-semibold text-slate-600 dark:text-slate-300">{selectedTableCount}</span> tables
          </p>
        </div>

        {/* ── Card 3: Export Format ── */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-4">
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Export Format</p>
            <p className="text-xs text-slate-500">Choose your preferred export format</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Excel */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                </div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Excel Format (.xlsx)</p>
              </div>
              <p className="text-xs text-slate-500">
                Each data category in a separate sheet. Best for viewing and editing in spreadsheet applications.
              </p>
              <Button
                className="w-full bg-orange-500 hover:bg-orange-600 text-white gap-2"
                onClick={handleExcelExport}
                disabled={exporting !== null}
              >
                {exporting === "excel" ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Preparing export...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Export as Excel
                  </>
                )}
              </Button>
            </div>

            {/* JSON */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                  <FileJson className="h-4 w-4 text-blue-600" />
                </div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">JSON Format (.json)</p>
              </div>
              <p className="text-xs text-slate-500">
                Complete structured data backup. Best for migrations, imports, and technical use.
              </p>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleJsonExport}
                disabled={exporting !== null}
              >
                {exporting === "json" ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-slate-400 border-t-transparent animate-spin" />
                    Preparing export...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Export as JSON
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
