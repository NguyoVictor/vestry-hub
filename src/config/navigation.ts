import {
  LayoutDashboard, Users, UsersRound, Home, HeartHandshake, UserPlus,
  ClipboardList, Sparkles, CreditCard, Receipt, Target, Wallet, PieChart,
  Banknote, BookOpen, FileText, BookMarked, ArrowUpRight, Church, CalendarDays,
  HandHeart, MessageSquare, Video, Building2, ShieldCheck, AlertTriangle,
  Send, Megaphone, MessageCircle, Quote, BarChart2, Palette, Bot, Mic2,
  BookOpenText, Music, Image as ImageIcon, Package, PenLine, PlayCircle, Radio,
  TrendingUp, GraduationCap, Globe, ShoppingBag, BookCheck, BarChart3,
  GitBranch, Settings, type LucideIcon,
} from "lucide-react";

export interface NavItem { title: string; path: string; icon: LucideIcon; }
export interface NavGroup { label: string; items: NavItem[]; }

export const navigationGroups: NavGroup[] = [
  { label: "Overview", items: [
    { title: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  ]},
  { label: "People", items: [
    { title: "Members", path: "/members", icon: Users },
    { title: "Groups", path: "/groups", icon: UsersRound },
    { title: "House Fellowships", path: "/house-fellowships", icon: Home },
    { title: "Families", path: "/families", icon: HeartHandshake },
    { title: "Visitors", path: "/visitors", icon: UserPlus },
    { title: "Follow-Up Tasks", path: "/follow-up-tasks", icon: ClipboardList },
    { title: "New Converts", path: "/new-converts", icon: Sparkles },
  ]},
  { label: "Finance", items: [
    { title: "Give Online", path: "/give-online", icon: CreditCard },
    { title: "Giving Records", path: "/giving-records", icon: Receipt },
    { title: "Pledge Campaigns", path: "/pledge-campaigns", icon: Target },
    { title: "Church Expenses", path: "/church-expenses", icon: Wallet },
    { title: "Budget Management", path: "/budget-management", icon: PieChart },
    { title: "Payroll", path: "/payroll", icon: Banknote },
    { title: "Fund Accounting", path: "/fund-accounting", icon: BookOpen },
    { title: "Accounts Payable", path: "/accounts-payable", icon: FileText },
    { title: "General Ledger", path: "/general-ledger", icon: BookMarked },
    { title: "Payouts", path: "/payouts", icon: ArrowUpRight },
  ]},
  { label: "Events & Operations", items: [
    { title: "Services", path: "/services", icon: Church },
    { title: "Events", path: "/events", icon: CalendarDays },
    { title: "Volunteering", path: "/volunteering", icon: HandHeart },
    { title: "Member Requests", path: "/member-requests", icon: MessageSquare },
    { title: "Board Meetings", path: "/board-meetings", icon: Video },
    { title: "Facility & Event Booking", path: "/facility-booking", icon: Building2 },
  ]},
  { label: "Security", items: [
    { title: "Security Centre", path: "/security-centre", icon: ShieldCheck },
    { title: "Incident Management", path: "/incident-management", icon: AlertTriangle },
  ]},
  { label: "Engagement", items: [
    { title: "Communications", path: "/communications", icon: Send },
    { title: "Announcements", path: "/announcements", icon: Megaphone },
    { title: "Member Messaging", path: "/member-messaging", icon: MessageCircle },
    { title: "Testimonies", path: "/testimonies", icon: Quote },
    { title: "Surveys", path: "/surveys", icon: BarChart2 },
  ]},
  { label: "Media & Content", items: [
    { title: "Graphics Studio", path: "/graphics-studio", icon: Palette },
    { title: "AI Tools", path: "/ai-tools", icon: Bot },
    { title: "Church Studio", path: "/church-studio", icon: Mic2 },
    { title: "Bible Explorer", path: "/bible-explorer", icon: BookOpenText },
    { title: "Song Library", path: "/song-library", icon: Music },
    { title: "Church Media", path: "/church-media", icon: ImageIcon },
    { title: "Asset Management", path: "/asset-management", icon: Package },
    { title: "Sermon Preparation", path: "/sermon-preparation", icon: PenLine },
    { title: "Sermon & Messages", path: "/sermons", icon: PlayCircle },
    { title: "Livestreaming", path: "/livestreaming", icon: Radio },
  ]},
  { label: "Growth", items: [
    { title: "Discipleship Dashboard", path: "/discipleship", icon: TrendingUp },
    { title: "Discipleship Resources", path: "/discipleship-resources", icon: GraduationCap },
    { title: "Outreach & Impact", path: "/outreach", icon: Globe },
    { title: "Resources Store", path: "/resources-store", icon: ShoppingBag },
    { title: "Training", path: "/training", icon: BookCheck },
  ]},
  { label: "Admin", items: [
    { title: "Reports & Analytics", path: "/reports", icon: BarChart3 },
    { title: "Branches", path: "/branches", icon: GitBranch },
    { title: "Settings", path: "/settings", icon: Settings },
  ]},
];

export const allNavItems = navigationGroups.flatMap(g => g.items);
