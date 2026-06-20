/** Prefer first name for member-facing staff labels (e.g. "Victor" not "Church Staff"). */
export function staffDisplayName(
  firstName?: string | null,
  lastName?: string | null,
  storedName?: string | null,
): string {
  const first = (firstName || "").trim();
  if (first) return first;
  const stored = (storedName || "").trim();
  if (stored) {
    const storedFirst = stored.split(/\s+/)[0];
    if (storedFirst) return storedFirst;
  }
  const full = `${firstName || ""} ${lastName || ""}`.trim();
  return full || "Team member";
}

export function formatStaffRole(role?: string | null): string {
  if (!role) return "";
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
