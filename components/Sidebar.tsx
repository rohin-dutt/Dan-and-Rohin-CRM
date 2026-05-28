"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";

import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { updateStreakAfterAction } from "@/lib/crm-rules";
import { todayInputValue } from "@/lib/date-utils";
import { INTERACTION_TYPES } from "@/lib/form-utils";

const SIGNUP_URL = "https://useroots.app/auth/signup";

const navLinks = [
  { label: "Home", href: "/dashboard" },
  { label: "People", href: "/people" },
  { label: "Your Roots", href: "/roots-map" },
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

function QuickAddModal({ onClose }: { onClose: () => void }) {
  type View = "menu" | "log" | "note";
  const router = useRouter();
  const modalRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>("menu");
  const [people, setPeople] = useState<{ id: string; name: string }[]>([]);

  // Log view state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [selectedPersonName, setSelectedPersonName] = useState("");
  const [selectedType, setSelectedType] = useState("Text");
  const [selectedDate, setSelectedDate] = useState(todayInputValue());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [fetchError, setFetchError] = useState("");

  // Note view state
  const [notePersonId, setNotePersonId] = useState<string | null>(null);
  const [notePersonName, setNotePersonName] = useState("");
  const [noteText, setNoteText] = useState("");
  const [noteSearchQuery, setNoteSearchQuery] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSaveResult, setNoteSaveResult] = useState<"idle" | "success" | "error">("idle");
  const [noteErrorMsg, setNoteErrorMsg] = useState("");

  useEffect(() => {
    async function fetchPeople() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setFetchError("Not authenticated");
        return;
      }
      const { data, error } = await supabase
        .from("people")
        .select("id, name")
        .eq("user_id", user.id)
        .order("name");
      if (error) {
        setFetchError("Failed to load people.");
        return;
      }
      setPeople(data ?? []);
    }
    fetchPeople();
  }, []);

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [onClose]);

  const filteredPeople = searchQuery
    ? people.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : people;

  const noteFilteredPeople = noteSearchQuery
    ? people.filter((p) =>
        p.name.toLowerCase().includes(noteSearchQuery.toLowerCase())
      )
    : people;

  async function handleSave() {
    if (!selectedPersonId) return;
    setSaving(true);
    setErrorMsg("");

    const { error } = await supabase.rpc("create_interaction_and_touch_person", {
      p_person_id: selectedPersonId,
      p_type: selectedType,
      p_date: selectedDate,
      p_notes: notes.trim() || null,
      p_follow_up_needed: false,
      p_follow_up_date: null,
      p_follow_up_status: "done",
    });

    if (error) {
      setErrorMsg(error.message ?? "Failed to save.");
      setSaveResult("error");
      setSaving(false);
      return;
    }

    setSaveResult("success");
    await updateStreakAfterAction(supabase);
    setTimeout(() => onClose(), 1500);
  }

  async function handleNoteSave() {
    if (!notePersonId || !noteText.trim() || noteSaving) return;
    setNoteSaving(true);
    setNoteErrorMsg("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setNoteErrorMsg("Not authenticated");
      setNoteSaveResult("error");
      setNoteSaving(false);
      return;
    }

    const { data: personData, error: fetchErr } = await supabase
      .from("people")
      .select("notes")
      .eq("id", notePersonId)
      .single();

    if (fetchErr) {
      setNoteErrorMsg(fetchErr.message ?? "Failed to load person.");
      setNoteSaveResult("error");
      setNoteSaving(false);
      return;
    }

    const dateStr = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const noteWithDate = `[${dateStr}] ${noteText.trim()}`;
    const updatedNotes = personData?.notes
      ? `${personData.notes}\n\n${noteWithDate}`
      : noteWithDate;

    const { error: updateErr } = await supabase
      .from("people")
      .update({ notes: updatedNotes })
      .eq("id", notePersonId)
      .eq("user_id", user.id);

    if (updateErr) {
      setNoteErrorMsg(updateErr.message ?? "Failed to save note.");
      setNoteSaveResult("error");
      setNoteSaving(false);
      return;
    }

    setNoteSaveResult("success");
    setTimeout(() => onClose(), 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
      <div
        ref={modalRef}
        className="mx-4 w-full max-w-sm rounded-lg border border-border bg-background p-5 shadow-xl"
      >
        {saveResult === "success" ? (
          <div className="py-8 text-center">
            <p className="text-lg font-semibold text-foreground">Logged ✓</p>
          </div>
        ) : noteSaveResult === "success" ? (
          <div className="py-8 text-center">
            <p className="text-lg font-semibold text-foreground">Note saved ✓</p>
          </div>
        ) : view === "menu" ? (
          <>
            <h2 className="mb-4 text-base font-semibold">Quick Add</h2>
            {fetchError && (
              <p className="mb-3 text-sm text-red-700">{fetchError}</p>
            )}
            <div className="space-y-3">
              <button
                onClick={() => setView("log")}
                className="w-full rounded-lg border border-border bg-card p-4 text-left transition hover:border-primary/30 hover:shadow-sm"
              >
                <p className="font-medium text-foreground">💬 Log a chat</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Record a recent conversation
                </p>
              </button>
              <button
                onClick={() => setView("note")}
                className="w-full rounded-lg border border-border bg-card p-4 text-left transition hover:border-primary/30 hover:shadow-sm"
              >
                <p className="font-medium text-foreground">📝 Add a note</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Jot something down about someone
                </p>
              </button>
              <button
                onClick={() => {
                  router.push("/people/new");
                  onClose();
                }}
                className="w-full rounded-lg border border-border bg-card p-4 text-left transition hover:border-primary/30 hover:shadow-sm"
              >
                <p className="font-medium text-foreground">👤 Add someone new</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add a new person to Roots
                </p>
              </button>
            </div>
            <button
              onClick={onClose}
              className="mt-4 w-full rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent"
            >
              Close
            </button>
          </>
        ) : view === "log" ? (
          <>
            <button
              onClick={() => setView("menu")}
              className="mb-3 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              ← Back
            </button>
            <h2 className="mb-4 text-base font-semibold">Log a chat</h2>

            {/* Person search */}
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-foreground">
                Who did you talk to?
              </label>
              {people.length === 0 && !fetchError ? (
                <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                  <Link
                    href="/people/new"
                    onClick={onClose}
                    className="font-medium underline"
                  >
                    Add someone to Roots first
                  </Link>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (selectedPersonId) {
                        setSelectedPersonId(null);
                        setSelectedPersonName("");
                      }
                    }}
                    placeholder="Search by name..."
                    className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  {searchQuery && !selectedPersonId && filteredPeople.length > 0 && (
                    <div className="mt-1 max-h-40 overflow-y-auto rounded-md border border-border bg-card shadow-sm">
                      {filteredPeople.slice(0, 8).map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedPersonId(p.id);
                            setSelectedPersonName(p.name);
                            setSearchQuery(p.name);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  )}
                  {searchQuery && !selectedPersonId && filteredPeople.length === 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">No matches</p>
                  )}
                  {selectedPersonId && (
                    <p className="mt-1 text-xs text-emerald-600">
                      ✓ {selectedPersonName}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Type pills */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-foreground">
                How did you connect?
              </label>
              <div className="flex flex-wrap gap-1.5">
                {INTERACTION_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedType(type)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition",
                      selectedType === type
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-foreground hover:bg-muted"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Date */}
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-foreground">
                When?
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Notes */}
            <div className="mb-4">
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What did you talk about? (optional)"
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {saveResult === "error" && (
              <p className="mb-3 text-sm text-red-700">{errorMsg}</p>
            )}

            <button
              onClick={handleSave}
              disabled={saving || !selectedPersonId}
              className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setView("menu")}
              className="mb-3 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              ← Back
            </button>
            <h2 className="mb-4 text-base font-semibold">Add a note</h2>

            {/* Person search */}
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-foreground">
                Who is this about?
              </label>
              {people.length === 0 && !fetchError ? (
                <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                  <Link
                    href="/people/new"
                    onClick={onClose}
                    className="font-medium underline"
                  >
                    Add someone to Roots first
                  </Link>
                </div>
              ) : notePersonId ? (
                <div className="flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm">
                  <span className="font-medium text-foreground">{notePersonName}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setNotePersonId(null);
                      setNotePersonName("");
                    }}
                    className="leading-none text-muted-foreground hover:text-foreground"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={noteSearchQuery}
                    onChange={(e) => setNoteSearchQuery(e.target.value)}
                    placeholder="Search by name..."
                    className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  {noteSearchQuery && noteFilteredPeople.length > 0 && (
                    <div className="mt-1 max-h-40 overflow-y-auto rounded-md border border-border bg-card shadow-sm">
                      {noteFilteredPeople.slice(0, 8).map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setNotePersonId(p.id);
                            setNotePersonName(p.name);
                            setNoteSearchQuery("");
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  )}
                  {noteSearchQuery && noteFilteredPeople.length === 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">No matches</p>
                  )}
                </>
              )}
            </div>

            {/* Note text */}
            <div className="mb-4">
              <textarea
                rows={3}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="What do you want to note?"
                className="w-full resize-none rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {noteSaveResult === "error" && (
              <p className="mb-3 text-sm text-red-700">{noteErrorMsg}</p>
            )}

            <button
              onClick={handleNoteSave}
              disabled={!notePersonId || !noteText.trim() || noteSaving}
              className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
            >
              {noteSaving ? "Saving..." : "Save note"}
            </button>
          </>
        )}
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
          className="rounded-md px-3 py-2 text-center text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
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
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [streak, setStreak] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{ id: string; name: string; company: string | null }>
  >([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchStreak() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("settings")
          .select("current_streak")
          .eq("user_id", user.id)
          .maybeSingle();
        setStreak(data?.current_streak ?? 0);
      } catch {
        // silent fail
      }
    }
    fetchStreak();
  }, []);

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  useEffect(() => {
    const delay = searchQuery.trim() ? 300 : 0;
    const timer = setTimeout(async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        setShowSearchResults(false);
        return;
      }
      setSearchLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("people")
        .select("id, name, company")
        .eq("user_id", user.id)
        .ilike("name", `%${searchQuery}%`)
        .limit(6);
      setSearchResults(data ?? []);
      setShowSearchResults(true);
      setSearchLoading(false);
    }, delay);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <>
      {inviteOpen && <InviteModal onClose={() => setInviteOpen(false)} />}
      {quickAddOpen && <QuickAddModal onClose={() => setQuickAddOpen(false)} />}

      <header className="border-b border-border bg-background px-4 py-4 md:hidden">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-base font-semibold">
            <img src="/logo.svg" alt="" aria-hidden="true" width="24" height="24" />
            Roots
          </Link>
          <button
            onClick={() => setQuickAddOpen(true)}
            className="rounded-md bg-primary px-3 py-1 text-sm font-medium text-primary-foreground"
            aria-label="Quick Add"
          >
            +
          </button>
        </div>
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

        <button
          onClick={() => setQuickAddOpen(true)}
          className="mb-4 w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/80"
        >
          ＋ Quick Add
        </button>

        <div ref={searchRef} className="relative mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search people..."
            className="h-9 w-full rounded-md border border-sidebar-border bg-sidebar-accent/50 px-3 text-sm text-sidebar-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {searchLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              ...
            </div>
          )}
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-10 z-50 overflow-hidden rounded-md border border-border bg-background shadow-lg">
              {searchResults.map((person) => (
                <Link
                  key={person.id}
                  href={`/people/${person.id}`}
                  onClick={() => {
                    setSearchQuery("");
                    setShowSearchResults(false);
                  }}
                  className="flex flex-col px-3 py-2.5 transition-colors hover:bg-muted"
                >
                  <span className="text-sm font-medium text-foreground">{person.name}</span>
                  {person.company && (
                    <span className="text-xs text-muted-foreground">{person.company}</span>
                  )}
                </Link>
              ))}
            </div>
          )}
          {showSearchResults && searchResults.length === 0 && !searchLoading && (
            <div className="absolute left-0 right-0 top-10 z-50 rounded-md border border-border bg-background px-3 py-2.5 shadow-lg">
              <p className="text-sm text-muted-foreground">No people found</p>
            </div>
          )}
        </div>

        <NavLinks onInviteClick={() => setInviteOpen(true)} />

        <div className="mt-auto flex flex-col gap-1">
          {streak > 0 && (
            <div className="mb-2 flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-muted-foreground">
              <span>🔥</span>
              <span className="font-medium">{streak} day streak</span>
            </div>
          )}
          <button
            onClick={() => setInviteOpen(true)}
            className="rounded-md px-3 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            Invite a friend
          </button>
          <button
            onClick={handleLogout}
            className="rounded-md px-3 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}
