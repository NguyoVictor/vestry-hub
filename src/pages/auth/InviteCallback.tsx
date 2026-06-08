import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TABLES, COLS } from '@/lib/schema';

export default function InviteCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleInvite = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        navigate("/auth/signin", { replace: true });
        return;
      }

      const userMeta = data.session.user.user_metadata || {};
      const invitedTenantId = userMeta.tenant_id;
      const invitedRole = userMeta.role;

      if (invitedTenantId && invitedRole) {
        const { data: memberData } = await supabase
          .from(TABLES.MEMBERS)
          .select(`${COLS.FIRST_NAME}, ${COLS.LAST_NAME}`)
          .eq('email', data.session.user.email)
          .eq('tenant_id', invitedTenantId)
          .maybeSingle();

        await supabase
          .from('users')
          .upsert({
            id: data.session.user.id,
            tenant_id: invitedTenantId,
            email: data.session.user.email,
            role: invitedRole,
            status: 'active',
            invitation_sent: true,
            first_name: memberData?.first_name || '',
            last_name: memberData?.last_name || '',
          }, { onConflict: 'id' });
      }

      navigate('/auth/reset-password', { replace: true });
    };

    handleInvite();
  }, [navigate]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif', color: '#71717a' }}>
      <p>Setting up your account...</p>
    </div>
  );
}
