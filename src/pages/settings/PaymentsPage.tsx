// Settings → Payments: each church chooses how M-Pesa gifts reach it
// (provider choice, 20261124110000):
//   • IntaSend — the church's own IntaSend account (it may link its own
//     paybill/till inside IntaSend);
//   • Safaricom Daraja — straight to the church's own paybill / till.
// Credentials go straight to a server function (intasend-connect /
// daraja-connect), are checked with the provider and stored in Vault; the
// browser never reads them back. One active provider per church.
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, CheckCircle2, Copy, KeyRound, Loader2, ShieldCheck, Smartphone, Unplug, Webhook } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toUserFacingError } from "@/lib/userFacingError";

interface Status {
  enabled: boolean;
  provider: "intasend" | "daraja" | null;
  intasend: { connected: boolean; env: "live" | "test" | null; publishable_key_hint: string | null; challenge_set: boolean; connected_at: string | null };
  daraja: { connected: boolean; env: "sandbox" | "production" | null; shortcode: string | null; till_number: string | null; transaction_type: string | null; connected_at: string | null };
}
interface WebhookSetup { webhook_url: string; challenge: string }

async function callFn(fn: "intasend-connect" | "daraja-connect", body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) throw new Error((data as { error?: string } | null)?.error ?? error.message ?? "Request failed");
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

const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString() : "");

