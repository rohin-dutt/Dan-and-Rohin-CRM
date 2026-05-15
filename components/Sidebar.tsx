"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

const navLinks = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "People", href: "/people" },
  { label: "Settings", href: "/settings" },
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        mobile ? "grid grid-cols-3 gap-2" : "flex flex-col gap-1"
      )}
      aria-label="Main navigation"
    >
      {navLinks.map((link) => {
        const isActive = isActivePath(pathname, link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              mobile && "text-center",
              isActive
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              !mobile && isActive && "bg-sidebar-primary text-sidebar-primary-foreground",
              !mobile && !isActive && "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function Sidebar() {
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <>
      <header className="border-b border-border bg-background px-4 py-4 md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2 text-base font-semibold">
          <img src="/logo.svg" alt="" aria-hidden="true" width="24" height="24" />
          Roots
        </Link>
        <p className="mt-1 text-xs text-muted-foreground">Stay close to the people who matter</p>
        <div className="mt-4">
          <NavLinks mobile />
        </div>
      </header>

      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 text-sidebar-foreground md:flex">
        <div className="mb-8">
          <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold">
            <img src="/logo.svg" alt="" aria-hidden="true" width="24" height="24" />
            Roots
          </Link>
          <p className="mt-1 text-sm text-muted-foreground">Stay close to the people who matter</p>
        </div>

        <NavLinks />

        <button
          onClick={handleLogout}
          className="mt-auto rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-left"
        >
          Log out
        </button>
      </aside>
    </>
  );
}
