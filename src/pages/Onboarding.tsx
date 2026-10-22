import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Church, Phone, Target, ArrowRight, Loader2 } from "lucide-react";
import { countries, getCurrencyByCountry } from "@/lib/country-currency";
import { ADMIN_MODULES, moduleConfigFromOnboarding } from "@/config/modules";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const onboardingServices = ADMIN_MODULES.map((module) => ({
  id: module.key,
  label: module.label,
  desc: module.description,
  core: Boolean(module.core),
}));

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
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>(["members_groups"]);

  useEffect(() => {
    let active = true;

    const checkAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session) {
          navigate("/auth/signin", { replace: true });
          return;
        }

        const { data: user, error: userError } = await supabase
          .from("users")
          .select("tenant_id")
          .eq("id", session.user.id)
          .maybeSingle();

        if (userError) throw userError;
        if (!user?.tenant_id) {
          toast.error("Your account has no church linked. Please contact support.");
          return;
        }

        const { data: tenant, error: tenantError } = await supabase
          .from("tenants")
          .select("onboarding_completed")
          .eq("id", user.tenant_id)
          .maybeSingle();

        if (tenantError) throw tenantError;
        if (!tenant) {
          toast.error("Your linked church could not be found. Please contact support.");
          return;
        }

        if (!active) return;
        if (tenant.onboarding_completed) {
          navigate("/dashboard", { replace: true });
          return;
        }
        setTenantId(user.tenant_id);
      } catch (error) {
        console.error("[Onboarding] failed to load church:", error);
        if (active) toast.error("Could not load your church account. Please refresh.");
      } finally {
        if (active) setCheckingAuth(false);
      }
    };

    void checkAuth();
    return () => { active = false; };
  }, [navigate]);

  const toggleNeed = (id: string, core = false) => {
    if (core) return;
    setSelectedNeeds((prev) =>
      prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id]
    );
  };

  const selectedCountryData = countries.find((c) => c.code === phoneCountry);
  const dialCode = selectedCountryData?.dialCode || "+254";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) {
      toast.error("Church account is not ready. Please refresh before retrying.");
      return;
    }
    if (!churchName.trim()) {
      toast.error("Church name is required.");
      return;
    }

    setLoading(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) {
        toast.error("Session expired. Please sign in again.");
        navigate("/auth/signin", { replace: true });
        return;
      }

      // Always resolve the current account's existing tenant. Never treat a
      // failed lookup as permission to create a new tenant in the browser.
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("id", session.user.id)
        .maybeSingle();
      if (userError) throw userError;
      if (!user?.tenant_id) {
        toast.error("No church is linked to your account. Please contact support.");
        return;
      }

      const resolvedTenantId = user.tenant_id;
      if (tenantId && tenantId !== resolvedTenantId) {
        console.warn("[Onboarding] tenant changed; using server-linked tenant.");
      }

      const countryName = countries.find((c) => c.code === selectedCountry)?.name || selectedCountry;
      const currency = getCurrencyByCountry(countryName);
      const fullPhone = phoneNumber ? `${dialCode}${phoneNumber}` : null;

      const moduleConfig = moduleConfigFromOnboarding(selectedNeeds);

      const { data: updatedTenant, error: updateError } = await supabase
        .from("tenants")
        .update({
          name: churchName.trim(),
          city: city.trim() || null,
          country: countryName || null,
          phone: fullPhone,
          currency,
          onboarding_completed: true,
          onboarding_step: 1,
          tenant_metadata: {
            priority_needs: selectedNeeds,
          },
          enabled_modules: moduleConfig,
        })
        .eq("id", resolvedTenantId)
        .select("id, onboarding_completed")
        .maybeSingle();

      if (updateError) throw updateError;
      if (!updatedTenant || updatedTenant.onboarding_completed !== true) {
        throw new Error("Church update did not return a completed onboarding record.");
      }

      // Verify the write actually committed before navigating.
      const { data: verifiedTenant, error: verifyError } = await supabase
        .from("tenants")
        .select("onboarding_completed")
        .eq("id", resolvedTenantId)
        .maybeSingle();
      if (verifyError) throw verifyError;
      if (verifiedTenant?.onboarding_completed !== true) {
        throw new Error("Could not confirm the church setup was saved.");
      }

      toast.success("Church details saved successfully!");
      navigate("/dashboard", { replace: true });
    } catch (error) {
      console.error("[Onboarding] failed to save church details:", error);
      toast.error("Failed to save church details. Please try again.");
    } finally {
      setLoading(false);
    }
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
                <Label className="text-base font-semibold">Choose the services your church will use</Label>
                <span className="text-xs text-muted-foreground">(Members & Groups is always enabled)</span>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">
                Your selections control which modules are available in the Admin and Member portals. You can change them later in Settings.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {onboardingServices.map((need) => {
                  const isSelected = selectedNeeds.includes(need.id);
                  return (
                    <button
                      key={need.id}
                      type="button"
                      onClick={() => toggleNeed(need.id, need.core)}
                      aria-pressed={isSelected}
                      disabled={need.core}
                      className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-left transition-all ${
                        isSelected
                          ? "border-accent bg-accent/5 ring-1 ring-accent"
                          : "border-border bg-card hover:border-muted-foreground/30"
                      } ${need.core ? "cursor-not-allowed opacity-80" : ""}`}
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
                        <p className="text-sm font-semibold text-card-foreground">{need.label}{need.core ? " (Core)" : ""}</p>
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
            disabled={loading || !tenantId}
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
