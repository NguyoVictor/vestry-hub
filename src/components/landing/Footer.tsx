import { Link } from "react-router-dom";

const footerLinks = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "Integrations", href: "#" },
    { label: "Changelog", href: "#" },
  ],
  Company: [
    { label: "About", href: "#about" },
    { label: "Blog", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Contact", href: "#contact" },
  ],
  Support: [
    { label: "Help Center", href: "#" },
    { label: "Documentation", href: "#" },
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
  ],
};

const Footer = () => {
  return (
    <footer id="about" className="border-t border-border bg-card py-16">
      <div className="container mx-auto px-4">
        <div className="grid gap-12 md:grid-cols-4">
          {/* Brand */}
          <div>
            <Link to="/" className="text-2xl font-extrabold tracking-tight text-primary">
              Vestry
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              The all-in-one church management platform that helps you focus on what matters — ministry.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-sm font-semibold text-foreground">{title}</h4>
              <ul className="mt-4 space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-border pt-8 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Vestry. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
