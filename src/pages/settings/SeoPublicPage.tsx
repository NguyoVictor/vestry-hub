import { useState, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { Loader2, Upload, X, ChevronDown, Globe, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const seoSchema = z.object({
  page_title: z.string().max(60).optional().or(z.literal("")),
  meta_description: z.string().max(160).optional().or(z.literal("")),
  keywords: z.string().optional().or(z.literal("")),
  og_title: z.string().max(60).optional().or(z.literal("")),
  og_description: z.string().max(160).optional().or(z.literal("")),
  twitter_card_type: z.string().optional(),
  ga_measurement_id: z.string().regex(/^$|^G-[A-Z0-9]{10,}$/, "Must be G-XXXXXXXXXX format").optional().or(z.literal("")),
  facebook_pixel_id: z.string().optional().or(z.literal("")),
  gsc_verification: z.string().optional().or(z.literal("")),
  structured_data_enabled: z.boolean().optional(),
  public_page_visible: z.boolean().optional(),
  show_in_directory: z.boolean().optional(),
});

type SeoFormData = z.infer<typeof seoSchema>;

const SeoPublicPage = () => {
  const church = useChurch();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewTab, setPreviewTab] = useState<"facebook" | "twitter">("facebook");

  const { data: seoData, isLoading } = useQuery({
    queryKey: ["seo-settings", church.tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("tenant_seo_settings")
        .select("*").eq("tenant_id", church.tenantId).single();
      return data as any;
    },
  });

  const { data: tenant } = useQuery({
    queryKey: ["tenant", church.tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("tenants").select("name, slug, tagline, city, country, phone, logo").eq("id", church.tenantId).single();
      return data as any;
    },
  });

  const form = useForm<SeoFormData>({
    resolver: zodResolver(seoSchema),
    values: seoData ? {
      page_title: seoData.page_title || "",
      meta_description: seoData.meta_description || "",
      keywords: (seoData.keywords || []).join(", "),
      og_title: seoData.og_title || "",
      og_description: seoData.og_description || "",
      twitter_card_type: seoData.twitter_card_type || "summary_large_image",
      ga_measurement_id: seoData.ga_measurement_id || "",
      facebook_pixel_id: seoData.facebook_pixel_id || "",
      gsc_verification: seoData.gsc_verification || "",
      structured_data_enabled: seoData.structured_data_enabled ?? true,
      public_page_visible: seoData.public_page_visible ?? true,
      show_in_directory: seoData.show_in_directory ?? true,
    } : {
      page_title: "", meta_description: "", keywords: "", og_title: "", og_description: "",
      twitter_card_type: "summary_large_image", ga_measurement_id: "", facebook_pixel_id: "",
      gsc_verification: "", structured_data_enabled: true, public_page_visible: true, show_in_directory: true,
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: SeoFormData) => {
      const payload = {
        tenant_id: church.tenantId,
        page_title: values.page_title || null,
        meta_description: values.meta_description || null,
        keywords: values.keywords ? values.keywords.split(",").map(k => k.trim()).filter(Boolean) : [],
        og_title: values.og_title || null,
        og_description: values.og_description || null,
        twitter_card_type: values.twitter_card_type || "summary_large_image",
        ga_measurement_id: values.ga_measurement_id || null,
        facebook_pixel_id: values.facebook_pixel_id || null,
        gsc_verification: values.gsc_verification || null,
        structured_data_enabled: values.structured_data_enabled ?? true,
        public_page_visible: values.public_page_visible ?? true,
        show_in_directory: values.show_in_directory ?? true,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("tenant_seo_settings").upsert(payload as any, { onConflict: "tenant_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["seo-settings", church.tenantId] });
      toast.success("SEO settings saved");
    },
    onError: () => toast.error("Failed to save SEO settings"),
  });

  const handleOgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${church.tenantId}/og.${ext}`;
    const { error } = await supabase.storage.from("church-media").upload(path, file, { upsert: true });
    if (error) { toast.error("Upload failed"); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("church-media").getPublicUrl(path);
    // Save immediately
    await supabase.from("tenant_seo_settings").upsert({
      tenant_id: church.tenantId, og_image_url: urlData.publicUrl
    } as any, { onConflict: "tenant_id" });
    qc.invalidateQueries({ queryKey: ["seo-settings", church.tenantId] });
    toast.success("OG image uploaded");
    setUploading(false);
  };

  const pageTitle = form.watch("page_title");
  const metaDesc = form.watch("meta_description");
  const ogTitle = form.watch("og_title");
  const ogDesc = form.watch("og_description");
  const slug = tenant?.slug || "your-church";

  const structuredData = form.watch("structured_data_enabled") ? JSON.stringify({
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "Church"],
    name: tenant?.name || church.name,
    url: `https://vestry.com/church/${slug}`,
    logo: tenant?.logo || "",
    address: { "@type": "PostalAddress", addressLocality: tenant?.city || "", addressCountry: tenant?.country || "" },
    telephone: tenant?.phone || "",
  }, null, 2) : "";

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-96 w-full" /></div>;

  return (
    <>
      <Helmet><title>SEO & Public Page — Vestry</title></Helmet>
      <PageHeader title="SEO & Public Page" subtitle="Control how your church appears in search engines and social media" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(v => saveMutation.mutate(v))}>
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left: Form */}
            <div className="flex-1 space-y-6">
              {/* Basic SEO */}
              <Card>
                <CardHeader><CardTitle className="text-base">Basic SEO</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={form.control} name="page_title" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Page Title</FormLabel>
                      <FormControl><Input maxLength={60} {...field} /></FormControl>
                      <p className={cn("text-xs", (field.value?.length || 0) >= 55 ? (field.value?.length || 0) >= 60 ? "text-destructive" : "text-amber-500") : "text-muted-foreground")}>{field.value?.length || 0} / 60</p>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="meta_description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meta Description</FormLabel>
                      <FormControl><Textarea maxLength={160} rows={3} {...field} /></FormControl>
                      <p className={cn("text-xs", (field.value?.length || 0) >= 150 ? "text-amber-500" : "text-muted-foreground")}>{field.value?.length || 0} / 160</p>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="keywords" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Keywords</FormLabel>
                      <FormControl><Input placeholder="church, community, worship" {...field} /></FormControl>
                      <p className="text-xs text-muted-foreground">Separate keywords with commas</p>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="rounded-md bg-muted px-3 py-2 text-xs font-mono text-muted-foreground">
                    https://vestry.com/church/{slug}
                  </div>
                </CardContent>
              </Card>

              {/* Open Graph */}
              <Card>
                <CardHeader><CardTitle className="text-base">Open Graph / Social Sharing</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={form.control} name="og_title" render={({ field }) => (
                    <FormItem>
                      <FormLabel>OG Title</FormLabel>
                      <FormControl><Input maxLength={60} placeholder={pageTitle || "Defaults to page title"} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="og_description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>OG Description</FormLabel>
                      <FormControl><Textarea maxLength={160} rows={2} placeholder={metaDesc || "Defaults to meta description"} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div>
                    <FormLabel>OG Image</FormLabel>
                    <p className="text-xs text-muted-foreground mb-2">1200 × 630px recommended</p>
                    {seoData?.og_image_url && (
                      <img src={seoData.og_image_url} alt="" className="w-full max-w-md rounded-md border object-cover aspect-[1200/630] mb-2" />
                    )}
                    <input ref={fileInputRef} type="file" accept=".jpg,.png,.webp" className="hidden" onChange={handleOgUpload} />
                    <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                      {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Upload Image
                    </Button>
                  </div>
                  <FormField control={form.control} name="twitter_card_type" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Twitter Card Type</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="summary">Summary</SelectItem>
                          <SelectItem value="summary_large_image">Summary with Large Image</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </CardContent>
              </Card>

              {/* Analytics */}
              <Card>
                <CardHeader><CardTitle className="text-base">Analytics & Tracking</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={form.control} name="ga_measurement_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Google Analytics Measurement ID</FormLabel>
                      <FormControl><Input placeholder="G-XXXXXXXXXX" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="facebook_pixel_id" render={({ field }) => (
                    <FormItem><FormLabel>Facebook Pixel ID</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="gsc_verification" render={({ field }) => (
                    <FormItem><FormLabel>Google Search Console Verification</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </CardContent>
              </Card>

              {/* Structured Data */}
              <Card>
                <CardHeader><CardTitle className="text-base">Structured Data</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={form.control} name="structured_data_enabled" render={({ field }) => (
                    <div className="flex items-center justify-between">
                      <div><p className="text-sm font-medium">Enable Schema.org Structured Data</p><p className="text-xs text-muted-foreground">Auto-generates JSON-LD from your church profile</p></div>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </div>
                  )} />
                  {form.watch("structured_data_enabled") && (
                    <Collapsible>
                      <CollapsibleTrigger className="flex items-center gap-1 text-xs text-primary"><ChevronDown className="h-3 w-3" />Preview JSON-LD</CollapsibleTrigger>
                      <CollapsibleContent>
                        <pre className="mt-2 rounded-md bg-muted p-3 text-xs overflow-auto max-h-48 font-mono">{structuredData}</pre>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </CardContent>
              </Card>

              {/* Visibility */}
              <Card>
                <CardHeader><CardTitle className="text-base">Public Page Visibility</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={form.control} name="public_page_visible" render={({ field }) => (
                    <div className="flex items-center justify-between">
                      <div><p className="text-sm font-medium">Make Public Page Visible</p><p className="text-xs text-muted-foreground">When off, your /church page returns a 404</p></div>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </div>
                  )} />
                  <FormField control={form.control} name="show_in_directory" render={({ field }) => (
                    <div className="flex items-center justify-between">
                      <div><p className="text-sm font-medium">Show in Church Directory</p><p className="text-xs text-muted-foreground">Appear in the Vestry church directory</p></div>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </div>
                  )} />
                </CardContent>
              </Card>

              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save SEO Settings
              </Button>
            </div>

            {/* Right: Preview */}
            <div className="w-full lg:w-96 lg:sticky lg:top-0 space-y-4">
              {/* SERP Preview */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Search className="h-4 w-4" />Search Engine Preview</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="h-4 w-4 rounded-full bg-primary" />
                      <span className="text-muted-foreground">vestry.com › church › {slug}</span>
                    </div>
                    <p className="text-lg text-primary hover:underline cursor-pointer truncate">
                      {pageTitle || <span className="text-muted-foreground/50">Your Church Name — Vestry</span>}
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {metaDesc || <span className="text-muted-foreground/50">Add a meta description to tell people what your church is about.</span>}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Social Preview */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2"><Globe className="h-4 w-4" />Social Media Preview</CardTitle>
                    <div className="flex text-xs">
                      {(["facebook", "twitter"] as const).map(tab => (
                        <button key={tab} type="button" className={cn("px-2 py-1 rounded-md capitalize", previewTab === tab ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground")} onClick={() => setPreviewTab(tab)}>
                          {tab === "facebook" ? "Facebook" : "Twitter / X"}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border overflow-hidden">
                    <div className={cn("bg-muted flex items-center justify-center", previewTab === "twitter" ? "aspect-[2/1]" : "aspect-[1200/630]")}>
                      {seoData?.og_image_url ? (
                        <img src={seoData.og_image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Globe className="h-8 w-8 text-muted-foreground/30" />
                      )}
                    </div>
                    <div className="p-3 space-y-1">
                      <p className="text-xs text-muted-foreground uppercase">vestry.com</p>
                      <p className="text-sm font-semibold line-clamp-1">{ogTitle || pageTitle || church.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{ogDesc || metaDesc || ""}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </Form>
    </>
  );
};

export default SeoPublicPage;
