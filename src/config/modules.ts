export const MODULE_CONFIG_VERSION = 1 as const;

export type AdminModuleKey =
  | "members_groups"
  | "attendance"
  | "giving_finance"
  | "communications"
  | "events"
  | "discipleship"
  | "volunteering"
  | "resources_media"
  | "operations"
  | "childrens_ministry"
  | "reports_analytics"
  | "branches";

export type MemberModuleKey =
  | "give_online"
  | "pledge_campaigns"
  | "my_giving_history"
  | "announcements"
  | "messages"
  | "chat_on_whatsapp"
  | "testimonies"
  | "share_your_testimony"
  | "member_request"
  | "expense_request"
  | "opinion_box"
  | "counselling"
  | "my_appointments"
  | "upcoming_events"
  | "watch_live"
  | "sermons"
  | "church_media"
  | "outreach_impact"
  | "volunteer"
  | "join_volunteer_groups"
  | "house_fellowships"
  | "my_groups"
  | "surveys"
  | "bible_explorer"
  | "daily_devotionals"
  | "training_courses"
  | "my_discipleship_journey"
  | "facility_booking"
  | "resource_store"
  | "children";

export interface CanonicalModuleConfig {
  version: typeof MODULE_CONFIG_VERSION;
  admin: Record<AdminModuleKey, boolean>;
  member_portal: Record<MemberModuleKey, boolean>;
}

export interface AdminModuleDefinition {
  key: AdminModuleKey;
  label: string;
  description: string;
  core?: boolean;
}

export const ADMIN_MODULES: readonly AdminModuleDefinition[] = [
  { key: "members_groups", label: "Members & Groups", description: "Manage your congregation, families, and groups", core: true },
  { key: "attendance", label: "Attendance & Services", description: "Schedule services and track attendance" },
  { key: "giving_finance", label: "Giving & Finance", description: "Giving, expenses, budgets, payroll, and accounting" },
  { key: "communications", label: "Communications & Engagement", description: "Messaging, announcements, surveys, appointments, and testimonies" },
  { key: "events", label: "Events", description: "Plan and manage church events" },
  { key: "discipleship", label: "Discipleship & Outreach", description: "New converts, follow-up, outreach, and training" },
  { key: "volunteering", label: "Volunteering", description: "Coordinate volunteer teams and schedules" },
  { key: "resources_media", label: "Resources & Media", description: "Sermons, livestreaming, media, Bible tools, and resources" },
  { key: "operations", label: "Operations", description: "Requests, facilities, security, incidents, and board meetings" },
  { key: "childrens_ministry", label: "Children's Ministry", description: "Children's church check-in and management" },
  { key: "reports_analytics", label: "Reports & Analytics", description: "Church-wide reporting and analytics" },
  { key: "branches", label: "Branches", description: "Multi-branch church management" },
] as const;

export const MEMBER_MODULE_DEFAULTS: Record<MemberModuleKey, boolean> = {
  give_online: true,
  pledge_campaigns: true,
  my_giving_history: true,
  announcements: true,
  messages: true,
  chat_on_whatsapp: false,
  testimonies: true,
  share_your_testimony: true,
  member_request: true,
  expense_request: true,
  opinion_box: true,
  counselling: true,
  my_appointments: true,
  upcoming_events: true,
  watch_live: true,
  sermons: true,
  church_media: true,
  outreach_impact: false,
  volunteer: true,
  join_volunteer_groups: true,
  house_fellowships: true,
  my_groups: true,
  surveys: true,
  bible_explorer: true,
  daily_devotionals: true,
  training_courses: true,
  my_discipleship_journey: true,
  facility_booking: false,
  resource_store: true,
  children: true,
};

const ALL_ADMIN_ENABLED = Object.fromEntries(ADMIN_MODULES.map(module => [module.key, true])) as Record<AdminModuleKey, boolean>;

export const DEFAULT_MODULE_CONFIG: CanonicalModuleConfig = {
  version: MODULE_CONFIG_VERSION,
  admin: { ...ALL_ADMIN_ENABLED },
  member_portal: { ...MEMBER_MODULE_DEFAULTS },
};

const LEGACY_MEMBER_ALIASES: Record<string, MemberModuleKey> = {
  giving_history: "my_giving_history",
  messages_inbox: "messages",
  whatsapp_chat: "chat_on_whatsapp",
  share_testimony: "share_your_testimony",
  service_request: "member_request",
  events_services: "upcoming_events",
  sermons_messages: "sermons",
  volunteer_groups: "join_volunteer_groups",
  discipleship_journey: "my_discipleship_journey",
};

