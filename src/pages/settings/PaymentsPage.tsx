// Settings → Payments: connect the church's OWN IntaSend account (one account
// per church, user decision 2026-11-23). Keys go straight to the
// intasend-connect server function, are checked with IntaSend and stored in
// Vault; the browser never reads them back. Replaces the old PayHero/Daraja
// flow (its server functions were never deployed).
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Copy, KeyRound, Loader2, ShieldCheck, Smartphone, Unplug, Webhook } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toUserFacingError } from "@/lib/userFacingError";

interface Status { connected: boolean; env: "live" | "test" | null; publishable_key_hint: string | null; challenge_set: boolean; connected_at: string | null; enabled: boolean }
interface WebhookSetup { webhook_url: string; challenge: string }

async function callConnect(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("intasend-connect", { body });
  if (error) {
    // Non-2xx: supabase-js keeps the function's JSON body on error.context (a Response).
    const ctx = (error as { context?: Response }).context;
    const detail = ctx && typeof ctx.json === "function" ? await ctx.json().catch(() => null) : null;
    throw new Error((detail as { error?: string } | null)?.error ?? error.message ?? "Request failed");
  }
  if (data?.error) throw new Error(data.error);
  return data as { ok: true; env?: string; webhook_url?: string; challenge?: string };
}

