// Launch scope (user decisions 2026-11-20, launch 2026-11-24): these feature
// areas are DEFERRED. Their server functions are not deployed, so their pages
// are hidden and their function calls short-circuit with a clear message
// instead of failing with network/CORS errors. Turn an area back on per
// environment with VITE_FEATURE_<NAME>=true once its functions are reviewed,
// deployed and its provider credentials are configured.
const env = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};
const on = (v: string | undefined) => v === "true" || v === "1";

export const LAUNCH_FEATURES = {
  ai: on(env.VITE_FEATURE_AI),                          // Findings 10, 11, 20 (AI tools/insights/course generation)
  media: on(env.VITE_FEATURE_MEDIA),                    // Findings 12, 13, 15 + Graphics (Canva). Church Studio removed (product, Phase 7)
  livestream: on(env.VITE_FEATURE_LIVESTREAM),          // Finding 16
  appEmail: on(env.VITE_FEATURE_APP_EMAIL),             // Resend-backed app emails
  sms: on(env.VITE_FEATURE_SMS),                        // Africa's Talking
  push: on(env.VITE_FEATURE_PUSH),                      // FCM push notifications
  sentryFeed: on(env.VITE_FEATURE_SENTRY_FEED),         // Sentry issues inside the app
  paymentDevTools: on(env.VITE_FEATURE_PAYMENT_DEV_TOOLS), // PayHero/bank test panels
  liveQuiz: on(env.VITE_FEATURE_LIVE_QUIZ),             // multiplayer live quiz (T2): players cannot read sessions; needs a server-side game API
} as const;
export type LaunchFeature = keyof typeof LAUNCH_FEATURES;

export const FEATURE_LABELS: Record<LaunchFeature, string> = {
  ai: "AI tools", media: "Media & content", livestream: "Livestreaming", appEmail: "Email sending",
  sms: "SMS", push: "Push notifications", sentryFeed: "Error monitoring feed", paymentDevTools: "Payment test tools",
  liveQuiz: "Live quiz",
};

/** Admin + member-portal pages hidden while their area is deferred. */
export const DEFERRED_PATHS: ReadonlyArray<[string, LaunchFeature]> = [
  ["/ai-tools", "ai"],
  ["/graphics-studio", "media"], ["/song-library", "media"],
  ["/church-media", "media"], ["/sermon-preparation", "media"], ["/sermons", "media"],
  ["/livestreaming", "livestream"], ["/settings/livestreaming", "livestream"],
  ["/training/host", "liveQuiz"],
  ["/member/church-media", "media"], ["/member/sermons", "media"], ["/member/livestreaming", "livestream"],
];

/** Server functions that belong to a deferred area (not deployed for launch). */
export const FUNCTION_FEATURE: Readonly<Record<string, LaunchFeature>> = {
  "generate-ai-content": "ai", "generate-ai-email": "ai", "generate-sermon": "ai", "transcribe-audio": "ai",
  "process-sermon-archive": "ai", "generate-quiz": "ai",
  "canva-api": "media", "canva-oauth": "media",
  "send-communication": "appEmail", "send-member-welcome": "appEmail", "send-booking-confirmation": "appEmail",
  "legal-signature-notify": "appEmail", "data-download-request": "appEmail", "website-consultation": "appEmail",
  "process-email-automations": "appEmail", "send-bible-reminder": "appEmail",
  "africastalking-sms": "sms", "africastalking-balance": "sms", "at-sms": "sms", "send-whatsapp-message": "sms",
  "register-device-token": "push", "send-push-notification": "push",
  "fetch-sentry-issues": "sentryFeed",
  "test-payhero-api": "paymentDevTools", "test-payhero-stk": "paymentDevTools",
};

export function deferredFeatureForPath(pathname: string): LaunchFeature | null {
  const hit = DEFERRED_PATHS.find(([p]) => pathname === p || pathname.startsWith(`${p}/`));
  return hit && !LAUNCH_FEATURES[hit[1]] ? hit[1] : null;
}

export function deferredFeatureForFunction(name: string): LaunchFeature | null {
  const f = FUNCTION_FEATURE[name];
  return f && !LAUNCH_FEATURES[f] ? f : null;
}

export class FeatureUnavailableError extends Error {
  constructor(public feature: LaunchFeature) {
    super(`${FEATURE_LABELS[feature]} is not available yet.`);
    this.name = "FeatureUnavailableError";
  }
}
