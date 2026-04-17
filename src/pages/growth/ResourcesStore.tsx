import { useState, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { useCurrency } from "@/hooks/useCurrency";
import { TABLES, COLS } from "@/lib/schema";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import {
  Package, Tag, ShoppingCart, Star, DollarSign, TrendingUp,
  Users, QrCode, Copy, Download, Share2, Plus, Pencil, Trash2,
  LayoutDashboard, BookOpen, FolderOpen, Layers, Ticket,
  Truck, ClipboardList, RotateCcw, Settings,
} from "lucide-react";

// ─── Store QR Modal ───────────────────────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_BASE_URL || "http://localhost:8080";

function StoreQRModal({ open, onClose, tenantId }: { open: boolean; onClose: () => void; tenantId: string }) {
  const qrRef = useRef<SVGSVGElement>(null);
  const storeUrl = `${BASE_URL}/store/${tenantId}`;

  function copy() {
    navigator.clipboard.writeText(storeUrl);
    toast.success("Link copied to clipboard");
  }

  function downloadQR() {
    if (!qrRef.current) return;
    const svg = new XMLSerializer().serializeToString(qrRef.current);
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resource-store-qr.svg";
    a.click();
    URL.revokeObjectURL(url);
  }

  function share() {
    if (navigator.share) navigator.share({ title: "Resource Store", url: storeUrl });
    else copy();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Resource Store QR</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {/* QR code — same pattern as Sermons page */}
          <div className="flex flex-col items-center p-6 bg-white rounded-xl border border-slate-200">
            <QRCodeSVG ref={qrRef} value={storeUrl} size={180} level="H" includeMargin />
            <p className="text-xs text-muted-foreground mt-3">Scan to browse our resource store</p>
          </div>

          {/* Link */}
          <div>
            <Label className="text-xs text-muted-foreground">Link</Label>
            <div className="flex gap-2 mt-1">
              <Input value={storeUrl} readOnly className="text-xs font-mono" />
              <Button variant="outline" size="icon" onClick={copy}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={downloadQR}>
              <Download className="mr-2 h-4 w-4" /> Download QR
            </Button>
            <Button variant="outline" size="sm" onClick={share}>
              <Share2 className="mr-2 h-4 w-4" /> Share Link
            </Button>
          </div>

          {/* How to use */}
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">How to use</p>
            <p>• Display at resource tables</p>
            <p>• Include in announcements</p>
            <p>• Share with members</p>
            <p>• Quick access to digital resources</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Resource Type grouped options ───────────────────────────────────────────
const RESOURCE_TYPE_GROUPS = [
  {
    group: "Digital Products",
    options: ["eBook", "Audio", "Video", "Course", "Template", "Document", "Other Digital"],
  },
  {
    group: "Physical Products",
    options: ["Physical Product", "Merchandise", "Music/Worship Album", "Curriculum/Study Guide", "Art & Decor", "Kids & Youth"],
  },
  {
    group: "Special",
    options: ["Events/Tickets", "Membership", "Devotional", "Ministry Tools", "Donation/Good Cause"],
  },
] as const;

const ALL_RESOURCE_TYPES = RESOURCE_TYPE_GROUPS.flatMap(g => g.options);

const RESOURCE_CATEGORIES = [
  "No Category", "Books", "Audio", "Video", "Study Materials",
  "Merchandise", "Digital Download", "Kids & Youth", "Worship", "Other",
];

const defaultForm = {
  name: "", type: "eBook" as string, category: "No Category",
  short_description: "", description: "",
  pricing: "fixed" as string, price: "", member_discount: "0",
  sku: "", stock_quantity: "0", status: "active",
  digital_file_url: "", download_limit: "",
  cover_image: null as File | null,
  gallery_images: [] as File[],
  tags: [] as string[], tag_input: "",
  chapters: [] as { title: string; description: string }[],
};

// ─── Grouped Select ───────────────────────────────────────────────────────────
function GroupedTypeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
    >
      {RESOURCE_TYPE_GROUPS.map(group => (
        <optgroup key={group.group} label={group.group}>
          {group.options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

// ─── Add/Edit Resource Form (full page overlay) ───────────────────────────────
function AddResourceForm({ tenantId, editProduct, onClose, onSaved }: {
  tenantId: string;
  editProduct?: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();
  const { userId } = useChurch();
  const [form, setForm] = useState(() => editProduct ? {
    name: editProduct.name || "",
    type: editProduct.product_type || "eBook",
    category: editProduct.category || "No Category",
    short_description: editProduct.short_description || "",
    description: editProduct.description || "",
    pricing: editProduct.pricing || "fixed",
    price: String(editProduct.price || ""),
    member_discount: String(editProduct.member_discount || "0"),
    sku: editProduct.sku || "",
    stock_quantity: String(editProduct.stock_quantity || 0),
    status: editProduct.status || "active",
    digital_file_url: editProduct.digital_file_url || "",
    download_limit: String(editProduct.download_limit || ""),
    cover_image: null as File | null,
    gallery_images: [] as File[],
    tags: editProduct.tags || [] as string[],
    tag_input: "",
    chapters: editProduct.chapters || [] as { title: string; description: string }[],
  } : { ...defaultForm });

  function setField(k: string, v: any) { setForm(f => ({ ...f, [k]: v })); }

  const isDigital = ["eBook", "Audio", "Video", "Course", "Template", "Document", "Other Digital"].includes(form.type);

  const save = useMutation({
    mutationFn: async () => {
      const payload: Record<string, any> = {
        name: form.name.trim(),
        product_type: form.type,
        category: form.category === "No Category" ? null : form.category.toLowerCase().replace(/ /g, "_"),
        short_description: form.short_description || null,
        description: form.description || null,
        pricing: form.pricing,
        price: Number(form.price) || 0,
        member_discount: Number(form.member_discount) || 0,
        sku: form.sku || null,
        stock_quantity: Number(form.stock_quantity) || 0,
        status: form.status,
        digital_file_url: form.digital_file_url || null,
        download_limit: form.download_limit ? Number(form.download_limit) : null,
        tags: form.tags,
        tenant_id: tenantId,
        created_by: userId,
      };
      if (editProduct) {
        const { error } = await supabase.from(TABLES.STORE_PRODUCTS).update(payload).eq(COLS.ID, editProduct.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(TABLES.STORE_PRODUCTS).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-products-admin", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["store-products", tenantId] });
      toast.success(editProduct ? "Resource updated" : "Resource created");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save resource"),
  });

  function addTag() {
    const t = form.tag_input.trim();
    if (t && !form.tags.includes(t)) setForm(f => ({ ...f, tags: [...f.tags, t], tag_input: "" }));
  }

  function removeTag(t: string) { setForm(f => ({ ...f, tags: f.tags.filter(x => x !== t) })); }

  function addChapter() { setForm(f => ({ ...f, chapters: [...f.chapters, { title: "", description: "" }] })); }

  function updateChapter(i: number, k: "title" | "description", v: string) {
    setForm(f => ({ ...f, chapters: f.chapters.map((c, idx) => idx === i ? { ...c, [k]: v } : c) }));
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-900 overflow-y-auto">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-500">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">{editProduct ? "Edit Resource" : "Add New Resource"}</h1>
            <p className="text-xs text-slate-500">Create a new digital or physical product</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            className="bg-orange-500 hover:bg-orange-600 text-white"
            onClick={() => save.mutate()}
            disabled={!form.name.trim() || save.isPending}
          >
            {save.isPending ? "Saving…" : editProduct ? "Save Changes" : "Create Resource"}
          </Button>
        </div>
      </div>

      {/* Form body */}
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {/* Basic Information */}
        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Basic Information</h2>

          <div className="space-y-1.5">
            <Label>Name <span className="text-red-500">*</span></Label>
            <Input placeholder="Resource name" value={form.name} onChange={e => setField("name", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <GroupedTypeSelect value={form.type} onChange={v => setField("type", v)} />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setField("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RESOURCE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Short Description</Label>
            <Input
              placeholder="Brief description for marketplace listings (max 160 chars)"
              value={form.short_description}
              onChange={e => setField("short_description", e.target.value.slice(0, 160))}
              maxLength={160}
            />
            <p className="text-xs text-slate-400">{form.short_description.length}/160</p>
          </div>

          <div className="space-y-1.5">
            <Label>Full Description</Label>
            <Textarea
              placeholder="Detailed product description"
              value={form.description}
              onChange={e => setField("description", e.target.value)}
              rows={5}
            />
          </div>
        </section>

        {/* Pricing */}
        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Pricing</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Pricing Type</Label>
              <Select value={form.pricing} onValueChange={v => setField("pricing", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Price</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="donation">Donation</SelectItem>
                  <SelectItem value="subscription">Subscription</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Price ($)</Label>
              <Input type="number" placeholder="0" value={form.price} onChange={e => setField("price", e.target.value)} min={0} />
            </div>
            <div className="space-y-1.5">
              <Label>Member Discount (%)</Label>
              <Input type="number" placeholder="0" value={form.member_discount} onChange={e => setField("member_discount", e.target.value)} min={0} max={100} />
            </div>
          </div>
        </section>

        {/* Digital Product Settings — only for digital types */}
        {isDigital && (
          <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Digital Product Settings</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Download Limit <span className="text-slate-400 font-normal">(leave empty for unlimited)</span></Label>
                <Input type="number" placeholder="Unlimited" value={form.download_limit} onChange={e => setField("download_limit", e.target.value)} min={0} />
              </div>
              <div className="space-y-1.5">
                <Label>Digital File</Label>
                <Input type="file" className="text-sm" onChange={e => setField("digital_file_url", e.target.value)} />
              </div>
            </div>
          </section>
        )}

        {/* Media */}
        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Media</h2>
          <div className="space-y-1.5">
            <Label>Cover Image <span className="text-red-500">*</span></Label>
            <Input type="file" accept="image/*" className="text-sm" />
            <p className="text-xs text-slate-400">Main product image shown in listings</p>
          </div>
          <div className="space-y-1.5">
            <Label>Gallery Images</Label>
            <Input type="file" accept="image/*" multiple className="text-sm" />
            <p className="text-xs text-slate-400">Additional images for product carousel</p>
          </div>
        </section>

        {/* Tags & Organization */}
        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Tags & Organization</h2>
          <div className="space-y-1.5">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add a tag..."
                value={form.tag_input}
                onChange={e => setField("tag_input", e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                className="flex-1"
              />
              <Button variant="outline" onClick={addTag} type="button">Add</Button>
            </div>
            <p className="text-xs text-slate-400">Tags help users find your product</p>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.tags.map(t => (
                  <span key={t} className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-xs text-slate-700 dark:text-slate-300">
                    {t}
                    <button onClick={() => removeTag(t)} className="text-slate-400 hover:text-red-500 transition-colors">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Table of Contents / Chapters */}
        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Table of Contents / Chapters</h2>
          <div className="space-y-2">
            {form.chapters.map((ch, i) => (
              <div key={i} className="grid grid-cols-2 gap-3">
                <Input placeholder="Chapter title..." value={ch.title} onChange={e => updateChapter(i, "title", e.target.value)} />
                <Input placeholder="Description (optional)" value={ch.description} onChange={e => updateChapter(i, "description", e.target.value)} />
              </div>
            ))}
            <button
              onClick={addChapter}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700 text-sm text-slate-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
            >
              <Plus className="h-4 w-4" /> Add Chapter
            </button>
          </div>
        </section>

        {/* Bottom actions */}
        <div className="flex justify-end gap-3 pb-8">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            className="bg-orange-500 hover:bg-orange-600 text-white"
            onClick={() => save.mutate()}
            disabled={!form.name.trim() || save.isPending}
          >
            {save.isPending ? "Saving…" : editProduct ? "Save Changes" : "Create Resource"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Resources Tab ────────────────────────────────────────────────────────────
function ResourcesTab({ tenantId, currency }: { tenantId: string; currency: (n: number) => string }) {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["store-products-admin", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.STORE_PRODUCTS).select("*").eq(COLS.TENANT_ID, tenantId).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 300000,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLES.STORE_PRODUCTS).delete().eq(COLS.ID, id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-products-admin", tenantId] });
      toast.success("Resource deleted");
    },
    onError: () => toast.error("Failed to delete resource"),
  });

  if (formOpen) {
    return (
      <AddResourceForm
        tenantId={tenantId}
        editProduct={editProduct}
        onClose={() => { setFormOpen(false); setEditProduct(null); }}
        onSaved={() => { setFormOpen(false); setEditProduct(null); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditProduct(null); setFormOpen(true); }} className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5">
          <Plus className="h-4 w-4" /> Add Resource
        </Button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              {["Name", "Type", "Category", "Pricing", "Price", "Sales", "Status", "Actions"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="text-center py-10 text-slate-400 text-sm">Loading…</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-10 text-slate-400 text-sm">No resources yet. Add your first resource to get started.</td></tr>
            ) : (
              products.map((p: any) => (
                <tr key={p.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{p.name}</td>
                  <td className="px-4 py-3 capitalize text-slate-600 dark:text-slate-400">{p.product_type?.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 capitalize text-slate-600 dark:text-slate-400">{p.category?.replace(/_/g, " ") || "—"}</td>
                  <td className="px-4 py-3 capitalize text-slate-600 dark:text-slate-400">{p.pricing || "Fixed"}</td>
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{currency(p.price)}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{p.sales_count || 0}</td>
                  <td className="px-4 py-3">
                    <Badge className={`text-xs capitalize ${p.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{p.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditProduct(p); setFormOpen(true); }} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-600 transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => remove.mutate(p.id)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, iconColor }: { icon: React.ElementType; label: string; value: string | number; iconColor: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm p-5 flex items-center gap-4">
      <Icon className={`h-6 w-6 shrink-0 ${iconColor}`} />
      <div>
        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      </div>
    </div>
  );
}

// ─── Empty tab placeholder ────────────────────────────────────────────────────
function EmptyTab({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
      <Icon className="h-10 w-10" />
      <p className="text-sm font-medium">Nothing here yet</p>
      <p className="text-xs text-slate-400">{label} will appear here once added.</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const TABS = [
  { key: "dashboard",  label: "Dashboard",  icon: LayoutDashboard },
  { key: "resources",  label: "Resources",  icon: BookOpen },
  { key: "categories", label: "Categories", icon: FolderOpen },
  { key: "bundles",    label: "Bundles",    icon: Layers },
  { key: "coupons",    label: "Coupons",    icon: Ticket },
  { key: "shipping",   label: "Shipping",   icon: Truck },
  { key: "orders",     label: "Orders",     icon: ClipboardList },
  { key: "refunds",    label: "Refunds",    icon: RotateCcw },
  { key: "settings",   label: "Settings",   icon: Settings },
] as const;

type TabKey = typeof TABS[number]["key"];

export default function ResourcesStore() {
  const { tenantId } = useChurch();
  const { symbol, format } = useCurrency();
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const [qrOpen, setQrOpen] = useState(false);

  // Fetch orders for stats
  const { data: orders = [] } = useQuery({
    queryKey: ["store-orders", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.STORE_ORDERS).select("*").eq(COLS.TENANT_ID, tenantId);
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 300000,
  });

  // Fetch products for stats
  const { data: products = [] } = useQuery({
    queryKey: ["store-products-admin", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.STORE_PRODUCTS).select("id").eq(COLS.TENANT_ID, tenantId);
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 300000,
  });

  const completedOrders = orders.filter((o: any) => o.order_status === "fulfilled" || o.order_status === "delivered").length;
  const totalRevenue = orders.filter((o: any) => o.payment_status === "paid").reduce((s: number, o: any) => s + Number(o.total || 0), 0);
  const now = new Date();
  const monthRevenue = orders.filter((o: any) => {
    const d = new Date(o.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && o.payment_status === "paid";
  }).reduce((s: number, o: any) => s + Number(o.total || 0), 0);
  const uniqueCustomers = new Set(orders.map((o: any) => o.customer_email).filter(Boolean)).size;

  function copyStoreLink() {
    const url = `${BASE_URL}/store/${tenantId}`;
    navigator.clipboard.writeText(url);
    toast.success("Store link copied!");
  }

  return (
    <>
      <Helmet><title>Resource Store — Vestry</title></Helmet>

      {/* Background gradient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-purple-300/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-orange-300/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/2 w-72 h-72 bg-blue-300/15 rounded-full blur-3xl" />
      </div>

      <PageHeader
        title="Resource Store"
        subtitle="Sell books, media and resources to your congregation"
        action={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-1.5" onClick={() => setQrOpen(true)}>
              <QrCode className="h-4 w-4" /> Store QR
            </Button>
            <Button variant="outline" className="gap-1.5" onClick={copyStoreLink}>
              <Copy className="h-4 w-4" /> Copy Store Link
            </Button>
          </div>
        }
      />

      {/* ── Top Stats Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Package}      label="Total Resources"   value={products.length}    iconColor="text-orange-500" />
        <StatCard icon={Tag}          label="Bundles"           value={0}                  iconColor="text-pink-500" />
        <StatCard icon={ShoppingCart} label="Completed Orders"  value={completedOrders}    iconColor="text-red-500" />
        <StatCard icon={Star}         label="Total Sales"       value={0}                  iconColor="text-amber-500" />
      </div>

      {/* ── Tab Bar ── */}
      <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
        <div className="flex gap-0 overflow-x-auto">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
                ${activeTab === key
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ── */}

      {/* Dashboard */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {/* Revenue stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={DollarSign}  label="Total Revenue" value={format(totalRevenue)}  iconColor="text-emerald-500" />
            <StatCard icon={TrendingUp}  label="This Month"    value={format(monthRevenue)}  iconColor="text-blue-500" />
            <StatCard icon={ShoppingCart}label="Total Orders"  value={orders.length}         iconColor="text-red-500" />
            <StatCard icon={Users}       label="Customers"     value={uniqueCustomers}        iconColor="text-purple-500" />
          </div>

          {/* Recent Orders */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm p-5">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Recent Orders</h3>
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
              <ShoppingCart className="h-10 w-10" />
              <p className="font-medium text-sm">No orders yet</p>
              <p className="text-xs text-center max-w-xs">Orders will appear here when customers make purchases.</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === "resources"  && <ResourcesTab tenantId={tenantId} currency={format} />}
      {activeTab === "categories" && <EmptyTab icon={FolderOpen}   label="Categories" />}
      {activeTab === "bundles"    && <EmptyTab icon={Layers}       label="Bundles" />}
      {activeTab === "coupons"    && <EmptyTab icon={Ticket}       label="Coupons" />}
      {activeTab === "shipping"   && <EmptyTab icon={Truck}        label="Shipping settings" />}
      {activeTab === "orders"     && <EmptyTab icon={ClipboardList}label="Orders" />}
      {activeTab === "refunds"    && <EmptyTab icon={RotateCcw}    label="Refunds" />}
      {activeTab === "settings"   && <EmptyTab icon={Settings}     label="Store settings" />}

      {/* QR Modal */}
      <StoreQRModal open={qrOpen} onClose={() => setQrOpen(false)} tenantId={tenantId} />
    </>
  );
}
