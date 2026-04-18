import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES, COLS } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Phone, Save } from "lucide-react";

// ─── Social icon components ───────────────────────────────────────────────────
function FacebookIcon() {
  return (
    <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
      <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    </div>
  );
}

function InstagramIcon() {
  return (
    <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
      style={{ background: "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)" }}>
      <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    </div>
  );
}

function XIcon() {
  return (
    <div className="h-8 w-8 rounded-lg bg-black flex items-center justify-center shrink-0">
      <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    </div>
  );
}

function YouTubeIcon() {
  return (
    <div className="h-8 w-8 rounded-lg bg-red-600 flex items-center justify-center shrink-0">
      <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    </div>
  );
}

// ─── Social input row ─────────────────────────────────────────────────────────
function SocialRow({ icon, placeholder, value, onChange }: {
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <Input
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="flex-1"
        type="url"
      />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ContactSocial() {
  const { tenantId } = useChurch();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    phone: "",
    contact_email: "",
    whatsapp_number: "",
    website_url: "",
    facebook_url: "",
    instagram_url: "",
    twitter_url: "",
    youtube_url: "",
  });

  const { data: tenant, isLoading } = useQuery({
    queryKey: ["tenant-settings", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.TENANTS)
        .select("phone, contact_email, whatsapp_number, website_url, facebook_url, instagram_url, twitter_url, youtube_url")
        .eq(COLS.ID, tenantId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
    staleTime: 60000,
  });

  useEffect(() => {
    if (!tenant) return;
    setForm({
      phone:           tenant.phone || "",
      contact_email:   tenant.contact_email || "",
      whatsapp_number: tenant.whatsapp_number || "",
      website_url:     tenant.website_url || "",
      facebook_url:    tenant.facebook_url || "",
      instagram_url:   tenant.instagram_url || "",
      twitter_url:     tenant.twitter_url || "",
      youtube_url:     tenant.youtube_url || "",
    });
  }, [tenant]);

  function setField(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        phone:           form.phone.trim() || null,
        contact_email:   form.contact_email.trim() || null,
        whatsapp_number: form.whatsapp_number.trim() || null,
        website_url:     form.website_url.trim() || null,
        facebook_url:    form.facebook_url.trim() || null,
        instagram_url:   form.instagram_url.trim() || null,
        twitter_url:     form.twitter_url.trim() || null,
        youtube_url:     form.youtube_url.trim() || null,
        updated_at:      new Date().toISOString(),
      };
      const { error } = await supabase.from(TABLES.TENANTS).update(payload).eq(COLS.ID, tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-settings", tenantId] });
      toast.success("Contact & Social saved");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save"),
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
      <Helmet><title>Contact & Social — Vestry</title></Helmet>

      <div className="max-w-3xl pb-24">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-6">

          {/* Card header */}
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Phone className="h-5 w-5 text-orange-500" />
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Contact & Social Media</h2>
            </div>
            <p className="text-xs text-slate-500">How can people reach your church?</p>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Contact Information</p>
              <p className="text-xs text-slate-400 mt-0.5">This information will appear on reports, emails, letters, and other communications</p>
            </div>

            {/* Phone + Email */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Main Phone</Label>
                <Input
                  placeholder="+1 234 567 8900"
                  value={form.phone}
                  onChange={e => setField("phone", e.target.value)}
                  type="tel"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Main Email</Label>
                <Input
                  placeholder="church@example.com"
                  value={form.contact_email}
                  onChange={e => setField("contact_email", e.target.value)}
                  type="email"
                />
              </div>
            </div>

            {/* WhatsApp */}
            <div className="space-y-1.5">
              <Label>WhatsApp Number</Label>
              <Input
                placeholder="+233 24 123 4567"
                value={form.whatsapp_number}
                onChange={e => setField("whatsapp_number", e.target.value)}
                type="tel"
              />
              <p className="text-xs text-slate-400">Used for WhatsApp automations. Leave empty to use main phone.</p>
            </div>

            {/* Website */}
            <div className="space-y-1.5">
              <Label>Website URL</Label>
              <Input
                placeholder="https://www.yourchurch.com"
                value={form.website_url}
                onChange={e => setField("website_url", e.target.value)}
                type="url"
              />
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-slate-100 dark:bg-slate-700" />

          {/* Social Media Links */}
          <div className="space-y-4">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Social Media Links</p>

            <SocialRow
              icon={<FacebookIcon />}
              placeholder="https://facebook.com/yourchurch"
              value={form.facebook_url}
              onChange={v => setField("facebook_url", v)}
            />
            <SocialRow
              icon={<InstagramIcon />}
              placeholder="https://instagram.com/yourchurch"
              value={form.instagram_url}
              onChange={v => setField("instagram_url", v)}
            />
            <SocialRow
              icon={<XIcon />}
              placeholder="https://twitter.com/yourchurch"
              value={form.twitter_url}
              onChange={v => setField("twitter_url", v)}
            />
            <SocialRow
              icon={<YouTubeIcon />}
              placeholder="https://youtube.com/@yourchurch"
              value={form.youtube_url}
              onChange={v => setField("youtube_url", v)}
            />
          </div>
        </div>
      </div>

      {/* Sticky Save */}
      <div className="fixed bottom-6 right-6 z-10">
        <Button
          className="bg-orange-500 hover:bg-orange-600 text-white gap-2 shadow-lg"
          onClick={() => save.mutate()}
          disabled={save.isPending}
        >
          <Save className="h-4 w-4" />
          {save.isPending ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </>
  );
}
