"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";

import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

const SIGNUP_URL = "https://dan-and-rohin-crm.vercel.app/auth/signup";

const navLinks = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "People", href: "/people" },
  { label: "Settings", href: "/settings" },
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function InviteModal({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [onClose]);

  async function handleCopy() {
    await navigator.clipboard.writeText(SIGNUP_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
      <div
        ref={modalRef}
        className="mx-4 w-full max-w-sm rounded-lg border border-border bg-background p-5 shadow-xl"
      >
        <h2 className="mb-1 text-base font-semibold">Invite a friend to Roots</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Share the link and they can sign up for free.
        </p>
        <input
          type="text"
          readOnly
          value={SIGNUP_URL}
          className="mb-3 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm"
        />
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
          <button
            onClick={onClose}
            className="rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function NavLinks({
  mobile = false,
  onInviteClick,
}: {
  mobile?: boolean;
  onInviteClick: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(mobile ? "grid grid-cols-4 gap-2" : "flex flex-col gap-1")}
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
      {mobile && (
        <button
          onClick={onInviteClick}
          className="rounded-md px-3 py-2 text-sm font-medium text-center text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          Invite
        </button>
      )}
    </nav>
  );
}

export default function Sidebar() {
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <>
      {inviteOpen && <InviteModal onClose={() => setInviteOpen(false)} />}

      <header className="border-b border-border bg-background px-4 py-4 md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2 text-base font-semibold">
          <img src="/logo.svg" alt="" aria-hidden="true" width="24" height="24" />
          Roots
        </Link>
        <p className="mt-1 text-xs text-muted-foreground">Stay close to the people who matter</p>
        <div className="mt-4">
          <NavLinks mobile onInviteClick={() => setInviteOpen(true)} />
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

        <NavLinks onInviteClick={() => setInviteOpen(true)} />

        <div className="mt-auto flex flex-col gap-1">
          <button
            onClick={() => setInviteOpen(true)}
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-left"
          >
            Invite a friend
          </button>
          <button
            onClick={handleLogout}
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-left"
          >
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}
