import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TABLES } from "@/lib/schema";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CheckCircle, Church } from "lucide-react";
import { format } from "date-fns";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateMembershipNumber(): string {
  return `MBR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function generateId(): string {
  return crypto.randomUUID();
}

// ─── Form state ───────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  first_name: "",
  last_name: "",
  gender: "",
  date_of_birth: "",
  phone: "",
  email: "",
  street: "",
  city: "",
  occupation: "",
  marital_status: "",
};

type FormState = typeof EMPTY_FORM;

export default function MemberRegistration() {
  const { orgId } = useParams<{ orgId: string }>();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitted, setSubmitted] = useState(false);

  // Fetch church info (public — no auth needed)
  const { data: tenant, isLoading: tenantLoading } = useQuery({
    queryKey: ["tenant-public-reg", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.TENANTS)
        .select("id, name, logo, registration_enabled")
        .eq("id", orgId!)
        .single();
      if (error) throw error;
      return data as { id: string; name: string; logo: string | null; registration_enabled: boolean };
    },
    enabled: !!orgId,
    staleTime: 300_000,
  });

  const set = (key: keyof FormState, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  function validate(): boolean {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.first_name.trim()) e.first_name = "First name is required";
    if (!form.last_name.trim())  e.last_name  = "Last name is required";
    if (!form.gender)            e.gender     = "Please select a gender";
    if (!form.phone.trim())      e.phone      = "Phone number is required";
    if (!form.email.trim())      e.email      = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Please enter a valid email";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const submitMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      const { error } = await supabase.from(TABLES.MEMBERS).insert({
        id: generateId(),
        tenant_id: orgId!,
        membership_number: generateMembershipNumber(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        gender: form.gender || null,
        date_of_birth: form.date_of_birth || null,
        phone: form.phone.trim(),
        email: form.email.trim(),
        street: form.street.trim() || null,
        city: form.city.trim() || null,
        occupation: form.occupation.trim() || null,
        marital_status: (form.marital_status as any) || null,
        status: "Active",
        registration_source: "Self-Registration",
        join_date: format(new Date(), "yyyy-MM-dd"),
        created_at: now,
        updated_at: now,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Registration successful!");
    },
    onError: (e: Error) => toast.error(e.message ?? "Registration failed. Please try again."),
  });

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    submitMutation.mutate();
  }

  // ── Loading ──
  if (tenantLoading) {
    return (
      <div className="min-h-screen bg-[#fdf0ee] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  // ── Org not found ──
  if (!tenant) {
    return (
      <div className="min-h-screen bg-[#fdf0ee] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-sm w-full text-center">
          <p className="text-slate-500 text-sm">Church not found. Please check the link and try again.</p>
        </div>
      </div>
    );
  }

  // ── Registration closed ──
  if (!tenant.registration_enabled) {
    return (
      <div className="min-h-screen bg-[#fdf0ee] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-sm w-full text-center space-y-3">
          {tenant.logo
            ? <img src={tenant.logo} alt="" className="h-14 w-14 rounded-full mx-auto object-cover" />
            : <div className="h-14 w-14 rounded-full bg-orange-100 flex items-center justify-center mx-auto"><Church className="h-7 w-7 text-orange-500" /></div>
          }
          <h1 className="text-lg font-bold text-slate-800">{tenant.name}</h1>
          <p className="text-sm text-slate-500">
            Registration is currently closed. Please contact your church admin.
          </p>
        </div>
      </div>
    );
  }

  // ── Success screen ──
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#fdf0ee] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-sm w-full text-center space-y-3">
          <div className="flex items-center justify-center">
            <CheckCircle className="h-14 w-14 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">
            Welcome to {tenant.name}!
          </h2>
          <p className="text-sm text-slate-500">
            Thank you for registering as a member. We're excited to have you join our church family!
          </p>
          <p className="text-sm font-medium text-orange-500">
            👤 You're now part of the family!
          </p>
        </div>
      </div>
    );
  }

  // ── Registration form ──
  return (
    <div className="min-h-screen bg-[#fdf0ee] flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-[500px]">
        {/* Church header */}
        <div className="text-center mb-5">
          {tenant.logo
            ? <img src={tenant.logo} alt="" className="h-14 w-14 rounded-full mx-auto mb-3 object-cover border-2 border-orange-200" />
            : (
              <div className="h-14 w-14 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-3">
                <Church className="h-7 w-7 text-orange-500" />
              </div>
            )
          }
          <h1 className="text-lg font-bold text-slate-800">{tenant.name}</h1>
          <p className="text-sm text-slate-500">Member Registration</p>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="mb-5">
            <h2 className="text-base font-bold text-slate-800">Join Our Church Family</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Please fill out this form to register as a member. We're excited to welcome you!
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* First + Last Name */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">First Name <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="Your first name"
                  value={form.first_name}
                  onChange={e => set("first_name", e.target.value)}
                  className={errors.first_name ? "border-red-400" : ""}
                />
                {errors.first_name && <p className="text-xs text-red-500">{errors.first_name}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Last Name <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="Your last name"
                  value={form.last_name}
                  onChange={e => set("last_name", e.target.value)}
                  className={errors.last_name ? "border-red-400" : ""}
                />
                {errors.last_name && <p className="text-xs text-red-500">{errors.last_name}</p>}
              </div>
            </div>

            {/* Gender + Date of Birth */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Gender <span className="text-red-500">*</span></Label>
                <Select value={form.gender} onValueChange={v => set("gender", v)}>
                  <SelectTrigger className={errors.gender ? "border-red-400" : ""}>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
                {errors.gender && <p className="text-xs text-red-500">{errors.gender}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Date of Birth</Label>
                <Input
                  type="date"
                  value={form.date_of_birth}
                  onChange={e => set("date_of_birth", e.target.value)}
                  placeholder="mm/dd/yyyy"
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Phone Number <span className="text-red-500">*</span></Label>
              <Input
                placeholder="Your phone number"
                value={form.phone}
                onChange={e => set("phone", e.target.value)}
                className={errors.phone ? "border-red-400" : ""}
              />
              {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
            </div>

            {/* Email */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Email <span className="text-red-500">*</span></Label>
              <Input
                type="email"
                placeholder="Your email address"
                value={form.email}
                onChange={e => set("email", e.target.value)}
                className={errors.email ? "border-red-400" : ""}
              />
              {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
            </div>

            {/* Address */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Address</Label>
              <Input
                placeholder="Your home address"
                value={form.street}
                onChange={e => set("street", e.target.value)}
              />
            </div>

            {/* City + Occupation */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">City</Label>
                <Input
                  placeholder="Your city"
                  value={form.city}
                  onChange={e => set("city", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Occupation</Label>
                <Input
                  placeholder="Your occupation"
                  value={form.occupation}
                  onChange={e => set("occupation", e.target.value)}
                />
              </div>
            </div>

            {/* Marital Status */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Marital Status</Label>
              <Select value={form.marital_status} onValueChange={v => set("marital_status", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="married">Married</SelectItem>
                  <SelectItem value="divorced">Divorced</SelectItem>
                  <SelectItem value="widowed">Widowed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white mt-2"
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending ? "Submitting..." : "Submit Registration"}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          Your information is kept private and secure.
        </p>
      </div>
    </div>
  );
}
