import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MemberPortalData {
  memberId: string;
  userId: string;
  churchId: string;
  churchName: string;
  churchLogoUrl: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  memberSince: string;
  profileComplete: number;
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: membership } = await supabase
        .from("church_members")
        .select("church_id, role")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .single();

      if (!membership) { setLoading(false); return; }

      const [memberRes, churchRes] = await Promise.all([
        supabase.from("members").select("*").eq("church_id", membership.church_id).eq("user_id", user.id).single(),
        supabase.from("churches").select("id, name, logo_url").eq("id", membership.church_id).single(),
      ]);

      const member = memberRes.data;
      const church = churchRes.data;
      if (!member || !church) { setLoading(false); return; }

      const fields = [member.first_name, member.last_name, member.phone, member.date_of_birth, member.gender, member.address];
      const filled = fields.filter(Boolean).length;
      const profileComplete = Math.round((filled / fields.length) * 100);

      setData({
        memberId: member.id,
        userId: user.id,
        churchId: church.id,
        churchName: church.name,
        churchLogoUrl: church.logo_url,
        firstName: member.first_name || "",
        lastName: member.last_name || "",
        email: user.email || "",
        phone: member.phone || null,
        avatarUrl: member.avatar_url || null,
        memberSince: member.created_at,
        profileComplete,
      });
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return null;
  if (!data) return null;

  return <MemberPortalContext.Provider value={data}>{children}</MemberPortalContext.Provider>;
}
