import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Phone, Mail, Globe, CalendarDays, Users, Church, ExternalLink, Facebook, Instagram, Youtube, Twitter } from "lucide-react";

const ChurchPublicPage = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: tenant, isLoading, error } = useQuery({
    queryKey: ["public-church", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants")
        .select("*")
        .eq("slug", slug)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!slug,
  });

  const { data: seo } = useQuery({
    queryKey: ["public-church-seo", tenant?.id],
    queryFn: async () => {
      const { data } = await supabase.from("tenant_seo_settings")
        .select("*").eq("tenant_id", tenant.id).single();
      return data as any;
    },
    enabled: !!tenant?.id,
  });

  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Skeleton className="h-12 w-48" />
    </div>
  );

  if (error || !tenant) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <Church className="h-16 w-16 text-muted-foreground/30" />
      <h1 className="text-2xl font-bold text-foreground">Church Not Found</h1>
      <p className="text-muted-foreground">This church page doesn't exist or has been removed.</p>
      <Button asChild><Link to="/">Go to Vestry</Link></Button>
    </div>
  );

  if (seo && !seo.public_page_visible) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <Church className="h-16 w-16 text-muted-foreground/30 grayscale" />
      <h1 className="text-2xl font-bold text-foreground">This church's page is currently private.</h1>
      <Button variant="outline" asChild><Link to="/">Go to Vestry</Link></Button>
    </div>
  );

  const logoUrl = tenant.logo;
  const initials = (tenant.name || "").slice(0, 2).toUpperCase();
  const pageTitle = seo?.page_title || `${tenant.name} — Vestry`;
  const metaDesc = seo?.meta_description || tenant.tagline || "";

  const structuredData = seo?.structured_data_enabled ? {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "Church"],
    name: tenant.name,
    url: `https://vestry.com/church/${slug}`,
    logo: logoUrl || "",
    address: { "@type": "PostalAddress", addressLocality: tenant.city || "", addressCountry: tenant.country || "" },
    telephone: tenant.phone || "",
    openingHours: tenant.service_days?.map((d: string) => `${d.slice(0, 2)} ${tenant.service_time || "09:00"}`).join(", ") || "",
  } : null;

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={metaDesc} />
        {seo?.keywords?.length && <meta name="keywords" content={seo.keywords.join(", ")} />}
        <link rel="canonical" href={`https://vestry.com/church/${slug}`} />
        <meta name="robots" content="index, follow" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={seo?.og_title || tenant.name} />
        <meta property="og:description" content={seo?.og_description || metaDesc} />
        {seo?.og_image_url && <meta property="og:image" content={seo.og_image_url} />}
        <meta property="og:url" content={`https://vestry.com/church/${slug}`} />
        <meta property="og:site_name" content="Vestry" />
        <meta name="twitter:card" content={seo?.twitter_card_type || "summary_large_image"} />
        <meta name="twitter:title" content={seo?.og_title || tenant.name} />
        <meta name="twitter:description" content={seo?.og_description || metaDesc} />
        {seo?.og_image_url && <meta name="twitter:image" content={seo.og_image_url} />}
        {seo?.gsc_verification && <meta name="google-site-verification" content={seo.gsc_verification} />}
        {structuredData && <script type="application/ld+json">{JSON.stringify(structuredData)}</script>}
      </Helmet>

      {/* GA Script — rendered as inline for Helmet compatibility */}
      {seo?.ga_measurement_id && (
        <Helmet>
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${seo.ga_measurement_id}`} />
          <script>{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${seo.ga_measurement_id}');`}</script>
        </Helmet>
      )}

      <div className="min-h-screen bg-background">
        {/* Hero */}
        <div className="bg-gradient-to-b from-primary/5 to-background pt-16 pb-12">
          <div className="max-w-4xl mx-auto text-center px-4">
            {logoUrl ? (
              <img src={logoUrl} alt={tenant.name} className="h-28 w-28 mx-auto rounded-full object-cover border-4 border-card shadow-lg" />
            ) : (
              <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-primary text-3xl font-bold text-primary-foreground border-4 border-card shadow-lg">
                {initials}
              </div>
            )}
            <h1 className="mt-6 text-4xl font-bold text-foreground">{tenant.name}</h1>
            {tenant.tagline && <p className="mt-3 text-lg text-muted-foreground max-w-xl mx-auto">{tenant.tagline}</p>}
            {tenant.church_code && (
              <div className="mt-6">
                <Button size="lg">Join Our Church</Button>
                <p className="mt-2 text-xs text-muted-foreground">Church Code: <code className="font-mono font-bold text-foreground">{tenant.church_code}</code></p>
              </div>
            )}
          </div>
        </div>

        {/* About */}
        {tenant.about && (
          <section className="max-w-4xl mx-auto px-4 py-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">About Us</h2>
            <p className="text-muted-foreground leading-relaxed">{tenant.about}</p>
          </section>
        )}

        {/* Facts Grid */}
        <section className="max-w-4xl mx-auto px-4 pb-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {tenant.founded_year && (
              <Card><CardContent className="p-4 text-center"><CalendarDays className="h-5 w-5 mx-auto mb-2 text-primary" /><p className="text-xs text-muted-foreground">Founded</p><p className="font-bold">{tenant.founded_year}</p></CardContent></Card>
            )}
            {tenant.denomination && (
              <Card><CardContent className="p-4 text-center"><Church className="h-5 w-5 mx-auto mb-2 text-primary" /><p className="text-xs text-muted-foreground">Denomination</p><p className="font-bold text-sm">{tenant.denomination}</p></CardContent></Card>
            )}
            {tenant.average_attendance && (
              <Card><CardContent className="p-4 text-center"><Users className="h-5 w-5 mx-auto mb-2 text-primary" /><p className="text-xs text-muted-foreground">Avg. Attendance</p><p className="font-bold">{tenant.average_attendance}</p></CardContent></Card>
            )}
            {(tenant.city || tenant.country) && (
              <Card><CardContent className="p-4 text-center"><MapPin className="h-5 w-5 mx-auto mb-2 text-primary" /><p className="text-xs text-muted-foreground">Location</p><p className="font-bold text-sm">{[tenant.city, tenant.country].filter(Boolean).join(", ")}</p></CardContent></Card>
            )}
          </div>
        </section>

        {/* Service Times */}
        {tenant.service_days?.length > 0 && (
          <section className="max-w-4xl mx-auto px-4 pb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">Join Us</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {tenant.service_days.map((day: string) => (
                <Card key={day}><CardContent className="p-4 flex items-center gap-3">
                  <CalendarDays className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="font-medium">{day}</p>
                    {tenant.service_time && <p className="text-sm text-muted-foreground">{tenant.service_time}</p>}
                  </div>
                </CardContent></Card>
              ))}
            </div>
          </section>
        )}

        {/* Contact */}
        <section className="max-w-4xl mx-auto px-4 pb-12">
          <h2 className="text-2xl font-bold text-foreground mb-4">Contact</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              {tenant.address && (
                <div className="flex items-start gap-3"><MapPin className="h-4 w-4 mt-1 text-muted-foreground shrink-0" /><p className="text-sm">{tenant.address}</p></div>
              )}
              {tenant.phone && (
                <a href={`tel:${tenant.phone}`} className="flex items-center gap-3 text-sm hover:text-primary"><Phone className="h-4 w-4 text-muted-foreground" />{tenant.phone}</a>
              )}
              {tenant.contact_email && (
                <a href={`mailto:${tenant.contact_email}`} className="flex items-center gap-3 text-sm hover:text-primary"><Mail className="h-4 w-4 text-muted-foreground" />{tenant.contact_email}</a>
              )}
              {tenant.website_url && (
                <a href={tenant.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm hover:text-primary"><Globe className="h-4 w-4 text-muted-foreground" />{tenant.website_url}<ExternalLink className="h-3 w-3" /></a>
              )}
            </div>
            {/* Social Links */}
            <div className="flex flex-wrap gap-3">
              {tenant.facebook_url && <a href={tenant.facebook_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm hover:bg-primary/10"><Facebook className="h-4 w-4" />Facebook</a>}
              {tenant.instagram_url && <a href={tenant.instagram_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm hover:bg-primary/10"><Instagram className="h-4 w-4" />Instagram</a>}
              {tenant.youtube_url && <a href={tenant.youtube_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm hover:bg-primary/10"><Youtube className="h-4 w-4" />YouTube</a>}
              {tenant.twitter_url && <a href={tenant.twitter_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm hover:bg-primary/10"><Twitter className="h-4 w-4" />Twitter</a>}
            </div>
          </div>
        </section>

        {/* Map */}
        {tenant.address && (
          <section className="max-w-4xl mx-auto px-4 pb-12">
            <iframe
              className="w-full h-64 rounded-lg border"
              loading="lazy"
              src={`https://www.google.com/maps?q=${encodeURIComponent(tenant.address)}&output=embed`}
              title="Church Location"
            />
          </section>
        )}

        {/* Footer */}
        <footer className="border-t border-border py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Powered by <Link to="/" className="font-semibold text-primary hover:underline">Vestry</Link>
          </p>
        </footer>
      </div>
    </>
  );
};

export default ChurchPublicPage;
