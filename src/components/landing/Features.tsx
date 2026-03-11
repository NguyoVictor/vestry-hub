import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  HandCoins,
  CalendarCheck,
  ClipboardCheck,
  Megaphone,
  UsersRound,
} from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Member Management",
    description: "Track every member's journey — profiles, families, groups, and pastoral notes all in one place.",
  },
  {
    icon: HandCoins,
    title: "Giving & Finance",
    description: "Record tithes, offerings, and pledges. Auto-currency formatting keeps your books accurate.",
  },
  {
    icon: CalendarCheck,
    title: "Service Planning",
    description: "Schedule services, assign volunteers, and manage recurring events with ease.",
  },
  {
    icon: ClipboardCheck,
    title: "Attendance Tracking",
    description: "Quick check-in for services and events. Spot trends and celebrate growth.",
  },
  {
    icon: Megaphone,
    title: "Communications",
    description: "Send announcements, messages, and notifications to your entire congregation or specific groups.",
  },
  {
    icon: UsersRound,
    title: "Groups & Ministries",
    description: "Organise house fellowships, youth groups, and ministry teams with dedicated management tools.",
  },
];

const Features = () => {
  return (
    <section id="features" className="py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Everything your church needs
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            One platform to replace the spreadsheets, WhatsApp groups, and paper registers.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="group border-border/50 bg-card shadow-sm transition-shadow hover:shadow-md"
            >
              <CardContent className="p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
