// Member portal testimonies page — Wall of Faith
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { Quote, Plus, MoreHorizontal, Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMemberPortal } from "@/contexts/MemberPortalContext";
import { TABLES, COLS } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PageTransition } from "@/components/ui/PageTransition";
import { BlurFadeIn } from "@/components/ui/BlurFadeIn";
import MasonryGrid from "@/components/ui/MasonryGrid";
import GradientText from "@/components/ui/GradientText";
import { TextRotate } from "@/components/ui/TextRotate";
import { MemberAvatar } from "@/components/shared/MemberAvatar";
import { TestimonyStatusBadge } from "@/components/ui/TestimonyStatusBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useTestimonyNotifications } from "@/hooks/useTestimonyNotifications";
import type { TestimonyWithRelations, TestimonyCategory, ReactionType, ReactionCounts } from "@/types/testimonies";

type MemberTab = "published" | "mine";
interface ShareFormState {
  title: string; category_id: string; body: string;
  date_of_testimony: string; is_anonymous: boolean; allow_featuring: boolean;
}
const DEFAULT_SHARE_FORM: ShareFormState = {
  title: "", category_id: "", body: "", date_of_testimony: format(new Date(), "yyyy-MM-dd"),
  is_anonymous: false, allow_featuring: true,
};
const REACTION_EMOJIS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: "amen", emoji: "🙏", label: "Amen" },
  { type: "touched", emoji: "❤️", label: "Touched" },
  { type: "inspiring", emoji: "✨", label: "Inspiring" },
];

function CategoryBadge({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: `${color}20`, color }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />{label}
    </span>
  );
}

