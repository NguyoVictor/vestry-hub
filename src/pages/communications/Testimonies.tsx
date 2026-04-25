// Admin testimonies management page
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format, formatDistanceToNow, startOfMonth } from "date-fns";
import {
  BookOpen, Clock, TrendingUp, Check, X, Pencil, Star,
  MoreHorizontal, Plus, CheckCircle2, Quote, Eye, Heart, Trash2, Archive,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES, COLS } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PageTransition } from "@/components/ui/PageTransition";
import { BlurFadeIn } from "@/components/ui/BlurFadeIn";
import AnimatedList from "@/components/ui/AnimatedList";
import { MemberAvatar } from "@/components/shared/MemberAvatar";
import { TestimonyStatusBadge } from "@/components/ui/TestimonyStatusBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useTestimonyNotifications } from "@/hooks/useTestimonyNotifications";
import type { TestimonyWithRelations, TestimonyCategory } from "@/types/testimonies";

type ActiveTab = "published" | "pending";
interface DrawerState { open: boolean; editing: TestimonyWithRelations | null; }
interface FormState {
  title: string; category_id: string; body: string;
  is_anonymous: boolean; member_name: string; date_of_testimony: string;
}
const DEFAULT_FORM: FormState = {
  title: "", category_id: "", body: "", is_anonymous: false,
  member_name: "", date_of_testimony: format(new Date(), "yyyy-MM-dd"),
};

