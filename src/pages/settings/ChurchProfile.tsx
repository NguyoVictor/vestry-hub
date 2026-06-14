import { useState, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { usePermissions } from '@/hooks/usePermissions';
import { ReadOnlyBanner } from '@/components/shared/ReadOnlyBanner';
import { PermissionButton } from '@/components/shared/PermissionButton';
import { useSubscription } from "@/hooks/useSubscription";
import { showPaywallToast } from "@/components/PaywallToast";
import { TABLES } from "@/lib/schema";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { Loader2, Upload, X, Check, QrCode } from "lucide-react";
import { countries } from "@/lib/country-currency";
import { TABLES } from "@/lib/schema";
import { ChurchQRModal } from "@/components/shared/ChurchQRModal";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const CURRENCIES = ["KES", "USD", "GBP", "EUR", "UGX", "TZS", "ZAR", "NGN", "GHS", "CAD", "AUD", "INR"];

const schema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens"),
  tagline: z.string().max(200).optional().or(z.literal("")),
  address: z.string().max(300).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  country: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  contact_email: z.string().email().optional().or(z.literal("")),
  website_url: z.string().url().optional().or(z.literal("")),
  founded_year: z.coerce.number().min(1800).max(new Date().getFullYear()).optional().or(z.literal("")),
  denomination: z.string().max(100).optional().or(z.literal("")),
  service_days: z.array(z.string()).optional(),
  service_time: z.string().optional().or(z.literal("")),
  average_attendance: z.coerce.number().min(0).optional().or(z.literal("")),
  currency: z.string().optional(),
  facebook_url: z.string().url().optional().or(z.literal("")),
  instagram_url: z.string().url().optional().or(z.literal("")),
  youtube_url: z.string().url().optional().or(z.literal("")),
  twitter_url: z.string().url().optional().or(z.literal("")),
  whatsapp_number: z.string().optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

const ChurchProfile = () => {
  const church = useChurch();
  const { limits, usage } = useSubscription();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('church_settings');
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [qrOpen, setQrOpen] = useState(false);

  const { data: tenant, isLoading } = useQuery({
    queryKey: ["tenant", church.tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.TENANTS).select("*").eq("id", church.tenantId).single();
      return data as any;
    },
  });

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "", slug: "", tagline: "", address: "", city: "", country: "",
      phone: "", contact_email: "", website_url: "", founded_year: "",
      denomination: "", service_days: [], service_time: "", average_attendance: "",
      currency: "KES", facebook_url: "", instagram_url: "", youtube_url: "",
      twitter_url: "", whatsapp_number: "",
    },
    values: tenant ? {
      name: tenant.name || "",
      slug: tenant.slug || "",
      tagline: tenant.tagline || "",
      address: tenant.address || "",
      city: tenant.city || "",
      country: tenant.country || "",
      phone: tenant.phone || "",
      contact_email: tenant.contact_email || "",
      website_url: tenant.website_url || "",
      founded_year: tenant.founded_year || "",
      denomination: tenant.denomination || "",
      service_days: tenant.service_days || [],
      service_time: tenant.service_time || "",
      average_attendance: tenant.average_attendance || "",
      currency: tenant.currency || "KES",
      facebook_url: tenant.facebook_url || "",
      instagram_url: tenant.instagram_url || "",
      youtube_url: tenant.youtube_url || "",
      twitter_url: tenant.twitter_url || "",
      whatsapp_number: tenant.whatsapp_number || "",
    } : undefined,
  });

  const saveMutation = useMutation({
    mutationFn: async (values: FormData) => {
      if (readOnly) return;
      const { error } = await supabase.from("tenants").update({
        name: values.name,
        slug: values.slug,
        tagline: values.tagline || null,
        address: values.address || null,
        city: values.city || null,
        country: values.country || null,
        phone: values.phone || null,
        contact_email: values.contact_email || null,
        website_url: values.website_url || null,
        founded_year: values.founded_year ? Number(values.founded_year) : null,
        denomination: values.denomination || null,
        service_days: values.service_days || [],
        service_time: values.service_time || null,
        average_attendance: values.average_attendance ? Number(values.average_attendance) : null,
        currency: values.currency || "KES",
        facebook_url: values.facebook_url || null,
        instagram_url: values.instagram_url || null,
        youtube_url: values.youtube_url || null,
        twitter_url: values.twitter_url || null,
        whatsapp_number: values.whatsapp_number || null,
      } as any).eq("id", church.tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenant", church.tenantId] });
      toast.success("Church profile updated successfully");
    },
    onError: () => toast.error("Failed to save. Please try again."),
  });

  const checkSlug = async (slug: string) => {
    if (!slug || slug.length < 2) { setSlugAvailable(null); return; }
    const { data } = await supabase.from("tenants").select("id").eq("slug", slug).neq("id", church.tenantId).limit(1);
    setSlugAvailable(!data?.length);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Max 2MB"); return; }
    
    // Check storage limit
    const fileSizeGB = file.size / (1024 * 1024 * 1024);
    if ((usage.storage_gb + fileSizeGB) > limits.storage_gb) {
      showPaywallToast('storage', 'storage');
      return;
    }
    
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${church.tenantId}/logo.${ext}`;
    const { error: uploadError } = await supabase.storage.from("church-logos").upload(path, file, { upsert: true });
    if (uploadError) { toast.error("Upload failed"); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("church-logos").getPublicUrl(path);
    await supabase.from("tenants").update({ logo: urlData.publicUrl } as any).eq("id", church.tenantId);
    
    // Increment storage usage
    await supabase
      .from(TABLES.TENANT_SUBSCRIPTIONS)
      .update({ storage_used_gb: usage.storage_gb + fileSizeGB })
      .eq('tenant_id', church.tenantId);
    
    qc.invalidateQueries({ queryKey: ["tenant", church.tenantId] });
    toast.success("Logo uploaded");
    setUploading(false);
  };

  const removeLogo = async () => {
    await supabase.from("tenants").update({ logo: null } as any).eq("id", church.tenantId);
    qc.invalidateQueries({ queryKey: ["tenant", church.tenantId] });
    toast.success("Logo removed");
  };

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-96 w-full" /></div>;

  const logoUrl = tenant?.logo;
  const initials = (tenant?.name || "VC").slice(0, 2).toUpperCase();

  return (
    <>
      <Helmet><title>Church Profile — Vestry</title></Helmet>
      
      {readOnly && <ReadOnlyBanner section="Church Profile" />}
      
      <PageHeader
        title="Church Profile"
        subtitle="Update your church's public information"
        action={
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setQrOpen(true)}>
            <QrCode className="h-4 w-4" />QR Codes
          </Button>
        }
      />

      {tenant && (
        <ChurchQRModal
          open={qrOpen}
          onClose={() => setQrOpen(false)}
          churchName={tenant.name || ""}
          churchCode={tenant.church_code || ""}
          churchSlug={tenant.slug || ""}
        />
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-6 max-w-3xl">
          {/* Logo */}
          <Card>
            <CardHeader><CardTitle className="text-base">Church Identity</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                {logoUrl ? (
                  <img src={logoUrl} alt="" className="h-24 w-24 rounded-full object-cover border border-border" />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                    {initials}
                  </div>
                )}
                <div className="space-y-2">
                  <input ref={fileInputRef} type="file" accept=".jpg,.png,.webp" className="hidden" onChange={handleLogoUpload} />
                  <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                    {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    Upload Logo
                  </Button>
                  {logoUrl && (
                    <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={removeLogo}>
                      <X className="mr-1 h-3 w-3" /> Remove
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground">JPG, PNG or WebP. Max 2MB.</p>
                </div>
              </div>

              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Church Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <FormField control={form.control} name="slug" render={({ field }) => (
                <FormItem>
                  <FormLabel>Church Slug</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input {...field} onBlur={() => checkSlug(field.value)} />
                      {slugAvailable !== null && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2">
                          {slugAvailable ? <Check className="h-4 w-4 text-emerald-500" /> : <X className="h-4 w-4 text-destructive" />}
                        </span>
                      )}
                    </div>
                  </FormControl>
                  <p className="text-xs text-muted-foreground">vestry.com/church/{field.value || "your-church"}</p>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="tagline" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tagline / Mission Statement</FormLabel>
                  <FormControl><Textarea {...field} maxLength={200} rows={2} /></FormControl>
                  <p className="text-xs text-muted-foreground">{(field.value || "").length} / 200</p>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          {/* Contact & Location */}
          <Card>
            <CardHeader><CardTitle className="text-base">Contact & Location</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem><FormLabel>Physical Address</FormLabel><FormControl><Textarea {...field} rows={2} maxLength={300} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="city" render={({ field }) => (
                  <FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="country" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger></FormControl>
                      <SelectContent>{countries.map(c => <SelectItem key={c.code} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="contact_email" render={({ field }) => (
                  <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="website_url" render={({ field }) => (
                <FormItem><FormLabel>Website URL</FormLabel><FormControl><Input type="url" placeholder="https://..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </CardContent>
          </Card>

          {/* Church Details */}
          <Card>
            <CardHeader><CardTitle className="text-base">Church Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="founded_year" render={({ field }) => (
                  <FormItem><FormLabel>Founded Year</FormLabel><FormControl><Input type="number" min={1800} max={new Date().getFullYear()} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="denomination" render={({ field }) => (
                  <FormItem><FormLabel>Denomination</FormLabel><FormControl><Input placeholder="e.g. Pentecostal" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <div>
                <Label className="mb-2 block">Weekly Service Days</Label>
                <div className="flex flex-wrap gap-3">
                  {DAYS.map(day => {
                    const current = form.watch("service_days") || [];
                    const checked = current.includes(day);
                    return (
                      <label key={day} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={checked} onCheckedChange={(c) => {
                          const next = c ? [...current, day] : current.filter((d: string) => d !== day);
                          form.setValue("service_days", next, { shouldDirty: true });
                        }} />
                        {day}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField control={form.control} name="service_time" render={({ field }) => (
                  <FormItem><FormLabel>Service Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="average_attendance" render={({ field }) => (
                  <FormItem><FormLabel>Avg. Attendance</FormLabel><FormControl><Input type="number" min={0} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="currency" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          {/* Social Links */}
          <Card>
            <CardHeader><CardTitle className="text-base">Social Links</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {(["facebook_url", "instagram_url", "youtube_url", "twitter_url", "whatsapp_number"] as const).map(key => (
                <FormField key={key} control={form.control} name={key} render={({ field }) => (
                  <FormItem>
                    <FormLabel className="capitalize">{key.replace(/_/g, " ").replace("url", "URL")}</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              ))}
            </CardContent>
          </Card>

          <PermissionButton
            readOnly={readOnly}
            type="submit"
            className="w-full"
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </PermissionButton>
        </form>
      </Form>
    </>
  );
};

export default ChurchProfile;
