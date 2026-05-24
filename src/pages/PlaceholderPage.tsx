import { Helmet } from "react-helmet-async";
import { useLocation, Link } from "react-router-dom";
import { allNavItems } from "@/config/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { LayoutDashboard } from "lucide-react";

const PLACEHOLDER_ROUTE_MAP: Record<string, string> = {
  '/appointments': 'Appointments',
  '/church-studio': 'Church Studio',
  '/livestreaming': 'Livestreaming'
};

const PlaceholderPage = () => {
  const { pathname } = useLocation();
  const item = allNavItems.find(i => i.path === pathname);
  const Icon = item?.icon || LayoutDashboard;
  
  // Use the placeholder route map for correct titles, fallback to navigation item title
  const title = PLACEHOLDER_ROUTE_MAP[pathname] || item?.title || "Page";

  return (
    <>
      <Helmet><title>{title} — Vestry</title></Helmet>
      <PageHeader title={title} />
      <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-12 text-center shadow-sm">
        <Icon className="mb-4 h-16 w-16 text-muted-foreground/30" />
        <h2 className="text-xl font-semibold text-foreground">{title} — Coming Soon</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This module is currently being built. Check back soon.
        </p>
        <Button variant="secondary" className="mt-6" asChild>
          <Link to="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    </>
  );
};

export default PlaceholderPage;
