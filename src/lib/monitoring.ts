import * as Sentry from "@sentry/react";
import posthog from "posthog-js";

// ── Sentry ────────────────────────────────────────────────────────────────────

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn || !import.meta.env.PROD) return;

  try {
    Sentry.init({
      dsn,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false }),
      ],
      tracesSampleRate: 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    });
  } catch {
    // fail silently — never crash the app
  }
}

// ── PostHog ───────────────────────────────────────────────────────────────────

export function initPostHog() {
  const key = import.meta.env.VITE_POSTHOG_KEY;
  const host = import.meta.env.VITE_POSTHOG_HOST || "https://app.posthog.com";
  if (!key || !import.meta.env.PROD) return;

  try {
    posthog.init(key, {
      api_host: host,
      capture_pageview: false, // we handle this manually on route change
      persistence: "localStorage",
    });
  } catch {
    // fail silently
  }
}

export function capturePageView(path: string) {
  try {
    if (import.meta.env.PROD) posthog.capture("$pageview", { $current_url: path });
  } catch { /* noop */ }
}

export function captureEvent(event: string, properties?: Record<string, unknown>) {
  try {
    if (import.meta.env.PROD) posthog.capture(event, properties);
  } catch { /* noop */ }
}

export function identifyUser(id: string, traits?: Record<string, unknown>) {
  try {
    if (import.meta.env.PROD) posthog.identify(id, traits);
  } catch { /* noop */ }
}
