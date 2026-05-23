import { Link, useLocation } from "react-router-dom";
import SilkOGL from "@/components/SilkOGL";
import logo from "@/assets/logo.png";

interface AuthLayoutProps {
  children: React.ReactNode;
}

const TAGLINES: Record<string, { line1: string; line2: string }> = {
  "/auth/signin": {
    line1: "Welcome back.",
    line2: "Your church is running.",
  },
  "/auth/signup": {
    line1: "Get started today.",
    line2: "Your congregation is waiting.",
  },
  "/auth/forgot-password": {
    line1: "No worries.",
    line2: "We'll get you back in.",
  },
  "/auth/reset-password": {
    line1: "Almost there.",
    line2: "Set a new password and get back to it.",
  },
};

const AuthLayout = ({ children }: AuthLayoutProps) => {
  const { pathname } = useLocation();
  const tagline = TAGLINES[pathname] ?? TAGLINES["/auth/signin"];

  return (
    <div className="flex min-h-screen">
      {/* Left branding panel */}
      <div
        className="hidden md:flex"
        style={{
          position: "relative",
          width: "45%",
          minHeight: "100vh",
          overflow: "hidden",
          background: "#0d0e24",
          flexShrink: 0,
        }}
      >
        {/* Layer 1 — SilkOGL anchored bottom-right */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: "75%",
            height: "55%",
            pointerEvents: "none",
            zIndex: 0,
            maskImage: "radial-gradient(ellipse at bottom right, black 40%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse at bottom right, black 40%, transparent 75%)",
          }}
        >
          <SilkOGL
            color="#3D1C8E"
            speed={4}
            scale={1.2}
            noiseIntensity={1.2}
            rotation={0.3}
          />
        </div>

        {/* Layer 2 — Content */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            padding: "40px",
            width: "100%",
          }}
        >
          {/* Logo — top left */}
          <div style={{ position: "absolute", top: 32, left: 32 }}>
            <Link to="/">
              <img src={logo} width={44} alt="Vestry Hub" style={{ height: "auto" }} />
            </Link>
          </div>

          {/* Tagline — vertically centered */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              paddingLeft: 8,
            }}
          >
            <p style={{ fontSize: "2.2rem", fontWeight: 700, color: "#ffffff", lineHeight: 1.2, marginBottom: 12 }}>
              {tagline.line1}
            </p>
            <p style={{ fontSize: "1rem", color: "rgba(255,255,255,0.6)", margin: 0 }}>
              {tagline.line2}
            </p>
          </div>
        </div>
      </div>

      {/* Right form panel — unchanged */}
      <div className="flex w-full flex-1 items-center justify-center bg-gradient-to-br from-background via-background to-secondary/30 p-6 lg:w-1/2">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