export default function PaymentsPage() {
  const { tenantId, userRole } = useChurch();
  const qc = useQueryClient();
  const isAdmin = userRole === "super_admin" || userRole === "church_admin";
  const [choice, setChoice] = useState<"intasend" | "daraja">("intasend");
  const [setup, setSetup] = useState<WebhookSetup | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState<null | "intasend" | "daraja">(null);
  // IntaSend form
  const [publishable, setPublishable] = useState("");
  const [secret, setSecret] = useState("");
  // Daraja form
  const [env, setEnv] = useState<"sandbox" | "production">("production");
  const [accountType, setAccountType] = useState<"paybill" | "till">("paybill");
  const [shortcode, setShortcode] = useState("");
  const [till, setTill] = useState("");
  const [consumerKey, setConsumerKey] = useState("");
  const [consumerSecret, setConsumerSecret] = useState("");
  const [passkey, setPasskey] = useState("");

  const { data: status, isLoading } = useQuery({
    queryKey: ["payment-status", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("payment_connection_status", { p_tenant_id: tenantId! });
      if (error) throw error;
      return data as unknown as Status;
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["payment-status", tenantId] });

  const connectIntasend = useMutation({
    mutationFn: () => callFn("intasend-connect", { action: "connect", tenant_id: tenantId, publishable_key: publishable, secret_key: secret }),
    onSuccess: (d) => {
      setSecret(""); setPublishable("");
      if (d.webhook_url && d.challenge) setSetup({ webhook_url: d.webhook_url, challenge: d.challenge });
      toast.success(`IntaSend connected (${d.env === "live" ? "live" : "test"} account)`);
      refresh();
    },
    onError: (e: Error) => toast.error(toUserFacingError(e, e.message)),
  });
  const connectDaraja = useMutation({
    mutationFn: () => callFn("daraja-connect", {
      action: "connect", tenant_id: tenantId, env, account_type: accountType, shortcode, till_number: till,
      consumer_key: consumerKey, consumer_secret: consumerSecret, passkey,
    }),
    onSuccess: () => {
      setConsumerKey(""); setConsumerSecret(""); setPasskey("");
      toast.success(`M-Pesa ${accountType} connected (${env === "production" ? "live" : "sandbox"})`);
      refresh();
    },
    onError: (e: Error) => toast.error(toUserFacingError(e, e.message)),
  });
  const newChallenge = useMutation({
    mutationFn: () => callFn("intasend-connect", { action: "new_challenge", tenant_id: tenantId }),
    onSuccess: (d) => { if (d.webhook_url && d.challenge) setSetup({ webhook_url: d.webhook_url, challenge: d.challenge }); toast.success("New webhook challenge created"); refresh(); },
    onError: (e: Error) => toast.error(toUserFacingError(e, e.message)),
  });
  const disconnect = useMutation({
    mutationFn: (p: "intasend" | "daraja") => callFn(p === "intasend" ? "intasend-connect" : "daraja-connect", { action: "disconnect", tenant_id: tenantId }),
    onSuccess: () => { setSetup(null); toast.success("Disconnected. M-Pesa giving is off until a provider is connected."); refresh(); },
    onError: (e: Error) => toast.error(toUserFacingError(e, e.message)),
    onSettled: () => setConfirmDisconnect(null),
  });

  const active = status?.enabled ? status.provider : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight dark:text-white">Payment Settings</h1>
        <p className="text-sm text-slate-500">Choose how M-Pesa gifts reach your church's own account.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
      ) : active === "intasend" && status ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 space-y-3 dark:border-emerald-900 dark:bg-emerald-950/40" data-testid="intasend-connected">
          <div className="flex flex-wrap items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <span className="font-semibold text-emerald-900 dark:text-emerald-200">M-Pesa via IntaSend</span>
            <Badge variant="outline" className={status.intasend.env === "live" ? "border-emerald-600 text-emerald-700" : "border-amber-500 text-amber-700"}>
              {status.intasend.env === "live" ? "Live — real money" : "Test (sandbox)"}
            </Badge>
          </div>
          <p className="text-sm text-emerald-900/80 dark:text-emerald-200/80">
            Key {status.intasend.publishable_key_hint} · connected {fmtDate(status.intasend.connected_at)}. Gifts go to your church's IntaSend account
            (or your own paybill/till if you linked it inside IntaSend) and are confirmed automatically.
          </p>
          {isAdmin && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => newChallenge.mutate()} disabled={newChallenge.isPending}>
                <Webhook className="h-4 w-4 mr-1" />Show webhook setup (new challenge)
              </Button>
              <Button variant="outline" size="sm" className="text-red-600" onClick={() => setConfirmDisconnect("intasend")}>
                <Unplug className="h-4 w-4 mr-1" />Disconnect
              </Button>
            </div>
          )}
        </div>
      ) : active === "daraja" && status ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 space-y-3 dark:border-emerald-900 dark:bg-emerald-950/40" data-testid="daraja-connected">
          <div className="flex flex-wrap items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <span className="font-semibold text-emerald-900 dark:text-emerald-200">M-Pesa direct (Safaricom Daraja)</span>
            <Badge variant="outline" className={status.daraja.env === "production" ? "border-emerald-600 text-emerald-700" : "border-amber-500 text-amber-700"}>
              {status.daraja.env === "production" ? "Live — real money" : "Sandbox"}
            </Badge>
          </div>
          <p className="text-sm text-emerald-900/80 dark:text-emerald-200/80">
            {status.daraja.transaction_type === "CustomerBuyGoodsOnline"
              ? <>Till {status.daraja.till_number} (store {status.daraja.shortcode})</>
              : <>Paybill {status.daraja.shortcode}</>} · connected {fmtDate(status.daraja.connected_at)}.
            Gifts go straight to this {status.daraja.transaction_type === "CustomerBuyGoodsOnline" ? "till" : "paybill"} and are confirmed automatically — nothing to set up in Safaricom.
          </p>
          {isAdmin && (
            <Button variant="outline" size="sm" className="text-red-600" onClick={() => setConfirmDisconnect("daraja")}>
              <Unplug className="h-4 w-4 mr-1" />Disconnect
            </Button>
          )}
        </div>
      ) : !isAdmin ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900" data-testid="intasend-connect-form">
          <p className="text-sm text-amber-700">Only a church administrator can connect the church's IntaSend account.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="M-Pesa provider" data-testid="provider-choice">
            {([
              { k: "intasend", title: "IntaSend", desc: "Use your church's own IntaSend account. Easiest to set up; IntaSend can also pay into your own paybill or till.", icon: Smartphone },
              { k: "daraja", title: "Safaricom Daraja (direct)", desc: "Straight to your own paybill or till. Needs a live Daraja app from Safaricom (consumer key, secret and passkey).", icon: Building2 },
            ] as const).map(o => (
              <button key={o.k} type="button" role="radio" aria-checked={choice === o.k} onClick={() => setChoice(o.k)}
                className={`rounded-xl border p-4 text-left ${choice === o.k ? "border-purple-600 ring-2 ring-purple-200 bg-white dark:bg-slate-900" : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"}`}>
                <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white"><o.icon className="h-5 w-5" />{o.title}</div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{o.desc}</p>
              </button>
            ))}
          </div>

          {choice === "intasend" ? (
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 dark:border-slate-800 dark:bg-slate-900" data-testid="intasend-connect-form">
              <h2 className="font-semibold text-slate-900 dark:text-white">Connect IntaSend</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                In your IntaSend dashboard open <span className="font-medium">Settings → API Keys</span> and copy the publishable and secret keys.
                Live keys (<code>…_live_…</code>) take real payments; test keys (<code>…_test_…</code>) use the sandbox.
              </p>
              <form className="space-y-3" onSubmit={e => { e.preventDefault(); connectIntasend.mutate(); }}>
                <div className="space-y-1">
                  <Label htmlFor="intasend-pub">Publishable key</Label>
                  <Input id="intasend-pub" value={publishable} onChange={e => setPublishable(e.target.value)} autoComplete="off" placeholder="ISPubKey_live_…" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="intasend-secret">Secret key</Label>
                  <Input id="intasend-secret" type="password" value={secret} onChange={e => setSecret(e.target.value)} autoComplete="new-password" placeholder="ISSecretKey_live_…" />
                  <p className="text-xs text-slate-500 flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" />Stored encrypted on the server; never shown again.</p>
                </div>
                <Button type="submit" disabled={connectIntasend.isPending || !publishable.trim() || !secret.trim()}>
                  {connectIntasend.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <KeyRound className="h-4 w-4 mr-2" />}Check and connect
                </Button>
              </form>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 dark:border-slate-800 dark:bg-slate-900" data-testid="daraja-connect-form">
              <h2 className="font-semibold text-slate-900 dark:text-white">Connect your paybill / till (Daraja)</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                On <span className="font-medium">developer.safaricom.co.ke</span> open your app (gone live with this shortcode) and copy the consumer key and
                consumer secret; Safaricom emailed the passkey when the app went live. Use Sandbox only for testing.
              </p>
              <form className="space-y-3" onSubmit={e => { e.preventDefault(); connectDaraja.mutate(); }}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Environment</Label>
                    <div className="flex gap-2">
                      {(["production", "sandbox"] as const).map(v => (
                        <Button key={v} type="button" size="sm" variant={env === v ? "default" : "outline"} aria-pressed={env === v} onClick={() => setEnv(v)}>
                          {v === "production" ? "Live" : "Sandbox"}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Account type</Label>
                    <div className="flex gap-2">
                      {(["paybill", "till"] as const).map(v => (
                        <Button key={v} type="button" size="sm" variant={accountType === v ? "default" : "outline"} aria-pressed={accountType === v} onClick={() => setAccountType(v)}>
                          {v === "paybill" ? "Paybill" : "Till (Buy Goods)"}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="daraja-shortcode">{accountType === "till" ? "Store (head office) number" : "Paybill number"}</Label>
                    <Input id="daraja-shortcode" inputMode="numeric" value={shortcode} onChange={e => setShortcode(e.target.value.replace(/\D/g, ""))} placeholder="e.g. 4123456" />
                  </div>
                  {accountType === "till" && (
                    <div className="space-y-1">
                      <Label htmlFor="daraja-till">Till number</Label>
                      <Input id="daraja-till" inputMode="numeric" value={till} onChange={e => setTill(e.target.value.replace(/\D/g, ""))} placeholder="e.g. 5123456" />
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="daraja-key">Consumer key</Label>
                  <Input id="daraja-key" value={consumerKey} onChange={e => setConsumerKey(e.target.value)} autoComplete="off" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="daraja-secret">Consumer secret</Label>
                  <Input id="daraja-secret" type="password" value={consumerSecret} onChange={e => setConsumerSecret(e.target.value)} autoComplete="new-password" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="daraja-passkey">Passkey</Label>
                  <Input id="daraja-passkey" type="password" value={passkey} onChange={e => setPasskey(e.target.value)} autoComplete="new-password" />
                  <p className="text-xs text-slate-500 flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" />Stored encrypted on the server; never shown again.</p>
                </div>
                <Button type="submit" disabled={connectDaraja.isPending || !shortcode || (accountType === "till" && !till) || !consumerKey.trim() || !consumerSecret.trim() || !passkey.trim()}>
                  {connectDaraja.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <KeyRound className="h-4 w-4 mr-2" />}Check and connect
                </Button>
              </form>
            </div>
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

      <AlertDialog open={!!confirmDisconnect} onOpenChange={o => { if (!o) setConfirmDisconnect(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {confirmDisconnect === "daraja" ? "your paybill / till" : "IntaSend"}?</AlertDialogTitle>
            <AlertDialogDescription>M-Pesa giving stops immediately and the stored credentials are deleted. Gifts already received are not affected. You can then connect the other provider.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => confirmDisconnect && disconnect.mutate(confirmDisconnect)}>Disconnect</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