function CategoryBadge({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${color}20`, color }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

interface PendingCardProps {
  testimony: TestimonyWithRelations;
  onApprove: () => void; onDecline: () => void; onEdit: () => void;
  exiting: "approve" | "decline" | null;
}
function PendingTestimonyCard({ testimony, onApprove, onDecline, onEdit, exiting }: PendingCardProps) {
  const cat = testimony.testimony_categories;
  const member = testimony.members;
  const displayName = testimony.is_anonymous ? "Anonymous Member"
    : member ? `${member.first_name} ${member.last_name}`
    : testimony.author_name || "Anonymous Member";
  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          exit={exiting === "approve" ? { opacity: 0, x: 60 } : { opacity: 0, x: -60 }}
          transition={{ duration: 0.25 }}
          className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex gap-4 items-start shadow-sm">
          <div className="flex flex-col items-center gap-1.5 shrink-0 w-28">
            <MemberAvatar name={displayName} avatarUrl={testimony.is_anonymous ? null : member?.avatar_url} size="md" />
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 text-center leading-tight">{displayName}</span>
            <span className="text-[10px] text-slate-400">{formatDistanceToNow(new Date(testimony.created_at), { addSuffix: true })}</span>
          </div>
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              {cat && <CategoryBadge label={cat.label} color={cat.color} />}
              <TestimonyStatusBadge status="pending" />
            </div>
            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 leading-snug">{testimony.title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{testimony.body}</p>
          </div>
          <div className="flex flex-col gap-1.5 shrink-0">
            <button onClick={onApprove} title="Approve" className="h-8 w-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors"><Check className="h-4 w-4" /></button>
            <button onClick={onDecline} title="Decline" className="h-8 w-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-colors"><X className="h-4 w-4" /></button>
            <button onClick={onEdit} title="Edit" className="h-8 w-8 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 flex items-center justify-center transition-colors"><Pencil className="h-4 w-4" /></button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface PublishedCardProps {
  testimony: TestimonyWithRelations; index: number;
  onEdit: () => void; onFeatureToggle: () => void; onArchive: () => void; onDelete: () => void;
}
function PublishedTestimonyCard({ testimony, index, onEdit, onFeatureToggle, onArchive, onDelete }: PublishedCardProps) {
  const cat = testimony.testimony_categories;
  const member = testimony.members;
  const displayName = testimony.is_anonymous ? "Anonymous Member"
    : member ? `${member.first_name} ${member.last_name}`
    : testimony.author_name || "Anonymous Member";
  const reactionCount = testimony.testimony_reactions?.length ?? 0;
  const catColor = cat?.color ?? "#6366f1";
  return (
    <BlurFadeIn delay={index * 0.07}>
      <motion.div whileHover={{ y: -3 }} transition={{ type: "spring", stiffness: 400, damping: 28 }}
        className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden relative"
        style={{ borderLeftWidth: 4, borderLeftColor: catColor }}>
        {testimony.is_featured && (
          <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(to right, ${catColor}40, #f59e0b40)` }} />
        )}
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {cat && <CategoryBadge label={cat.label} color={catColor} />}
              <TestimonyStatusBadge status="approved" />
              {testimony.is_featured && (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700">
                  <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />Featured
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={onFeatureToggle} title={testimony.is_featured ? "Unfeature" : "Feature"}
                className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors ${testimony.is_featured ? "bg-amber-100 text-amber-500" : "bg-slate-50 hover:bg-amber-50 text-slate-400 hover:text-amber-500"}`}>
                <Star className={`h-3.5 w-3.5 ${testimony.is_featured ? "fill-amber-500" : ""}`} />
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="h-7 w-7 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-400 flex items-center justify-center transition-colors"><MoreHorizontal className="h-3.5 w-3.5" /></button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="font-jakarta text-sm">
                  <DropdownMenuItem onClick={onEdit}><Pencil className="h-3.5 w-3.5 mr-2" />Edit</DropdownMenuItem>
                  <DropdownMenuItem onClick={onFeatureToggle}><Star className="h-3.5 w-3.5 mr-2" />{testimony.is_featured ? "Unfeature" : "Feature"}</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onArchive}><Archive className="h-3.5 w-3.5 mr-2" />Archive</DropdownMenuItem>
                  <DropdownMenuItem onClick={onDelete} className="text-red-600 focus:text-red-600"><Trash2 className="h-3.5 w-3.5 mr-2" />Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 mb-1">{testimony.title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">{testimony.body}</p>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <MemberAvatar name={displayName} avatarUrl={testimony.is_anonymous ? null : member?.avatar_url} size="sm" />
              <div>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{displayName}</p>
                <p className="text-[10px] text-slate-400">{testimony.date_of_testimony ? format(new Date(testimony.date_of_testimony), "dd MMM yyyy") : format(new Date(testimony.created_at), "dd MMM yyyy")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] text-slate-400"><Eye className="h-3 w-3" />{testimony.view_count ?? 0}</span>
              <span className="inline-flex items-center gap-1 text-[10px] text-slate-400"><Heart className="h-3 w-3" />{reactionCount}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </BlurFadeIn>
  );
}

interface TestimonyDrawerProps {
  open: boolean; onClose: () => void; editing: TestimonyWithRelations | null;
  categories: TestimonyCategory[]; tenantId: string; userId: string; onSuccess: () => void;
}
function TestimonyDrawer({ open, onClose, editing, categories, tenantId, userId, onSuccess }: TestimonyDrawerProps) {
  const [form, setForm] = useState<FormState>(() => editing ? {
    title: editing.title, category_id: editing.category_id ?? "", body: editing.body,
    is_anonymous: editing.is_anonymous, member_name: editing.author_name ?? "",
    date_of_testimony: editing.date_of_testimony ?? format(new Date(), "yyyy-MM-dd"),
  } : DEFAULT_FORM);
  const queryClient = useQueryClient();
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title.trim(), category_id: form.category_id || null, body: form.body.trim(),
        is_anonymous: form.is_anonymous, author_name: form.is_anonymous ? "Anonymous" : form.member_name.trim() || null,
        date_of_testimony: form.date_of_testimony || null, tenant_id: tenantId,
        status: "published" as const, submitted_by_admin_id: userId,
      };
      if (editing) {
        const { error } = await supabase.from(TABLES.TESTIMONIES).update(payload as never).eq(COLS.ID, editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(TABLES.TESTIMONIES).insert(payload as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-testimonies", tenantId] });
      toast.success(editing ? "Testimony updated." : "Testimony added successfully.");
      onSuccess(); onClose();
    },
    onError: () => toast.error("Failed to save testimony"),
  });
  const isValid = form.title.trim().length > 0 && form.body.trim().length > 0;
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto font-jakarta">
        <SheetHeader className="pb-4 border-b border-slate-100">
          <SheetTitle className="text-lg font-semibold text-slate-900 font-jakarta">{editing ? "Edit Testimony" : "Add Testimony"}</SheetTitle>
        </SheetHeader>
        <div className="space-y-5 pt-5">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600 font-jakarta">Title <span className="text-red-500">*</span></Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. God healed my marriage" className="h-10 border-slate-200 focus:border-orange-500 font-jakarta text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600 font-jakarta">Category</Label>
            <Select value={form.category_id} onValueChange={v => setForm(f => ({ ...f, category_id: v }))}>
              <SelectTrigger className="h-10 border-slate-200 font-jakarta text-sm"><SelectValue placeholder="Select a category" /></SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id} className="font-jakarta">
                    <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />{cat.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600 font-jakarta">Testimony <span className="text-red-500">*</span></Label>
            <Textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={6} placeholder="Share what God has done..." className="border-slate-200 focus:border-orange-500 font-jakarta text-sm resize-none" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600 font-jakarta">Member Name</Label>
            <Input value={form.member_name} onChange={e => setForm(f => ({ ...f, member_name: e.target.value }))} placeholder="Full name of the member" disabled={form.is_anonymous} className="h-10 border-slate-200 focus:border-orange-500 font-jakarta text-sm disabled:opacity-50" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600 font-jakarta">Date of Testimony</Label>
            <Input type="date" value={form.date_of_testimony} onChange={e => setForm(f => ({ ...f, date_of_testimony: e.target.value }))} className="h-10 border-slate-200 focus:border-orange-500 font-jakarta text-sm" />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
            <div>
              <p className="text-sm font-medium text-slate-700 font-jakarta">Share Anonymously</p>
              <p className="text-xs text-slate-400 font-jakarta mt-0.5">Member name will be hidden from the congregation</p>
            </div>
            <Switch checked={form.is_anonymous} onCheckedChange={v => setForm(f => ({ ...f, is_anonymous: v }))} />
          </div>
          <Button onClick={() => saveMutation.mutate()} disabled={!isValid || saveMutation.isPending} className="w-full h-11 bg-orange-500 hover:bg-orange-600 text-white font-jakarta font-semibold">
            {saveMutation.isPending ? "Saving..." : editing ? "Save Changes" : "Add Testimony"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function Testimonies() {
  const { tenantId, userId } = useChurch();
  const queryClient = useQueryClient();
  const { notifyMemberApproved, notifyMemberDeclined, notifyMemberFeatured } = useTestimonyNotifications();
  const [activeTab, setActiveTab] = useState<ActiveTab>("published");
  const [drawer, setDrawer] = useState<DrawerState>({ open: false, editing: null });
  const [exitingIds, setExitingIds] = useState<Record<string, "approve" | "decline">>({});
  const [deleteTarget, setDeleteTarget] = useState<TestimonyWithRelations | null>(null);

  const { data: testimonies = [], isLoading } = useQuery<TestimonyWithRelations[]>({
    queryKey: ["admin-testimonies", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from(TABLES.TESTIMONIES)
        .select("*, testimony_categories(label, color), testimony_reactions(*), members(first_name, last_name, avatar_url)")
        .eq(COLS.TENANT_ID, tenantId).order(COLS.CREATED_AT, { ascending: false });
      if (error) throw error;
      return (data ?? []) as TestimonyWithRelations[];
    },
    staleTime: 300_000,
  });

  const { data: categories = [] } = useQuery<TestimonyCategory[]>({
    queryKey: ["testimony-categories", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from(TABLES.TESTIMONY_CATEGORIES)
        .select("*").eq(COLS.TENANT_ID, tenantId).eq("is_active", true).order("sort_order");
      if (error) throw error;
      return (data ?? []) as TestimonyCategory[];
    },
    staleTime: 300_000,
  });

  const published = testimonies.filter(t => t.status === "published");
  const pending = testimonies.filter(t => t.status === "pending");
  const thisMonth = testimonies.filter(t => new Date(t.created_at) >= startOfMonth(new Date()));

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "published" | "declined" }) => {
      const { error } = await supabase.from(TABLES.TESTIMONIES).update({ status } as never).eq(COLS.ID, id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-testimonies", tenantId] }),
    onError: () => toast.error("Failed to update testimony"),
  });

  const featureMutation = useMutation({
    mutationFn: async ({ id, is_featured, memberId }: { id: string; is_featured: boolean; memberId: string | null }) => {
      const { error } = await supabase.from(TABLES.TESTIMONIES).update({ is_featured } as never).eq(COLS.ID, id);
      if (error) throw error;
      return { is_featured, memberId, id };
    },
    onSuccess: async ({ is_featured, memberId, id }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-testimonies", tenantId] });
      toast.success(is_featured ? "Testimony featured!" : "Testimony unfeatured.");
      if (is_featured && memberId) await notifyMemberFeatured(tenantId, memberId, id);
    },
    onError: () => toast.error("Failed to update feature status"),
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLES.TESTIMONIES).update({ status: "retracted" } as never).eq(COLS.ID, id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-testimonies", tenantId] }); toast.success("Testimony archived."); },
    onError: () => toast.error("Failed to archive testimony"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLES.TESTIMONIES).delete().eq(COLS.ID, id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-testimonies", tenantId] }); toast.success("Testimony deleted."); setDeleteTarget(null); },
    onError: () => toast.error("Failed to delete testimony"),
  });

  const handleApprove = async (testimony: TestimonyWithRelations) => {
    setExitingIds(prev => ({ ...prev, [testimony.id]: "approve" }));
    await updateStatusMutation.mutateAsync({ id: testimony.id, status: "published" });
    if (testimony.member_id) await notifyMemberApproved(tenantId, testimony.member_id, testimony.id, testimony.title);
    toast.success("Testimony approved and published!");
    setExitingIds(prev => { const next = { ...prev }; delete next[testimony.id]; return next; });
  };

  const handleDecline = async (testimony: TestimonyWithRelations) => {
    setExitingIds(prev => ({ ...prev, [testimony.id]: "decline" }));
    await updateStatusMutation.mutateAsync({ id: testimony.id, status: "declined" });
    if (testimony.member_id) await notifyMemberDeclined(tenantId, testimony.member_id, testimony.id, testimony.title);
    toast.success("Testimony declined.");
    setExitingIds(prev => { const next = { ...prev }; delete next[testimony.id]; return next; });
  };

  return (
    <PageTransition>
      <div className="font-jakarta min-h-screen bg-slate-50 px-6 py-6">
        <Helmet><title>Testimonies — Vestry</title></Helmet>
        <BlurFadeIn>
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-jakarta">Testimonies</h1>
                <p className="text-sm text-slate-500 mt-0.5 font-jakarta">Collect and share stories from your congregation</p>
              </div>
              <Button onClick={() => setDrawer({ open: true, editing: null })} className="bg-orange-500 hover:bg-orange-600 text-white font-jakarta font-semibold shrink-0">
                <Plus className="h-4 w-4 mr-1.5" />Add Testimony
              </Button>
            </div>

            {/* Stats */}
            <BlurFadeIn delay={0.1}>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { icon: BookOpen, label: "Published", count: published.length, bg: "bg-indigo-50", color: "text-indigo-500" },
                  { icon: Clock, label: "Pending", count: pending.length, bg: "bg-amber-50", color: "text-amber-500" },
                  { icon: TrendingUp, label: "This Month", count: thisMonth.length, bg: "bg-emerald-50", color: "text-emerald-500" },
                ].map(({ icon: Icon, label, count, bg, color }) => (
                  <div key={label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-lg ${bg} flex items-center justify-center shrink-0`}><Icon className={`h-4 w-4 ${color}`} /></div>
                    <div>
                      {isLoading ? <Skeleton className="h-6 w-10 mb-1" /> : <p className="text-xl font-bold text-slate-900 dark:text-slate-100 font-jakarta">{count}</p>}
                      <p className="text-xs text-slate-500 font-jakarta">{label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </BlurFadeIn>

            {/* Tabs */}
            <div className="flex gap-2">
              {(["published", "pending"] as ActiveTab[]).map(tab => (
                <div key={tab} className="relative">
                  <button onClick={() => setActiveTab(tab)}
                    className={`relative z-10 px-4 py-2 rounded-full text-sm font-medium transition-colors font-jakarta flex items-center gap-2 ${activeTab === tab ? "text-white" : "text-slate-500 hover:text-slate-700"}`}>
                    {activeTab === tab && <motion.div layoutId="adminTestimonyTab" className="absolute inset-0 rounded-full bg-orange-500" transition={{ type: "spring", stiffness: 400, damping: 30 }} />}
                    <span className="relative z-10 capitalize">{tab === "pending" ? "Pending Approval" : "Published"}</span>
                    {tab === "pending" && pending.length > 0 && (
                      <span className={`relative z-10 inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full text-[10px] font-bold ${activeTab === "pending" ? "bg-white/20 text-white" : "bg-amber-100 text-amber-700"}`}>{pending.length}</span>
                    )}
                  </button>
                </div>
              ))}
            </div>

            {/* Tab content */}
            <AnimatePresence mode="wait">
              {activeTab === "pending" && (
                <motion.div key="pending" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                  {isLoading ? (
                    <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 flex gap-4"><Skeleton className="h-10 w-10 rounded-full shrink-0" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-2/3" /></div></div>)}</div>
                  ) : pending.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                      <CheckCircle2 className="h-12 w-12 text-slate-300" />
                      <p className="text-base font-semibold text-slate-600 font-jakarta">All caught up!</p>
                      <p className="text-sm text-slate-400 font-jakarta">No testimonies waiting for review</p>
                    </div>
                  ) : (
                    <AnimatedList items={pending} showGradients={false} enableArrowNavigation={false} displayScrollbar={false}
                      renderItem={(testimony) => (
                        <PendingTestimonyCard testimony={testimony} exiting={exitingIds[testimony.id] ?? null}
                          onApprove={() => handleApprove(testimony)} onDecline={() => handleDecline(testimony)}
                          onEdit={() => setDrawer({ open: true, editing: testimony })} />
                      )} />
                  )}
                </motion.div>
              )}
              {activeTab === "published" && (
                <motion.div key="published" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                  {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3,4,5,6].map(i => <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-3/4" /></div>)}</div>
                  ) : published.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                      <Quote className="h-12 w-12 text-slate-300" />
                      <p className="text-base font-semibold text-slate-600 font-jakarta">No testimonies yet</p>
                      <p className="text-sm text-slate-400 font-jakarta">Add the first testimony to get started</p>
                      <Button size="sm" onClick={() => setDrawer({ open: true, editing: null })} className="mt-2 bg-orange-500 hover:bg-orange-600 text-white font-jakarta"><Plus className="h-4 w-4 mr-1.5" />Add Testimony</Button>
                    </div>
                  ) : (
                    <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" variants={{ show: { transition: { staggerChildren: 0.08 } }, hidden: {} }} initial="hidden" animate="show">
                      {published.map((testimony, index) => (
                        <PublishedTestimonyCard key={testimony.id} testimony={testimony} index={index}
                          onEdit={() => setDrawer({ open: true, editing: testimony })}
                          onFeatureToggle={() => featureMutation.mutate({ id: testimony.id, is_featured: !testimony.is_featured, memberId: testimony.member_id })}
                          onArchive={() => archiveMutation.mutate(testimony.id)}
                          onDelete={() => setDeleteTarget(testimony)} />
                      ))}
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </BlurFadeIn>

        <TestimonyDrawer open={drawer.open} onClose={() => setDrawer({ open: false, editing: null })} editing={drawer.editing} categories={categories} tenantId={tenantId} userId={userId} onSuccess={() => setDrawer({ open: false, editing: null })} />
        <ConfirmDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)} title="Delete Testimony?" description="This action cannot be undone. The testimony will be permanently removed." confirmLabel="Delete" destructive onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} loading={deleteMutation.isPending} />
      </div>
    </PageTransition>
  );
}
