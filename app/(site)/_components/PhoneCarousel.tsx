"use client";

import {
  Add01Icon,
  ArrowLeft02Icon,
  ArrowRight02Icon,
  BubbleChatIcon,
  Call02Icon,
  FavouriteIcon,
  Home01Icon,
  Mail01Icon,
  MapsIcon,
  MoreVerticalIcon,
  PencilEdit01Icon,
  Search01Icon,
  Settings01Icon,
  UserMultipleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRef, useState } from "react";

const appColors = {
  ivory: "#FCFBF7",
  mint: "#EEF4EA",
  forest: "#0F4A24",
  ink: "#20242D",
  muted: "#6B7280",
  border: "#E8E3D9",
};

const people = [
  { initials: "MC", name: "Maya Chen", meta: "Friend · Seattle", last: "Last talked 1 day ago" },
  { initials: "LS", name: "Liam Spencer", meta: "Friend · Austin", last: "Last talked 5 days ago" },
  { initials: "AS", name: "Aish Sharma", meta: "Friend · Boston", last: "Last talked 2 weeks ago" },
  { initials: "JW", name: "Julia Williams", meta: "Friend · Chicago", last: "Last talked 3 weeks ago" },
  { initials: "TB", name: "Theo Brooks", meta: "Friend · Denver", last: "Last talked 1 month ago" },
];

