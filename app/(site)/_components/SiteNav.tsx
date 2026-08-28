"use client";

import Link from "next/link";
import { useState } from "react";
import { APP_STORE_URL } from "../_lib/constants";

const links = [
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-heading text-2xl font-bold text-primary"
        >
          <img src="/logo.svg" alt="" aria-hidden="true" width="28" height="28" />
          Roots
        </Link>

        <nav className="hidden items-center gap-1 text-sm md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-foreground transition hover:bg-muted"
            >
              {link.label}
            </Link>
          ))}
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            Get the app
          </a>
        </nav>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Toggle menu"
          className="flex items-center justify-center rounded-md p-2 text-foreground md:hidden"
        >
          {open ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          )}
        </button>
      </div>

      <div
        className={`overflow-hidden transition-[max-height] duration-300 ease-in-out md:hidden ${
          open ? "max-h-72" : "max-h-0"
        }`}
      >
        <nav className="flex flex-col gap-1 border-t border-border px-6 py-4 text-sm">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2.5 text-foreground transition hover:bg-muted"
            >
              {link.label}
            </Link>
          ))}
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="mt-1 rounded-md bg-primary px-3 py-2.5 text-center font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            Get the app
          </a>
        </nav>
      </div>
    </header>
  );
}
