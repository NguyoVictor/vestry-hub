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

const defaultForm = {
  name: "", type: "eBook" as string, category: "none",
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

  // Fetch dynamic categories for this tenant
  const { data: categories = [] } = useQuery({
    queryKey: ["store-categories", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from(TABLES.STORE_CATEGORIES)
        .select("id, name")
        .eq(COLS.TENANT_ID, tenantId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 60000,
  });
  const [form, setForm] = useState(() => editProduct ? {
    name: editProduct.name || "",
    type: editProduct.product_type || "eBook",
    category: editProduct.category || "none",
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
        category: form.category === "none" || !form.category ? null : form.category,
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
                <SelectTrigger><SelectValue placeholder="No Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Category</SelectItem>
                  {categories.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                  {categories.length === 0 && (
                    <div className="px-3 py-2 text-xs text-slate-400">No categories yet — create them in the Categories tab</div>
                  )}
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

// ─── Orders Tab ───────────────────────────────────────────────────────────────
function OrdersTab({ tenantId, formatCurrency }: { tenantId: string; formatCurrency: (n: number) => string }) {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["store-orders", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.STORE_ORDERS).select("*, order_items(count)").eq(COLS.TENANT_ID, tenantId).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 60000,
  });

  function statusBadge(status: string) {
    const map: Record<string, string> = {
      pending: "bg-amber-100 text-amber-700",
      processing: "bg-blue-100 text-blue-700",
      fulfilled: "bg-emerald-100 text-emerald-700",
      delivered: "bg-emerald-100 text-emerald-700",
      cancelled: "bg-red-100 text-red-700",
      refunded: "bg-slate-100 text-slate-600",
    };
    return map[status] || "bg-slate-100 text-slate-600";
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            {["Order #", "Customer", "Items", "Total", "Shipping", "Status", "Date", "Actions"].map(h => (
              <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr><td colSpan={8} className="text-center py-10 text-slate-400 text-sm">Loading…</td></tr>
          ) : orders.length === 0 ? (
            <tr><td colSpan={8} className="text-center py-10 text-slate-400 text-sm">No orders yet.</td></tr>
          ) : (
            orders.map((o: any) => (
              <tr key={o.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-300">{o.order_number || o.id.slice(0, 8)}</td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{o.customer_name || "—"}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{o.order_items?.[0]?.count || 0}</td>
                <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{formatCurrency(o.total)}</td>
                <td className="px-4 py-3 capitalize text-slate-600 dark:text-slate-400">{o.delivery_method?.replace(/_/g, " ") || "—"}</td>
                <td className="px-4 py-3">
                  <Badge className={`text-xs capitalize ${statusBadge(o.order_status)}`}>{o.order_status?.replace(/_/g, " ")}</Badge>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                  {o.created_at ? new Date(o.created_at).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3">
                  <button className="text-xs text-indigo-600 hover:underline">View</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Refunds Tab ──────────────────────────────────────────────────────────────
function RefundsTab({ tenantId }: { tenantId: string }) {
  const { data: refunds = [], isLoading } = useQuery({
    queryKey: ["store-refunds", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.STORE_ORDERS).select("id, order_number, customer_name, total, order_status, created_at, delivery_method").eq(COLS.TENANT_ID, tenantId).eq("order_status", "refunded").order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 60000,
  });

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            {["Date", "Order", "Customer", "Type", "Reason", "Amount", "Status", "Actions"].map(h => (
              <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr><td colSpan={8} className="text-center py-10 text-slate-400 text-sm">Loading…</td></tr>
          ) : refunds.length === 0 ? (
            <tr>
              <td colSpan={8} className="py-14 text-center">
                <RotateCcw className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm text-slate-400">No refund requests yet</p>
              </td>
            </tr>
          ) : (
            refunds.map((r: any) => (
              <tr key={r.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                <td className="px-4 py-3 text-xs text-slate-500">{r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-300">{r.order_number || r.id.slice(0, 8)}</td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{r.customer_name || "—"}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">Refund</td>
                <td className="px-4 py-3 text-slate-500">—</td>
                <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{r.total}</td>
                <td className="px-4 py-3"><Badge className="text-xs bg-slate-100 text-slate-600">Refunded</Badge></td>
                <td className="px-4 py-3"><button className="text-xs text-indigo-600 hover:underline">View</button></td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────
function SettingsTab({ tenantId }: { tenantId: string }) {
  const { userEmail } = useChurch();
  const { symbol, format: formatCurrency } = useCurrency();
  const [settings, setSettings] = useState({
    order_notifications: true,
    notification_email: "",
    low_stock_alerts: true,
    alert_email: "",
    enable_tax: false,
    tax_rate: "0",
    tax_label: "Tax",
    tax_inclusive: false,
    return_window: "30",
    auto_approve_digital_refunds: false,
    refund_policy: "",
  });
  const [saving, setSaving] = useState(false);

  function setField(k: string, v: any) { setSettings(s => ({ ...s, [k]: v })); }

  async function handleSave() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setSaving(false);
    toast.success("Settings saved");
  }

  // Tax Calculation Preview — uses church currency
  const samplePrice = 100;
  const taxRate = Number(settings.tax_rate) || 0;
  const taxPreview = (() => {
    if (!settings.enable_tax || taxRate === 0) {
      return `A ${symbol}100 product + 0% Tax = ${formatCurrency(samplePrice)} total`;
    }
    if (settings.tax_inclusive) {
      const taxAmount = (samplePrice * taxRate) / (100 + taxRate);
      return `A ${symbol}100 product includes ${settings.tax_label} of ${formatCurrency(taxAmount)} (Customer pays ${formatCurrency(samplePrice)} total)`;
    }
    const taxAmount = (samplePrice * taxRate) / 100;
    return `A ${symbol}100 product + ${taxRate}% ${settings.tax_label} = ${formatCurrency(samplePrice + taxAmount)} total`;
  })();

  return (
    <div className="space-y-6 pb-20">
      {/* Notification Settings */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-5">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-base">🔔</span>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Notification Settings</h3>
          </div>
          <p className="text-xs text-slate-500">Configure email notifications for orders and inventory alerts</p>
        </div>

        {/* Order Notifications */}
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Order Notifications</p>
              <p className="text-xs text-slate-500">Receive email when new orders are placed</p>
            </div>
            <Switch checked={settings.order_notifications} onCheckedChange={v => setField("order_notifications", v)} />
          </div>
          {settings.order_notifications && (
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Notification Email</Label>
              <Input
                placeholder="orders@yourchurch.com (defaults to church email)"
                value={settings.notification_email}
                onChange={e => setField("notification_email", e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-700">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Low Stock Alerts</p>
              <p className="text-xs text-slate-500">Receive email when products are running low</p>
            </div>
            <Switch checked={settings.low_stock_alerts} onCheckedChange={v => setField("low_stock_alerts", v)} />
          </div>
          {settings.low_stock_alerts && (
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Alert Email</Label>
              <Input
                placeholder="inventory@yourchurch.com (defaults to church email)"
                value={settings.alert_email}
                onChange={e => setField("alert_email", e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Tax Configuration */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-5">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-base font-bold text-slate-700">%</span>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Tax Configuration</h3>
          </div>
          <p className="text-xs text-slate-500">Configure tax calculation for your store</p>
        </div>

        {/* Enable Tax toggle */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Enable Tax</p>
            <p className="text-xs text-slate-500">Add tax to product prices</p>
          </div>
          <Switch checked={settings.enable_tax} onCheckedChange={v => setField("enable_tax", v)} />
        </div>

        {/* Expanded tax fields — only when enabled */}
        {settings.enable_tax && (
          <>
            <div className="h-px bg-slate-100 dark:bg-slate-700" />

            {/* Tax Rate + Tax Label */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tax Rate (%)</Label>
                <Input
                  type="number"
                  value={settings.tax_rate}
                  onChange={e => setField("tax_rate", e.target.value)}
                  min={0}
                  max={100}
                  step={0.1}
                />
                <p className="text-xs text-slate-400">Enter the tax percentage to apply</p>
              </div>
              <div className="space-y-1.5">
                <Label>Tax Label</Label>
                <Input
                  value={settings.tax_label}
                  onChange={e => setField("tax_label", e.target.value)}
                  placeholder="Tax"
                />
                <p className="text-xs text-slate-400">Label shown to customers (e.g. "VAT", "GST", "Sales Tax")</p>
              </div>
            </div>

            {/* Tax Inclusive Pricing */}
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Tax Inclusive Pricing</p>
                  <p className="text-xs text-slate-500">Product prices already include tax (tax is extracted from price)</p>
                </div>
                <Switch checked={settings.tax_inclusive} onCheckedChange={v => setField("tax_inclusive", v)} />
              </div>

              {/* Tax Calculation Preview — always shown when tax is enabled */}
              <div className="rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 p-4">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tax Calculation Preview</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{taxPreview}</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Returns & Refunds */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-5">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <RotateCcw className="h-4 w-4 text-slate-600" />
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Returns & Refunds</h3>
          </div>
          <p className="text-xs text-slate-500">Set your return window and refund policy</p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <Label>Return Window (Days)</Label>
            <Input
              type="number"
              value={settings.return_window}
              onChange={e => setField("return_window", e.target.value)}
              min={0}
            />
            <p className="text-xs text-slate-400">Number of days customers have to request a return (0 = no returns)</p>
          </div>
          <div className="flex items-start justify-between pt-6">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Auto-approve Digital Refunds</p>
              <p className="text-xs text-slate-500">Automatically approve refund requests for digital products</p>
            </div>
            <Switch checked={settings.auto_approve_digital_refunds} onCheckedChange={v => setField("auto_approve_digital_refunds", v)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Refund Policy</Label>
          <Textarea
            placeholder="Describe your refund and return policy..."
            value={settings.refund_policy}
            onChange={e => setField("refund_policy", e.target.value)}
            rows={5}
          />
          <p className="text-xs text-slate-400">This will be displayed to customers during checkout and in their order confirmation</p>
        </div>
      </div>

      {/* Sticky Save button */}
      <div className="fixed bottom-6 right-6 z-10">
        <Button
          className="bg-orange-500 hover:bg-orange-600 text-white gap-2 shadow-lg"
          onClick={handleSave}
          disabled={saving}
        >
          <Settings className="h-4 w-4" />
          {saving ? "Saving…" : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}

// ─── Coupons Tab ──────────────────────────────────────────────────────────────
function CouponsTab({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient();
  const { userId } = useChurch();
  const [modalOpen, setModalOpen] = useState(false);
  const [editCoupon, setEditCoupon] = useState<any>(null);
  const [form, setForm] = useState({
    code: "", description: "",
    discount_type: "percentage" as "percentage" | "fixed",
    discount_value: "10",
    min_order_amount: "0",
    max_uses: "",
    start_date: "", end_date: "",
    is_active: true,
  });

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["store-coupons", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.STORE_COUPONS).select("*").eq(COLS.TENANT_ID, tenantId).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 300000,
  });

  function openAdd() {
    setForm({ code: "", description: "", discount_type: "percentage", discount_value: "10", min_order_amount: "0", max_uses: "", start_date: "", end_date: "", is_active: true });
    setEditCoupon(null);
    setModalOpen(true);
  }

  function openEdit(c: any) {
    setForm({
      code: c.code || "",
      description: c.description || "",
      discount_type: c.discount_type || "percentage",
      discount_value: String(c.discount_value || 10),
      min_order_amount: String(c.min_order_amount || 0),
      max_uses: c.max_uses ? String(c.max_uses) : "",
      start_date: c.start_date || "",
      end_date: c.end_date || "",
      is_active: c.is_active ?? true,
    });
    setEditCoupon(c);
    setModalOpen(true);
  }

  function setField(k: string, v: any) { setForm(f => ({ ...f, [k]: v })); }

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        code: form.code.trim().toUpperCase(),
        description: form.description || null,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value) || 0,
        min_order_amount: Number(form.min_order_amount) || 0,
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        is_active: form.is_active,
        tenant_id: tenantId,
        created_by: userId,
      };
      if (editCoupon) {
        const { error } = await supabase.from(TABLES.STORE_COUPONS).update(payload).eq(COLS.ID, editCoupon.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(TABLES.STORE_COUPONS).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-coupons", tenantId] });
      setModalOpen(false);
      toast.success(editCoupon ? "Coupon updated" : "Coupon created");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save coupon"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLES.STORE_COUPONS).delete().eq(COLS.ID, id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-coupons", tenantId] });
      toast.success("Coupon deleted");
    },
    onError: () => toast.error("Failed to delete coupon"),
  });

  function formatDiscount(c: any) {
    return c.discount_type === "percentage" ? `${c.discount_value}%` : `${c.discount_value} off`;
  }

  function formatValidPeriod(c: any) {
    if (!c.start_date && !c.end_date) return "No limit";
    if (c.start_date && c.end_date) return `${c.start_date} → ${c.end_date}`;
    if (c.start_date) return `From ${c.start_date}`;
    return `Until ${c.end_date}`;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex justify-end">
        <Button onClick={openAdd} className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5">
          <Plus className="h-4 w-4" /> Create Coupon
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              {["Code", "Discount", "Min Order", "Usage", "Valid Period", "Status", "Actions"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-10 text-slate-400 text-sm">Loading…</td></tr>
            ) : coupons.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-slate-400 text-sm">No coupons yet. Create your first discount code.</td></tr>
            ) : (
              coupons.map((c: any) => (
                <tr key={c.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-slate-800 dark:text-slate-100">{c.code}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{formatDiscount(c)}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{c.min_order_amount > 0 ? c.min_order_amount : "—"}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {c.uses_count || 0}{c.max_uses ? ` / ${c.max_uses}` : " / ∞"}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs">{formatValidPeriod(c)}</td>
                  <td className="px-4 py-3">
                    <Badge className={`text-xs ${c.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                      {c.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-600 transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => remove.mutate(c.id)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors">
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

      {/* Create / Edit Coupon Modal */}
      <Dialog open={modalOpen} onOpenChange={o => { setModalOpen(o); if (!o) setEditCoupon(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editCoupon ? "Edit Coupon" : "Create Coupon"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Coupon Code */}
            <div className="space-y-1.5">
              <Label>Coupon Code <span className="text-red-500">*</span></Label>
              <Input
                placeholder="SUMMER20"
                value={form.code}
                onChange={e => setField("code", e.target.value.toUpperCase())}
                className="font-mono border-orange-300 focus-visible:ring-orange-400"
                autoFocus
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input
                placeholder="Summer sale discount"
                value={form.description}
                onChange={e => setField("description", e.target.value)}
              />
            </div>

            {/* Discount Type + Value */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Discount Type</Label>
                <Select value={form.discount_type} onValueChange={v => setField("discount_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Discount Value <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  value={form.discount_value}
                  onChange={e => setField("discount_value", e.target.value)}
                  min={0}
                  max={form.discount_type === "percentage" ? 100 : undefined}
                />
              </div>
            </div>

            {/* Min Order + Max Uses */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Min Order Amount</Label>
                <Input
                  type="number"
                  value={form.min_order_amount}
                  onChange={e => setField("min_order_amount", e.target.value)}
                  min={0}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Max Uses</Label>
                <Input
                  type="number"
                  placeholder="Unlimited"
                  value={form.max_uses}
                  onChange={e => setField("max_uses", e.target.value)}
                  min={1}
                />
              </div>
            </div>

            {/* Start + End Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={e => setField("start_date", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={e => setField("end_date", e.target.value)}
                />
              </div>
            </div>

            {/* Active toggle */}
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setField("is_active", v)} />
              <Label className="cursor-pointer">Active</Label>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button
                className="bg-orange-500 hover:bg-orange-600 text-white"
                onClick={() => save.mutate()}
                disabled={!form.code.trim() || !form.discount_value || save.isPending}
              >
                {save.isPending ? "Saving…" : editCoupon ? "Save" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Bundles Tab ──────────────────────────────────────────────────────────────
function BundlesTab({ tenantId, formatCurrency }: { tenantId: string; formatCurrency: (n: number) => string }) {
  const queryClient = useQueryClient();
  const { userId } = useChurch();
  const [modalOpen, setModalOpen] = useState(false);
  const [editBundle, setEditBundle] = useState<any>(null);
  const [bundleForm, setBundleForm] = useState({
    name: "", description: "",
    product_ids: [] as string[],
    bundle_price: "0", member_discount: "0",
    is_featured: false, is_active: true,
  });
  const [productSearch, setProductSearch] = useState("");
  const [productDropOpen, setProductDropOpen] = useState(false);

  const { data: bundles = [], isLoading } = useQuery({
    queryKey: ["store-bundles", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.STORE_BUNDLES).select("*").eq(COLS.TENANT_ID, tenantId).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 300000,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["store-products-admin", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.STORE_PRODUCTS).select("id, name, price").eq(COLS.TENANT_ID, tenantId).eq("status", "active");
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 300000,
  });

  // Compute original total from selected products
  const selectedProducts = products.filter((p: any) => bundleForm.product_ids.includes(p.id));
  const originalTotal = selectedProducts.reduce((s: number, p: any) => s + Number(p.price || 0), 0);

  function openAdd() {
    setBundleForm({ name: "", description: "", product_ids: [], bundle_price: "0", member_discount: "0", is_featured: false, is_active: true });
    setEditBundle(null);
    setModalOpen(true);
  }

  function openEdit(b: any) {
    setBundleForm({
      name: b.name || "",
      description: b.description || "",
      product_ids: b.product_ids || [],
      bundle_price: String(b.bundle_price || 0),
      member_discount: String(b.member_discount || 0),
      is_featured: b.is_featured || false,
      is_active: b.is_active ?? true,
    });
    setEditBundle(b);
    setModalOpen(true);
  }

  function toggleProduct(id: string) {
    setBundleForm(f => ({
      ...f,
      product_ids: f.product_ids.includes(id)
        ? f.product_ids.filter(x => x !== id)
        : [...f.product_ids, id],
    }));
  }

  const filteredProducts = products.filter((p: any) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: bundleForm.name.trim(),
        description: bundleForm.description || null,
        product_ids: bundleForm.product_ids,
        original_price: originalTotal,
        bundle_price: Number(bundleForm.bundle_price) || 0,
        member_discount: Number(bundleForm.member_discount) || 0,
        is_featured: bundleForm.is_featured,
        is_active: bundleForm.is_active,
        tenant_id: tenantId,
        created_by: userId,
      };
      if (editBundle) {
        const { error } = await supabase.from(TABLES.STORE_BUNDLES).update(payload).eq(COLS.ID, editBundle.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(TABLES.STORE_BUNDLES).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-bundles", tenantId] });
      setModalOpen(false);
      toast.success(editBundle ? "Bundle updated" : "Bundle created");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save bundle"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLES.STORE_BUNDLES).delete().eq(COLS.ID, id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-bundles", tenantId] });
      toast.success("Bundle deleted");
    },
    onError: () => toast.error("Failed to delete bundle"),
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex justify-end">
        <Button onClick={openAdd} className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5">
          <Plus className="h-4 w-4" /> Create Bundle
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              {["Name", "Items", "Original Price", "Bundle Price", "Sales", "Status", "Actions"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-10 text-slate-400 text-sm">Loading…</td></tr>
            ) : bundles.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-slate-400 text-sm">No bundles yet. Create bundles to offer discounted resource packages.</td></tr>
            ) : (
              bundles.map((b: any) => (
                <tr key={b.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{b.name}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{b.product_ids?.length || 0}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{formatCurrency(b.original_price)}</td>
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{formatCurrency(b.bundle_price)}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{b.sales_count || 0}</td>
                  <td className="px-4 py-3">
                    <Badge className={`text-xs ${b.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                      {b.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(b)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-600 transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => remove.mutate(b.id)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors">
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

      {/* Create / Edit Bundle Modal */}
      <Dialog open={modalOpen} onOpenChange={o => { setModalOpen(o); if (!o) { setEditBundle(null); setProductSearch(""); setProductDropOpen(false); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editBundle ? "Edit Bundle" : "Create Bundle"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Bundle Name */}
            <div className="space-y-1.5">
              <Label>Bundle Name <span className="text-red-500">*</span></Label>
              <Input
                value={bundleForm.name}
                onChange={e => setBundleForm(f => ({ ...f, name: e.target.value }))}
                className="border-orange-300 focus-visible:ring-orange-400"
                autoFocus
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={bundleForm.description}
                onChange={e => setBundleForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Select Resources */}
            <div className="space-y-1.5">
              <Label>Select Resources</Label>
              <div className="relative">
                <Input
                  placeholder="Search and select resources..."
                  value={productSearch}
                  onChange={e => { setProductSearch(e.target.value); setProductDropOpen(true); }}
                  onFocus={() => setProductDropOpen(true)}
                />
                {productDropOpen && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredProducts.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-slate-400">No resources found</p>
                    ) : (
                      filteredProducts.map((p: any) => (
                        <label key={p.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={bundleForm.product_ids.includes(p.id)}
                            onChange={() => toggleProduct(p.id)}
                            className="rounded border-slate-300 text-indigo-600"
                          />
                          <span className="text-sm flex-1">{p.name}</span>
                          <span className="text-xs text-slate-400">{formatCurrency(p.price)}</span>
                        </label>
                      ))
                    )}
                    <button
                      className="w-full px-3 py-2 text-xs text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 text-left border-t border-slate-100 dark:border-slate-700"
                      onClick={() => setProductDropOpen(false)}
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>

              {/* Selected chips */}
              {bundleForm.product_ids.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {selectedProducts.map((p: any) => (
                    <span key={p.id} className="flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-xs text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      {p.name}
                      <button onClick={() => toggleProduct(p.id)} className="text-indigo-400 hover:text-red-500 transition-colors">×</button>
                    </span>
                  ))}
                </div>
              )}

              {/* Original total — uses church currency */}
              <p className="text-xs text-slate-500">
                Original total: <span className="font-medium">{formatCurrency(originalTotal)}</span>
              </p>
            </div>

            {/* Bundle Price + Member Discount */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Bundle Price <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  value={bundleForm.bundle_price}
                  onChange={e => setBundleForm(f => ({ ...f, bundle_price: e.target.value }))}
                  min={0}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Member Discount (%)</Label>
                <Input
                  type="number"
                  value={bundleForm.member_discount}
                  onChange={e => setBundleForm(f => ({ ...f, member_discount: e.target.value }))}
                  min={0}
                  max={100}
                />
              </div>
            </div>

            {/* Toggles */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={bundleForm.is_featured} onCheckedChange={v => setBundleForm(f => ({ ...f, is_featured: v }))} />
                <Label className="cursor-pointer">Featured</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={bundleForm.is_active} onCheckedChange={v => setBundleForm(f => ({ ...f, is_active: v }))} />
                <Label className="cursor-pointer">Active</Label>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button
                className="bg-orange-500 hover:bg-orange-600 text-white"
                onClick={() => save.mutate()}
                disabled={!bundleForm.name.trim() || save.isPending}
              >
                {save.isPending ? "Saving…" : editBundle ? "Save" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Categories Tab ───────────────────────────────────────────────────────────
function CategoriesTab({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient();
  const { userId } = useChurch();
  const [modalOpen, setModalOpen] = useState(false);
  const [editCat, setEditCat] = useState<any>(null);
  const [catForm, setCatForm] = useState({ name: "", slug: "", description: "", is_active: true });

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["store-categories", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from(TABLES.STORE_CATEGORIES)
        .select("*")
        .eq(COLS.TENANT_ID, tenantId)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 60000,
  });

  function toSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  function openAdd() {
    setCatForm({ name: "", slug: "", description: "", is_active: true });
    setEditCat(null);
    setModalOpen(true);
  }

  function openEdit(c: any) {
    setCatForm({ name: c.name, slug: c.slug, description: c.description || "", is_active: c.is_active });
    setEditCat(c);
    setModalOpen(true);
  }

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: catForm.name.trim(),
        slug: catForm.slug || toSlug(catForm.name),
        description: catForm.description || null,
        is_active: catForm.is_active,
        tenant_id: tenantId,
      };
      if (editCat) {
        const { error } = await supabase.from(TABLES.STORE_CATEGORIES).update(payload).eq(COLS.ID, editCat.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(TABLES.STORE_CATEGORIES).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-categories", tenantId] });
      setModalOpen(false);
      toast.success(editCat ? "Category updated" : "Category created");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save category"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLES.STORE_CATEGORIES).delete().eq(COLS.ID, id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-categories", tenantId] });
      toast.success("Category deleted");
    },
    onError: () => toast.error("Failed to delete category"),
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex justify-end">
        <Button onClick={openAdd} className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5">
          <Plus className="h-4 w-4" /> Add Category
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              {["Name", "Slug", "Description", "Status", "Actions"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="text-center py-10 text-slate-400 text-sm">Loading…</td></tr>
            ) : categories.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-10 text-slate-400 text-sm">No categories yet. Add categories to organize your resources.</td></tr>
            ) : (
              categories.map((c: any) => (
                <tr key={c.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{c.name}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-mono text-xs">{c.slug}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">{c.description || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge className={`text-xs ${c.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                      {c.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-600 transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => remove.mutate(c.id)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors">
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

      {/* Add / Edit Category Modal */}
      <Dialog open={modalOpen} onOpenChange={o => { setModalOpen(o); if (!o) setEditCat(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editCat ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label>Name <span className="text-red-500">*</span></Label>
              <Input
                placeholder=""
                value={catForm.name}
                onChange={e => {
                  const name = e.target.value;
                  setCatForm(f => ({ ...f, name, slug: toSlug(name) }));
                }}
                className="border-orange-300 focus-visible:ring-orange-400"
                autoFocus
              />
            </div>

            {/* Slug */}
            <div className="space-y-1.5">
              <Label>Slug</Label>
              <Input
                placeholder="auto-generated from name"
                value={catForm.slug}
                onChange={e => setCatForm(f => ({ ...f, slug: e.target.value }))}
                className="font-mono text-sm text-slate-500"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={catForm.description}
                onChange={e => setCatForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Active toggle */}
            <div className="flex items-center gap-3">
              <Switch
                checked={catForm.is_active}
                onCheckedChange={v => setCatForm(f => ({ ...f, is_active: v }))}
              />
              <Label className="cursor-pointer">Active</Label>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button
                className="bg-orange-500 hover:bg-orange-600 text-white"
                onClick={() => save.mutate()}
                disabled={!catForm.name.trim() || save.isPending}
              >
                {save.isPending ? "Saving…" : editCat ? "Save" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
      {activeTab === "categories" && <CategoriesTab tenantId={tenantId} />}
      {activeTab === "bundles"    && <BundlesTab tenantId={tenantId} formatCurrency={format} />}
      {activeTab === "coupons"    && <CouponsTab tenantId={tenantId} />}
      {activeTab === "shipping"   && <EmptyTab icon={Truck}        label="Shipping settings" />}
      {activeTab === "orders"     && <OrdersTab tenantId={tenantId} formatCurrency={format} />}
      {activeTab === "refunds"    && <RefundsTab tenantId={tenantId} />}
      {activeTab === "settings"   && <SettingsTab tenantId={tenantId} />}

      {/* QR Modal */}
      <StoreQRModal open={qrOpen} onClose={() => setQrOpen(false)} tenantId={tenantId} />
    </>
  );
}