function Initials({ children, size = "h-10 w-10" }: { children: string; size?: string }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full border border-white text-[11px] font-bold ${size}`}
      style={{ backgroundColor: appColors.mint, color: appColors.forest }}
    >
      {children}
    </span>
  );
}

function BottomTabs({ active }: { active: "home" | "people" | "roots" | "settings" }) {
  const tabs = [
    { key: "home", label: "Home", icon: Home01Icon },
    { key: "people", label: "People", icon: UserMultipleIcon },
    { key: "add", label: "", icon: Add01Icon },
    { key: "roots", label: "Your Roots", icon: MapsIcon },
    { key: "settings", label: "Settings", icon: Settings01Icon },
  ] as const;

  return (
    <div
      className="absolute inset-x-0 bottom-0 z-20 grid h-[64px] grid-cols-5 items-center border-t px-2"
      style={{ borderColor: appColors.border, backgroundColor: "rgba(252,251,247,0.98)" }}
    >
      {tabs.map((tab) => {
        const selected = tab.key === active;
        if (tab.key === "add") {
          return (
            <span
              key={tab.key}
              className="mx-auto -mt-4 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg"
              style={{ backgroundColor: appColors.forest }}
            >
              <HugeiconsIcon icon={tab.icon} size={26} strokeWidth={1.8} />
            </span>
          );
        }
        return (
          <span
            key={tab.key}
            className="flex flex-col items-center gap-1 text-[8px] font-medium"
            style={{ color: selected ? appColors.forest : appColors.muted }}
          >
            <HugeiconsIcon icon={tab.icon} size={18} strokeWidth={selected ? 2.1 : 1.7} />
            {tab.label}
          </span>
        );
      })}
    </div>
  );
}

function PeopleScreen() {
  return (
    <div className="relative h-full overflow-hidden" style={{ backgroundColor: appColors.ivory }}>
      <div className="px-4 pb-[70px] pt-4">
        <div className="flex items-center gap-2">
          <h3 className="font-heading text-[27px] font-semibold leading-none" style={{ color: appColors.forest }}>
            Your People
          </h3>
          <HugeiconsIcon icon={FavouriteIcon} size={19} strokeWidth={1.6} style={{ color: appColors.forest }} />
        </div>
        <p className="mt-1 text-[10px]" style={{ color: appColors.muted }}>The people who matter.</p>

        <div
          className="mt-3 flex h-9 items-center gap-2 rounded-2xl border bg-white px-3 shadow-sm"
          style={{ borderColor: appColors.border, color: appColors.muted }}
        >
          <HugeiconsIcon icon={Search01Icon} size={15} strokeWidth={1.8} />
          <span className="text-[10px]">Search people</span>
        </div>

        <div className="mt-3 flex gap-1.5 overflow-hidden">
          {[
            ["All", false],
            ["Friends", true],
            ["Family", false],
            ["Mentors", false],
          ].map(([label, selected]) => (
            <span
              key={String(label)}
              className="whitespace-nowrap rounded-full border px-3 py-1.5 text-[9px] font-semibold"
              style={{
                borderColor: selected ? appColors.forest : appColors.border,
                backgroundColor: selected ? appColors.forest : "#FFFFFF",
                color: selected ? "#FFFFFF" : appColors.ink,
              }}
            >
              {label}
            </span>
          ))}
        </div>

        <div className="mt-3 overflow-hidden rounded-2xl border bg-white shadow-sm" style={{ borderColor: appColors.border }}>
          {people.map((person, personIndex) => (
            <div
              key={person.name}
              className="flex items-center gap-3 px-3 py-2.5"
              style={{ borderBottom: personIndex < people.length - 1 ? `1px solid ${appColors.border}` : undefined }}
            >
              <Initials>{person.initials}</Initials>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-bold" style={{ color: appColors.ink }}>{person.name}</p>
                <p className="mt-0.5 truncate text-[9px]" style={{ color: appColors.muted }}>{person.meta}</p>
                <p className="mt-0.5 truncate text-[9px]" style={{ color: appColors.muted }}>{person.last}</p>
              </div>
              <HugeiconsIcon icon={ArrowRight02Icon} size={15} strokeWidth={1.8} style={{ color: appColors.muted }} />
            </div>
          ))}
        </div>
      </div>
      <BottomTabs active="people" />
    </div>
  );
}

const timeline = [
  { date: "Jul 18, 2026", kind: "Text / Email", body: "Loved the book recs—starting Tomorrow, and Tomorrow!", icon: BubbleChatIcon },
  { date: "Jul 7, 2026", kind: "In Person", body: "Coffee at Elm Café. Great catch up. She’s thinking about grad school in the fall.", icon: UserMultipleIcon },
  { date: "Jun 21, 2026", kind: "Call", body: "Quick call—congratulated her on the new role at Northwind.", icon: Call02Icon },
];

function TimelineScreen() {
  return (
    <div className="relative h-full overflow-hidden" style={{ backgroundColor: appColors.ivory }}>
      <div className="px-4 pb-[62px] pt-3">
        <div className="flex items-center justify-between">
          <HugeiconsIcon icon={ArrowLeft02Icon} size={20} strokeWidth={2} style={{ color: appColors.ink }} />
          <HugeiconsIcon icon={MoreVerticalIcon} size={19} strokeWidth={2} style={{ color: appColors.ink }} />
        </div>

        <div className="mt-3 flex items-center gap-3">
          <Initials size="h-[58px] w-[58px]">MC</Initials>
          <div>
            <h3 className="font-heading text-[26px] font-semibold leading-none" style={{ color: appColors.forest }}>Maya Chen</h3>
            <p className="mt-1 text-[10px]" style={{ color: appColors.muted }}>Friend · Seattle</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-4 rounded-2xl border bg-white px-1 py-3 shadow-sm" style={{ borderColor: appColors.border }}>
          {[
            ["Last talked", "1 day ago"],
            ["Reach out", "by Jul 20"],
            ["Chats", "5"],
            ["Follow up?", "No"],
          ].map(([label, value], statIndex) => (
            <div key={label} className="px-1 text-center" style={{ borderRight: statIndex < 3 ? `1px solid ${appColors.border}` : undefined }}>
              <p className="text-[7px]" style={{ color: appColors.muted }}>{label}</p>
              <p className="mt-1 text-[9px] font-bold" style={{ color: appColors.ink }}>{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-4 border-b text-center text-[9px]" style={{ borderColor: appColors.border, color: appColors.ink }}>
          {["Timeline", "About", "Notes", "Follow-ups"].map((tab, tabIndex) => (
            <span
              key={tab}
              className="pb-2"
              style={{
                color: tabIndex === 0 ? appColors.forest : appColors.ink,
                borderBottom: tabIndex === 0 ? `2px solid ${appColors.forest}` : undefined,
              }}
            >
              {tab}
            </span>
          ))}
        </div>

        <div className="relative mt-3 space-y-3 before:absolute before:bottom-2 before:left-[17px] before:top-3 before:w-px before:bg-[#D9E4D7]">
          {timeline.map((item, itemIndex) => (
            <div key={item.date} className="relative flex gap-3">
              <span className="z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: appColors.mint, color: appColors.forest }}>
                <HugeiconsIcon icon={item.icon} size={16} strokeWidth={1.8} />
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-[9px] font-bold" style={{ color: appColors.ink }}>{item.date} · {item.kind}</p>
                <p className="mt-1 text-[9px] leading-[1.4]" style={{ color: appColors.muted }}>{item.body}</p>
                {itemIndex === 0 ? (
                  <div className="mt-2 rounded-xl px-3 py-2" style={{ backgroundColor: appColors.mint }}>
                    <p className="text-[8px] font-bold" style={{ color: appColors.ink }}>Note</p>
                    <p className="mt-0.5 text-[9px] leading-[1.35]" style={{ color: appColors.ink }}>Send her that article on remote team culture.</p>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 grid grid-cols-2 gap-2 border-t px-3 py-2" style={{ borderColor: appColors.border, backgroundColor: appColors.ivory }}>
        <span className="flex h-10 items-center justify-center gap-2 rounded-2xl text-[10px] font-semibold text-white" style={{ backgroundColor: appColors.forest }}>
          <HugeiconsIcon icon={BubbleChatIcon} size={15} strokeWidth={1.8} /> Log a chat
        </span>
        <span className="flex h-10 items-center justify-center gap-2 rounded-2xl border bg-white text-[10px] font-semibold" style={{ borderColor: appColors.forest, color: appColors.forest }}>
          <HugeiconsIcon icon={PencilEdit01Icon} size={15} strokeWidth={1.8} /> Add Note
        </span>
      </div>
    </div>
  );
}

function CadenceScreen() {
  return (
    <div className="relative h-full overflow-hidden" style={{ backgroundColor: appColors.ivory }}>
      <div className="px-4 pt-3">
        <div className="flex items-center justify-between">
          <HugeiconsIcon icon={ArrowLeft02Icon} size={20} strokeWidth={2} style={{ color: appColors.ink }} />
          <HugeiconsIcon icon={MoreVerticalIcon} size={19} strokeWidth={2} style={{ color: appColors.ink }} />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Initials size="h-[62px] w-[62px]">MC</Initials>
          <div>
            <h3 className="font-heading text-[27px] font-semibold leading-none" style={{ color: appColors.forest }}>Maya Chen</h3>
            <p className="mt-1 text-[10px]" style={{ color: appColors.muted }}>Friend · Seattle</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border bg-white p-5 shadow-sm" style={{ borderColor: appColors.border }}>
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: appColors.mint, color: appColors.forest }}>
              <HugeiconsIcon icon={BubbleChatIcon} size={17} strokeWidth={1.8} />
            </span>
            <div>
              <p className="text-[13px] font-bold" style={{ color: appColors.ink }}>Keep in touch</p>
              <p className="mt-1 text-[11px]" style={{ color: appColors.ink }}>Every 2 weeks</p>
            </div>
          </div>
          <div className="mt-5 rounded-xl px-4 py-3" style={{ backgroundColor: appColors.mint }}>
            <p className="text-[9px]" style={{ color: appColors.muted }}>Next reminder</p>
            <p className="mt-1 text-[15px] font-semibold text-[#B42318]">Jul 20, 2026</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 rounded-[1.75rem] border bg-white p-4 shadow-lg" style={{ borderColor: appColors.border }}>
          {[
            { label: "Text", icon: BubbleChatIcon },
            { label: "Call", icon: Call02Icon },
            { label: "Email", icon: Mail01Icon },
          ].map(({ label, icon }) => (
            <div key={label} className="flex flex-col items-center gap-2 text-[10px] font-semibold" style={{ color: appColors.ink }}>
              <span className="flex h-12 w-12 items-center justify-center rounded-full text-white" style={{ backgroundColor: appColors.forest }}>
                <HugeiconsIcon icon={icon} size={23} strokeWidth={1.8} />
              </span>
              {label}
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between rounded-2xl border bg-white px-4 py-4 shadow-sm" style={{ borderColor: appColors.border }}>
          <div className="flex items-center gap-3">
            <HugeiconsIcon icon={Call02Icon} size={18} strokeWidth={1.8} style={{ color: appColors.forest }} />
            <span className="text-[11px] font-semibold" style={{ color: appColors.ink }}>Reminders</span>
          </div>
          <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: appColors.forest }}>
            On <HugeiconsIcon icon={ArrowRight02Icon} size={13} strokeWidth={2} />
          </span>
        </div>
      </div>
    </div>
  );
}

const screens = [
  { label: "Your People", description: "Everyone who matters, all in one place.", component: PeopleScreen },
  { label: "Pick up where you left off", description: "Remember the details that make reaching out natural.", component: TimelineScreen },
  { label: "Your own rhythm", description: "Choose a cadence that fits every relationship.", component: CadenceScreen },
];

export function PhoneCarousel() {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  function goTo(next: number) {
    setIndex((next + screens.length) % screens.length);
  }

  function handleTouchStart(event: React.TouchEvent) {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(event: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = event.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) goTo(delta > 0 ? index - 1 : index + 1);
    touchStartX.current = null;
  }

  return (
    <div className="mx-auto w-full max-w-[330px]">
      <div className="relative aspect-[9/19.5] overflow-hidden rounded-[2.85rem] border-[9px] border-foreground bg-background shadow-[0_30px_80px_-32px_rgba(28,25,23,0.55)]">
        <div className="absolute left-1/2 top-0 z-30 h-6 w-28 -translate-x-1/2 rounded-b-2xl bg-foreground" aria-hidden="true" />
        <div className="absolute inset-x-0 top-0 z-20 flex h-9 items-center justify-between px-5 text-[8px] font-semibold text-foreground/70" aria-hidden="true">
          <span>7:25</span>
          <span>Roots</span>
        </div>

        <div
          className="flex h-full w-full touch-pan-y transition-transform duration-500 ease-out motion-reduce:transition-none"
          style={{ transform: `translateX(-${index * 100}%)` }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {screens.map((screen) => {
            const Screen = screen.component;
            return (
              <div
                key={screen.label}
                className="h-full w-full flex-shrink-0 overflow-hidden pt-8"
                aria-hidden={screen.label !== screens[index].label}
                inert={screen.label !== screens[index].label}
              >
                <Screen />
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-center gap-4">
        <button type="button" onClick={() => goTo(index - 1)} aria-label="Previous preview" className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-primary shadow-sm transition hover:-translate-y-0.5 hover:bg-secondary">
          <HugeiconsIcon icon={ArrowLeft02Icon} size={17} strokeWidth={2} />
        </button>
        <div className="flex items-center gap-2">
          {screens.map((screen, screenIndex) => (
            <button
              key={screen.label}
              type="button"
              onClick={() => goTo(screenIndex)}
              aria-label={`Show ${screen.label} preview`}
              aria-current={screenIndex === index ? "true" : undefined}
              className={`h-2 rounded-full transition-all ${screenIndex === index ? "w-7 bg-primary" : "w-2 bg-ring/35 hover:bg-ring/60"}`}
            />
          ))}
        </div>
        <button type="button" onClick={() => goTo(index + 1)} aria-label="Next preview" className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-primary shadow-sm transition hover:-translate-y-0.5 hover:bg-secondary">
          <HugeiconsIcon icon={ArrowRight02Icon} size={17} strokeWidth={2} />
        </button>
      </div>

      <div className="mt-3 text-center" aria-live="polite">
        <p className="text-sm font-semibold text-foreground">{screens[index].label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{screens[index].description}</p>
      </div>
    </div>
  );
}
