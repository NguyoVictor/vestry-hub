// "How to connect M-Pesa" — plain-language steps for church admins, shown on
// Settings → Payments. Three paths: IntaSend (fastest), IntaSend with the
// church's own paybill/till, or Safaricom Daraja direct.
import { BookOpen, ChevronDown } from "lucide-react";

function Path({ title, when, steps, money, testId }: { title: string; when: string; steps: React.ReactNode[]; money: string; testId: string }) {
  return (
    <details className="group rounded-lg border border-slate-200 bg-white open:shadow-sm dark:border-slate-800 dark:bg-slate-900" data-testid={testId}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3">
        <span>
          <span className="block font-medium text-slate-900 dark:text-white">{title}</span>
          <span className="block text-xs text-slate-500">{when}</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-3 px-4 pb-4 text-sm text-slate-700 dark:text-slate-300">
        <ol className="list-decimal space-y-1.5 pl-5">{steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
        <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300"><span className="font-medium">Where the money goes:</span> {money}</p>
      </div>
    </details>
  );
}

export function MpesaConnectGuide() {
  return (
    <section className="space-y-3" aria-labelledby="mpesa-guide-title" data-testid="mpesa-connect-guide">
      <h2 id="mpesa-guide-title" className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
        <BookOpen className="h-5 w-5 text-purple-600" />How to connect M-Pesa
      </h2>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Gifts always go to <span className="font-medium">your church's own account</span> — never to Vestry. Pick the path that fits your church.
        Givers pay the small M-Pesa processing fee, so the church receives the full gift.
      </p>

      <Path
        testId="guide-intasend"
        title="1. IntaSend — quickest to set up"
        when="Best if your church has no paybill or till yet."
        steps={[
          <>Open an IntaSend account for the church at <span className="font-medium">payment.intasend.com</span> and complete their verification (KYC) — they usually ask for the church's registration documents, KRA PIN and the officials' IDs.</>,
          <>In IntaSend go to <span className="font-medium">Settings → API Keys</span> and copy the <span className="font-medium">publishable</span> and <span className="font-medium">secret</span> keys (use the <code>_live_</code> keys for real gifts).</>,
          <>On this page choose <span className="font-medium">IntaSend</span>, paste both keys and click <span className="font-medium">Check and connect</span>.</>,
          <>Vestry then shows an <span className="font-medium">Endpoint</span> and a <span className="font-medium">Challenge</span>. In IntaSend open <span className="font-medium">Settings → Webhooks → New</span>, paste both, tick only <span className="font-medium">Collection</span>, and save. Gifts are then confirmed automatically.</>,
        ]}
        money="into the church's IntaSend wallet. Withdraw to the church's bank or M-Pesa from the IntaSend dashboard (IntaSend's withdrawal fees apply)."
      />

      <Path
        testId="guide-intasend-own-shortcode"
        title="2. IntaSend with your own paybill or till"
        when="Best if your church already has a Safaricom paybill or till and wants IntaSend's simple setup."
        steps={[
          <>Do steps 1–4 of path 1.</>,
          <>Make sure your paybill / till has <span className="font-medium">M-Pesa Org Portal</span> access (org.ke.m-pesa.com) and a <span className="font-medium">Daraja app that has gone live</span> with that shortcode (see path 3, steps 1–3). Safaricom emails the passkey when the app goes live.</>,
          <>In IntaSend open <span className="font-medium">Integrations → M-Pesa settings</span>, choose PayBill or TillNumber, enter the shortcode, the Daraja consumer key, consumer secret and passkey, then click <span className="font-medium">Activate</span>.</>,
          <>Nothing changes on this page — keep IntaSend connected here.</>,
        ]}
        money="straight into your paybill or till. Ask IntaSend about their fee for own-shortcode collections."
      />

      <Path
        testId="guide-daraja"
        title="3. Safaricom Daraja — direct to your paybill or till"
        when="Best if your church has a paybill or till and wants no intermediary."
        steps={[
          <>You need a Safaricom <span className="font-medium">paybill</span> or <span className="font-medium">till (Buy Goods)</span> with M-Pesa Org Portal access — ask Safaricom customer care if you don't have it.</>,
          <>Create an account at <span className="font-medium">developer.safaricom.co.ke</span>, create an app with <span className="font-medium">M-Pesa Express</span>, and click <span className="font-medium">Go Live</span> for your shortcode (Safaricom verifies it with the Org Portal administrator).</>,
          <>Safaricom emails the <span className="font-medium">passkey</span>. From the live app copy the <span className="font-medium">consumer key</span> and <span className="font-medium">consumer secret</span>.</>,
          <>On this page choose <span className="font-medium">Safaricom Daraja</span>, select <span className="font-medium">Live</span> and Paybill or Till, enter the paybill number (or the store number and till number), the key, secret and passkey, then click <span className="font-medium">Check and connect</span>. Nothing else needs setting up — Vestry gives Safaricom the confirmation address with every payment.</>,
        ]}
        money="straight into your paybill or till. Safaricom's transaction charges follow your paybill / till tariff."
      />
    </section>
  );
}