const ADMIN_PATH_MODULE_MAP: ReadonlyArray<[string, AdminModuleKey]> = [
  ["/childrens-ministry", "childrens_ministry"],
  ["/follow-up-tasks", "discipleship"],
  ["/new-converts", "discipleship"],
  ["/discipleship", "discipleship"],
  ["/outreach", "discipleship"],
  ["/training", "discipleship"],
  ["/members", "members_groups"],
  ["/groups", "members_groups"],
  ["/house-fellowships", "members_groups"],
  ["/families", "members_groups"],
  ["/visitors", "members_groups"],
  ["/services", "attendance"],
  ["/give-online", "giving_finance"],
  ["/giving-records", "giving_finance"],
  ["/pledge-campaigns", "giving_finance"],
  ["/church-expenses", "giving_finance"],
  ["/budget-management", "giving_finance"],
  ["/payroll", "giving_finance"],
  ["/fund-accounting", "giving_finance"],
  ["/accounts-payable", "giving_finance"],
  ["/general-ledger", "giving_finance"],
  ["/payouts", "giving_finance"],
  ["/events", "events"],
  ["/volunteering", "volunteering"],
  ["/communications", "communications"],
  ["/announcements", "communications"],
  ["/member-messaging", "communications"],
  ["/appointments", "communications"],
  ["/testimonies", "communications"],
  ["/surveys", "communications"],
  ["/member-requests", "operations"],
  ["/board-meetings", "operations"],
  ["/facility-booking", "operations"],
  ["/security-centre", "operations"],
  ["/incident-management", "operations"],
  ["/graphics-studio", "resources_media"],
  ["/ai-tools", "resources_media"],
  ["/church-studio", "resources_media"],
  ["/bible-explorer", "resources_media"],
  ["/song-library", "resources_media"],
  ["/church-media", "resources_media"],
  ["/asset-management", "resources_media"],
  ["/sermon-preparation", "resources_media"],
  ["/sermons", "resources_media"],
  ["/livestreaming", "resources_media"],
  ["/discipleship-resources", "resources_media"],
  ["/resources-store", "resources_media"],
  ["/reports", "reports_analytics"],
  ["/branches", "branches"],
];

const MEMBER_PATH_RULES: ReadonlyArray<[string, MemberModuleKey, AdminModuleKey]> = [
  ["/member/give", "give_online", "giving_finance"],
  ["/member/giving-history", "my_giving_history", "giving_finance"],
  ["/member/pledge-campaigns", "pledge_campaigns", "giving_finance"],
  ["/member/events", "upcoming_events", "events"],
  ["/member/announcements", "announcements", "communications"],
  ["/member/messages", "messages", "communications"],
  ["/member/whatsapp", "chat_on_whatsapp", "communications"],
  ["/member/testimonies", "testimonies", "communications"],
  ["/member/surveys", "surveys", "communications"],
  ["/member/requests", "member_request", "operations"],
  ["/member/appointments", "my_appointments", "operations"],
  ["/member/facility-booking", "facility_booking", "operations"],
  ["/member/volunteer", "volunteer", "volunteering"],
  ["/member/groups", "my_groups", "members_groups"],
  ["/member/house-fellowships", "house_fellowships", "members_groups"],
  ["/member/children", "children", "childrens_ministry"],
  ["/member/sermons", "sermons", "resources_media"],
  ["/member/bible", "bible_explorer", "resources_media"],
  ["/member/church-media", "church_media", "resources_media"],
  ["/member/livestreaming", "watch_live", "resources_media"],
  ["/member/watch-live", "watch_live", "resources_media"],
  ["/member/store", "resource_store", "resources_media"],
  ["/member/outreach", "outreach_impact", "discipleship"],
  ["/member/training", "training_courses", "discipleship"],
];

