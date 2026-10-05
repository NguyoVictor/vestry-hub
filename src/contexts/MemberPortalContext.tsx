import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { currentTenantBaseDomain, tenantSlugMatchesHostname } from "@/lib/tenantHost";
import { normalizeModuleConfig, type CanonicalModuleConfig } from "@/config/modules";

export interface MemberPortalData {
  memberId: string;
  userId: string; // alias for memberId — same value
  tenantId: string;
  churchId: string; // alias for tenantId
  churchSlug: string;
  churchName: string;
  churchLogoUrl: string | null;
  churchCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  dateOfBirth: string | null;
  memberSince: string;
  profileComplete: number;
  memberType: string;
  enabledModules: CanonicalModuleConfig;
}

const MemberPortalContext = createContext<MemberPortalData | null>(null);

export const useMemberPortal = () => {
  const ctx = useContext(MemberPortalContext);
  if (!ctx) throw new Error("useMemberPortal must be used within MemberPortalProvider");
  return ctx;
};

export function MemberPortalProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<MemberPortalData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const raw = localStorage.getItem("member_session");
      if (!raw) { setLoading(false); return; }

      let session: any;
      try { session = JSON.parse(raw); } catch { setLoading(false); return; }

      if (!session.memberId || !session.tenantId || !session.sessionToken || !session.expiresAt || new Date(session.expiresAt) <= new Date()) {
        localStorage.removeItem("member_session");
        setLoading(false);
        return;
      }

      const { data: context, error } = await supabase.functions.invoke("member-session-context", {
        body: {
          memberId: session.memberId,
          tenantId: session.tenantId,
          sessionToken: session.sessionToken,
        },
      });

      const member = context?.member;
      const church = context?.tenant;
      if (
        error ||
        context?.error ||
        !member ||
        !church ||
        member.tenant_id !== session.tenantId ||
        !church.slug ||
        !tenantSlugMatchesHostname(window.location.hostname, church.slug, currentTenantBaseDomain())
      ) {
        localStorage.removeItem("member_session");
        setLoading(false);
        return;
      }

      const fields = [member.first_name, member.last_name, member.phone, member.date_of_birth, member.gender];
      const filled = fields.filter(Boolean).length;
      const profileComplete = Math.round((filled / fields.length) * 100);
      const enabledModules = normalizeModuleConfig(church.enabled_modules);

      localStorage.setItem("member_session", JSON.stringify({
        ...session,
        tenantSlug: church.slug,
        enabledModules,
        expiresAt: context.expiresAt || session.expiresAt,
      }));

      setData({
        memberId: member.id,
        userId: member.id,
        tenantId: church.id,
        churchId: church.id,
        churchSlug: church.slug,
        churchName: church.name,
        churchLogoUrl: church.logo,
        churchCode: church.church_code || "",
        firstName: member.first_name || "",
        lastName: member.last_name || "",
        email: member.email || "",
        phone: member.phone || null,
        avatarUrl: member.avatar_url || null,
        dateOfBirth: member.date_of_birth || null,
        memberSince: member.created_at,
        profileComplete,
        memberType: member.member_type || "member",
        enabledModules,
      });
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return null;
  if (!data) return <Navigate to="/member/login" replace />;

  return <MemberPortalContext.Provider value={data}>{children}</MemberPortalContext.Provider>;
}
