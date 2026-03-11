import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="text-2xl font-extrabold tracking-tight text-primary">
          Vestry
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-8 md:flex">
          <a href="#features" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Features
          </a>
          <a href="#pricing" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Pricing
          </a>
          <a href="#about" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            About
          </a>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Button variant="ghost" asChild>
            <Link to="/auth/signin">Sign In</Link>
          </Button>
          <Button asChild className="bg-primary hover:bg-accent hover:text-accent-foreground">
            <Link to="/auth/signup">Get Started Free</Link>
          </Button>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-border bg-card px-4 pb-4 md:hidden">
          <div className="flex flex-col gap-3 pt-3">
            <a href="#features" className="text-sm font-medium text-muted-foreground" onClick={() => setMobileOpen(false)}>Features</a>
            <a href="#pricing" className="text-sm font-medium text-muted-foreground" onClick={() => setMobileOpen(false)}>Pricing</a>
            <a href="#about" className="text-sm font-medium text-muted-foreground" onClick={() => setMobileOpen(false)}>About</a>
            <hr className="border-border" />
            <Button variant="ghost" asChild className="justify-start">
              <Link to="/auth/signin">Sign In</Link>
            </Button>
            <Button asChild className="bg-primary hover:bg-accent hover:text-accent-foreground">
              <Link to="/auth/signup">Get Started Free</Link>
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
