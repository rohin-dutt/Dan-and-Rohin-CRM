import Link from "next/link";

const columns = [
  {
    heading: "Site",
    links: [
      { href: "/about", label: "About" },
      { href: "/faq", label: "FAQ" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-6 py-14">
        <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
          <div>
            <Link
              href="/"
              className="flex items-center gap-2 font-heading text-2xl font-bold text-primary"
            >
              <img src="/logo.svg" alt="" aria-hidden="true" width="28" height="28" />
              Roots
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-6 text-muted-foreground">
              Stay close to the people who matter most.
            </p>
          </div>

          <div className="flex gap-16">
            {columns.map((column) => (
              <div key={column.heading}>
                <h3 className="text-sm font-medium text-foreground">{column.heading}</h3>
                <nav className="mt-3 flex flex-col gap-2 text-sm">
                  {column.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="text-muted-foreground transition hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-12 border-t border-border pt-6 text-sm text-muted-foreground">
          © {new Date().getFullYear()} Roots
        </p>
      </div>
    </footer>
  );
}
