// Launch scope guard (Phase 6): calls to server functions of DEFERRED feature
// areas (not deployed for launch) short-circuit with FeatureUnavailableError
// instead of failing with network/CORS/404 errors. Installed once at startup.
import { supabase } from "@/integrations/supabase/client";
import { deferredFeatureForFunction, FeatureUnavailableError } from "@/config/launchFlags";

let installed = false;
export function installFunctionGuard(): void {
  if (installed) return;
  // supabase.functions is a getter returning a new FunctionsClient each time;
  // patch the shared prototype so every instance is guarded.
  const proto = Object.getPrototypeOf(supabase.functions) as { invoke: (...a: unknown[]) => Promise<unknown> };
  const original = proto.invoke;
  proto.invoke = function guardedInvoke(this: unknown, ...args: unknown[]) {
    const feature = typeof args[0] === "string" ? deferredFeatureForFunction(args[0]) : null;
    if (feature) return Promise.resolve({ data: null, error: new FeatureUnavailableError(feature), response: undefined });
    return (original.apply(this, args) as Promise<InvokeResult>).then(surfaceFunctionError);
  };
  installed = true;
}

// T17: on a non-2xx reply supabase-js returns error.message = "Edge Function
// returned a non-2xx status code" and data = null, so screens written as
// `data?.error ?? error.message` showed that generic text instead of the
// function's own reason. Read a COPY of the body (the original stays readable
// for callers that inspect error.context) and surface its message.
interface InvokeResult { data: unknown; error: unknown; response?: unknown }

export function functionErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  for (const k of ["error", "message", "msg"]) {
    const v = b[k];
    if (typeof v === "string" && v.trim()) return v.trim().slice(0, 300);
    if (v && typeof v === "object" && typeof (v as Record<string, unknown>).message === "string") return String((v as Record<string, unknown>).message).slice(0, 300);
  }
  return null;
}

export async function surfaceFunctionError(result: InvokeResult): Promise<InvokeResult> {
  const err = result?.error as { message?: string; context?: unknown } | null;
  const ctx = err?.context as { clone?: () => { json: () => Promise<unknown> } } | undefined;
  if (!err || !ctx || typeof ctx.clone !== "function") return result;
  try {
    const body = await ctx.clone().json();
    const message = functionErrorMessage(body);
    if (message) {
      try { err.message = message; } catch { /* read-only message */ }
      return { ...result, data: result.data ?? body };
    }
  } catch { /* not JSON */ }
  return result;
}
