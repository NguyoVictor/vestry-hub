import { useLocation } from "react-router-dom";

const ROUTE_MAP: Record<string, { category: string; page: string; parent?: string }> = {
  '/dashboard': { category: 'Overview', page: 'Dashboard' },
  '/members': { category: 'People', page: 'Members' },
  '/groups': { category: 'People', page: 'Groups' },
  '/house-fellowships': { category: 'People', page: 'House Fellowships' },
  '/families': { category: 'People', page: 'Families' },
  '/childrens-ministry': { category: 'People', page: "Children's Ministry" },
  '/childrens-ministry/checkin': { category: 'People', page: 'Check-In', parent: "Children's Ministry" },
  '/childrens-ministry/classes': { category: 'People', page: 'Classes', parent: "Children's Ministry" },
  '/childrens-ministry/children': { category: 'People', page: 'Children', parent: "Children's Ministry" },
  '/childrens-ministry/reports': { category: 'People', page: 'Reports', parent: "Children's Ministry" },
  '/childrens-ministry/settings': { category: 'People', page: 'Settings', parent: "Children's Ministry" },
  '/visitors': { category: 'People', page: 'Visitors' },
  '/follow-up-tasks': { category: 'People', page: 'Follow-Up Tasks' },
  '/new-converts': { category: 'People', page: 'New Converts' },
  '/give-online': { category: 'Finance', page: 'Give Online' },
  '/giving-records': { category: 'Finance', page: 'Giving Records' },
  '/pledge-campaigns': { category: 'Finance', page: 'Pledge Campaigns' },
  '/church-expenses': { category: 'Finance', page: 'Church Expenses' },
  '/budget-management': { category: 'Finance', page: 'Budget Management' },
  '/payroll': { category: 'Finance', page: 'Payroll' },
  '/fund-accounting': { category: 'Finance', page: 'Fund Accounting' },
  '/accounts-payable': { category: 'Finance', page: 'Accounts Payable' },
  '/general-ledger': { category: 'Finance', page: 'General Ledger' },
  '/payouts': { category: 'Finance', page: 'Payouts' },
  '/services': { category: 'Events & Operations', page: 'Services' },
  '/events': { category: 'Events & Operations', page: 'Events' },
  '/volunteering': { category: 'Events & Operations', page: 'Volunteering' },
  '/member-requests': { category: 'Events & Operations', page: 'Member Requests' },
  '/board-meetings': { category: 'Events & Operations', page: 'Board Meetings' },
  '/facility-booking': { category: 'Events & Operations', page: 'Facility & Event Booking' },
  '/security-centre': { category: 'Security', page: 'Security Centre' },
  '/incident-management': { category: 'Security', page: 'Incident Management' },
  '/communications': { category: 'Engagement', page: 'Communications' },
  '/communications/compose': { category: 'Engagement', page: 'Compose Message', parent: 'Communications' },
  '/announcements': { category: 'Engagement', page: 'Announcements' },
  '/member-messaging': { category: 'Engagement', page: 'Member Messaging' },
  '/appointments': { category: 'Engagement', page: 'Appointments' },
  '/testimonies': { category: 'Engagement', page: 'Testimonies' },
  '/surveys': { category: 'Engagement', page: 'Surveys' },
  '/graphics-studio': { category: 'Media & Content', page: 'Graphics Studio' },
  '/ai-tools': { category: 'Media & Content', page: 'AI Tools' },
  '/church-studio': { category: 'Media & Content', page: 'Church Studio' },
  '/bible-explorer': { category: 'Media & Content', page: 'Bible Explorer' },
  '/song-library': { category: 'Media & Content', page: 'Song Library' },
  '/church-media': { category: 'Media & Content', page: 'Church Media' },
  '/asset-management': { category: 'Media & Content', page: 'Asset Management' },
  '/sermon-preparation': { category: 'Media & Content', page: 'Sermon Preparation' },
  '/sermons': { category: 'Media & Content', page: 'Sermons & Messages' },
  '/livestreaming': { category: 'Media & Content', page: 'Livestreaming' },
  '/discipleship': { category: 'Growth', page: 'Discipleship Dashboard' },
  '/discipleship/graduates': { category: 'Growth', page: 'Graduates', parent: 'Discipleship Dashboard' },
  '/discipleship-resources': { category: 'Growth', page: 'Discipleship Resources' },
  '/outreach': { category: 'Growth', page: 'Outreach & Impact' },
  '/resources-store': { category: 'Growth', page: 'Resources Store' },
  '/training': { category: 'Growth', page: 'Training' },
  '/training/new': { category: 'Growth', page: 'New Course', parent: 'Training' },
  '/reports': { category: 'Admin', page: 'Reports & Analytics' },
  '/branches': { category: 'Admin', page: 'Branches' },
  '/settings': { category: 'Admin', page: 'Settings' },
  '/settings/general': { category: 'Admin', page: 'General', parent: 'Settings' },
  '/settings/vision': { category: 'Admin', page: 'Vision & Mission', parent: 'Settings' },
  '/settings/contact': { category: 'Admin', page: 'Contact & Social', parent: 'Settings' },
  '/settings/qr-codes': { category: 'Admin', page: 'QR Codes', parent: 'Settings' },
  '/settings/profile': { category: 'Admin', page: 'Church Profile', parent: 'Settings' },
  '/settings/services': { category: 'Admin', page: 'Services & Modules', parent: 'Settings' },
  '/settings/roles': { category: 'Admin', page: 'Access Control', parent: 'Settings' },
  '/settings/billing': { category: 'Admin', page: 'Billing', parent: 'Settings' },
  '/settings/security': { category: 'Admin', page: 'Security', parent: 'Settings' },
  '/settings/integrations': { category: 'Admin', page: 'Integrations', parent: 'Settings' },
  '/settings/seo': { category: 'Admin', page: 'SEO & Public Page', parent: 'Settings' },
  '/settings/member-app': { category: 'Admin', page: 'Member App', parent: 'Settings' },
  '/settings/branches': { category: 'Admin', page: 'Branches', parent: 'Settings' },
  '/settings/users': { category: 'Admin', page: 'Users', parent: 'Settings' },
  '/settings/staff': { category: 'Admin', page: 'Staff', parent: 'Settings' },
  '/settings/registration': { category: 'Admin', page: 'Registration', parent: 'Settings' },
  '/settings/preferences': { category: 'Admin', page: 'Preferences', parent: 'Settings' },
  '/settings/attendance': { category: 'Admin', page: 'Attendance', parent: 'Settings' },
  '/settings/notifications': { category: 'Admin', page: 'Notifications', parent: 'Settings' },
  '/settings/service-requests': { category: 'Admin', page: 'Service Requests', parent: 'Settings' },
  '/settings/facility-types': { category: 'Admin', page: 'Facility Types', parent: 'Settings' },
  '/settings/website': { category: 'Admin', page: 'Website', parent: 'Settings' },
  '/settings/privacy': { category: 'Admin', page: 'Privacy & Data', parent: 'Settings' },
  '/settings/backup': { category: 'Admin', page: 'Backup', parent: 'Settings' },
  '/settings/legal': { category: 'Admin', page: 'Legal', parent: 'Settings' },
  '/settings/giving': { category: 'Admin', page: 'Giving', parent: 'Settings' },
  '/settings/tax': { category: 'Admin', page: 'Tax', parent: 'Settings' },
  '/settings/payments': { category: 'Admin', page: 'Payments', parent: 'Settings' },
  '/settings/communications-settings': { category: 'Admin', page: 'Communications', parent: 'Settings' },
  '/settings/livestreaming': { category: 'Admin', page: 'Livestreaming', parent: 'Settings' },
  '/settings/announcement-types': { category: 'Admin', page: 'Announcement Types', parent: 'Settings' },
  '/settings/testimony-categories': { category: 'Admin', page: 'Testimony Categories', parent: 'Settings' },
  '/settings/media-categories': { category: 'Admin', page: 'Media Categories', parent: 'Settings' },
  '/settings/appointment-types': { category: 'Admin', page: 'Appointment Types', parent: 'Settings' },
  '/settings/group-types': { category: 'Admin', page: 'Group Types', parent: 'Settings' },
  '/settings/branding': { category: 'Admin', page: 'Branding', parent: 'Settings' },
  '/settings/whatsapp': { category: 'Admin', page: 'WhatsApp', parent: 'Settings' },
  '/settings/verification': { category: 'Admin', page: 'Verification', parent: 'Settings' },
};

export const Breadcrumb = () => {
  const { pathname } = useLocation();
  
  // Try exact match first
  let routeInfo = ROUTE_MAP[pathname];
  
  // If no exact match, try startsWith matching for dynamic routes
  if (!routeInfo) {
    const matchingRoute = Object.keys(ROUTE_MAP).find(route => 
      pathname.startsWith(route) && route !== '/'
    );
    if (matchingRoute) {
      routeInfo = ROUTE_MAP[matchingRoute];
    }
  }
  
  // If no route found, return null
  if (!routeInfo) {
    return null;
  }
  
  const { category, page, parent } = routeInfo;
  
  return (
    <div className="text-sm text-slate-400 font-jakarta">
      <span>{category}</span>
      <span className="mx-2">&gt;</span>
      {parent && (
        <>
          <span>{parent}</span>
          <span className="mx-2">&gt;</span>
        </>
      )}
      <span className="font-bold text-slate-900">{page}</span>
    </div>
  );
};