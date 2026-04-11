import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Church } from "lucide-react";

const HOW_HEARD_OPTIONS = [
  { value: "friend_referral", label: "Friend / Family Referral" },
  { value: "social_media", label: "Social Media" },
  { value: "walk_in", label: "Walk-in" },
  { value: "church_event", label: "Church Event" },
  { value: "online_search", label: "Online Search" },
  { value: "flyer_poster", label: "Flyer / Poster" },
  { value: "other", label: "Other" },
];

const CONTACT_METHODS = [
  { value: "phone_call", label: "Phone Call" },
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
];

const AGE_GROUPS = [
  { value: "under_18", label: "Under 18" },
  { value: "18_25", label: "18–25" },
  { value: "26_35", label: "26–35" },
  { value: "36_50", label: "36–50" },
  { value: "51_65", label: "51–65" },
  { value: "over_65", label: "Over 65" },
];

const EMPTY_FORM = {
  first_name: "", last_name: "", gender: "", age_group: "",
  phone: "", email: "", city: "", how_heard: "",
  preferred_contact: "phone_call", prayer_request: "",
};

export default function VisitorRegistration() {
  const { churchId } = useParams<{ churchId: string }>();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const { data: tenant } = useQuery({
    queryKey: ["tenant-public", churchId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tenants")
        .select("id, name, logo")
        .eq("id", churchId!)
        .single();
      return data;
    },
    enabled: !!churchId,
    staleTime: 300000,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("visitors").insert({
        tenant_id: churchId!,
        first_name: form.first_name,
        last_name: form.last_name,
        gender: form.gender || null,
        phone: form.phone,
        email: form.email || null,
        city: form.city || null,
        how_heard: form.how_heard || null,
        notes: [
          form.age_group ? `Age group: ${form.age_group}` : null,
          form.preferred_contact ? `Preferred contact: ${form.preferred_contact}` : null,
          form.prayer_request ? `Prayer request: ${form.prayer_request}` : null,
        ].filter(Boolean).join("\n") || null,
        follow_up_status: "new",
        visit_date: new Date().toISOString().split("T")[0],
        how_heard_detail: form.preferred_contact,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => setSubmitted(true),
  });

  function validate() {
    const e: Record<string, string> = {};
    if (!form.first_name.trim()) e.first_name = "Required";
    if (!form.last_name.trim()) e.last_name = "Required";
    if (!form.phone.trim()) e.phone = "Required";
    return e;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    submitMutation.mutate();
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">You're registered!</h2>
          <p className="text-muted-foreground">
            Welcome to {tenant?.name || "our church"}. We're so glad you're here and look forward to connecting with you soon.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Church header */}
        <div className="text-center mb-6">
          {tenant?.logo
            ? <img src={tenant.logo} alt="" className="h-14 w-14 rounded-full mx-auto mb-3 object-cover" />
            : <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3"><Church className="h-7 w-7 text-primary" /></div>}
          <h1 className="text-2xl font-bold text-foreground">{tenant?.name || "Church"}</h1>
          <p className="text-sm text-muted-foreground">Visitor Registration</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Welcome!</h2>
            <p className="text-sm text-muted-foreground">We're so glad you're here. Please fill out this form so we can connect with you.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>First Name *</Label>
                <Input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} placeholder="Your first name" className="mt-1" />
                {errors.first_name && <p className="text-xs text-destructive mt-1">{errors.first_name}</p>}
              </div>
              <div>
                <Label>Last Name *</Label>
                <Input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} placeholder="Your last name" className="mt-1" />
                {errors.last_name && <p className="text-xs text-destructive mt-1">{errors.last_name}</p>}
              </div>
            </div>

            {/* Gender + Age Group */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Gender</Label>
                <Select value={form.gender} onValueChange={v => setForm(f => ({ ...f, gender: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Age Group</Label>
                <Select value={form.age_group} onValueChange={v => setForm(f => ({ ...f, age_group: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {AGE_GROUPS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Phone */}
            <div>
              <Label>Phone Number *</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Your phone number" className="mt-1" />
              {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
            </div>

            {/* Email */}
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Your email address" className="mt-1" />
            </div>

            {/* City */}
            <div>
              <Label>City</Label>
              <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Where do you live?" className="mt-1" />
            </div>

            {/* How heard */}
            <div>
              <Label>How did you hear about us?</Label>
              <Select value={form.how_heard} onValueChange={v => setForm(f => ({ ...f, how_heard: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {HOW_HEARD_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Preferred contact */}
            <div>
              <Label>Preferred Contact Method</Label>
              <Select value={form.preferred_contact} onValueChange={v => setForm(f => ({ ...f, preferred_contact: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTACT_METHODS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Prayer request */}
            <div>
              <Label>Prayer Request (Optional)</Label>
              <Textarea
                value={form.prayer_request}
                onChange={e => setForm(f => ({ ...f, prayer_request: e.target.value }))}
                placeholder="Is there anything you'd like us to pray about?"
                rows={3}
                className="mt-1"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending ? "Submitting..." : "Submit Registration"}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">Your information is kept private and secure.</p>
      </div>
    </div>
  );
}
