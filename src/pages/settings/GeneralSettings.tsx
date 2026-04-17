import { useState, useRef, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES, COLS } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Upload, Clock, Save, CreditCard } from "lucide-react";

// ─── Timezone list ────────────────────────────────────────────────────────────
const TIMEZONES = [
  "Africa/Nairobi", "Africa/Lagos", "Africa/Johannesburg", "Africa/Cairo",
  "Africa/Accra", "Africa/Kampala", "Africa/Dar_es_Salaam", "Africa/Addis_Ababa",
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Toronto", "America/Sao_Paulo", "America/Mexico_City",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Rome", "Europe/Madrid",
  "Asia/Dubai", "Asia/Kolkata", "Asia/Singapore", "Asia/Tokyo", "Asia/Seoul",
  "Asia/Shanghai", "Asia/Bangkok", "Asia/Karachi",
  "Australia/Sydney", "Australia/Melbourne", "Pacific/Auckland",
  "UTC",
];

// ─── Currency list ────────────────────────────────────────────────────────────
const CURRENCIES = [
  { code: "KES", label: "KSh - Kenyan Shilling (KES)" },
  { code: "USD", label: "$ - US Dollar (USD)" },
  { code: "GBP", label: "£ - British Pound (GBP)" },
  { code: "EUR", label: "€ - Euro (EUR)" },
  { code: "NGN", label: "₦ - Nigerian Naira (NGN)" },
  { code: "ZAR", label: "R - South African Rand (ZAR)" },
  { code: "GHS", label: "GH₵ - Ghanaian Cedi (GHS)" },
  { code: "UGX", label: "USh - Ugandan Shilling (UGX)" },
  { code: "TZS", label: "TSh - Tanzanian Shilling (TZS)" },
  { code: "RWF", label: "RF - Rwandan Franc (RWF)" },
  { code: "ETB", label: "Br - Ethiopian Birr (ETB)" },
  { code: "CAD", label: "C$ - Canadian Dollar (CAD)" },
  { code: "AUD", label: "A$ - Australian Dollar (AUD)" },
  { code: "INR", label: "₹ - Indian Rupee (INR)" },
  { code: "BRL", label: "R$ - Brazilian Real (BRL)" },
];

const APP_BASE_URL = "https://www.churchcentralcloud.com/app/";

