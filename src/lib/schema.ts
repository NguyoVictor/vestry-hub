/**
 * ⚠️ SCHEMA CONSTANTS — SOURCE OF TRUTH
 *
 * The database uses different names than the phase spec files.
 * ALWAYS use these constants for Supabase queries.
 * NEVER hardcode table or column names.
 *
 * See .kiro/specs/schema-correction-notice.md for full details.
 */

// ─── Table Names ─────────────────────────────────────────────────────────────
export const TABLES = {
  // Core
  TENANTS: "tenants",
  USERS: "users",
  MEMBERS: "members",
  BRANCHES: "branches",
  ROLE_PERMISSIONS: "role_permissions",

  // People
  GROUPS: "groups",
  GROUP_MEMBERS: "group_members",
  FAMILIES: "families",
  FAMILY_MEMBERS: "family_members",
  HOUSE_FELLOWSHIPS: "house_fellowships",
  FELLOWSHIP_MEMBERS: "fellowship_members",
  VISITORS: "visitors",
  VISITOR_FOLLOWUP_NOTES: "visitor_followup_notes",
  FOLLOW_UP_TASKS: "follow_up_tasks",
  NEW_CONVERTS: "new_converts",
  CONVERT_CHECKINS: "convert_checkins",
  CONVERT_STAGE_HISTORY: "convert_stage_history",
  DISCIPLESHIP_PATHWAYS: "discipleship_pathways",

  // Finance
  GIVING_RECORDS: "giving_records",       // spec said "donations"
  GIVING_AUDIT_LOG: "giving_audit_log",
  EXPENSES: "expenses",                   // spec said "church_expenses"
  BUDGETS: "budgets",
  BUDGET_CATEGORIES: "budget_categories", // spec said "budget_lines"
  FUNDS: "funds",
  FUND_TRANSACTIONS: "fund_transactions",
  PLEDGE_CAMPAIGNS: "pledge_campaigns",
  PLEDGES: "pledges",
  PAYROLL_STAFF: "payroll_staff",
  PAYROLL_RUNS: "payroll_runs",
  PAYROLL_PAYMENTS: "payroll_payments",
  PAYROLL_RECORDS: "payroll_records",
  ACCOUNTS_PAYABLE: "accounts_payable",
  CHART_OF_ACCOUNTS: "chart_of_accounts",
  JOURNAL_ENTRIES: "journal_entries",
  JOURNAL_LINES: "journal_lines",
  LEDGER_ENTRIES: "ledger_entries",
  INVOICES: "invoices",
  PAYOUTS: "payouts",

  // Events & Operations
  EVENTS: "events",
  EVENT_RSVPS: "event_rsvps",
  EVENT_REGISTRATIONS: "event_registrations",
  SERVICES: "services",
  ATTENDANCE_SESSIONS: "attendance_sessions",
  ATTENDANCE_RECORDS: "attendance_records",  // spec said "attendance"
  VOLUNTEERS: "volunteers",
  VOLUNTEER_ROLES: "volunteer_roles",
  VOLUNTEER_ASSIGNMENTS: "volunteer_assignments",
  MEMBER_REQUESTS: "member_requests",
  MEMBER_REQUEST_NOTES: "member_request_notes",
  BOARD_MEETINGS: "board_meetings",
  MEETING_ATTENDEES: "meeting_attendees",
  MEETING_ACTION_ITEMS: "meeting_action_items",
  FACILITIES: "facilities",
  FACILITY_BOOKINGS: "facility_bookings",
  FACILITY_BOOKING_RESPONSES: "facility_booking_responses",

  // Security & Communications
  INCIDENTS: "incidents",
  INCIDENT_UPDATES: "incident_updates",
  SECURITY_ALERTS: "security_alerts",
  LOGIN_EVENTS: "login_events",
  ANNOUNCEMENTS: "announcements",
  BROADCASTS: "broadcasts",
  COMMUNICATIONS: "communications",
  CONVERSATIONS: "conversations",
  CONVERSATION_PARTICIPANTS: "conversation_participants",
  MESSAGES: "messages",
  NOTIFICATIONS: "notifications",
  NOTIFICATION_PREFERENCES: "notification_preferences",
  TESTIMONIES: "testimonies",
  SURVEYS: "surveys",
  SURVEY_RESPONSES: "survey_responses",
  SURVEY_ANSWERS: "survey_answers",

  // Media & Content
  STUDIO_MEDIA: "studio_media",
  SERMON_SERIES: "sermon_series",
  SERMONS: "sermons",
  SONGS: "songs",
  SET_LISTS: "set_lists",
  SET_LIST_SONGS: "set_list_songs",
  MEDIA_ASSETS: "media_assets",
  MEDIA_FOLDERS: "media_folders",
  MEDIA_ALBUMS: "media_albums",
  MEDIA_PHOTOS: "media_photos",
  CHURCH_ASSETS: "church_assets",
  ASSET_MAINTENANCE: "asset_maintenance",
  ASSET_RELEASE_REQUESTS: "asset_release_requests",
  LIVESTREAMS: "livestreams",
  AI_TOOL_USAGE: "ai_tool_usage",

  // Growth & Discipleship
  DISCIPLESHIP_RESOURCES: "discipleship_resources",
  RESOURCE_ASSIGNMENTS: "resource_assignments",
  RESOURCE_COLLECTIONS: "resource_collections",
  COLLECTION_RESOURCES: "collection_resources",
  OUTREACH_ACTIVITIES: "outreach_activities",
  STORE_PRODUCTS: "store_products",
  STORE_CATEGORIES: "store_categories",
  STORE_BUNDLES: "store_bundles",
  STORE_COUPONS: "store_coupons",
  STORE_ORDERS: "store_orders",
  ORDER_ITEMS: "order_items",
  RESOURCES: "resources",                  // spec said "training_courses" in some places
  TRAINING_COURSES: "training_courses",    // also exists as its own table
  TRAINING_ENROLLMENTS: "training_enrollments",
  COURSE_ENROLLMENTS: "course_enrollments",
  LESSON_COMPLETIONS: "lesson_completions",
  COURSE_COMMENTS: "course_comments",

  // Analytics & Settings
  STAFF_PAYROLL: "staff_payroll",
  STAFF_LEAVE_REQUESTS: "staff_leave_requests",
  STAFF_LEAVE_BALANCES: "staff_leave_balances",
  STAFF_ABSENCES: "staff_absences",
  STAFF_POSITIONS: "staff_positions",
  STAFF_TASKS: "staff_tasks",
  FEATURE_PERMISSIONS: "feature_permissions",
  USER_ROLE_OVERRIDES: "user_role_overrides",
  MEMBER_PERMISSION_OVERRIDES: "member_permission_overrides",
  SAVED_REPORTS: "saved_reports",
  PRAYER_REQUESTS: "prayer_requests",
  ACTIVITY_LOG: "activity_log",
  TENANT_SEO_SETTINGS: "tenant_seo_settings",  // spec said "church_seo_settings"
  INTEGRATION_SETTINGS: "integration_settings",
  ONBOARDING_PROGRESS: "onboarding_progress",
  EMAIL_QUOTAS: "email_quotas",
  BIBLE_NOTES: "bible_notes",
  BIBLE_HIGHLIGHTS: "bible_highlights",
  BIBLE_FAVORITES: "bible_favorites",

  // Canva integration
  CANVA_TOKENS: "canva_tokens",
  CANVA_OAUTH_STATE: "canva_oauth_state",
} as const;