const ONBOARDING_MODULE_MAP: Record<string, AdminModuleKey[]> = {
  online_giving: ["giving_finance"],
  member_management: ["members_groups"],
  attendance_tracking: ["attendance"],
  event_management: ["events"],
  children_church: ["childrens_ministry"],
  communication: ["communications"],
  volunteer_scheduling: ["volunteering"],
  financial_reporting: ["giving_finance", "reports_analytics"],
  multi_branch: ["branches"],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function booleanRecord<T extends string>(source: unknown, defaults: Record<T, boolean>, aliases: Record<string, T> = {}): Record<T, boolean> {
  const result = { ...defaults };
  if (!isRecord(source)) return result;
  for (const [rawKey, rawValue] of Object.entries(source)) {
    if (typeof rawValue !== "boolean") continue;
    const key = (aliases[rawKey] || rawKey) as T;
    if (key in result) result[key] = rawValue;
  }
  return result;
}

export function normalizeModuleConfig(raw: unknown): CanonicalModuleConfig {
  if (isRecord(raw) && raw.version === MODULE_CONFIG_VERSION && isRecord(raw.admin)) {
    return {
      version: MODULE_CONFIG_VERSION,
      admin: booleanRecord(raw.admin, ALL_ADMIN_ENABLED),
      member_portal: booleanRecord(raw.member_portal, MEMBER_MODULE_DEFAULTS, LEGACY_MEMBER_ALIASES),
    };
  }

  if (Array.isArray(raw)) {
    const admin = { ...ALL_ADMIN_ENABLED };
    for (const module of ADMIN_MODULES) {
      if (module.core) continue;
      admin[module.key] = ADMIN_PATH_MODULE_MAP.some(([path, key]) => key === module.key && raw.includes(path));
    }
    return { version: MODULE_CONFIG_VERSION, admin, member_portal: { ...MEMBER_MODULE_DEFAULTS } };
  }

  if (isRecord(raw)) {
    const nestedMember = isRecord(raw.member_portal) ? raw.member_portal : undefined;
    const admin = booleanRecord(raw, ALL_ADMIN_ENABLED);
    return {
      version: MODULE_CONFIG_VERSION,
      admin,
      member_portal: booleanRecord(nestedMember ?? raw, MEMBER_MODULE_DEFAULTS, LEGACY_MEMBER_ALIASES),
    };
  }

  return {
    version: MODULE_CONFIG_VERSION,
    admin: { ...ALL_ADMIN_ENABLED },
    member_portal: { ...MEMBER_MODULE_DEFAULTS },
  };
}

export function moduleConfigFromOnboarding(priorityNeeds: string[]): CanonicalModuleConfig {
  const admin = Object.fromEntries(ADMIN_MODULES.map(module => [module.key, !!module.core])) as Record<AdminModuleKey, boolean>;
  const canonicalKeys = new Set<AdminModuleKey>(ADMIN_MODULES.map(module => module.key));
  for (const need of priorityNeeds) {
    if (canonicalKeys.has(need as AdminModuleKey)) {
      admin[need as AdminModuleKey] = true;
      continue;
    }
    for (const key of ONBOARDING_MODULE_MAP[need] || []) admin[key] = true;
  }

  const memberPortal = { ...MEMBER_MODULE_DEFAULTS };
  for (const [path, memberKey, adminKey] of MEMBER_PATH_RULES) {
    void path;
    if (!admin[adminKey]) memberPortal[memberKey] = false;
  }

  return { version: MODULE_CONFIG_VERSION, admin, member_portal: memberPortal };
}

export function adminModuleForPath(pathname: string): AdminModuleKey | null {
  const match = ADMIN_PATH_MODULE_MAP.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  return match?.[1] ?? null;
}

export function isAdminPathEnabled(pathname: string, config: CanonicalModuleConfig): boolean {
  if (pathname === "/dashboard" || pathname === "/settings" || pathname.startsWith("/settings/")) return true;
  const moduleKey = adminModuleForPath(pathname);
  return moduleKey ? config.admin[moduleKey] !== false : true;
}

export function memberRuleForPath(pathname: string): { memberKey: MemberModuleKey; adminKey: AdminModuleKey } | null {
  const match = MEMBER_PATH_RULES.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  return match ? { memberKey: match[1], adminKey: match[2] } : null;
}

export function isMemberPathEnabled(pathname: string, config: CanonicalModuleConfig): boolean {
  if (pathname === "/member" || pathname === "/member/profile" || pathname === "/member/settings" || pathname === "/member/welcome") return true;
  const rule = memberRuleForPath(pathname);
  return rule ? config.admin[rule.adminKey] !== false && config.member_portal[rule.memberKey] !== false : true;
}

export function filterAdminNavigation<T extends { path: string }>(items: T[], config: CanonicalModuleConfig): T[] {
  return items.filter(item => isAdminPathEnabled(item.path, config));
}
