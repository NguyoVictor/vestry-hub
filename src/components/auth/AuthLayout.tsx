import { Link } from "react-router-dom";
import { Shield, Clock, Sparkles, Users, DollarSign, Heart, Lock } from "lucide-react";

interface AuthLayoutProps {
  children: React.ReactNode;
}

const features = [
  { icon: Users, label: "Member Growth", sub: "Smart CRM" },
  { icon: DollarSign, label: "Financial Tracking", sub: "Real-time" },
  { icon: Heart, label: "Giving Management", sub: "Simplified" },
  { icon: Lock, label: "Data Security", sub: "Bank-grade" },
];

const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div className="flex min-h-screen">
      {/* Left branding panel */}
      <div className="hidden w-1/2 flex-col justify-between bg-sidebar p-10 lg:flex">
        <div>
          <Link to="/" className="mb-2 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-sidebar-foreground">Vestry</h2>
              <p className="text-sm text-sidebar-foreground/60">Church Management Reimagined</p>
            </div>
          </Link>

          <div className="mt-2 flex gap-0.5">
            {[...Array(5)].map((_, i) => (
              <span key={i} className="text-yellow-400 text-lg">★</span>
            ))}
          </div>

          <h3 className="mt-10 max-w-md text-3xl font-extrabold leading-tight text-sidebar-foreground">
            Manage members, giving, services, and generate reports{" "}
            <span className="text-accent">in one simple system</span>
          </h3>

          <p className="mt-4 text-sm text-sidebar-foreground/70">
            Trusted by 500+ churches worldwide.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-3">
            {features.map((f) => (
              <div
                key={f.label}
                className="flex items-center gap-3 rounded-lg bg-sidebar-accent/10 px-4 py-3"
              >
                <f.icon className="h-5 w-5 text-accent" />
                <div>
                  <p className="text-sm font-semibold text-sidebar-foreground">{f.label}</p>
                  <p className="text-xs text-sidebar-foreground/50">{f.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-center text-sm font-medium text-accent">
            Trusted by 500+ churches worldwide
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-sidebar-foreground/50">
            <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> SSL Secured</span>
            <span>·</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> 5-min Setup</span>
            <span>·</span>
            <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" /> Free Trial</span>
          </div>
          <Link
            to="/auth/signup"
            className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-accent to-primary py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            <Sparkles className="h-4 w-4" />
            Start Free Today — No Credit Card Required
          </Link>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex w-full flex-1 items-center justify-center bg-gradient-to-br from-background via-background to-secondary/30 p-6 lg:w-1/2">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
