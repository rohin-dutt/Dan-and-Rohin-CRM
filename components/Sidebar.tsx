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
                ? "bg-zinc-900 text-white"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950",
              !mobile && isActive && "bg-white text-zinc-950",
              !mobile && !isActive && "text-zinc-300 hover:bg-zinc-800 hover:text-white"
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
      <header className="border-b border-zinc-200 bg-white px-4 py-4 md:hidden">
        <Link href="/dashboard" className="block text-base font-semibold">
          Personal CRM
        </Link>
        <p className="mt-1 text-xs text-zinc-500">Relationship tracker</p>
        <div className="mt-4">
          <NavLinks mobile />
        </div>
      </header>

      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-zinc-800 bg-zinc-950 px-4 py-6 text-white md:flex">
        <div className="mb-8">
          <Link href="/dashboard" className="text-lg font-semibold">
            Personal CRM
          </Link>
          <p className="mt-1 text-sm text-zinc-400">Relationship tracker</p>
        </div>

        <NavLinks />

        <button
          onClick={handleLogout}
          className="mt-auto rounded-md px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white text-left"
        >
          Log out
        </button>
      </aside>
    </>
  );
}