export default function GeneralSettings() {
  const { tenantId } = useChurch();
  const queryClient = useQueryClient();
  const logoRef = useRef<HTMLInputElement>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    address: "",
    country: "",
    city: "",
    post_code: "",
    timezone: "Africa/Nairobi",
    currency: "KES",
    denomination: "",
    founded_year: "",
    senior_pastor: "",
    app_slug: "",
    require_post_code: false,
    logo: "",
  });

  // Load existing tenant data
  const { data: tenant, isLoading } = useQuery({
    queryKey: ["tenant-settings", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.TENANTS)
        .select("*")
        .eq(COLS.ID, tenantId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
    staleTime: 60000,
  });

  // Populate form when data loads
  useEffect(() => {
    if (!tenant) return;
    setForm({
      name: tenant.name || "",
      address: tenant.address || "",
      country: tenant.country || "",
      city: tenant.city || "",
      post_code: (tenant as any).post_code || "",
      timezone: tenant.timezone || "Africa/Nairobi",
      currency: tenant.currency || "KES",
      denomination: tenant.denomination || "",
      founded_year: tenant.founded_year ? String(tenant.founded_year) : "",
      senior_pastor: (tenant as any).senior_pastor || "",
      app_slug: (tenant as any).app_slug || tenant.slug || "",
      require_post_code: (tenant as any).require_post_code || false,
      logo: tenant.logo || "",
    });
    if (tenant.logo) setLogoPreview(tenant.logo);
  }, [tenant]);

  function setField(k: string, v: any) { setForm(f => ({ ...f, [k]: v })); }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  const save = useMutation({
    mutationFn: async () => {
      let logoUrl = form.logo;

      // Upload logo if a new file was selected
      if (logoFile) {
        setUploading(true);
        const ext = logoFile.name.split(".").pop();
        const path = `${tenantId}/logo-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("church-logos").upload(path, logoFile, { upsert: true });
        if (!upErr) {
          const { data } = supabase.storage.from("church-logos").getPublicUrl(path);
          logoUrl = data.publicUrl;
        }
        setUploading(false);
      }

      const payload: Record<string, any> = {
        name: form.name.trim(),
        address: form.address || null,
        country: form.country || null,
        city: form.city || null,
        post_code: form.post_code || null,
        timezone: form.timezone || null,
        currency: form.currency || null,
        denomination: form.denomination || null,
        founded_year: form.founded_year ? Number(form.founded_year) : null,
        senior_pastor: form.senior_pastor || null,
        app_slug: form.app_slug || null,
        require_post_code: form.require_post_code,
        logo: logoUrl || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from(TABLES.TENANTS).update(payload).eq(COLS.ID, tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-settings", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["church", tenantId] });
      setLogoFile(null);
      toast.success("Settings saved successfully");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save settings"),
  });

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  return (
    <>
      <Helmet><title>General Settings — Vestry</title></Helmet>

      <div className="max-w-3xl space-y-6 pb-24">
        {/* Church Information Card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              🏛️ Church Information
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Basic information about your church</p>
          </div>

          {/* Church Logo */}
          <div className="space-y-2">
            <Label>Church Logo</Label>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-600 flex items-center justify-center bg-slate-50 dark:bg-slate-900 overflow-hidden shrink-0">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <svg className="h-7 w-7 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
              </div>
              <div>
                <input ref={logoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoChange} />
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => logoRef.current?.click()}>
                  <Upload className="h-3.5 w-3.5" /> Upload Logo
                </Button>
                <p className="text-xs text-slate-400 mt-1">Recommended: Square image, PNG or JPG, max 5MB</p>
              </div>
            </div>
          </div>

          {/* Church Name */}
          <div className="space-y-1.5">
            <Label>Church Name <span className="text-red-500">*</span></Label>
            <Input value={form.name} onChange={e => setField("name", e.target.value)} />
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <Label>Address</Label>
            <Input placeholder="e.g., 123 Main Street" value={form.address} onChange={e => setField("address", e.target.value)} />
          </div>

          {/* Country / City / Post Code */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Country</Label>
              <Input value={form.country} onChange={e => setField("country", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input value={form.city} onChange={e => setField("city", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Post Code</Label>
              <Input placeholder="e.g., 10001" value={form.post_code} onChange={e => setField("post_code", e.target.value)} />
            </div>
          </div>

          {/* Timezone */}
          <div className="space-y-1.5">
            <Label>Timezone</Label>
            <Select value={form.timezone} onValueChange={v => setField("timezone", v)}>
              <SelectTrigger className="gap-2">
                <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {TIMEZONES.map(tz => <SelectItem key={tz} value={tz}>{tz.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Currency */}
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <Select value={form.currency} onValueChange={v => setField("currency", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-60">
                {CURRENCIES.map(c => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-400">Currency used for giving and financial records</p>
          </div>

          {/* Denomination + Founding Year */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Denomination / Affiliation</Label>
              <Input placeholder="e.g., Non-denominational" value={form.denomination} onChange={e => setField("denomination", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Founding Year</Label>
              <Input placeholder="e.g., 1985" type="number" value={form.founded_year} onChange={e => setField("founded_year", e.target.value)} min={1800} max={new Date().getFullYear()} />
            </div>
          </div>

          {/* Senior Pastor */}
          <div className="space-y-1.5">
            <Label>Senior Pastor</Label>
            <Input placeholder="e.g., Pastor John Smith" value={form.senior_pastor} onChange={e => setField("senior_pastor", e.target.value)} />
          </div>

          {/* Member App Link */}
          <div className="space-y-1.5">
            <Label>Member App Link (Custom URL)</Label>
            <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden">
              <span className="px-3 py-2 bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 border-r border-slate-200 dark:border-slate-600 whitespace-nowrap shrink-0">
                {APP_BASE_URL}
              </span>
              <Input
                placeholder="your-church-name"
                value={form.app_slug}
                onChange={e => setField("app_slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                className="border-0 rounded-none focus-visible:ring-0"
              />
            </div>
            <p className="text-xs text-slate-400">Create a custom link for your member app. Members can install this as a PWA on their phones.</p>
          </div>

          {/* Require Post Code */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Require Post Code in Forms</p>
              <p className="text-xs text-slate-500 mt-0.5">When enabled, post code will be required in member registration, visitor forms, and family records. Enable this based on your region's requirements.</p>
            </div>
            <Switch checked={form.require_post_code} onCheckedChange={v => setField("require_post_code", v)} />
          </div>

          {/* Subscription Plan — read only */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-slate-400" /> Subscription Plan
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Manage your subscription in the Subscription tab</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 capitalize">
              {tenant?.subscription_plan || "Free"}
            </span>
          </div>
        </div>
      </div>

      {/* Sticky Save button */}
      <div className="fixed bottom-6 right-6 z-10">
        <Button
          className="bg-orange-500 hover:bg-orange-600 text-white gap-2 shadow-lg"
          onClick={() => save.mutate()}
          disabled={save.isPending || uploading || !form.name.trim()}
        >
          <Save className="h-4 w-4" />
          {save.isPending || uploading ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </>
  );
}
