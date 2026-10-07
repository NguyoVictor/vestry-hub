/**
 * Convert backend/auth/provider errors into safe, non-technical messages for UI surfaces.
 * Keep raw error details in logs/monitoring only; never render them directly to users.
 */
export function toUserFacingError(error: unknown, fallback = "Something went wrong. Please try again."): string {
  const message = extractMessage(error);
  if (!message) return fallback;

  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials") || normalized.includes("invalid credentials")) {
    return "The email or password is incorrect.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Please verify your email address before signing in.";
  }
  if (normalized.includes("user already registered") || normalized.includes("already been registered")) {
    return "An account with this email already exists.";
  }
  if (normalized.includes("password") && (normalized.includes("weak") || normalized.includes("length"))) {
    return "Please choose a stronger password and try again.";
  }
  if (normalized.includes("rate limit") || normalized.includes("too many requests") || normalized.includes("429")) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  if (
    normalized.includes("permission denied") || normalized.includes("not authorized") ||
    normalized.includes("unauthorized") || normalized.includes("forbidden") ||
    normalized.includes("row-level security") || normalized.includes("row level security") ||
    normalized.includes("rls")
  ) {
    return "You do not have permission to perform this action.";
  }

  if (normalized.includes("duplicate key") || normalized.includes("unique constraint") || normalized.includes("already exists")) {
    return "This record already exists.";
  }
  if (normalized.includes("foreign key") || normalized.includes("violates foreign key")) {
    return "This item is linked to other records and cannot be changed that way.";
  }
  if (normalized.includes("not-null") || normalized.includes("null value") || normalized.includes("required")) {
    return "Please complete all required fields and try again.";
  }
  if (normalized.includes("capacity reached")) return "This item has reached its capacity.";
  if (normalized.includes("overlap") && normalized.includes("booking")) {
    return "That time is already booked. Please choose another time.";
  }

  if (
    normalized.includes("failed to fetch") || normalized.includes("network") ||
    normalized.includes("timeout") || normalized.includes("connection")
  ) {
    return "We could not connect to the service. Check your connection and try again.";
  }

  if (
    /\b(22|23|28|40|42|53|54|55|57|58|p0)[0-9a-z]{3}\b/i.test(message) ||
    normalized.includes("postgres") || normalized.includes("postgrest") ||
    normalized.includes("relation ") || normalized.includes("column ") ||
    normalized.includes("schema ") || normalized.includes("constraint ") ||
    normalized.includes("sqlstate") || normalized.includes("pgrst")
  ) {
    return fallback;
  }

  return fallback;
}

function extractMessage(error: unknown): string {
  if (error instanceof Error) return error.message?.trim() ?? "";
  if (typeof error === "string") return error.trim();
  if (error && typeof error === "object" && "message" in error) {
    const value = (error as { message?: unknown }).message;
    return typeof value === "string" ? value.trim() : "";
  }
  return "";
}
