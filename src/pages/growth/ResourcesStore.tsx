import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable, Column } from "@/components/shared/DataTable";
import { ProductCard, Product } from "@/components/growth/ProductCard";
import { toast } from "sonner";
import { format } from "date-fns";
import { ShoppingBag, Plus, ShoppingCart, Package, X, Minus, Search, TrendingUp } from "lucide-react";
import { formatCurrencyFull } from "@/lib/format";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const CHART_COLORS = ["#4F46E5", "#10B981", "#7C3AED", "#F59E0B", "#EF4444", "#06B6D4", "#EC4899", "#84CC16"];
const CATEGORIES = ["books", "audio", "video", "study_materials", "merchandise", "digital_download", "other"];

interface CartItem { product: Product; quantity: number; }

const defaultProductForm = {
  name: "", category: "books", description: "", product_type: "physical" as "physical" | "digital",
  price: "", compare_at_price: "", sku: "", stock_quantity: "0", status: "active",
  digital_file_url: "", image_urls: [] as string[],
};

export default function ResourcesStore() {
  const { tenantId, userId, currency } = useChurch();
  const queryClient = useQueryClient();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(0);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [productSheet, setProductSheet] = useState(false);
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState(defaultProductForm);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [orderDetailId, setOrderDetailId] = useState<string | null>(null);
  const [discountCode, setDiscountCode] = useState("");
  const [customerInfo, setCustomerInfo] = useState({ name: "", email: "", phone: "", delivery_method: "pickup", delivery_address: "" });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["store-products", tenantId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("store_products").select("*").eq("church_id", tenantId).eq("status", "active").order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Product[];
    },
    enabled: !!tenantId,
  });

  const { data: allProducts = [] } = useQuery({
    queryKey: ["store-products-admin", tenantId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("store_products").select("*").eq("church_id", tenantId).order("created_at", { ascending: false });
      return (data || []) as Product[];
    },
    enabled: !!tenantId,
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["store-orders", tenantId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("store_orders").select("*, order_items(*)").eq("church_id", tenantId).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: selectedOrder } = useQuery({
    queryKey: ["store-order-detail", orderDetailId],
    queryFn: async () => {
      if (!orderDetailId) return null;
      const { data } = await (supabase as any).from("store_orders").select("*, order_items(*)").eq("id", orderDetailId).single();
      return data;
    },
    enabled: !!orderDetailId,
  });

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || p.category === categoryFilter;
    return matchSearch && matchCat;
  }).sort((a, b) => {
    if (sortBy === "price_asc") return a.price - b.price;
    if (sortBy === "price_desc") return b.price - a.price;
    if (sortBy === "best_selling") return (b.sales_count || 0) - (a.sales_count || 0);
    return 0;
  });

  const cartTotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  // Sales analytics
  const totalRevenueMonth = orders.filter((o: any) => {
    const d = new Date(o.created_at); const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && o.payment_status === "paid";
  }).reduce((s: number, o: any) => s + Number(o.total), 0);

  const totalRevenueYear = orders.filter((o: any) =>
    new Date(o.created_at).getFullYear() === new Date().getFullYear() && o.payment_status === "paid"
  ).reduce((s: number, o: any) => s + Number(o.total), 0);

  const revenueByMonth = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(new Date().getFullYear(), i, 1);
    return {
      month: format(d, "MMM"),
      revenue: orders.filter((o: any) => new Date(o.created_at).getMonth() === i && new Date(o.created_at).getFullYear() === new Date().getFullYear() && o.payment_status === "paid").reduce((s: number, o: any) => s + Number(o.total), 0),
    };
  });

  const topProducts = (() => {
    const map: Record<string, { name: string; units: number; revenue: number }> = {};
    orders.forEach((o: any) => o.order_items?.forEach((item: any) => {
      if (!map[item.product_id]) map[item.product_id] = { name: item.product_name, units: 0, revenue: 0 };
      map[item.product_id].units += item.quantity;
      map[item.product_id].revenue += Number(item.total_price);
    }));
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  })();

  const orderStatusBreakdown = ["pending", "processing", "fulfilled", "picked_up", "delivered", "cancelled", "refunded"]
    .map(s => ({ name: s.replace(/_/g, " "), value: orders.filter((o: any) => o.order_status === s).length }))
    .filter(s => s.value > 0);

  const salesByCategory = CATEGORIES.map(cat => ({
    name: cat.replace(/_/g, " "),
    value: orders.reduce((s: number, o: any) =>
      s + (o.order_items?.filter((i: any) => allProducts.find((p: any) => p.id === i.product_id)?.category === cat)
        .reduce((ss: number, i: any) => ss + Number(i.total_price), 0) || 0), 0),
  })).filter(c => c.value > 0);

  const addToCart = (product: Product) => {
    setCart(c => {
      const existing = c.find(i => i.product.id === product.id);
      if (existing) return c.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...c, { product, quantity: 1 }];
    });
    setCartOpen(true);
  };

  const updateQty = (id: string, delta: number) =>
    setCart(c => c.map(i => i.product.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter(i => i.quantity > 0));

  const placeOrder = useMutation({
    mutationFn: async () => {
      const { data: order, error } = await (supabase as any).from("store_orders").insert({
        church_id: tenantId, order_number: null,
        customer_name: customerInfo.name, customer_email: customerInfo.email, customer_phone: customerInfo.phone,
        delivery_method: customerInfo.delivery_method, delivery_address: customerInfo.delivery_address,
        subtotal: cartTotal, total: cartTotal, currency: currency || "KES",
        payment_method: "cash", payment_status: "pending", order_status: "pending",
      }).select().single();
      if (error) throw error;
      await (supabase as any).from("order_items").insert(cart.map(i => ({
        order_id: order.id, product_id: i.product.id, product_name: i.product.name,
        product_type: i.product.product_type, quantity: i.quantity,
        unit_price: i.product.price, total_price: i.product.price * i.quantity,
      })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-orders", tenantId] });
      setCart([]); setCartOpen(false); setCheckoutOpen(false); setCheckoutStep(0);
      toast.success("Order placed successfully!");
    },
    onError: () => toast.error("Failed to place order"),
  });

  const saveProduct = useMutation({
    mutationFn: async () => {
      const payload = { ...productForm, church_id: tenantId, created_by: userId, price: Number(productForm.price), compare_at_price: productForm.compare_at_price ? Number(productForm.compare_at_price) : null, stock_quantity: Number(productForm.stock_quantity), currency: currency || "KES" };
      if (editProductId) { const { error } = await (supabase as any).from("store_products").update(payload).eq("id", editProductId); if (error) throw error; }
      else { const { error } = await (supabase as any).from("store_products").insert(payload); if (error) throw error; }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-products", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["store-products-admin", tenantId] });
      setProductSheet(false); setProductForm(defaultProductForm); setEditProductId(null);
      toast.success(editProductId ? "Product updated" : "Product added");
    },
    onError: () => toast.error("Failed to save product"),
  });

  const updateOrderStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any).from("store_orders").update({ order_status: status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["store-orders", tenantId] }); toast.success("Order status updated"); },
    onError: () => toast.error("Failed to update order"),
  });

  const productColumns: Column<any>[] = [
    { key: "name", header: "Product", render: r => <div className="flex items-center gap-2"><div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-700 overflow-hidden shrink-0">{r.image_urls?.[0] ? <img src={r.image_urls[0]} className="w-full h-full object-cover" alt="" /> : <Package className="h-4 w-4 m-2 text-slate-400" />}</div><span className="font-medium text-sm">{r.name}</span></div> },
    { key: "category", header: "Category", render: r => <Badge variant="secondary" className="capitalize text-xs">{r.category?.replace(/_/g, " ")}</Badge> },
    { key: "price", header: "Price", render: r => <span className="text-sm font-medium">{formatCurrencyFull(r.price, r.currency)}</span> },
    { key: "stock_quantity", header: "Stock", render: r => <span className="text-sm">{r.product_type === "digital" ? "Digital" : r.stock_quantity}</span> },
    { key: "sales_count", header: "Sales", render: r => <span className="text-sm">{r.sales_count || 0}</span> },
    { key: "status", header: "Status", render: r => <Badge className={`text-xs capitalize ${r.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{r.status}</Badge> },
    { key: "actions", header: "Actions", render: r => <Button size="sm" variant="ghost" onClick={() => { setProductForm({ ...defaultProductForm, ...r, price: String(r.price), compare_at_price: String(r.compare_at_price || ""), stock_quantity: String(r.stock_quantity) }); setEditProductId(r.id); setProductSheet(true); }}>Edit</Button> },
  ];

  const orderColumns: Column<any>[] = [
    { key: "order_number", header: "Order #", render: r => <span className="font-mono text-sm">{r.order_number}</span> },
    { key: "customer_name", header: "Customer", render: r => <span className="text-sm">{r.customer_name}</span> },
    { key: "total", header: "Total", render: r => <span className="text-sm font-medium">{formatCurrencyFull(r.total, r.currency)}</span> },
    { key: "payment_status", header: "Payment", render: r => <Badge className={`text-xs capitalize ${r.payment_status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{r.payment_status}</Badge> },
    { key: "order_status", header: "Status", render: r => (
      <Select value={r.order_status} onValueChange={v => updateOrderStatus.mutate({ id: r.id, status: v })}>
        <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
        <SelectContent>{["pending","processing","fulfilled","picked_up","delivered","cancelled","refunded"].map(s => <SelectItem key={s} value={s} className="capitalize text-xs">{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
      </Select>
    )},
    { key: "created_at", header: "Date", render: r => <span className="text-sm">{format(new Date(r.created_at), "dd MMM yyyy")}</span> },
    { key: "detail", header: "", render: r => <Button size="sm" variant="ghost" onClick={() => setOrderDetailId(r.id)}>View</Button> },
  ];

  return (
    <>
      <Helmet><title>Resources Store — Vestry</title></Helmet>
      <PageHeader
        title="Resources Store"
        subtitle="Sell books, media and resources to your congregation"
        action={
          <div className="flex gap-2">
            {cartCount > 0 && (
              <Button variant="outline" onClick={() => setCartOpen(true)} className="relative">
                <ShoppingCart className="h-4 w-4 mr-1" />Cart
                <span className="absolute -top-1.5 -right-1.5 bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{cartCount}</span>
              </Button>
            )}
            <Button variant="outline" onClick={() => setOrderDetailId(null)}>View Orders</Button>
            <Button onClick={() => { setProductForm(defaultProductForm); setEditProductId(null); setProductSheet(true); }}><Plus className="h-4 w-4 mr-1" />Add Product</Button>
          </div>
        }
      />

      <Tabs defaultValue="store">
        <TabsList className="mb-4">
          <TabsTrigger value="store">Store</TabsTrigger>
          <TabsTrigger value="admin">Admin</TabsTrigger>
        </TabsList>

        <TabsContent value="store">
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Sort by" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price_asc">Price: Low to High</SelectItem>
                <SelectItem value="price_desc">Price: High to Low</SelectItem>
                <SelectItem value="best_selling">Best Selling</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2 flex-wrap">
              {["all", ...CATEGORIES].map(c => (
                <button key={c} onClick={() => setCategoryFilter(c)} className={`px-3 py-1.5 rounded-full text-sm border transition-colors capitalize ${categoryFilter === c ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-400"}`}>
                  {c === "all" ? "All" : c.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ShoppingBag className="h-10 w-10 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">No products found</p>
              <Button className="mt-4" onClick={() => setProductSheet(true)}><Plus className="h-4 w-4 mr-1" />Add Product</Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map(p => <ProductCard key={p.id} product={p} onAddToCart={() => addToCart(p)} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="admin">
          <Tabs defaultValue="products">
            <TabsList className="mb-4">
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="analytics">Sales Analytics</TabsTrigger>
            </TabsList>
            <TabsContent value="products">
              <Card><CardContent className="p-0">
                <DataTable data={allProducts} columns={productColumns} loading={false} getRowId={r => r.id}
                  emptyIcon={<Package className="h-8 w-8 text-slate-300" />} emptyTitle="No products yet"
                  emptyCta={<Button onClick={() => setProductSheet(true)}><Plus className="h-4 w-4 mr-1" />Add Product</Button>}
                />
              </CardContent></Card>
            </TabsContent>
            <TabsContent value="orders">
              <Card><CardContent className="p-0">
                <DataTable data={orders} columns={orderColumns} loading={ordersLoading} getRowId={r => r.id}
                  emptyIcon={<ShoppingBag className="h-8 w-8 text-slate-300" />} emptyTitle="No orders yet"
                />
              </CardContent></Card>
            </TabsContent>
            <TabsContent value="analytics" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: "Revenue This Month", value: formatCurrencyFull(totalRevenueMonth, currency || "KES"), icon: TrendingUp, color: "emerald" },
                  { label: "Revenue This Year", value: formatCurrencyFull(totalRevenueYear, currency || "KES"), icon: TrendingUp, color: "indigo" },
                ].map(({ label, value, icon: Icon, color }) => (
                  <Card key={label}><CardContent className="p-5 flex items-center gap-4">
                    <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg bg-${color}-100 dark:bg-${color}-900/30 shrink-0`}>
                      <Icon className={`h-5 w-5 text-${color}-600`} />
                    </div>
                    <div><p className="text-2xl font-bold">{value}</p><p className="text-sm text-muted-foreground">{label}</p></div>
                  </CardContent></Card>
                ))}
              </div>
              <Card>
                <CardHeader><CardTitle>Revenue Over Time</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={revenueByMonth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} formatter={(v: number) => [formatCurrencyFull(v, currency || "KES"), "Revenue"]} />
                      <Area type="monotone" dataKey="revenue" stroke="#4F46E5" fill="#4F46E520" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle>Top Selling Products</CardTitle></CardHeader>
                  <CardContent>
                    {topProducts.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">No sales yet</p> : (
                      <div className="space-y-2">
                        {topProducts.map((p, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span className="truncate flex-1">{p.name}</span>
                            <div className="flex gap-4 text-muted-foreground shrink-0 ml-2">
                              <span>{p.units} units</span>
                              <span className="font-medium text-foreground">{formatCurrencyFull(p.revenue, currency || "KES")}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Sales by Category</CardTitle></CardHeader>
                  <CardContent>
                    {salesByCategory.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">No data yet</p> : (
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={salesByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                            {salesByCategory.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v: number) => [formatCurrencyFull(v, currency || "KES")]} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader><CardTitle>Order Status Breakdown</CardTitle></CardHeader>
                <CardContent>
                  {orderStatusBreakdown.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">No orders yet</p> : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={orderStatusBreakdown}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                        <Bar dataKey="value" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* Cart Sidebar */}
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent className="w-full sm:max-w-sm">
          <SheetHeader><SheetTitle className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" />Your Cart ({cartCount} items)</SheetTitle></SheetHeader>
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto mt-4 space-y-3">
              {cart.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Your cart is empty</p> : cart.map(item => (
                <div key={item.product.id} className="flex items-center gap-3 p-2 border rounded-lg">
                  <div className="w-12 h-12 rounded bg-slate-100 dark:bg-slate-700 overflow-hidden shrink-0">
                    {item.product.image_urls?.[0] ? <img src={item.product.image_urls[0]} className="w-full h-full object-cover" alt="" /> : <Package className="h-5 w-5 m-3.5 text-slate-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrencyFull(item.product.price, item.product.currency)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQty(item.product.id, -1)} className="w-6 h-6 rounded border flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700"><Minus className="h-3 w-3" /></button>
                    <span className="w-6 text-center text-sm">{item.quantity}</span>
                    <button onClick={() => updateQty(item.product.id, 1)} className="w-6 h-6 rounded border flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700"><Plus className="h-3 w-3" /></button>
                    <button onClick={() => setCart(c => c.filter(i => i.product.id !== item.product.id))} className="ml-1 text-red-400 hover:text-red-600"><X className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
            {cart.length > 0 && (
              <div className="border-t pt-4 mt-4 space-y-3">
                <div className="flex justify-between font-semibold"><span>Subtotal</span><span>{formatCurrencyFull(cartTotal, currency || "KES")}</span></div>
                <Button className="w-full" onClick={() => { setCheckoutOpen(true); setCheckoutStep(1); }}>Checkout</Button>
                <Button variant="ghost" className="w-full" onClick={() => setCartOpen(false)}>Continue Shopping</Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Checkout Dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Checkout — Step {checkoutStep} of 3</DialogTitle></DialogHeader>
          {checkoutStep === 1 && (
            <div className="space-y-3">
              <h3 className="font-medium">Order Summary</h3>
              {cart.map(i => <div key={i.product.id} className="flex justify-between text-sm"><span>{i.product.name} x{i.quantity}</span><span>{formatCurrencyFull(i.product.price * i.quantity, currency || "KES")}</span></div>)}
              <div className="border-t pt-2 flex justify-between font-semibold"><span>Total</span><span>{formatCurrencyFull(cartTotal, currency || "KES")}</span></div>
              <div className="flex gap-2">
                <Input placeholder="Discount code (optional)" value={discountCode} onChange={e => setDiscountCode(e.target.value)} />
                <Button variant="outline" type="button">Apply</Button>
              </div>
              <Button className="w-full" onClick={() => setCheckoutStep(2)}>Proceed to Customer Info</Button>
            </div>
          )}
          {checkoutStep === 2 && (
            <div className="space-y-3">
              <div className="space-y-1.5"><Label>Name *</Label><Input value={customerInfo.name} onChange={e => setCustomerInfo(f => ({ ...f, name: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={customerInfo.email} onChange={e => setCustomerInfo(f => ({ ...f, email: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Phone</Label><Input value={customerInfo.phone} onChange={e => setCustomerInfo(f => ({ ...f, phone: e.target.value }))} /></div>
              <div className="space-y-1.5">
                <Label>Delivery Method</Label>
                <Select value={customerInfo.delivery_method} onValueChange={v => setCustomerInfo(f => ({ ...f, delivery_method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pickup">Pick-up at Church</SelectItem>
                    <SelectItem value="delivery">Delivery</SelectItem>
                    <SelectItem value="digital_download">Digital Download</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {customerInfo.delivery_method === "delivery" && <div className="space-y-1.5"><Label>Delivery Address</Label><Textarea value={customerInfo.delivery_address} onChange={e => setCustomerInfo(f => ({ ...f, delivery_address: e.target.value }))} rows={2} /></div>}
              <Button className="w-full" onClick={() => setCheckoutStep(3)} disabled={!customerInfo.name}>Proceed to Payment</Button>
            </div>
          )}
          {checkoutStep === 3 && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm text-center text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Cash Payment</p>
                <p>Bring payment on collection day. Your order will be reserved.</p>
              </div>
              <div className="border-t pt-3 space-y-1 text-sm">
                {cart.map(i => <div key={i.product.id} className="flex justify-between"><span>{i.product.name} x{i.quantity}</span><span>{formatCurrencyFull(i.product.price * i.quantity, currency || "KES")}</span></div>)}
                <div className="flex justify-between font-semibold pt-2 border-t"><span>Total</span><span>{formatCurrencyFull(cartTotal, currency || "KES")}</span></div>
              </div>
              <Button className="w-full" onClick={() => placeOrder.mutate()} disabled={placeOrder.isPending}>
                {placeOrder.isPending ? "Placing Order..." : "Place Order"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Order Detail Sheet */}
      <Sheet open={!!orderDetailId} onOpenChange={o => { if (!o) setOrderDetailId(null); }}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          <SheetHeader><SheetTitle>Order {(selectedOrder as any)?.order_number}</SheetTitle></SheetHeader>
          {selectedOrder && (
            <div className="mt-6 space-y-5">
              <div className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">Customer:</span> <strong>{(selectedOrder as any).customer_name}</strong></p>
                {(selectedOrder as any).customer_email && <p><span className="text-muted-foreground">Email:</span> {(selectedOrder as any).customer_email}</p>}
                {(selectedOrder as any).customer_phone && <p><span className="text-muted-foreground">Phone:</span> {(selectedOrder as any).customer_phone}</p>}
              </div>
              <div className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">Delivery:</span> <span className="capitalize">{(selectedOrder as any).delivery_method?.replace(/_/g, " ")}</span></p>
                {(selectedOrder as any).delivery_address && <p><span className="text-muted-foreground">Address:</span> {(selectedOrder as any).delivery_address}</p>}
              </div>
              <div className="border rounded-lg overflow-hidden">
                {(selectedOrder as any).order_items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center p-3 border-b last:border-0 text-sm">
                    <div><p className="font-medium">{item.product_name}</p><p className="text-xs text-muted-foreground">Qty: {item.quantity}</p></div>
                    <span className="font-medium">{formatCurrencyFull(item.total_price, (selectedOrder as any).currency)}</span>
                  </div>
                ))}
                <div className="p-3 bg-slate-50 dark:bg-slate-800 flex justify-between font-semibold text-sm">
                  <span>Total</span><span>{formatCurrencyFull((selectedOrder as any).total, (selectedOrder as any).currency)}</span>
                </div>
              </div>
              <div className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">Payment:</span> <span className="capitalize">{(selectedOrder as any).payment_method}</span></p>
                <Badge className={`text-xs capitalize ${(selectedOrder as any).payment_status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{(selectedOrder as any).payment_status}</Badge>
              </div>
              <div className="space-y-1.5">
                <Label>Update Order Status</Label>
                <Select value={(selectedOrder as any).order_status} onValueChange={v => updateOrderStatus.mutate({ id: (selectedOrder as any).id, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["pending","processing","fulfilled","picked_up","delivered","cancelled","refunded"].map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button variant="outline" className="w-full" onClick={() => toast.info("Receipt email feature requires Edge Function setup")}>Send Receipt</Button>
              <Button variant="destructive" className="w-full" onClick={() => toast.info("Refund requires Stripe Edge Function setup")}>Refund Order</Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Add/Edit Product Sheet */}
      <Sheet open={productSheet} onOpenChange={setProductSheet}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          <SheetHeader><SheetTitle>{editProductId ? "Edit Product" : "Add Product"}</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-6">
            <div className="space-y-1.5"><Label>Product Name *</Label><Input value={productForm.name} onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))} maxLength={150} /></div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={productForm.category} onValueChange={v => setProductForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Description</Label><Textarea value={productForm.description} onChange={e => setProductForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div>
            <div className="space-y-1.5">
              <Label>Product Type</Label>
              <Select value={productForm.product_type} onValueChange={v => setProductForm(f => ({ ...f, product_type: v as "physical" | "digital" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="physical">Physical</SelectItem><SelectItem value="digital">Digital</SelectItem></SelectContent>
              </Select>
            </div>
            {productForm.product_type === "physical"
              ? <div className="space-y-1.5"><Label>Stock Quantity</Label><Input type="number" min="0" value={productForm.stock_quantity} onChange={e => setProductForm(f => ({ ...f, stock_quantity: e.target.value }))} /></div>
              : <div className="space-y-1.5"><Label>Digital File URL</Label><Input value={productForm.digital_file_url} onChange={e => setProductForm(f => ({ ...f, digital_file_url: e.target.value }))} placeholder="Supabase Storage URL" /></div>
            }
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Price *</Label><Input type="number" min="0" step="0.01" value={productForm.price} onChange={e => setProductForm(f => ({ ...f, price: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Compare at Price</Label><Input type="number" min="0" step="0.01" value={productForm.compare_at_price} onChange={e => setProductForm(f => ({ ...f, compare_at_price: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5"><Label>SKU</Label><Input value={productForm.sku} onChange={e => setProductForm(f => ({ ...f, sku: e.target.value }))} /></div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={productForm.status} onValueChange={v => setProductForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="draft">Draft</SelectItem><SelectItem value="out_of_stock">Out of Stock</SelectItem></SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={() => saveProduct.mutate()} disabled={!productForm.name || !productForm.price || saveProduct.isPending}>
              {saveProduct.isPending ? "Saving..." : editProductId ? "Update Product" : "Add Product"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
