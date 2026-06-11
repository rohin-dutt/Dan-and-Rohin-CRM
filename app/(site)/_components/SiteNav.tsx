import Link from "next/link";

export function SiteNav() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
      <Link
        href="/"
        className="flex items-center gap-2 font-heading text-lg font-semibold text-foreground"
      >
        <img src="/logo.svg" alt="" aria-hidden="true" width="28" height="28" />
        Roots
      </Link>
      <nav className="flex items-center gap-1 text-sm">
        <Link
          href="/about"
          className="rounded-md px-3 py-2 text-foreground transition hover:bg-muted"
        >
          About
        </Link>
        <Link
          href="/faq"
          className="rounded-md px-3 py-2 text-foreground transition hover:bg-muted"
        >
          FAQ
        </Link>
        <Link
          href="/contact"
          className="rounded-md px-3 py-2 text-foreground transition hover:bg-muted"
        >
          Contact
        </Link>
        <Link
          href="#"
          className="rounded-md bg-primary px-3 py-2 font-medium text-primary-foreground transition hover:bg-primary/80"
        >
          Download
        </Link>
      </nav>
    </header>
  );
}
