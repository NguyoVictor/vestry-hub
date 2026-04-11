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

const HOW_HEARD_OPTIONS = [
  "Friend or Family",
  "Social Media",
  "Walk-in",
  "Church Event",
  "Online Search",
  "Billboard / Poster",
  "Radio / TV",
  "WhatsApp",
  "Other",
];

interface SuccessData {
  type: "member" | "visitor";
  name: string;
  churchName: string;
  churchCode?: string;
  churchLogo: string | null;
}

export default function JoinChurch() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<SuccessData | null>(null);
  const [copied, setCopied] = useState(false);
  const [church, setChurch] = useState<{ name: string; logo: string | null } | null>(null);
  const [churchCode, setChurchCode] = useState("");
  // Track whether user arrived via QR scan (code pre-filled from URL)
  const [arrivedViaQR, setArrivedViaQR] = useState(false);

  // Routing question — shown first
  const [memberType, setMemberType] = useState<"member" | "visitor" | null>(null);

  // Shared fields
  const [form, setForm] = useState({
    firstName: "", lastName: "", phone: "", email: "",
    // Member-only
    gender: "", dateOfBirth: "", address: "", city: "", occupation: "", maritalStatus: "",
    // Visitor fields
    howHeard: "", ageGroup: "", preferredContact: "phone_call", prayerRequest: "",
  });

  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      const upper = code.toUpperCase();
      setChurchCode(upper);
      setArrivedViaQR(true);
      lookupChurch(upper);
    }
  }, []);

  const lookupChurch = async (code: string) => {
    const { data } = await supabase.from("tenants").select("name, logo").eq("church_code", code).single();
    if (data) setChurch(data);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(success!.churchCode!);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!churchCode) { toast.error("Church code is required"); return; }
    if (!memberType) { toast.error("Please select if you are a Visitor or Member"); return; }
    setLoading(true);

    const { data, error } = await supabase.functions.invoke("member-register", {
      body: {
        churchCode: churchCode.trim().toUpperCase(),
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email || undefined,
        phone: form.phone,
        memberType,
        howHeard: form.howHeard || undefined,
        registrationSource: arrivedViaQR ? "qr_scan" : "form",
        // Visitor-specific fields
        ...(memberType === "visitor" ? {
          gender: form.gender || undefined,
          ageGroup: form.ageGroup || undefined,
          city: form.city || undefined,
          preferredContact: form.preferredContact || undefined,
          prayerRequest: form.prayerRequest || undefined,
        } : {}),
        // Member-only fields
        ...(memberType === "member" ? {
          gender: form.gender || undefined,
          dateOfBirth: form.dateOfBirth || undefined,
          address: form.address || undefined,
          city: form.city || undefined,
          occupation: form.occupation || undefined,
          maritalStatus: form.maritalStatus || undefined,
        } : {}),
      },
    });

    setLoading(false);

    if (error || data?.error) {
      const err = data?.error;
      if (err === "invalid_code") toast.error("Invalid church code. Please check and try again.");
      else if (err === "already_registered") toast.error("You are already registered. Please sign in.");
      else toast.error("Registration failed. Please try again.");
      return;
    }

    setSuccess({
      type: data.type,
      name: `${form.firstName} ${form.lastName}`,
      churchName: data.churchName,
      churchCode: data.churchCode,
      churchLogo: data.churchLogo,
    });
  };

  // ── Success screen ──────────────────────────────────────────────────────────
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
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {success.type === "visitor" ? `Welcome, ${success.name.split(" ")[0]}! 👋` : `Welcome to ${success.churchName}! 🎉`}
                </h1>
              </div>
              {success.type === "visitor" ? (
                <p className="text-slate-500">Your visit has been recorded. We're glad you came!</p>
              ) : (
                <p className="text-slate-500">Your registration is complete. An admin will review and approve your membership.</p>
              )}
            </div>

            {/* Member gets church code to sign in later */}
            {success.type === "member" && success.churchCode && (
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
                  Save this code — you'll need it to sign in once your membership is approved.
                </p>
                <Button asChild className="w-full h-11 rounded-full">
                  <Link to={`/member/login?code=${success.churchCode}`}>Sign In</Link>
                </Button>
              </div>
            )}

            {success.type === "visitor" && (
              <p className="text-sm text-slate-400">The church team will be in touch with you soon.</p>
            )}
          </div>
        </div>
      </>
    );
  }

  // ── Step 1: Routing question ────────────────────────────────────────────────
  if (!memberType) {
    return (
      <>
        <Helmet><title>Join Us — Vestry</title></Helmet>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
          <div className="w-full max-w-md space-y-6">
            <div className="text-center">
              {church?.logo ? (
                <img src={church.logo} className="w-16 h-16 rounded-full mx-auto mb-3 object-cover" alt={church.name} />
              ) : (
                <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-3">
                  <Church className="text-indigo-600" size={28} />
                </div>
              )}
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">{church?.name ?? "Welcome!"}</h1>
              <p className="text-sm text-slate-500 mt-1">Are you joining us for the first time or are you a member?</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setMemberType("visitor")}
                className="flex flex-col items-center gap-3 p-6 bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all group"
              >
                <div className="h-14 w-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  👋
                </div>
                <div className="text-center">
                  <p className="font-semibold text-slate-800 dark:text-white">Visitor</p>
                  <p className="text-xs text-slate-500 mt-0.5">First time here</p>
                </div>
              </button>

              <button
                onClick={() => setMemberType("member")}
                className="flex flex-col items-center gap-3 p-6 bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all group"
              >
                <div className="h-14 w-14 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  ✝️
                </div>
                <div className="text-center">
                  <p className="font-semibold text-slate-800 dark:text-white">Member</p>
                  <p className="text-xs text-slate-500 mt-0.5">I want to join</p>
                </div>
              </button>
            </div>

            <p className="text-center text-sm text-slate-400">
              Already registered? <Link to="/member/login" className="text-indigo-600 font-medium">Sign In</Link>
            </p>
          </div>
        </div>
      </>
    );
  }

  // ── Step 2: Registration form (conditional on type) ─────────────────────────
  return (
    <>
      <Helmet><title>{memberType === "visitor" ? "Visitor Registration" : "Member Registration"} — Vestry</title></Helmet>
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
            <p className="text-sm text-slate-500 mt-1">
              {memberType === "visitor" ? "Welcome! Please fill in your details." : "Please fill out this form to register as a member."}
            </p>
            <button onClick={() => setMemberType(null)} className="text-xs text-indigo-500 mt-1 hover:underline">
              ← Change selection
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <form onSubmit={submit} className="space-y-4">

              {/* Church code — always shown, read-only if pre-filled from QR */}
              <div className="space-y-1.5">
                <Label>Church Access Code *</Label>
                <Input
                  value={churchCode}
                  onChange={e => {
                    if (arrivedViaQR) return; // locked when from QR
                    const v = e.target.value.toUpperCase();
                    setChurchCode(v);
                    if (v.length >= 9) lookupChurch(v);
                  }}
                  placeholder="e.g. HOPE-2847"
                  className={`h-11 uppercase font-mono tracking-widest text-center ${arrivedViaQR ? "bg-slate-50 dark:bg-slate-800 cursor-not-allowed opacity-70" : ""}`}
                  maxLength={9}
                  readOnly={arrivedViaQR}
                  required
                />
                {arrivedViaQR && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    ✓ Church code pre-filled from QR code
                  </p>
                )}
              </div>

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

              {/* Phone */}
              <div className="space-y-1.5">
                <Label>Phone Number *</Label>
                <Input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Your phone number" required className="h-10" />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label>Email {memberType === "member" ? "*" : ""}</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Your email address" required={memberType === "member"} className="h-10" />
              </div>

              {/* VISITOR-ONLY: Full visitor fields */}
              {memberType === "visitor" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Gender</Label>
                      <Select value={form.gender || undefined} onValueChange={v => setForm(f => ({ ...f, gender: v }))}>
                        <SelectTrigger className="h-10"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Age Group</Label>
                      <Select value={form.ageGroup || undefined} onValueChange={v => setForm(f => ({ ...f, ageGroup: v }))}>
                        <SelectTrigger className="h-10"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="under_18">Under 18</SelectItem>
                          <SelectItem value="18_25">18-25</SelectItem>
                          <SelectItem value="26_35">26-35</SelectItem>
                          <SelectItem value="36_50">36-50</SelectItem>
                          <SelectItem value="51_65">51-65</SelectItem>
                          <SelectItem value="over_65">Over 65</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>City</Label>
                    <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Where do you live?" className="h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>How did you hear about us?</Label>
                    <Select value={form.howHeard || undefined} onValueChange={v => setForm(f => ({ ...f, howHeard: v }))}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Select an option" /></SelectTrigger>
                      <SelectContent>
                        {HOW_HEARD_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Preferred Contact Method</Label>
                    <Select value={form.preferredContact} onValueChange={v => setForm(f => ({ ...f, preferredContact: v }))}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="phone_call">Phone Call</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Prayer Request (Optional)</Label>
                    <textarea
                      value={form.prayerRequest}
                      onChange={e => setForm(f => ({ ...f, prayerRequest: e.target.value }))}
                      placeholder="Is there anything you'd like us to pray about?"
                      rows={3}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                    />
                  </div>
                </>
              )}

              {/* MEMBER-ONLY: Additional fields */}
              {memberType === "member" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Gender</Label>
                      <Select value={form.gender || undefined} onValueChange={v => setForm(f => ({ ...f, gender: v }))}>
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

                  <div className="space-y-1.5">
                    <Label>Address</Label>
                    <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Your home address" className="h-10" />
                  </div>

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

                  <div className="space-y-1.5">
                    <Label>Marital Status</Label>
                    <Select value={form.maritalStatus || undefined} onValueChange={v => setForm(f => ({ ...f, maritalStatus: v }))}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Single</SelectItem>
                        <SelectItem value="married">Married</SelectItem>
                        <SelectItem value="divorced">Divorced</SelectItem>
                        <SelectItem value="widowed">Widowed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <Button
                type="submit"
                className="w-full h-11 rounded-full bg-orange-500 hover:bg-orange-600 text-white"
                disabled={loading || !form.firstName || !form.lastName || !form.phone || (memberType === "member" && !form.email)}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : memberType === "visitor" ? "Submit Visit" : "Submit Registration"}
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
