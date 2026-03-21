import { Helmet } from "react-helmet-async";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, MessageSquare, Mail, Youtube, Video, Send, BarChart3, CalendarDays, Zap, Globe } from "lucide-react";

const integrations = [
  { category: "Payments", items: [
    { name: "Stripe", desc: "Accept online donations and process payouts", icon: CreditCard, status: "available" as const },
    { name: "M-Pesa (Daraja)", desc: "Accept mobile money payments via M-Pesa", icon: CreditCard, status: "available" as const },
  ]},
  { category: "Communication", items: [
    { name: "Twilio", desc: "Send SMS notifications to members", icon: MessageSquare, status: "coming_soon" as const },
    { name: "SendGrid", desc: "Transactional email delivery", icon: Mail, status: "coming_soon" as const },
    { name: "WhatsApp Business", desc: "Send WhatsApp messages to members", icon: Send, status: "coming_soon" as const },
  ]},
  { category: "Media", items: [
    { name: "YouTube", desc: "Link your YouTube channel for livestreaming", icon: Youtube, status: "available" as const },
    { name: "Zoom", desc: "Embed Zoom meetings and livestreams", icon: Video, status: "coming_soon" as const },
  ]},
  { category: "Marketing & Analytics", items: [
    { name: "Google Analytics", desc: "Track your public church page traffic", icon: BarChart3, status: "available" as const },
    { name: "Mailchimp", desc: "Sync members to Mailchimp email lists", icon: Mail, status: "coming_soon" as const },
  ]},
  { category: "Productivity", items: [
    { name: "Google Calendar", desc: "Sync church events to Google Calendar", icon: CalendarDays, status: "coming_soon" as const },
    { name: "Zapier", desc: "Automate workflows with 5000+ apps", icon: Zap, status: "coming_soon" as const },
  ]},
];

const Integrations = () => {
  return (
    <>
      <Helmet><title>Integrations — Vestry</title></Helmet>
      <PageHeader title="Integrations" subtitle="Connect third-party services to extend your church platform" />

      <div className="max-w-4xl space-y-6">
        {integrations.map(group => (
          <div key={group.category}>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">{group.category}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {group.items.map(item => (
                <Card key={item.name}>
                  <CardContent className="p-4 flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{item.name}</p>
                        {item.status === "coming_soon" && <Badge variant="secondary" className="text-xs">Coming Soon</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                      <div className="mt-3">
                        {item.status === "coming_soon" ? (
                          <Button variant="outline" size="sm" disabled>Connect</Button>
                        ) : (
                          <Button variant="outline" size="sm">Connect</Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default Integrations;
