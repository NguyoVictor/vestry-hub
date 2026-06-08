import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES } from "@/lib/schema";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ImageIcon, UserCircle, PenLine, Palette, FileText, Eye, Save, X,
} from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { showPaywallToast } from "@/components/PaywallToast";

// ─── Types ────────────────────────────────────────────────────────────────────
interface BrandingState {
  logoUrl: string;
  logoFile: File | null;
  logoPreview: string;
  senderPhotoUrl: string;
  senderPhotoFile: File | null;
  senderPhotoPreview: string;
  senderName: string;
  emailSignature: string;
  primaryColor: string;
  buttonColor: string;
  textColor: string;
  footerText: string;
}

// ─── Color picker row ─────────────────────────────────────────────────────────
function ColorPicker({ label, sublabel, value, onChange }: {
  label: string; sublabel: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <p className="text-xs text-slate-400">{sublabel}</p>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="h-9 w-12 rounded-lg border border-slate-200 cursor-pointer p-0.5"
        />
        <Input
          value={value}
          onChange={e => {
            const v = e.target.value;
            if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) onChange(v);
          }}
          className="font-mono text-sm w-28"
          maxLength={7}
        />
      </div>
    </div>
  );
}

// ─── Email Preview ────────────────────────────────────────────────────────────
function EmailPreview({ branding, churchName }: { branding: BrandingState; churchName: string }) {
  const logoSrc = branding.logoPreview || branding.logoUrl;
  const photoSrc = branding.senderPhotoPreview || branding.senderPhotoUrl;

  return (
    <div className="bg-slate-100 p-4 rounded-lg">
      <div className="max-w-lg mx-auto bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200">
        {/* Header */}
        <div style={{ backgroundColor: branding.primaryColor }} className="px-8 py-6 text-center">
          {logoSrc ? (
            <img src={logoSrc} alt="Church Logo" className="h-12 mx-auto object-contain" />
          ) : (
            <p className="text-white font-bold text-lg">{churchName}</p>
          )}
        </div>

        {/* Body */}
        <div className="px-8 py-6 space-y-4" style={{ color: branding.textColor }}>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Subject: Sample Church Email</p>
          <p className="text-sm">Dear [Member Name],</p>
          <p className="text-sm leading-relaxed">
            This is a preview of how your emails will appear to members. Your branding makes your communications instantly recognisable.
          </p>
          <div>
            <a
              href="#"
              style={{ backgroundColor: branding.buttonColor }}
              className="inline-block px-5 py-2.5 rounded-lg text-white text-sm font-medium no-underline"
              onClick={e => e.preventDefault()}
            >
              View Details
            </a>
          </div>

          <hr className="border-slate-200" />

          {/* Signature */}
          <div className="flex items-start gap-3">
            {photoSrc ? (
              <img src={photoSrc} alt="Sender" className="h-10 w-10 rounded-full object-cover shrink-0" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                <UserCircle className="h-6 w-6 text-slate-400" />
              </div>
            )}
            <div>
              {branding.senderName && <p className="text-sm font-semibold">{branding.senderName}</p>}
              {branding.emailSignature ? (
                <div className="text-xs text-slate-600 mt-1" dangerouslySetInnerHTML={{ __html: branding.emailSignature.replace(/\n/g, "<br/>") }} />
              ) : (
                <p className="text-xs text-slate-400 italic">Email signature will appear here</p>
              )}
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Footer */}
          <div className="text-xs text-slate-400 text-center leading-relaxed">
            {branding.footerText || `${churchName} | You are receiving this because you are a member.`}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function EmailBranding() {
  const { tenantId, name: churchName, city, country } = useChurch();
  const qc = useQueryClient();
  const logoRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [softWarning, setSoftWarning] = useState(false);
  const { limits, usage } = useSubscription();

  const [branding, setBranding] = useState<BrandingState>({
    logoUrl: "", logoFile: null, logoPreview: "",
    senderPhotoUrl: "", senderPhotoFile: null, senderPhotoPreview: "",
    senderName: "",
    emailSignature: "",
    primaryColor: "#4F46E5",
    buttonColor: "#F97316",
    textColor: "#1F2937",
    footerText: "",
  });

  const set = (key: keyof BrandingState, value: unknown) =>
    setBranding(prev => ({ ...prev, [key]: value }));

  // Fetch saved branding
  const { data: saved } = useQuery({
    queryKey: ["email-branding", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from(TABLES.EMAIL_BRANDING)
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      return data as Record<string, string> | null;
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!saved) return;
    setBranding(prev => ({
      ...prev,
      logoUrl: saved.logo_url ?? "",
      senderPhotoUrl: saved.sender_photo_url ?? "",
      senderName: saved.sender_name ?? "",
      emailSignature: saved.email_signature ?? "",
      primaryColor: saved.primary_color ?? "#4F46E5",
      buttonColor: saved.button_color ?? "#F97316",
      textColor: saved.text_color ?? "#1F2937",
      footerText: saved.footer_text ?? "",
    }));
  }, [saved]);

  // Default footer text
  useEffect(() => {
    if (!branding.footerText && churchName) {
      const addr = [city, country].filter(Boolean).join(", ");
      set("footerText", `${churchName}${addr ? ` | ${addr}` : ""}\nYou are receiving this because you are a member of ${churchName}.\nTo unsubscribe, contact us.`);
    }
  }, [churchName]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Logo must be under 2MB."); return; }
    
    // Pre-upload storage check
    const fileSizeGB = file.size / (1024 * 1024 * 1024);
    if ((usage.storage_gb + fileSizeGB) > limits.storage_gb) {
      showPaywallToast('storage', 'storage');
      return;
    }
    
    set("logoFile", file);
    set("logoPreview", URL.createObjectURL(file));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1 * 1024 * 1024) { toast.error("Photo must be under 1MB."); return; }
    
    // Pre-upload storage check
    const fileSizeGB = file.size / (1024 * 1024 * 1024);
    if ((usage.storage_gb + fileSizeGB) > limits.storage_gb) {
      showPaywallToast('storage', 'storage');
      return;
    }
    
    set("senderPhotoFile", file);
    set("senderPhotoPreview", URL.createObjectURL(file));
  };

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const { error } = await supabase.storage.from("church-logos").upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from("church-logos").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSave = async () => {
    const hasLogo = branding.logoPreview || branding.logoUrl;
    const hasSender = branding.senderName.trim();
    if (!hasLogo && !hasSender) setSoftWarning(true);
    else setSoftWarning(false);

    setSaving(true);
    try {
      let logoUrl = branding.logoUrl;
      let senderPhotoUrl = branding.senderPhotoUrl;
      let totalUploadedGB = 0;

      if (branding.logoFile) {
        logoUrl = await uploadFile(branding.logoFile, `${tenantId}/email-logo-${Date.now()}.${branding.logoFile.name.split(".").pop()}`);
        totalUploadedGB += branding.logoFile.size / (1024 * 1024 * 1024);
      }
      if (branding.senderPhotoFile) {
        senderPhotoUrl = await uploadFile(branding.senderPhotoFile, `${tenantId}/sender-photo-${Date.now()}.${branding.senderPhotoFile.name.split(".").pop()}`);
        totalUploadedGB += branding.senderPhotoFile.size / (1024 * 1024 * 1024);
      }

      const payload = {
        tenant_id: tenantId,
        logo_url: logoUrl || null,
        sender_photo_url: senderPhotoUrl || null,
        sender_name: branding.senderName.trim() || null,
        email_signature: branding.emailSignature.trim() || null,
        primary_color: branding.primaryColor,
        button_color: branding.buttonColor,
        text_color: branding.textColor,
        footer_text: branding.footerText.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from(TABLES.EMAIL_BRANDING)
        .upsert(payload as never, { onConflict: "tenant_id" });
      if (error) throw error;

      // Post-upload increment storage (only if files were uploaded)
      if (totalUploadedGB > 0) {
        await supabase
          .from(TABLES.TENANT_SUBSCRIPTIONS)
          .update({ storage_used_gb: usage.storage_gb + totalUploadedGB })
          .eq('tenant_id', tenantId);
      }

      // Update local state with uploaded URLs
      setBranding(prev => ({ ...prev, logoUrl, senderPhotoUrl, logoFile: null, senderPhotoFile: null }));
      qc.invalidateQueries({ queryKey: ["email-branding", tenantId] });
      toast.success("✅ Branding settings saved successfully.");
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed to save branding.");
    } finally {
      setSaving(false);
    }
  };

  const cardClass = "bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-4 shadow-sm";

  return (
    <div className="space-y-5 pb-24">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Email Branding</h2>
          <p className="text-sm text-slate-500">Customize how your emails look with your church logo, sender photo, and signature</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={() => setPreviewOpen(true)}>
          <Eye className="h-4 w-4" />
          Show Preview
        </Button>
      </div>

      {/* Soft warning */}
      {softWarning && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
          ⚠ Adding a logo and sender name helps members recognise your church in their inbox.
        </div>
      )}

      {/* Card 1: Church Logo */}
      <div className={cardClass}>
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 shrink-0">
            <ImageIcon className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Church Logo</p>
            <p className="text-xs text-slate-500">Your church logo appears at the top of every email</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Preview box */}
          <button
            type="button"
            onClick={() => logoRef.current?.click()}
            className="h-20 w-32 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2220%22%20height%3D%2220%22%3E%3Crect%20width%3D%2210%22%20height%3D%2210%22%20fill%3D%22%23f1f5f9%22/%3E%3Crect%20x%3D%2210%22%20y%3D%2210%22%20width%3D%2210%22%20height%3D%2210%22%20fill%3D%22%23f1f5f9%22/%3E%3C/svg%3E')] hover:border-orange-300 transition-colors overflow-hidden shrink-0"
            title="Click to upload logo"
          >
            {branding.logoPreview || branding.logoUrl ? (
              <img src={branding.logoPreview || branding.logoUrl} alt="Logo" className="h-full w-full object-contain p-1" />
            ) : (
              <ImageIcon className="h-8 w-8 text-slate-300" />
            )}
          </button>
          {/* File input */}
          <div className="flex-1">
            <input
              ref={logoRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              className="text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-slate-200 file:text-xs file:font-medium file:bg-white file:text-slate-700 hover:file:bg-slate-50 cursor-pointer"
              onChange={handleLogoChange}
            />
          </div>
        </div>

        {(branding.logoPreview || branding.logoUrl) && (
          <button
            type="button"
            onClick={() => { set("logoUrl", ""); set("logoPreview", ""); set("logoFile", null); if (logoRef.current) logoRef.current.value = ""; }}
            className="text-xs text-red-500 hover:underline"
          >
            Remove Logo
          </button>
        )}
        <p className="text-xs text-slate-400">Recommended: 200x60px, PNG or SVG with transparent background</p>
      </div>

      {/* Card 2: Sender Photo */}
      <div className={cardClass}>
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 shrink-0">
            <UserCircle className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Sender Photo</p>
            <p className="text-xs text-slate-500">A personal photo (e.g., pastor) shown in the email signature area</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Circular preview */}
          <button
            type="button"
            onClick={() => photoRef.current?.click()}
            className="h-16 w-16 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center hover:border-orange-300 transition-colors overflow-hidden shrink-0"
          >
            {branding.senderPhotoPreview || branding.senderPhotoUrl ? (
              <img src={branding.senderPhotoPreview || branding.senderPhotoUrl} alt="Sender" className="h-full w-full object-cover" />
            ) : (
              <UserCircle className="h-8 w-8 text-slate-300" />
            )}
          </button>
          <div className="flex-1">
            <input
              ref={photoRef}
              type="file"
              accept="image/png,image/jpeg"
              className="text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-slate-200 file:text-xs file:font-medium file:bg-white file:text-slate-700 hover:file:bg-slate-50 cursor-pointer"
              onChange={handlePhotoChange}
            />
            {(branding.senderPhotoPreview || branding.senderPhotoUrl) && (
              <button
                type="button"
                onClick={() => { set("senderPhotoUrl", ""); set("senderPhotoPreview", ""); set("senderPhotoFile", null); if (photoRef.current) photoRef.current.value = ""; }}
                className="text-xs text-red-500 hover:underline"
              >
                Remove Photo
              </button>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Sender Name</Label>
          <Input
            placeholder="e.g., Pastor John Smith"
            value={branding.senderName}
            onChange={e => set("senderName", e.target.value)}
          />
          <p className="text-xs text-slate-400">This name appears alongside the photo in the signature</p>
        </div>
      </div>

      {/* Card 3: Email Signature */}
      <div className={cardClass}>
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 shrink-0">
            <PenLine className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Email Signature</p>
            <p className="text-xs text-slate-500">Custom text appended to the bottom of every email (HTML supported)</p>
          </div>
        </div>
        <Textarea
          placeholder={`e.g., With love and blessings,\nThe Grace Church Family\n📍 123 Faith Street, City\n📞 (555) 123-4567\n🌐 www.gracechurch.com`}
          value={branding.emailSignature}
          onChange={e => set("emailSignature", e.target.value)}
          rows={6}
        />
        <p className="text-xs text-slate-400">You can use HTML tags for formatting (bold, links, etc.)</p>
      </div>

      {/* Card 4: Colour Scheme */}
      <div className={cardClass}>
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 shrink-0">
            <Palette className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Email Colour Scheme</p>
            <p className="text-xs text-slate-500">Set the primary colours used in your email header and buttons</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <ColorPicker label="Primary Colour" sublabel="Used for email header background" value={branding.primaryColor} onChange={v => set("primaryColor", v)} />
          <ColorPicker label="Button Colour" sublabel="Used for call-to-action buttons" value={branding.buttonColor} onChange={v => set("buttonColor", v)} />
          <ColorPicker label="Text Colour" sublabel="Used for body text in emails" value={branding.textColor} onChange={v => set("textColor", v)} />
        </div>
      </div>

      {/* Card 5: Footer */}
      <div className={cardClass}>
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 shrink-0">
            <FileText className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Email Footer</p>
            <p className="text-xs text-slate-500">Text that appears at the very bottom of every email (legal/unsubscribe area)</p>
          </div>
        </div>
        <Textarea
          value={branding.footerText}
          onChange={e => set("footerText", e.target.value)}
          rows={3}
        />
        <p className="text-xs text-slate-400">Church name and address auto-fill from your General settings</p>
      </div>

      {/* Save button */}
      <Button
        className="w-full bg-orange-500 hover:bg-orange-600 text-white gap-2 py-3 text-base"
        onClick={handleSave}
        disabled={saving}
      >
        <Save className="h-5 w-5" />
        {saving ? "Saving..." : "💾 Save Branding Settings"}
      </Button>

      {/* Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-5 pb-3 border-b border-slate-100 flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-base font-semibold">Email Preview</DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5">Live preview — updates as you change settings</p>
            </div>
            <button onClick={() => setPreviewOpen(false)} className="rounded-full border border-slate-200 p-1.5 text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-4">
            <EmailPreview branding={branding} churchName={churchName} />
          </div>
          <div className="px-6 py-4 border-t border-slate-100">
            <Button variant="outline" className="w-full" onClick={() => setPreviewOpen(false)}>Close Preview</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
