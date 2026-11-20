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
    return original.apply(this, args);
  };
  installed = true;
}
