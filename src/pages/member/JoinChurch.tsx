import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Church, Copy, CheckCircle2 } from "lucide-react";

interface SuccessData {
  memberName: string;
  churchName: string;
  churchCode: string;
  churchLogo: string | null;
}

export default function JoinChurch() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<SuccessData | null>(null);
  const [copied, setCopied] = useState(false);

  // Church lookup for branding
  const [church, setChurch] = useState<{ name: string; logo: string | null } | null>(null);
  const [churchCode, setChurchCode] = useState("");

  const [form, setForm] = useState({
    memberType: "member" as "member" | "visitor",
    firstName: "", lastName: "", gender: "", dateOfBirth: "",
    phone: "", email: "", address: "", city: "", occupation: "", maritalStatus: "",
  });

  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      const upper = code.toUpperCase();
      setChurchCode(upper);
      lookupChurch(upper);
    }
  }, []);

  const lookupChurch = async (code: string) => {
    const { data } = await supabase.from("tenants").select("name, logo").eq("church_code", code).single();
    if (data) setChurch(data);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(success!.churchCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!churchCode) { toast.error("Church code is required"); return; }
    setLoading(true);

    const { data, error } = await supabase.functions.invoke("member-register", {
      body: {
        churchCode: churchCode.trim().toUpperCase(),
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email || undefined,
        phone: form.phone,
        gender: form.gender || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        address: form.address || undefined,
        city: form.city || undefined,
        occupation: form.occupation || undefined,
        maritalStatus: form.maritalStatus || undefined,
        memberType: form.memberType,
      },
    });

    setLoading(false);

    if (error || data?.error) {
      const err = data?.error;
      if (err === "invalid_code") toast.error("Invalid church code. Please check and try again.");
      else if (err === "already_registered") toast.error("You are already registered with this church. Please sign in.");
      else toast.error("Registration failed. Please try again.");
      return;
    }

    setSuccess({
      memberName: `${form.firstName} ${form.lastName}`,
      churchName: data.churchName,
      churchCode: data.churchCode,
      churchLogo: data.churchLogo,
    });
  };

  // Success screen
  if (success) {
    return (
      <>
        <Helmet><title>Welcome! — Vestry</title></Helmet>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
          <div className="w-full max-w-md space-y-6 text-center">
            {success.churchLogo ? (
              <img src={success.churchLogo} className="w-20 h-20 rounded-full mx-auto object-cover border-4 border-white shadow-lg" alt={success.churchName} />
            ) : (
              <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center mx-auto">
                <Church className="text-indigo-600" size={36} />
              </div>
            )}

            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome to {success.churchName}! 🎉</h1>
              </div>
              <p className="text-slate-500">Your registration is complete, {success.memberName.split(" ")[0]}.</p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Your Church Access Code</p>
              <div className="flex items-center gap-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4">
                <span className="flex-1 text-2xl font-bold font-mono tracking-widest text-indigo-600 text-center">
                  {success.churchCode}
                </span>
                <Button size="icon" variant="ghost" onClick={copyCode} className="shrink-0">
                  {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                Save this code — you will need it every time you sign in to the <strong>{success.churchName}</strong> member portal.
              </p>
              <Button asChild className="w-full h-11 rounded-full">
                <Link to={`/member/login?code=${success.churchCode}`}>Sign In Now</Link>
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet><title>Member Registration — Vestry</title></Helmet>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            {church?.logo ? (
              <img src={church.logo} className="w-16 h-16 rounded-full mx-auto mb-3 object-cover" alt={church.name} />
            ) : (
              <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-3">
                <Church className="text-indigo-600" size={28} />
              </div>
            )}
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">{church?.name ?? "Join Our Church Family"}</h1>
            <p className="text-sm text-slate-500 mt-1">Please fill out this form to register as a member. We're excited to welcome you!</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <form onSubmit={submit} className="space-y-4">

              {/* Member type — required, at top */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">I am a: *</Label>
                <div className="flex gap-4">
                  {(["member", "visitor"] as const).map(type => (
                    <label key={type} className={`flex-1 flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-colors ${form.memberType === type ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" : "border-slate-200 dark:border-slate-700"}`}>
                      <input type="radio" name="memberType" value={type} checked={form.memberType === type} onChange={() => setForm(f => ({ ...f, memberType: type }))} className="sr-only" />
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${form.memberType === type ? "border-indigo-500" : "border-slate-300"}`}>
                        {form.memberType === type && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                      </div>
                      <span className="capitalize font-medium text-sm">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Church code (if not pre-filled from URL) */}
              {!searchParams.get("code") && (
                <div className="space-y-1.5">
                  <Label>Church Access Code *</Label>
                  <Input
                    value={churchCode}
                    onChange={e => { const v = e.target.value.toUpperCase(); setChurchCode(v); if (v.length >= 9) lookupChurch(v); }}
                    placeholder="e.g. HOPE-2847"
                    className="h-11 uppercase font-mono tracking-widest text-center"
                    maxLength={9}
                    required
                  />
                </div>
              )}

              {/* Name */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>First Name *</Label>
                  <Input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} placeholder="Your first name" required className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label>Last Name *</Label>
                  <Input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Your last name" required className="h-10" />
                </div>
              </div>

              {/* Gender + DOB */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Gender *</Label>
                  <Select value={form.gender} onValueChange={v => setForm(f => ({ ...f, gender: v }))}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Date of Birth</Label>
                  <Input type="date" value={form.dateOfBirth} onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))} className="h-10" />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <Label>Phone Number *</Label>
                <Input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Your phone number" required className="h-10" />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Your email address" required className="h-10" />
              </div>

              {/* Address */}
              <div className="space-y-1.5">
                <Label>Address</Label>
                <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Your home address" className="h-10" />
              </div>

              {/* City + Occupation */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>City</Label>
                  <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Your city" className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label>Occupation</Label>
                  <Input value={form.occupation} onChange={e => setForm(f => ({ ...f, occupation: e.target.value }))} placeholder="Your occupation" className="h-10" />
                </div>
              </div>

              {/* Marital Status */}
              <div className="space-y-1.5">
                <Label>Marital Status</Label>
                <Select value={form.maritalStatus} onValueChange={v => setForm(f => ({ ...f, maritalStatus: v }))}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="married">Married</SelectItem>
                    <SelectItem value="divorced">Divorced</SelectItem>
                    <SelectItem value="widowed">Widowed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full h-11 rounded-full bg-orange-500 hover:bg-orange-600 text-white" disabled={loading || !form.firstName || !form.lastName || !form.phone || !form.email}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Registration"}
              </Button>

              <p className="text-xs text-center text-slate-400">Your information is kept private and secure.</p>
            </form>
          </div>

          <p className="text-center mt-4 text-sm text-slate-500">
            Already registered? <Link to="/member/login" className="text-indigo-600 font-medium">Sign In</Link>
          </p>
        </div>
      </div>
    </>
  );
}
