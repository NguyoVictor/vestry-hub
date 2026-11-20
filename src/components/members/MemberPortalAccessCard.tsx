import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { KeyRound, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { describeProvisioningError, provisionMemberPortalAccess } from "@/lib/memberPortalProvisioning";

interface MemberPortalAccessCardProps {
  memberId: string;
  tenantId: string;
  email: string | null;
  canManage: boolean;
}

// Finding 1: show whether Member Portal access is provisioned and offer a safe,
// idempotent "Retry Portal Access Setup". No invitation/activation/approval.
export function MemberPortalAccessCard({ memberId, tenantId, email, canManage }: MemberPortalAccessCardProps) {
  const queryClient = useQueryClient();
  const [retrying, setRetrying] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const { data: provisioned, isLoading, isError } = useQuery({
    queryKey: ["member-portal-access", tenantId, memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("member_auth_memberships" as never)
        .select("member_id")
        .eq("member_id", memberId)
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (error) throw error;
      return Boolean(data);
    },
    enabled: Boolean(memberId && tenantId),
  });

  const retry = async () => {
    setRetrying(true);
    setLastError(null);
    const result = await provisionMemberPortalAccess(supabase, memberId, tenantId);
    setRetrying(false);
    if (result.ok) {
      toast.success("Member Portal access is ready.");
    } else {
      const message = describeProvisioningError(result.error);
      setLastError(message);
      toast.error(`Portal access setup failed: ${message}`);
    }
    await queryClient.invalidateQueries({ queryKey: ["member-portal-access", tenantId, memberId] });
  };

  return (
    <Card data-testid="member-portal-access-card">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <KeyRound className="h-4 w-4" />Member Portal Access
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div><span className="text-muted-foreground">Registered email:</span> {email || "None"}</div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Status:</span>
          {isLoading ? <span>Checking…</span>
            : isError ? <Badge variant="outline">Unknown</Badge>
            : provisioned ? <Badge className="bg-emerald-600 hover:bg-emerald-600" data-testid="portal-access-ready">Ready</Badge>
            : <Badge variant="destructive" data-testid="portal-access-not-ready">Not set up</Badge>}
        </div>
        {provisioned && (
          <p className="text-muted-foreground">The member signs in with this email, your church access code and a one-time email code.</p>
        )}
        {!email && <p className="text-muted-foreground">Add an email address to enable Member Portal access.</p>}
        {lastError && <p className="text-destructive" role="alert">{lastError}</p>}
        {canManage && email && !provisioned && !isLoading && (
          <Button size="sm" variant="outline" onClick={retry} disabled={retrying} className="gap-2">
            <RefreshCw className={retrying ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            {retrying ? "Setting up…" : "Retry Portal Access Setup"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
