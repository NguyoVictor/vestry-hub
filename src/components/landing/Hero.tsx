import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <section className="relative overflow-hidden py-24 md:py-36">
      {/* Subtle gradient accent */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />

      <div className="container relative mx-auto px-4 text-center">
        {/* BLURTEXT_PLACEHOLDER: Replace this h1 with BlurText component from React Bits */}
        <h1 className="mx-auto max-w-4xl text-5xl font-extrabold leading-tight tracking-tight text-foreground md:text-7xl">
          Church Management,
          <br />
          <span className="text-primary">Simplified.</span>
        </h1>

        <div className="mt-6">
          {/* SPLITTEXT_PLACEHOLDER: Replace this p with SplitText component from React Bits */}
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground md:text-xl">
            The all-in-one platform to manage your congregation, finances, and
            communications — so you can focus on ministry.
          </p>
        </div>

        {/* CTA Buttons — these will fade in via GSAP after SplitText completes */}
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button size="lg" asChild className="bg-primary px-8 text-lg hover:bg-accent hover:text-accent-foreground">
            <Link to="/auth/signup">Get Started Free</Link>
          </Button>
          <Button size="lg" variant="outline" className="px-8 text-lg">
            Watch Demo
          </Button>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          Free forever for up to 100 members · No credit card required
        </p>
      </div>
    </section>
  );
};

export default Hero;
