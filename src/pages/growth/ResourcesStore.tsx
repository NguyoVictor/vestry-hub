import { useState, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { useCurrency } from "@/hooks/useCurrency";
import { TABLES, COLS } from "@/lib/schema";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import {
  Package, Tag, ShoppingCart, Star, DollarSign, TrendingUp,
  Users, QrCode, Copy, Download, Share2, CheckCircle2,
  LayoutDashboard, BookOpen, FolderOpen, Layers, Ticket,
  Truck, ClipboardList, RotateCcw, Settings, AlertCircle,
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

      {activeTab === "resources"  && <EmptyTab icon={BookOpen}     label="Resources" />}
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
