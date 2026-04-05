import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Church, Phone, Target, ArrowRight, Loader2 } from "lucide-react";
import { countries, getCurrencyByCountry } from "@/lib/country-currency";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const priorityNeeds = [
  { id: "online_giving", label: "Online Giving", desc: "Accept tithes & offerings digitally" },
  { id: "member_management", label: "Member Management", desc: "Track & organize your congregation" },
  { id: "attendance_tracking", label: "Attendance Tracking", desc: "Monitor service attendance" },
  { id: "event_management", label: "Event Management", desc: "Plan and coordinate church events" },
  { id: "children_church", label: "Children's Church", desc: "Manage kids ministry check-in" },
  { id: "communication", label: "Communication", desc: "SMS, email & announcements" },
  { id: "volunteer_scheduling", label: "Volunteer Scheduling", desc: "Coordinate ministry teams" },
  { id: "financial_reporting", label: "Financial Reporting", desc: "Track income & expenses" },
  { id: "multi_branch", label: "Multi-Branch Management", desc: "Manage multiple locations" },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [tenantId, setTenantId] = useState("");

  const [churchName, setChurchName] = useState("");
  const [city, setCity] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [phoneCountry, setPhoneCountry] = useState("KE");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth/signin", { replace: true });
        return;
      }

      const { data: user } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("id", session.user.id)
        .maybeSingle();

      console.log("[Onboarding] checkAuth user row:", user);

      if (user?.tenant_id) {
        const { data: tenant } = await supabase
          .from("tenants")
          .select("onboarding_completed")
          .eq("id", user.tenant_id)
          .maybeSingle();

        console.log("[Onboarding] checkAuth tenant row:", tenant);

        if (tenant?.onboarding_completed) {
          // Already completed — go straight to dashboard
          navigate("/dashboard", { replace: true });
          return;
        }
        setTenantId(user.tenant_id);
      }
      setCheckingAuth(false);
    };
    checkAuth();
  }, [navigate]);

  const toggleNeed = (id: string) => {
    setSelectedNeeds((prev) =>
      prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id]
    );
  };

  const selectedCountryData = countries.find((c) => c.code === phoneCountry);
  const dialCode = selectedCountryData?.dialCode || "+254";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!churchName.trim()) {
      toast.error("Church name is required.");
      return;
    }

    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Session expired. Please sign in again.");
      navigate("/auth/signin", { replace: true });
      return;
    }

    const countryName = countries.find((c) => c.code === selectedCountry)?.name || selectedCountry;
    const currency = getCurrencyByCountry(countryName);
    const fullPhone = phoneNumber ? `${dialCode}${phoneNumber}` : null;

    console.log("[Onboarding] submit — tenantId in state:", tenantId);

    // If the trigger ran correctly, tenantId is already set from useEffect.
    // If not (edge case), fetch it fresh from the DB before deciding what to do.
    let resolvedTenantId = tenantId;

    if (!resolvedTenantId) {
      console.log("[Onboarding] tenantId empty — fetching fresh from DB");
      const { data: freshUser } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("id", session.user.id)
        .maybeSingle();

      console.log("[Onboarding] fresh user row:", freshUser);
      resolvedTenantId = freshUser?.tenant_id || "";
    }

    if (!resolvedTenantId) {
      // Trigger genuinely didn't run — create tenant + link user manually
      console.log("[Onboarding] no tenant found — creating manually");
      const newTenantId = crypto.randomUUID();
      const churchCode = (
        Math.random().toString(36).substring(2, 6) +
        Math.random().toString(36).substring(2, 6)
      ).toUpperCase();
      const now = new Date().toISOString();

      const { error: tenantError } = await supabase.from("tenants").insert({
        id: newTenantId,
        slug: churchCode.toLowerCase(),
        name: churchName.trim(),
        church_code: churchCode,
        city: city.trim() || null,
        country: countryName || null,
        phone: fullPhone,
        currency,
        subscription_plan: "free",
        subscription_tier: "free",
        subscription_status: "trial",
        onboarding_completed: true,
        onboarding_step: 1,
        tenant_metadata: { priority_needs: selectedNeeds },
        created_at: now,
        updated_at: now,
      });

      if (tenantError) {
        console.error("[Onboarding] tenant insert error:", tenantError);
        setLoading(false);
        toast.error("Failed to create church. Please try again.");
        return;
      }

      const fullName = session.user.user_metadata?.full_name || "";
      const firstName = fullName.split(" ")[0] || "Admin";
      const lastName = fullName.split(" ").slice(1).join(" ") || "User";

      // Try insert; if row already exists just update the tenant_id link
      const { error: insertUserError } = await supabase.from("users").insert({
        id: session.user.id,
        tenant_id: newTenantId,
        email: session.user.email,
        first_name: firstName,
        last_name: lastName,
        role: "super_admin",
        status: "active",
        join_date: now.split("T")[0],
        created_at: now,
        updated_at: now,
        mfa_enabled: false,
        email_verified: true,
        phone_verified: false,
      });

      if (insertUserError) {
        console.log("[Onboarding] user insert failed (row exists), updating tenant_id:", insertUserError.message);
        const { error: updateUserError } = await supabase
          .from("users")
          .update({ tenant_id: newTenantId })
          .eq("id", session.user.id);

        if (updateUserError) {
          console.error("[Onboarding] user update error:", updateUserError);
          setLoading(false);
          toast.error("Failed to link user to church. Please try again.");
          return;
        }
      }

      resolvedTenantId = newTenantId;
      console.log("[Onboarding] manual creation done, resolvedTenantId:", resolvedTenantId);
    } else {
      // Tenant exists — update it with the church details from the form
      console.log("[Onboarding] updating existing tenant:", resolvedTenantId);
      const { error } = await supabase
        .from("tenants")
        .update({
          name: churchName.trim(),
          city: city.trim() || null,
          country: countryName || null,
          phone: fullPhone,
          currency,
          onboarding_completed: true,
          onboarding_step: 1,
          tenant_metadata: { priority_needs: selectedNeeds },
        })
        .eq("id", resolvedTenantId);

      if (error) {
        console.error("[Onboarding] tenant update error:", error);
        setLoading(false);
        toast.error("Failed to save church details. Please try again.");
        return;
      }
    }

    // Verify the write actually committed before navigating
    console.log("[Onboarding] verifying DB write committed...");
    let verified = false;
    for (let attempt = 0; attempt < 5; attempt++) {
      await new Promise((r) => setTimeout(r, 400));
      const { data: check } = await supabase
        .from("tenants")
        .select("onboarding_completed")
        .eq("id", resolvedTenantId)
        .maybeSingle();

      console.log(`[Onboarding] verify attempt ${attempt + 1}:`, check);
      if (check?.onboarding_completed === true) {
        verified = true;
        break;
      }
    }

    setLoading(false);

    if (!verified) {
      console.error("[Onboarding] could not verify onboarding_completed after 5 attempts");
      toast.error("Something went wrong saving your church. Please try again.");
      return;
    }

    toast.success("Church created successfully! 🎉");
    console.log("[Onboarding] verified — navigating to /dashboard");
    navigate("/dashboard", { replace: true });
  };

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30">
      <div className="mx-auto max-w-2xl px-4 py-10">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Shield className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-extrabold text-foreground">Vestry</h1>
          <h2 className="mt-3 text-xl font-bold text-foreground">Create Your Church</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Fill in your church details to get started
          </p>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit}>
          <div className="rounded-xl border border-border bg-card p-6 shadow-lg sm:p-8">
            {/* Church Details Header */}
            <div className="mb-6 flex items-center gap-3">
              <Church className="h-5 w-5 text-accent" />
              <div>
                <h3 className="text-lg font-bold text-card-foreground">Church Details</h3>
                <p className="text-sm text-muted-foreground">
                  You will be assigned as the administrator of this church
                </p>
              </div>
            </div>

            {/* Church Name */}
            <div className="mb-5 space-y-2">
              <Label htmlFor="churchName">
                Church Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="churchName"
                placeholder="e.g., Grace Community Church"
                value={churchName}
                onChange={(e) => setChurchName(e.target.value)}
                required
              />
            </div>

            {/* City + Country */}
            <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="e.g., Los Angeles"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Phone */}
            <div className="mb-8 space-y-2">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <Label>Phone Number</Label>
                <span className="text-xs text-muted-foreground">(for setup support & tips)</span>
              </div>
              <div className="flex gap-2">
                <Select value={phoneCountry} onValueChange={setPhoneCountry}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.code} {c.dialCode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Phone number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Priority Needs */}
            <div className="mb-6">
              <div className="mb-3 flex items-center gap-2">
                <Target className="h-4 w-4 text-accent" />
                <Label className="text-base font-semibold">What are your priority needs?</Label>
                <span className="text-xs text-muted-foreground">(Select all that apply)</span>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">
                Help us focus our support on what matters most to your church
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {priorityNeeds.map((need) => {
                  const isSelected = selectedNeeds.includes(need.id);
                  return (
                    <button
                      key={need.id}
                      type="button"
                      onClick={() => toggleNeed(need.id)}
                      className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-left transition-all ${
                        isSelected
                          ? "border-accent bg-accent/5 ring-1 ring-accent"
                          : "border-border bg-card hover:border-muted-foreground/30"
                      }`}
                    >
                      <div
                        className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 transition-colors ${
                          isSelected
                            ? "border-accent bg-accent"
                            : "border-muted-foreground/40"
                        }`}
                      >
                        {isSelected && (
                          <div className="flex h-full items-center justify-center">
                            <div className="h-1.5 w-1.5 rounded-full bg-accent-foreground" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-card-foreground">{need.label}</p>
                        <p className="text-xs text-muted-foreground">{need.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={loading}
            className="mt-6 w-full bg-gradient-to-r from-accent to-accent/80 py-6 text-base font-semibold text-accent-foreground shadow-lg hover:opacity-90"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Creating Church…
              </>
            ) : (
              <>
                Create Church
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Onboarding;
