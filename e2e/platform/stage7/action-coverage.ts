export const STAGE7_PROTECTED_ACTION_IDS = [
  'members-update','members-delete','visitor-create','visitor-convert','family-create','family-link-member','followup-create',
  'event-create','event-update','event-rsvp-admin','service-create','service-attendance','volunteer-role-create','volunteer-assign',
  'board-meeting-create','board-minutes-save','facility-share-link','facility-booking-review','announcement-create','announcement-edit',
  'announcement-delete','survey-create','survey-share','survey-delete','appointment-review','testimony-moderate','message-send-admin',
  'message-delete-admin','message-attachment-admin','giving-record-create','giving-export','expense-create','expense-approve','budget-create',
  'accounts-payable-create','pledge-campaign-create','communications-email-send','communications-sms-send','communications-template-save',
  'settings-user-invite','settings-permissions-save','qr-copy','member-rsvp','member-message-send','member-message-attachment','member-request',
  'member-appointment','member-testimony','member-volunteer-signup','member-facility-book','member-profile-update','member-settings-update',
  'member-survey-submit','public-survey-submit','public-facility-book','public-visitor-register','public-member-register'
] as const;

export const STAGE7_MANUAL_ACTION_IDS = ['payroll-run','subscription-upgrade','member-give-stk'] as const;
