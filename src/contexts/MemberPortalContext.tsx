import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MemberPortalData {
  memberId: string;
  userId: string; // alias for memberId — same value
  tenantId: string;
  churchId: string; // alias for tenantId
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
  enabledModules: Record<string, boolean>;
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

      if (!session.memberId || !session.tenantId) { setLoading(false); return; }

      const [memberRes, churchRes] = await Promise.all([
        supabase.from("members").select("*").eq("id", session.memberId).single(),
        supabase.from("tenants").select("id, name, logo, church_code, enabled_modules").eq("id", session.tenantId).single(),
      ]);

      const member = memberRes.data;
      const church = churchRes.data;
      if (!member || !church) { setLoading(false); return; }

      const fields = [member.first_name, member.last_name, member.phone, member.date_of_birth, member.gender];
      const filled = fields.filter(Boolean).length;
      const profileComplete = Math.round((filled / fields.length) * 100);

      // Extract member portal module visibility
      const rawModules = (church.enabled_modules as any)?.member_portal || {};
      const enabledModules: Record<string, boolean> = rawModules;

      setData({
        memberId: member.id,
        userId: member.id, // alias
        tenantId: church.tenantId,
        churchId: church.tenantId,
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
  if (!data) return null;

  return <MemberPortalContext.Provider value={data}>{children}</MemberPortalContext.Provider>;
}