interface FeaturedCardProps { testimony: TestimonyWithRelations; myReactions: Record<string, ReactionType | null>; onReact: (id: string, type: ReactionType) => void; }
function FeaturedTestimonyCard({ testimony, myReactions, onReact }: FeaturedCardProps) {
  const cat = testimony.testimony_categories;
  const member = testimony.members;
  const catColor = cat?.color ?? "#7c3aed";
  const displayName = testimony.is_anonymous ? "Anonymous Member" : member ? `${member.first_name} ${member.last_name}` : testimony.author_name || "Anonymous Member";
  const reactionCounts: ReactionCounts = {
    amen: testimony.testimony_reactions?.filter(r => r.reaction_type === "amen").length ?? 0,
    touched: testimony.testimony_reactions?.filter(r => r.reaction_type === "touched").length ?? 0,
    inspiring: testimony.testimony_reactions?.filter(r => r.reaction_type === "inspiring").length ?? 0,
  };
  return (
    <BlurFadeIn delay={0.4}>
      <div className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden relative p-6 sm:p-8" style={{ background: `linear-gradient(135deg, ${catColor}08 0%, ${catColor}04 100%)` }}>
        <div className="absolute top-4 right-4"><span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold bg-amber-100 text-amber-700">✨ Featured Testimony</span></div>
        <div className="mb-4" style={{ color: `${catColor}33` }}>
          <svg width="48" height="36" viewBox="0 0 48 36" fill="currentColor"><path d="M0 36V22.5C0 10.5 7.5 3 22.5 0L24 3C16.5 4.5 12 9 12 15H21V36H0ZM27 36V22.5C27 10.5 34.5 3 49.5 0L51 3C43.5 4.5 39 9 39 15H48V36H27Z" /></svg>
        </div>
        <p className="text-xl font-medium italic text-slate-800 dark:text-slate-200 leading-relaxed mb-6">{testimony.body}</p>
        <div className="flex items-center gap-3 mb-5">
          <MemberAvatar name={displayName} avatarUrl={testimony.is_anonymous ? null : member?.avatar_url} size="md" />
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 font-jakarta">{displayName}</p>
            <p className="text-xs text-slate-400 font-jakarta">{testimony.date_of_testimony ? format(new Date(testimony.date_of_testimony), "MMMM yyyy") : format(new Date(testimony.created_at), "MMMM yyyy")}</p>
          </div>
          {cat && <CategoryBadge label={cat.label} color={catColor} />}
        </div>
        <div className="flex items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          {REACTION_EMOJIS.map(({ type, emoji, label }) => {
            const isActive = myReactions[testimony.id] === type;
            return (
              <motion.button key={type} onClick={() => onReact(testimony.id, type)} whileTap={{ scale: 0.9 }} animate={isActive ? { scale: [1, 1.15, 1] } : { scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors border ${isActive ? "border-current" : "border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300"}`}
                style={isActive ? { borderColor: catColor, color: catColor } : undefined}>
                <span>{emoji}</span><span className="text-xs">{label}</span><span className="text-xs font-bold">{reactionCounts[type]}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </BlurFadeIn>
  );
}

interface MemberCardProps { testimony: TestimonyWithRelations; myReaction: ReactionType | null; onReact: (id: string, type: ReactionType) => void; }
function MemberTestimonyCard({ testimony, myReaction, onReact }: MemberCardProps) {
  const [expanded, setExpanded] = useState(false);
  const cat = testimony.testimony_categories;
  const member = testimony.members;
  const catColor = cat?.color ?? "#6366f1";
  const displayName = testimony.is_anonymous ? "Anonymous Member" : member ? `${member.first_name} ${member.last_name}` : testimony.author_name || "Anonymous Member";
  const isLong = testimony.body.length > 180;
  const bodyPreview = isLong && !expanded ? testimony.body.slice(0, 180) + "…" : testimony.body;
  const reactionCounts: ReactionCounts = {
    amen: testimony.testimony_reactions?.filter(r => r.reaction_type === "amen").length ?? 0,
    touched: testimony.testimony_reactions?.filter(r => r.reaction_type === "touched").length ?? 0,
    inspiring: testimony.testimony_reactions?.filter(r => r.reaction_type === "inspiring").length ?? 0,
  };
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden" style={{ borderLeftWidth: 4, borderLeftColor: catColor }}>
      <div className="p-4 space-y-2.5">
        <Quote className="h-4 w-4" style={{ color: catColor }} />
        <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 leading-snug font-jakarta">{testimony.title}</h3>
        <div>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-jakarta">{bodyPreview}</p>
          {isLong && (
            <button onClick={() => setExpanded(e => !e)} className="mt-1 flex items-center gap-1 text-xs font-medium text-indigo-500 hover:text-indigo-600 transition-colors">
              {expanded ? <><span>Show less</span><ChevronUp className="h-3 w-3" /></> : <><span>Read more</span><ChevronDown className="h-3 w-3" /></>}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 pt-1">
          <MemberAvatar name={displayName} avatarUrl={testimony.is_anonymous ? null : member?.avatar_url} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate font-jakarta">{displayName}</p>
            <p className="text-[10px] text-slate-400 font-jakarta">{formatDistanceToNow(new Date(testimony.created_at), { addSuffix: true })}</p>
          </div>
          {cat && <CategoryBadge label={cat.label} color={catColor} />}
        </div>
      </div>
      <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-2.5 flex items-center gap-2">
        {REACTION_EMOJIS.map(({ type, emoji }) => {
          const isActive = myReaction === type;
          return (
            <motion.button key={type} onClick={() => onReact(testimony.id, type)} whileTap={{ scale: 0.9 }} animate={isActive ? { scale: [1, 1.15, 1] } : { scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors border ${isActive ? "border-current" : "border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300"}`}
              style={isActive ? { borderColor: catColor, color: catColor } : undefined}>
              <span>{emoji}</span><span>{reactionCounts[type]}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

interface MyCardProps { testimony: TestimonyWithRelations; onEdit: () => void; onDelete: () => void; onResubmit: () => void; }
function MyTestimonyCard({ testimony, onEdit, onDelete, onResubmit }: MyCardProps) {
  const cat = testimony.testimony_categories;
  const catColor = cat?.color ?? "#6366f1";
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden" style={{ borderLeftWidth: 4, borderLeftColor: catColor }}>
      <div className="p-4 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {cat && <CategoryBadge label={cat.label} color={catColor} />}
            <TestimonyStatusBadge status={testimony.status === "published" ? "approved" : testimony.status as "pending" | "declined"} />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-7 w-7 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-400 flex items-center justify-center transition-colors shrink-0"><MoreHorizontal className="h-3.5 w-3.5" /></button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="font-jakarta text-sm">
              {testimony.status === "pending" && <DropdownMenuItem onClick={onEdit}><Pencil className="h-3.5 w-3.5 mr-2" />Edit</DropdownMenuItem>}
              <DropdownMenuItem onClick={onDelete} className="text-red-600 focus:text-red-600"><Trash2 className="h-3.5 w-3.5 mr-2" />Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 font-jakarta">{testimony.title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed font-jakarta">{testimony.body}</p>
        {testimony.status === "pending" && <p className="text-xs text-amber-600 font-medium font-jakarta">⏳ Awaiting review by church admin</p>}
        {testimony.status === "declined" && (
          <div className="flex items-center gap-2">
            <p className="text-xs text-red-500 font-medium font-jakarta">This testimony was not approved.</p>
            <button onClick={onResubmit} className="text-xs text-indigo-500 hover:text-indigo-600 font-medium underline font-jakarta">Resubmit</button>
          </div>
        )}
        <p className="text-[10px] text-slate-400 font-jakarta">Submitted {formatDistanceToNow(new Date(testimony.created_at), { addSuffix: true })}</p>
      </div>
    </div>
  );
}

interface ShareDrawerProps {
  open: boolean; onClose: () => void; editing: TestimonyWithRelations | null;
  categories: TestimonyCategory[]; memberId: string; tenantId: string; memberName: string; onSuccess: () => void;
}
function ShareTestimonyDrawer({ open, onClose, editing, categories, memberId, tenantId, memberName, onSuccess }: ShareDrawerProps) {
  const queryClient = useQueryClient();
  const { notifyAdminNewTestimony } = useTestimonyNotifications();
  const [form, setForm] = useState<ShareFormState>(() => editing ? {
    title: editing.title, category_id: editing.category_id ?? "", body: editing.body,
    date_of_testimony: editing.date_of_testimony ?? format(new Date(), "yyyy-MM-dd"),
    is_anonymous: editing.is_anonymous, allow_featuring: editing.allow_featuring,
  } : DEFAULT_SHARE_FORM);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title.trim(), category_id: form.category_id || null, body: form.body.trim(),
        date_of_testimony: form.date_of_testimony || null, is_anonymous: form.is_anonymous,
        allow_featuring: form.allow_featuring, member_id: memberId, tenant_id: tenantId,
        status: "pending" as const, author_name: form.is_anonymous ? "Anonymous" : memberName,
      };
      if (editing) {
        const { error } = await supabase.from(TABLES.TESTIMONIES).update(payload as never).eq(COLS.ID, editing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from(TABLES.TESTIMONIES).insert(payload as never).select("id").single();
        if (error) throw error;
        await notifyAdminNewTestimony(tenantId, data.id, form.title.trim(), memberName, form.is_anonymous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-testimonies-mine", memberId] });
      queryClient.invalidateQueries({ queryKey: ["member-testimonies-published", tenantId] });
      toast.success(editing ? "Testimony updated." : "Thank you! Your testimony has been submitted for review.");
      onSuccess(); onClose(); setForm(DEFAULT_SHARE_FORM);
    },
    onError: () => toast.error("Failed to submit testimony"),
  });

  const isValid = form.title.trim().length > 0 && form.body.trim().length > 0;
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto font-jakarta">
        <SheetHeader className="pb-4 border-b border-slate-100">
          <SheetTitle className="text-lg font-semibold text-slate-900 font-jakarta">{editing ? "Edit Testimony" : "Share a Testimony"}</SheetTitle>
        </SheetHeader>
        <div className="space-y-5 pt-5">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600 font-jakarta">Title <span className="text-red-500">*</span></Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. God healed my family" className="h-10 border-slate-200 focus:border-orange-500 font-jakarta text-sm" />
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
            <Label className="text-xs font-medium text-slate-600 font-jakarta">Your Testimony <span className="text-red-500">*</span></Label>
            <Textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={7} placeholder="Share what God has done for you..." className="border-slate-200 focus:border-orange-500 font-jakarta text-sm resize-none" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600 font-jakarta">Date of Testimony</Label>
            <Input type="date" value={form.date_of_testimony} onChange={e => setForm(f => ({ ...f, date_of_testimony: e.target.value }))} className="h-10 border-slate-200 focus:border-orange-500 font-jakarta text-sm" />
          </div>
          <div className="flex items-start justify-between rounded-xl border border-slate-200 p-4 gap-4">
            <div>
              <p className="text-sm font-medium text-slate-700 font-jakarta">Share Anonymously</p>
              <p className="text-xs text-slate-400 font-jakarta mt-0.5 leading-relaxed">Your name will be hidden from other members but the church admin can still see who submitted this</p>
            </div>
            <Switch checked={form.is_anonymous} onCheckedChange={v => setForm(f => ({ ...f, is_anonymous: v }))} />
          </div>
          <div className="flex items-start justify-between rounded-xl border border-slate-200 p-4 gap-4">
            <div>
              <p className="text-sm font-medium text-slate-700 font-jakarta">Allow Featuring</p>
              <p className="text-xs text-slate-400 font-jakarta mt-0.5 leading-relaxed">Allow church to feature this testimony on the Wall of Faith</p>
            </div>
            <Switch checked={form.allow_featuring} onCheckedChange={v => setForm(f => ({ ...f, allow_featuring: v }))} />
          </div>
          <Button onClick={() => submitMutation.mutate()} disabled={!isValid || submitMutation.isPending} className="w-full h-11 bg-orange-500 hover:bg-orange-600 text-white font-jakarta font-semibold">
            {submitMutation.isPending ? "Submitting..." : editing ? "Save Changes" : "Submit Testimony"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function MemberTestimonies() {
  const member = useMemberPortal();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<MemberTab>("published");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [shareDrawer, setShareDrawer] = useState<{ open: boolean; editing: TestimonyWithRelations | null }>({ open: false, editing: null });
  const [deleteTarget, setDeleteTarget] = useState<TestimonyWithRelations | null>(null);
  const [optimisticReactions, setOptimisticReactions] = useState<Record<string, ReactionType | null>>({});

  const { data: publishedTestimonies = [], isLoading: pubLoading } = useQuery<TestimonyWithRelations[]>({
    queryKey: ["member-testimonies-published", member.churchId],
    queryFn: async () => {
      const { data, error } = await supabase.from(TABLES.TESTIMONIES)
        .select("*, testimony_categories(label, color), testimony_reactions(*), members(first_name, last_name, avatar_url)")
        .eq(COLS.TENANT_ID, member.churchId).eq(COLS.STATUS, "published").order(COLS.CREATED_AT, { ascending: false });
      if (error) throw error;
      return (data ?? []) as TestimonyWithRelations[];
    },
    staleTime: 300_000,
  });

  const { data: myTestimonies = [], isLoading: mineLoading } = useQuery<TestimonyWithRelations[]>({
    queryKey: ["member-testimonies-mine", member.memberId],
    queryFn: async () => {
      const { data, error } = await supabase.from(TABLES.TESTIMONIES)
        .select("*, testimony_categories(label, color), testimony_reactions(*), members(first_name, last_name, avatar_url)")
        .eq("member_id", member.memberId).order(COLS.CREATED_AT, { ascending: false });
      if (error) throw error;
      return (data ?? []) as TestimonyWithRelations[];
    },
    staleTime: 300_000,
  });

  const { data: categories = [] } = useQuery<TestimonyCategory[]>({
    queryKey: ["testimony-categories", member.churchId],
    queryFn: async () => {
      const { data, error } = await supabase.from(TABLES.TESTIMONY_CATEGORIES)
        .select("*").eq(COLS.TENANT_ID, member.churchId).eq("is_active", true).order("sort_order");
      if (error) throw error;
      return (data ?? []) as TestimonyCategory[];
    },
    staleTime: 300_000,
  });

  const { data: myReactionsData = [] } = useQuery({
    queryKey: ["member-testimony-reactions", member.memberId],
    queryFn: async () => {
      const { data, error } = await supabase.from(TABLES.TESTIMONY_REACTIONS).select("testimony_id, reaction_type").eq("member_id", member.memberId);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 300_000,
  });

  const serverReactions: Record<string, ReactionType | null> = {};
  for (const r of myReactionsData as { testimony_id: string; reaction_type: ReactionType }[]) {
    serverReactions[r.testimony_id] = r.reaction_type;
  }
  const myReactions: Record<string, ReactionType | null> = { ...serverReactions, ...optimisticReactions };

  const reactionMutation = useMutation({
    mutationFn: async ({ testimonyId, type, currentReaction }: { testimonyId: string; type: ReactionType; currentReaction: ReactionType | null }) => {
      if (currentReaction === type) {
        const { error } = await supabase.from(TABLES.TESTIMONY_REACTIONS).delete().eq("testimony_id", testimonyId).eq("member_id", member.memberId).eq("reaction_type", type);
        if (error) throw error;
      } else {
        await supabase.from(TABLES.TESTIMONY_REACTIONS).delete().eq("testimony_id", testimonyId).eq("member_id", member.memberId);
        const { error } = await supabase.from(TABLES.TESTIMONY_REACTIONS).insert({ tenant_id: member.tenantId, testimony_id: testimonyId, member_id: member.memberId, reaction_type: type } as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-testimonies-published", member.churchId] });
      queryClient.invalidateQueries({ queryKey: ["member-testimony-reactions", member.memberId] });
    },
    onError: (_, variables) => {
      setOptimisticReactions(prev => { const next = { ...prev }; delete next[variables.testimonyId]; return next; });
      toast.error("Failed to update reaction");
    },
  });

  const handleReact = (testimonyId: string, type: ReactionType) => {
    const current = myReactions[testimonyId] ?? null;
    setOptimisticReactions(prev => ({ ...prev, [testimonyId]: current === type ? null : type }));
    reactionMutation.mutate({ testimonyId, type, currentReaction: current });
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLES.TESTIMONIES).delete().eq(COLS.ID, id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["member-testimonies-mine", member.memberId] }); toast.success("Testimony deleted."); setDeleteTarget(null); },
    onError: () => toast.error("Failed to delete testimony"),
  });

  const featuredTestimony = publishedTestimonies.find(t => t.is_featured) ?? null;
  const filteredPublished = categoryFilter === null ? publishedTestimonies : publishedTestimonies.filter(t => t.category_id === categoryFilter);
  const memberFullName = `${member.firstName} ${member.lastName}`;

  return (
    <PageTransition>
      <div className="font-jakarta min-h-screen bg-slate-50 px-4 py-6">
        <Helmet><title>Testimonies — Vestry</title></Helmet>
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Hero */}
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <BlurFadeIn delay={0}><p className="text-xs uppercase tracking-widest text-muted-foreground font-jakarta">Wall of Faith</p></BlurFadeIn>
            <BlurFadeIn delay={0.1}>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-jakarta leading-tight">
                Stories of God's{" "}
                <GradientText colors={["#7c3aed", "#a78bfa", "#6d28d9", "#7c3aed"]} className="inline">
                  <TextRotate texts={["Faithfulness", "Provision", "Healing", "Grace", "Power"]} interval={2800} />
                </GradientText>
              </h1>
            </BlurFadeIn>
            <BlurFadeIn delay={0.2}><p className="text-sm text-slate-500 dark:text-slate-400 font-jakarta leading-relaxed max-w-lg mx-auto">Read how God is moving in our community. Every testimony here is a real story from a real person.</p></BlurFadeIn>
            <BlurFadeIn delay={0.3}>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <Button onClick={() => setShareDrawer({ open: true, editing: null })} className="bg-orange-500 hover:bg-orange-600 text-white font-jakarta font-semibold rounded-full"><Plus className="h-4 w-4 mr-1.5" />Share Your Testimony</Button>
                <p className="text-sm text-slate-400 font-jakarta">{publishedTestimonies.length} testimonies shared</p>
              </div>
            </BlurFadeIn>
          </div>

          {/* Featured */}
          {featuredTestimony && <FeaturedTestimonyCard testimony={featuredTestimony} myReactions={myReactions} onReact={handleReact} />}

          {/* Tabs */}
          <div className="flex gap-2">
            {(["published", "mine"] as MemberTab[]).map(tab => (
              <div key={tab} className="relative">
                <button onClick={() => setActiveTab(tab)} className={`relative z-10 px-4 py-2 rounded-full text-sm font-medium transition-colors font-jakarta ${activeTab === tab ? "text-white" : "text-slate-500 hover:text-slate-700"}`}>
                  {activeTab === tab && <motion.div layoutId="memberTestimonyTab" className="absolute inset-0 rounded-full bg-orange-500" transition={{ type: "spring", stiffness: 400, damping: 30 }} />}
                  <span className="relative z-10">{tab === "published" ? "Published" : "My Testimonies"}</span>
                </button>
              </div>
            ))}
          </div>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            {activeTab === "published" && (
              <motion.div key="published" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-5">
                {categories.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => setCategoryFilter(null)} className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors font-jakarta ${categoryFilter === null ? "bg-orange-500 text-white" : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"}`}>All</button>
                    {categories.map(cat => {
                      const isActive = categoryFilter === cat.id;
                      return (
                        <button key={cat.id} onClick={() => setCategoryFilter(isActive ? null : cat.id)} className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors font-jakarta ${isActive ? "text-white" : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"}`} style={isActive ? { backgroundColor: cat.color } : undefined}>{cat.label}</button>
                      );
                    })}
                  </div>
                )}
                {pubLoading ? (
                  <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">{[1,2,3,4,5].map(i => <div key={i} className="break-inside-avoid bg-white rounded-xl border border-slate-200 p-4 space-y-3 mb-4"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-5/6" /></div>)}</div>
                ) : filteredPublished.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                    <Quote className="h-12 w-12 text-slate-300" />
                    <p className="text-base font-semibold text-slate-600 font-jakarta">No testimonies yet</p>
                    <p className="text-sm text-slate-400 font-jakarta">Be the first to share a testimony</p>
                    <Button size="sm" onClick={() => setShareDrawer({ open: true, editing: null })} className="mt-2 bg-orange-500 hover:bg-orange-600 text-white font-jakarta"><Plus className="h-4 w-4 mr-1.5" />Share a Testimony</Button>
                  </div>
                ) : (
                  <MasonryGrid items={filteredPublished} className="columns-1 sm:columns-2 lg:columns-3"
                    renderItem={testimony => <MemberTestimonyCard testimony={testimony} myReaction={myReactions[testimony.id] ?? null} onReact={handleReact} />} />
                )}
              </motion.div>
            )}
            {activeTab === "mine" && (
              <motion.div key="mine" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                {mineLoading ? (
                  <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-2/3" /></div>)}</div>
                ) : myTestimonies.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                    <Quote className="h-12 w-12 text-slate-300" />
                    <p className="text-base font-semibold text-slate-600 font-jakarta">You haven't shared any testimonies yet</p>
                    <p className="text-sm text-slate-400 font-jakarta">Share what God has done in your life</p>
                    <Button size="sm" onClick={() => setShareDrawer({ open: true, editing: null })} className="mt-2 bg-orange-500 hover:bg-orange-600 text-white font-jakarta"><Plus className="h-4 w-4 mr-1.5" />Share a Testimony</Button>
                  </div>
                ) : (
                  <div className="space-y-3 max-w-2xl">
                    {myTestimonies.map(testimony => (
                      <MyTestimonyCard key={testimony.id} testimony={testimony}
                        onEdit={() => setShareDrawer({ open: true, editing: testimony })}
                        onDelete={() => setDeleteTarget(testimony)}
                        onResubmit={() => setShareDrawer({ open: true, editing: testimony })} />
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <ShareTestimonyDrawer open={shareDrawer.open} onClose={() => setShareDrawer({ open: false, editing: null })} editing={shareDrawer.editing} categories={categories} memberId={member.memberId} tenantId={member.tenantId} memberName={memberFullName} onSuccess={() => setShareDrawer({ open: false, editing: null })} />
        <ConfirmDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)} title="Delete Testimony?" description="This will permanently remove your testimony. This action cannot be undone." confirmLabel="Delete" destructive onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} loading={deleteMutation.isPending} />
      </div>
    </PageTransition>
  );
}