// ─── Column Names ─────────────────────────────────────────────────────────────
export const COLS = {
  // Universal
  ID: "id",
  TENANT_ID: "tenant_id",          // spec said "church_id" — WRONG, use this
  CREATED_AT: "created_at",
  UPDATED_AT: "updated_at",
  STATUS: "status",

  // Tenants
  TENANT_NAME: "name",
  TENANT_LOGO: "logo",             // spec said "logo_url" — WRONG
  TENANT_EMAIL: "contact_email",   // spec said "email" — WRONG
  TENANT_ONBOARDING: "onboarding_completed",  // spec said "onboarding_complete"

  // Events
  EVENT_TITLE: "title",            // spec said "name" — WRONG
  EVENT_DATE: "event_date",        // spec said "start_datetime" — WRONG
  EVENT_START_TIME: "start_time",
  EVENT_END_TIME: "end_time",
  EVENT_IS_PUBLISHED: "is_published",  // spec said "status = 'published'" — WRONG
  EVENT_CAPACITY: "capacity_limit",    // spec said "capacity" — WRONG
  EVENT_DEADLINE: "registration_deadline",  // spec said "rsvp_deadline"

  // Giving Records (spec said "donations")
  GIVING_DATE: "given_at",         // spec said "donation_date" — WRONG
  GIVING_TYPE: "giving_type",      // spec said "category" — WRONG
  GIVING_AMOUNT: "amount",
  GIVING_PAYMENT_REF: "pesapal_transaction_id",  // spec said "payment_reference"

  // Members / Users
  FIRST_NAME: "first_name",
  LAST_NAME: "last_name",
  EMAIL: "email",
  PHONE: "phone",
  AVATAR_URL: "avatar_url",
  GENDER: "gender",
  DATE_OF_BIRTH: "date_of_birth",
  JOIN_DATE: "join_date",
  MEMBER_STATUS: "status",

  // Giving Records — post-build additions
  GIVING_IS_ANONYMOUS: "is_anonymous",
  GIVING_NOTES: "notes",
  GIVING_RECEIPT_NUMBER: "receipt_number",
  GIVING_FUND_ID: "fund_id",
  GIVING_CAMPAIGN_ID: "campaign_id",
  GIVING_DONOR_NAME: "donor_name",
  GIVING_CATEGORY: "category",

  // Notifications
  NOTIF_TASK_ID: "task_id",
  NOTIF_IS_READ: "is_read",
  NOTIF_TYPE: "type",
  NOTIF_TITLE: "title",
  NOTIF_BODY: "body",
  NOTIF_USER_ID: "user_id",
} as const;

// ─── Type helpers ─────────────────────────────────────────────────────────────
export type TableName = typeof TABLES[keyof typeof TABLES];
export type ColName = typeof COLS[keyof typeof COLS];
