import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES, COLS } from "@/lib/schema";
import { BlurFadeIn } from "@/components/ui/BlurFadeIn";
import { usePermissions } from '@/hooks/usePermissions';
import { ReadOnlyBanner } from '@/components/shared/ReadOnlyBanner';
import { PermissionButton } from '@/components/shared/PermissionButton';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Plus, Home, Trash2, Pencil, MoreHorizontal, LayoutGrid, List,
  Search, Users, MapPin, Clock, ChevronRight, Eye,
} from "lucide-react";

const PRESET_COLORS = ["#f97316","#7c3aed","#3b82f6","#10b981","#f59e0b","#ef4444","#ec4899","#14b8a6","#6366f1","#84cc16"];
const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

// ── Fellowship Card ───────────────────────────────────────────────────────────
function FellowshipCard({ f, memberCount, index, onEdit, onDelete, readOnly }: {
  f: any; memberCount: number; index: number;
  onEdit: () => void; onDelete: () => void; readOnly?: boolean;
}) {
  const navigate = useNavigate();
  const color = f.cover_color || "#f97316";

  return (
    <BlurFadeIn delay={index * 0.06}>
      <motion.div
        whileHover={{ y: -4, boxShadow: "0 12px 40px rgba(0,0,0,0.12)" }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="rounded-2xl border border-border/50 bg-card overflow-hidden cursor-pointer group"
        style={{ borderLeftColor: color, borderLeftWidth: 4 }}
        onClick={() => navigate(`/house-fellowships/${f.id}`)}
      >
        {/* Color band */}
        <div className="h-20 relative flex items-center px-4" style={{ backgroundColor: `${color}26` }}>
          <div className="h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg shrink-0"
            style={{ backgroundColor: `${color}40`, color }}>
            {getInitials(f.name || "HF")}
          </div>
          {/* Status badge */}
          <div className={`absolute top-3 right-10 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${f.is_active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800"}`}>
            {f.is_active ? "Active" : "Inactive"}
          </div>
          {/* Menu */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate(`/house-fellowships/${f.id}`)}>
                  <Eye className="h-4 w-4 mr-2" />View
                </DropdownMenuItem>
                <DropdownMenuItem disabled={readOnly} onClick={e => { e.stopPropagation(); onEdit(); }}>
                  <Pencil className="h-4 w-4 mr-2" />Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled={readOnly} className="text-destructive" onClick={e => { e.stopPropagation(); onDelete(); }}>
                  <Trash2 className="h-4 w-4 mr-2" />Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-2">
          <p className="font-semibold text-base text-foreground truncate">{f.name}</p>
          {f.zone && (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
              {f.zone}
            </span>
          )}
          {f.host_name && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />{f.host_name}
            </p>
          )}
          {f.meeting_day && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3 shrink-0" />{f.meeting_day}{f.meeting_time ? ` · ${f.meeting_time}` : ""}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border/50 px-4 pb-4 pt-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>{memberCount} member{memberCount !== 1 ? "s" : ""}</span>
            {f.max_capacity && <span className="text-muted-foreground/60">/ {f.max_capacity}</span>}
          </div>
          <button className="text-sm text-primary hover:underline flex items-center gap-0.5 font-medium"
            onClick={e => { e.stopPropagation(); navigate(`/house-fellowships/${f.id}`); }}>
            View <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </motion.div>
    </BlurFadeIn>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const HouseFellowships = () => {
  const { tenantId } = useChurch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('member_management') || isReadOnly('groups_ministries');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [zone, setZone] = useState("");
  const [hostName, setHostName] = useState("");
  const [hostAddress, setHostAddress] = useState("");
  const [meetingDay, setMeetingDay] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [maxCapacity, setMaxCapacity] = useState("");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [color, setColor] = useState("#f97316");
  const [saving, setSaving] = useState(false);

  const { data: fellowships = [], isLoading } = useQuery({
    queryKey: ["fellowships", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from(TABLES.HOUSE_FELLOWSHIPS)
        .select("*").eq(COLS.TENANT_ID, tenantId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 300_000,
  });

  const { data: memberCounts = {} } = useQuery({
    queryKey: ["fellowship-member-counts", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.FELLOWSHIP_MEMBERS).select("fellowship_id").eq(COLS.TENANT_ID, tenantId!);
      const counts: Record<string, number> = {};
      (data || []).forEach((fm: any) => { counts[fm.fellowship_id] = (counts[fm.fellowship_id] || 0) + 1; });
      return counts;
    },
    enabled: !!tenantId,
    staleTime: 300_000,
  });

  const filtered = useMemo(() => {
    if (!search) return fellowships;
    const q = search.toLowerCase();
    return fellowships.filter((f: any) =>
      f.name?.toLowerCase().includes(q) || f.zone?.toLowerCase().includes(q) || f.host_name?.toLowerCase().includes(q)
    );
  }, [fellowships, search]);

  const openCreate = () => {
    setEditingId(null);
    setName(""); setZone(""); setHostName(""); setHostAddress("");
    setMeetingDay(""); setMeetingTime(""); setMaxCapacity(""); setNotes("");
    setIsActive(true); setColor("#f97316");
    setSheetOpen(true);
  };

  const openEdit = (f: any) => {
    setEditingId(f.id);
    setName(f.name || ""); setZone(f.zone || ""); setHostName(f.host_name || "");
    setHostAddress(f.host_address || ""); setMeetingDay(f.meeting_day || "");
    setMeetingTime(f.meeting_time || ""); setMaxCapacity(f.max_capacity ? String(f.max_capacity) : "");
    setNotes(f.notes || ""); setIsActive(f.is_active ?? true); setColor(f.cover_color || "#f97316");
    setSheetOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Fellowship name is required"); return; }
    setSaving(true);
    try {
      const payload: any = {
        name: name.trim(), zone: zone.trim() || null, host_name: hostName.trim() || null,
        host_address: hostAddress.trim() || null, meeting_day: meetingDay || null,
        meeting_time: meetingTime || null, max_capacity: maxCapacity ? parseInt(maxCapacity) : null,
        notes: notes.trim() || null, is_active: isActive, cover_color: color,
      };
      if (editingId) {
        const { error } = await supabase.from(TABLES.HOUSE_FELLOWSHIPS).update(payload).eq("id", editingId);
        if (error) throw error;
        toast.success("Fellowship updated");
      } else {
        const { error } = await supabase.from(TABLES.HOUSE_FELLOWSHIPS).insert({ ...payload, tenant_id: tenantId });
        if (error) throw error;
        toast.success("Fellowship created");
      }
      qc.invalidateQueries({ queryKey: ["fellowships", tenantId] });
      setSheetOpen(false);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLES.HOUSE_FELLOWSHIPS).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fellowships", tenantId] }); toast.success("Fellowship deleted"); },
    onError: () => toast.error("Failed to delete"),
  });

  const totalMembers = Object.values(memberCounts).reduce((a, b) => a + b, 0);
  const activeCount = fellowships.filter((f: any) => f.is_active).length;

  return (
    <>
      <Helmet><title>House Fellowships — Vestry</title></Helmet>
      <BlurFadeIn delay={0}>
        <div className="space-y-6 font-jakarta">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground font-jakarta">House Fellowships</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Track and manage home cell groups</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {[
                  { icon: Home, value: fellowships.length, label: "Total" },
                  { icon: Users, value: totalMembers, label: "Members" },
                  { icon: Home, value: activeCount, label: "Active" },
                ].map((s, i) => (
                  <BlurFadeIn key={s.label} delay={0.07 * (i + 1)}>
                    <div className="flex items-center gap-1.5 bg-muted rounded-lg px-3 py-1.5 text-sm">
                      <s.icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-semibold text-foreground">{s.value}</span>
                      <span className="text-muted-foreground">{s.label}</span>
                    </div>
                  </BlurFadeIn>
                ))}
              </div>
            </div>
            <PermissionButton readOnly={readOnly} className="bg-orange-500 hover:bg-orange-600 text-white shrink-0 font-jakarta" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1.5" />Add Fellowship
            </PermissionButton>
          </div>
          {readOnly && <ReadOnlyBanner section="Groups & Ministries" />}

          {/* Toolbar */}
          <BlurFadeIn delay={0.1}>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search fellowships..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm border-slate-200 focus:border-orange-500" />
              </div>
              <div className="ml-auto flex items-center gap-1 border border-border rounded-lg overflow-hidden">
                <button onClick={() => setViewMode("grid")} className={`p-2 transition-colors ${viewMode === "grid" ? "bg-orange-500 text-white" : "text-muted-foreground hover:bg-muted"}`}>
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button onClick={() => setViewMode("list")} className={`p-2 transition-colors ${viewMode === "list" ? "bg-orange-500 text-white" : "text-muted-foreground hover:bg-muted"}`}>
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </BlurFadeIn>

          {/* Content */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
              <div className="h-16 w-16 rounded-2xl bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center">
                <Home className="h-8 w-8 text-orange-500" />
              </div>
              <p className="text-base font-semibold text-foreground">{search ? "No fellowships match your search" : "No fellowships yet"}</p>
              <p className="text-sm text-muted-foreground max-w-sm">{search ? "Try adjusting your search" : "Create your first house fellowship to organize home cell groups"}</p>
              {!search && (
                <PermissionButton readOnly={readOnly} className="bg-orange-500 hover:bg-orange-600 text-white font-jakarta" onClick={openCreate}>
                  <Plus className="h-4 w-4 mr-1.5" />Add Fellowship
                </PermissionButton>
              )}
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map((f: any, i: number) => (
                <FellowshipCard key={f.id} f={f} memberCount={memberCounts[f.id] || 0} index={i}
                  readOnly={readOnly} onEdit={() => openEdit(f)} onDelete={() => deleteMut.mutate(f.id)} />
              ))}
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
              <table className="w-full text-sm font-jakarta">
                <thead>
                  <tr className="bg-muted/50 border-b border-border/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide w-8" />
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Zone</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Host</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Members</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Meeting</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((f: any, i: number) => {
                    const color = f.cover_color || "#f97316";
                    return (
                      <motion.tr key={f.id}
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04, duration: 0.25 }}
                        className="border-b border-border/30 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/house-fellowships/${f.id}`)}>
                        <td className="px-4 py-3.5">
                          <span className="h-3 w-3 rounded-full block" style={{ backgroundColor: color }} />
                        </td>
                        <td className="px-4 py-3.5 font-medium text-foreground">{f.name}</td>
                        <td className="px-4 py-3.5 hidden md:table-cell">
                          {f.zone ? <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-orange-100 text-orange-700">{f.zone}</span> : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground hidden sm:table-cell">{f.host_name || "—"}</td>
                        <td className="px-4 py-3.5 text-muted-foreground">{memberCounts[f.id] || 0}</td>
                        <td className="px-4 py-3.5 text-muted-foreground hidden lg:table-cell">
                          {f.meeting_day ? `${f.meeting_day}${f.meeting_time ? ` · ${f.meeting_time}` : ""}` : "—"}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${f.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                            {f.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-primary gap-1" onClick={() => navigate(`/house-fellowships/${f.id}`)}>
                              View <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem disabled={readOnly} onClick={() => openEdit(f)}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem disabled={readOnly} className="text-destructive" onClick={() => deleteMut.mutate(f.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </BlurFadeIn>

      {/* Create/Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={v => { setSheetOpen(v); if (!v) setEditingId(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto font-jakarta" side="right">
          <SheetHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
            <SheetTitle className="font-jakarta">{editingId ? "Edit Fellowship" : "Add House Fellowship"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-5 pt-5">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Fellowship Name *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Westlands Cell Group" className="h-10 border-slate-200 focus:border-orange-500 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Zone / Area</Label>
              <Input value={zone} onChange={e => setZone(e.target.value)} placeholder="e.g. Westlands Zone" className="h-10 border-slate-200 focus:border-orange-500 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Host Name</Label>
                <Input value={hostName} onChange={e => setHostName(e.target.value)} className="h-10 border-slate-200 focus:border-orange-500 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Max Capacity</Label>
                <Input type="number" value={maxCapacity} onChange={e => setMaxCapacity(e.target.value)} placeholder="Unlimited" className="h-10 border-slate-200 focus:border-orange-500 text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Host Address</Label>
              <Textarea value={hostAddress} onChange={e => setHostAddress(e.target.value)} rows={2} className="border-slate-200 focus:border-orange-500 text-sm resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Meeting Day</Label>
                <Select value={meetingDay} onValueChange={setMeetingDay}>
                  <SelectTrigger className="h-10 border-slate-200 text-sm"><SelectValue placeholder="Select day" /></SelectTrigger>
                  <SelectContent>{DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Time</Label>
                <Input type="time" value={meetingTime} onChange={e => setMeetingTime(e.target.value)} className="h-10 border-slate-200 focus:border-orange-500 text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="border-slate-200 focus:border-orange-500 text-sm resize-none" />
            </div>
            {/* Color */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-600">Color</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${color === c ? "border-slate-900 dark:border-white scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-slate-600">Active</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
            <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-jakarta font-semibold h-11" onClick={handleSave} disabled={!name.trim() || saving}>
              {saving ? "Saving..." : editingId ? "Save Changes" : "Create Fellowship"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default HouseFellowships;