function CopyRow({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-slate-500">{label}</Label>
      <div className="flex items-center gap-2">
        <code className="flex-1 break-all rounded bg-slate-100 px-3 py-2 text-xs dark:bg-slate-800" data-testid={testId}>{value}</code>
        <Button size="icon" variant="outline" aria-label={`Copy ${label}`}
          onClick={() => navigator.clipboard?.writeText(value).then(() => toast.success(`${label} copied`)).catch(() => {})}>
          <Copy className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function PaymentsPage() {
  const { tenantId, userRole } = useChurch();
  const qc = useQueryClient();
  const isAdmin = userRole === "super_admin" || userRole === "church_admin";
  const [publishable, setPublishable] = useState("");
  const [secret, setSecret] = useState("");
  const [setup, setSetup] = useState<WebhookSetup | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const { data: status, isLoading } = useQuery({
    queryKey: ["intasend-status", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("intasend_connection_status", { p_tenant_id: tenantId! });
      if (error) throw error;
      return data as unknown as Status;
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["intasend-status", tenantId] });

  const connect = useMutation({
    mutationFn: () => callConnect({ action: "connect", tenant_id: tenantId, publishable_key: publishable, secret_key: secret }),
    onSuccess: (d) => {
      setSecret(""); setPublishable("");
      if (d.webhook_url && d.challenge) setSetup({ webhook_url: d.webhook_url, challenge: d.challenge });
      toast.success(`IntaSend connected (${d.env === "live" ? "live" : "test"} account)`);
      refresh();
    },
    onError: (e: Error) => toast.error(toUserFacingError(e, e.message)),
  });
  const newChallenge = useMutation({
    mutationFn: () => callConnect({ action: "new_challenge", tenant_id: tenantId }),
    onSuccess: (d) => { if (d.webhook_url && d.challenge) setSetup({ webhook_url: d.webhook_url, challenge: d.challenge }); toast.success("New webhook challenge created"); refresh(); },
    onError: (e: Error) => toast.error(toUserFacingError(e, e.message)),
  });
  const disconnect = useMutation({
    mutationFn: () => callConnect({ action: "disconnect", tenant_id: tenantId }),
    onSuccess: () => { setSetup(null); toast.success("IntaSend disconnected. M-Pesa giving is off."); refresh(); },
    onError: (e: Error) => toast.error(toUserFacingError(e, e.message)),
    onSettled: () => setConfirmDisconnect(false),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight dark:text-white">Payment Settings</h1>
        <p className="text-sm text-slate-500">Receive M-Pesa gifts straight into your church's own IntaSend account.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
      ) : status?.connected ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 space-y-3 dark:border-emerald-900 dark:bg-emerald-950/40" data-testid="intasend-connected">
          <div className="flex flex-wrap items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <span className="font-semibold text-emerald-900 dark:text-emerald-200">IntaSend connected</span>
            <Badge variant="outline" className={status.env === "live" ? "border-emerald-600 text-emerald-700" : "border-amber-500 text-amber-700"}>
              {status.env === "live" ? "Live — real money" : "Test (sandbox)"}
            </Badge>
          </div>
          <p className="text-sm text-emerald-900/80 dark:text-emerald-200/80">
            Key {status.publishable_key_hint} · connected {status.connected_at ? new Date(status.connected_at).toLocaleDateString() : ""}.
            Members and staff can now give with M-Pesa; gifts are confirmed automatically once IntaSend confirms the payment.
          </p>
          {isAdmin && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => newChallenge.mutate()} disabled={newChallenge.isPending}>
                <Webhook className="h-4 w-4 mr-1" />Show webhook setup (new challenge)
              </Button>
              <Button variant="outline" size="sm" className="text-red-600" onClick={() => setConfirmDisconnect(true)}>
                <Unplug className="h-4 w-4 mr-1" />Disconnect
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 dark:border-slate-800 dark:bg-slate-900" data-testid="intasend-connect-form">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-green-600" />
            <h2 className="font-semibold text-slate-900 dark:text-white">Connect IntaSend</h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            In your IntaSend dashboard open <span className="font-medium">Settings → API Keys</span> and copy the publishable and secret keys.
            Live keys (<code>…_live_…</code>) take real payments; test keys (<code>…_test_…</code>) use the sandbox.
          </p>
          {!isAdmin ? (
            <p className="text-sm text-amber-700">Only a church administrator can connect the church's IntaSend account.</p>
          ) : (
            <form className="space-y-3" onSubmit={e => { e.preventDefault(); connect.mutate(); }}>
              <div className="space-y-1">
                <Label htmlFor="intasend-pub">Publishable key</Label>
                <Input id="intasend-pub" value={publishable} onChange={e => setPublishable(e.target.value)} autoComplete="off" placeholder="ISPubKey_live_…" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="intasend-secret">Secret key</Label>
                <Input id="intasend-secret" type="password" value={secret} onChange={e => setSecret(e.target.value)} autoComplete="new-password" placeholder="ISSecretKey_live_…" />
                <p className="text-xs text-slate-500 flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" />Stored encrypted on the server; never shown again.</p>
              </div>
              <Button type="submit" disabled={connect.isPending || !publishable.trim() || !secret.trim()}>
                {connect.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <KeyRound className="h-4 w-4 mr-2" />}Check and connect
              </Button>
            </form>
          )}
        </div>
      )}

      {setup && (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-5 space-y-3 dark:bg-amber-950/30" data-testid="intasend-webhook-setup">
          <h2 className="font-semibold text-amber-900 dark:text-amber-200">Last step: tell IntaSend where to send payment confirmations</h2>
          <ol className="list-decimal pl-5 text-sm text-amber-900/90 space-y-1 dark:text-amber-200/90">
            <li>In IntaSend open <span className="font-medium">Settings → Webhooks → New</span>.</li>
            <li>Paste the <span className="font-medium">Endpoint</span> and <span className="font-medium">Challenge</span> below.</li>
            <li>Under Events choose <span className="font-medium">Collection</span> only, then save.</li>
          </ol>
          <CopyRow label="Endpoint" value={setup.webhook_url} testId="intasend-webhook-url" />
          <CopyRow label="Challenge" value={setup.challenge} testId="intasend-webhook-challenge" />
          <p className="text-xs text-amber-800">The challenge is shown only now. If you lose it, create a new one and update IntaSend.</p>
        </div>
      )}

      <AlertDialog open={confirmDisconnect} onOpenChange={setConfirmDisconnect}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect IntaSend?</AlertDialogTitle>
            <AlertDialogDescription>M-Pesa giving stops immediately and the stored keys are deleted. Gifts already received are not affected.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => disconnect.mutate()}>Disconnect</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
