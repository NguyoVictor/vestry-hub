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
  GROUP_TYPES: "group_types",
  JOIN_REQUESTS: "join_requests",
  FAMILIES: "families",
  FAMILY_MEMBERS: "family_members",
  HOUSE_FELLOWSHIPS: "house_fellowships",
  FELLOWSHIP_MEMBERS: "fellowship_members",
  FELLOWSHIP_ATTENDANCE: "fellowship_attendance",
  FELLOWSHIP_RSVP: "fellowship_rsvp",
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
  GIVING_CATEGORIES: "giving_categories",
  TAX_SETTINGS: "tax_settings",
  TAX_DEDUCTIBLE_TYPES: "tax_deductible_types",
  TAX_STATEMENTS: "tax_statements",
  EMAIL_BRANDING: "email_branding",
  EMAIL_CATEGORIES: "email_categories",
  EMAIL_TEMPLATES: "email_templates",
  EMAIL_AUTOMATIONS: "email_automations",
  SMS_SETTINGS: "sms_settings",
  SMS_HISTORY: "sms_history",
  SMS_TEMPLATES: "sms_templates",
  SMS_TEMPLATES: "sms_templates",
  SMS_RECIPIENTS: "sms_recipients",
  BROADCAST_TEMPLATES: "broadcast_templates",
  ADMIN_BROADCASTS: "admin_broadcasts",
  DEVICE_TOKENS: "device_tokens",
  WHATSAPP_MESSAGES: "whatsapp_messages",
  WHATSAPP_TEMPLATES: "whatsapp_templates",
  WHATSAPP_AUTOMATIONS: "whatsapp_automations",
  WHATSAPP_CREDITS: "whatsapp_credits",
  WHATSAPP_CREDIT_TRANSACTIONS: "whatsapp_credit_transactions",
  QUIZZES: "quizzes",
  QUIZ_SESSIONS: "quiz_sessions",
  QUIZ_PARTICIPANTS: "quiz_participants",
  QUIZ_ANSWERS: "quiz_answers",
  QUIZ_EVENTS: "quiz_events",
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
  MEETING_MINUTES: "meeting_minutes",
  MEETING_DECISIONS: "meeting_decisions",
  FACILITIES: "facilities",
  FACILITY_BOOKINGS: "facility_bookings",
  FACILITY_BOOKING_RESPONSES: "facility_booking_responses",
  FACILITY_TYPES: "facility_types",
  FACILITY_IMAGES: "facility_images",
  FACILITY_RESPONSES: "facility_responses",

  // Security & Communications
  INCIDENTS: "incidents",
  INCIDENT_STATUS_LOGS: "incident_status_logs",
  INCIDENT_UPDATES: "incident_updates",
  SECURITY_ALERTS: "security_alerts",
  LOGIN_EVENTS: "login_events",
  ANNOUNCEMENTS: "announcements",
  ANNOUNCEMENT_TYPES: "announcement_types",
  ANNOUNCEMENT_ATTACHMENTS: "announcement_attachments",
  ANNOUNCEMENT_REACTIONS: "announcement_reactions",
  ANNOUNCEMENT_COMMENTS: "announcement_comments",
  ANNOUNCEMENT_READ_RECEIPTS: "announcement_read_receipts",
  BROADCASTS: "broadcasts",
  COMMUNICATIONS: "communications",
  CONVERSATIONS: "conversations",
  CONVERSATION_PARTICIPANTS: "conversation_participants",
  MESSAGES: "messages",
  NOTIFICATIONS: "notifications",
  NOTIFICATION_PREFERENCES: "notification_preferences",
  TESTIMONIES: "testimonies",
  TESTIMONY_CATEGORIES: "testimony_categories",
  TESTIMONY_REACTIONS: "testimony_reactions",

  // Church Media
  CHURCH_MEDIA_ITEMS: "church_media_items",
  MEDIA_ALBUMS: "media_albums",
  MEDIA_CATEGORIES: "media_categories",
  CHURCH_STORAGE: "church_storage",
  STORAGE_PLANS: "storage_plans",
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
  USER_SONG_PREFERENCES: "user_song_preferences",
  SONG_USAGE_ANALYTICS: "song_usage_analytics",
  SETLIST_COLLABORATIONS: "setlist_collaborations",
  SETLIST_CHANGE_HISTORY: "setlist_change_history",
  MEDIA_ASSETS: "media_assets",
  MEDIA_FOLDERS: "media_folders",
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
  SERVICE_REQUEST_TYPES: "service_request_types",
  WEBSITE_CONSULTATION_REQUESTS: "website_consultation_requests",
  WEBSITE_REVIEWS: "website_reviews",
  LEGAL_SIGNATURES: "legal_signatures",
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

  // Bible Explorer (Member Side)
  VERSE_HIGHLIGHTS: "verse_highlights",
  VERSE_BOOKMARKS: "verse_bookmarks",
  VERSE_REACTIONS: "verse_reactions",
  READING_PROGRESS: "reading_progress",
  VERSE_NOTES: "verse_notes",
  MEMBER_PREFERENCES: "member_preferences",

  // Appointments
  APPOINTMENTS: "appointments",
  APPOINTMENT_TYPES: "appointment_types",

  // Canva integration
  CANVA_TOKENS: "canva_tokens",
  CANVA_OAUTH_STATE: "canva_oauth_state",

  // Children's Ministry
  CHILDREN: "children",
  CHILDREN_CLASSES: "children_classes",
  CHILDREN_CHECKINS: "children_checkins",
  CHILDREN_QR_CODES: "children_qr_codes",
  CHILDREN_MINISTRY_SETTINGS: "children_ministry_settings",

  // Service attendance
  SERVICE_ATTENDANCE: "service_attendance",

  // Livestreaming
  LIVESTREAM_CONFIGS: "livestream_configs",
  LIVESTREAM_SCHEDULES: "livestream_schedules",
  LIVESTREAM_HISTORY: "livestream_history",
  LIVESTREAM_PRAYER_REQUESTS: "livestream_prayer_requests",
  LIVESTREAM_REMINDERS: "livestream_reminders",
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

  // Bible Explorer columns
  BIBLE_SETTINGS: "bible_settings",
  MEMBER_ID: "member_id",
  BOOK_ID: "book_id",
  CHAPTER: "chapter",
  VERSE_NUMBER: "verse_number",
  REACTION: "reaction",
  COLOR: "color",
  VERSE_TEXT: "verse_text",

  // Enhanced Songs columns (Song Library UI Revamp)
  SONG_BPM: "bpm",
  SONG_TIME_SIGNATURE: "time_signature",
  SONG_COVER_ART_URL: "cover_art_url",
  SONG_COVER_ART_COLORS: "cover_art_colors",
  SONG_DURATION_SECONDS: "duration_seconds",
  SONG_USAGE_COUNT: "usage_count",
  SONG_LAST_PLAYED_AT: "last_played_at",
  SONG_CUSTOM_FIELDS: "custom_fields",
  SONG_IS_TRENDING: "is_trending",

  // User Song Preferences columns
  USER_PREF_THEME: "theme",
  USER_PREF_VIEW_MODE: "view_mode",
  USER_PREF_TRANSPOSITION: "transposition_preferences",
  USER_PREF_FILTER_PRESETS: "filter_presets",
  USER_PREF_RECENT_SEARCHES: "recent_searches",

  // Song Usage Analytics columns
  USAGE_SERVICE_TYPE: "service_type",
  USAGE_USED_AT: "used_at",
  USAGE_SETLIST_ID: "setlist_id",
  USAGE_KEY_USED: "key_used",
  USAGE_DURATION_PLAYED: "duration_played",

  // Collaboration columns
  COLLAB_IS_ACTIVE: "is_active",
  COLLAB_LAST_SEEN_AT: "last_seen_at",
  COLLAB_CURSOR_POSITION: "cursor_position",

  // Change History columns
  CHANGE_TYPE: "change_type",
  CHANGE_DATA: "change_data",
  CHANGE_PREVIOUS_STATE: "previous_state",
  TRANSLATION: "translation",
  READ_AT: "read_at",
  CONTENT: "content",

  // Livestreaming columns
  PLATFORM_TYPE: "platform_type",
  PLATFORM_URL: "platform_url",
  EMBED_URL: "embed_url",
  SUBSCRIBE_URL: "subscribe_url",
  SUBSCRIBE_LABEL: "subscribe_label",
  START_TIME: "start_time",
  RECURRENCE_PATTERN: "recurrence_pattern",
  RECURRENCE_DAY: "recurrence_day",
  IS_RECURRING: "is_recurring",
  IS_LIVE: "is_live",
  STREAM_DATE: "stream_date",
  THUMBNAIL_URL: "thumbnail_url",
  YOUTUBE_VIDEO_ID: "youtube_video_id",
  SOURCE: "source",
  PRAYER_TEXT: "prayer_text",
  IS_ANONYMOUS: "is_anonymous",
  IS_PRAYED_FOR: "is_prayed_for",
  PRAYED_AT: "prayed_at",
  SCHEDULE_ID: "schedule_id",
} as const;

// ─── Type helpers ─────────────────────────────────────────────────────────────
export type TableName = typeof TABLES[keyof typeof TABLES];
export type ColName = typeof COLS[keyof typeof COLS];
