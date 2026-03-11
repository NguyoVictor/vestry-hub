import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";

const tiers = [
  {
    name: "Free",
    monthlyPrice: 0,
    annualPrice: 0,
    description: "For small churches getting started.",
    features: [
      "Up to 100 members",
      "1 branch",
      "500 one-time emails",
      "2GB storage",
      "Manual giving records",
    ],
    cta: "Get Started Free",
    popular: false,
  },
  {
    name: "Foundation",
    monthlyPrice: 15,
    annualPrice: 162,
    description: "For growing churches ready to scale.",
    features: [
      "Up to 500 members",
      "2,500 emails/month",
      "5GB storage",
      "Online giving (coming soon)",
      "Priority email support",
    ],
    cta: "Start Foundation",
    popular: false,
  },
  {
    name: "Growth",
    monthlyPrice: 39,
    annualPrice: 421,
    description: "For established churches that need it all.",
    features: [
      "Unlimited members",
      "5,000 emails/month",
      "20GB storage",
      "150 AI credits/month",
      "Online giving (coming soon)",
      "Advanced analytics",
    ],
    cta: "Start Growth",
    popular: true,
  },
  {
    name: "Enterprise",
    monthlyPrice: null,
    annualPrice: null,
    description: "Custom solutions for large organisations.",
    features: [
      "Unlimited everything",
      "Dedicated account manager",
      "Custom SLA",
      "API access",
      "White-label options",
      "On-premise deployment",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

const Pricing = () => {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="bg-muted/40 py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Start free. Upgrade when you're ready.
          </p>

          <div className="mt-8 flex items-center justify-center gap-3">
            <span className={`text-sm font-medium ${!annual ? "text-foreground" : "text-muted-foreground"}`}>
              Monthly
            </span>
            <Switch checked={annual} onCheckedChange={setAnnual} />
            <span className={`text-sm font-medium ${annual ? "text-foreground" : "text-muted-foreground"}`}>
              Annual
            </span>
            {annual && (
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                Save 10%
              </Badge>
            )}
          </div>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {tiers.map((tier) => (
            <Card
              key={tier.name}
              className={`relative flex flex-col ${
                tier.popular
                  ? "border-2 border-primary shadow-lg"
                  : "border-border/50"
              }`}
            >
              {tier.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                  Most Popular
                </Badge>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">{tier.name}</CardTitle>
                <CardDescription>{tier.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <div className="mb-6">
                  {tier.monthlyPrice !== null ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-foreground">
                        ${annual ? Math.round(tier.annualPrice! / 12) : tier.monthlyPrice}
                      </span>
                      <span className="text-sm text-muted-foreground">/mo</span>
                    </div>
                  ) : (
                    <span className="text-4xl font-extrabold text-foreground">Custom</span>
                  )}
                  {annual && tier.annualPrice !== null && tier.annualPrice > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Billed ${tier.annualPrice}/year
                    </p>
                  )}
                </div>

                <ul className="mb-8 flex-1 space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  className={
                    tier.popular
                      ? "w-full bg-primary hover:bg-accent hover:text-accent-foreground"
                      : "w-full"
                  }
                  variant={tier.popular ? "default" : "outline"}
                >
                  <Link to={tier.monthlyPrice !== null ? "/auth/signup" : "#contact"}>
                    {tier.cta}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
