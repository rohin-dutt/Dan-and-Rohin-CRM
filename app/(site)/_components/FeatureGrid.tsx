import {
  BubbleChatIcon,
  CalendarLove02Icon,
  FavouriteIcon,
  MapPinIcon,
  Notification02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Image from "next/image";
import rootsLogoMark from "../../../mobile/assets/roots-logo-mark.png";

const features = [
  {
    icon: Notification02Icon,
    title: "Follow through",
    body: "Turn “I should reach out” into a gentle plan. See who’s due, what you promised, and the next small step.",
  },
  {
    icon: CalendarLove02Icon,
    title: "Remember what matters",
    body: "Keep birthdays, notes, important moments, and the details you’ll want before the next conversation.",
  },
  {
    icon: BubbleChatIcon,
    title: "Log a chat in seconds",
    body: "Capture a call, coffee, or memory while it’s fresh—just enough context to pick up where you left off.",
  },
  {
    icon: MapPinIcon,
    title: "See your whole world",
    body: "View the people you love by place, so being nearby can become a reason to reconnect.",
  },
  {
    icon: FavouriteIcon,
    title: "Stay close with intention",
    body: "Notice when a relationship has gone quiet and reach out before distance becomes the default.",
  },
];

export function FeatureGrid() {
  return (
    <section className="border-y border-border bg-muted px-6 py-20 sm:py-28">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:gap-8">
        <div className="relative overflow-hidden rounded-[2rem] bg-primary p-8 text-primary-foreground shadow-sm sm:p-10 lg:min-h-[620px]">
          <Image
            src={rootsLogoMark}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -right-16 h-auto w-[22rem] opacity-[0.09]"
          />
          <div className="relative flex h-full flex-col">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary-foreground/60">
              Made for real relationships
            </p>
            <h2 className="mt-5 max-w-sm font-heading text-[clamp(2.3rem,5vw,3.4rem)] font-semibold leading-[1.02]">
              Remember more. Show up better.
            </h2>
            <p className="mt-6 max-w-sm text-base leading-7 text-primary-foreground/75">
              Roots keeps the small things from getting lost, so caring for your relationships feels natural—not like another task list.
            </p>

            <div className="mt-10 border-l border-primary-foreground/20 pl-5 lg:mt-auto">
              <p className="font-heading text-xl font-semibold leading-snug">
                “The intention was always there. Roots helps you act on it.”
              </p>
              <p className="mt-3 text-xs uppercase tracking-[0.16em] text-primary-foreground/55">
                No feeds. No networking. No pressure.
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-sm">
          {features.map((feature, index) => (
            <article
              key={feature.title}
              className={`group grid gap-4 p-6 transition-colors hover:bg-secondary/55 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-5 sm:p-7 ${index < features.length - 1 ? "border-b border-border" : ""}`}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-primary transition-transform group-hover:scale-105">
                <HugeiconsIcon icon={feature.icon} size={22} strokeWidth={1.7} />
              </span>
              <div>
                <h3 className="font-heading text-[1.45rem] font-semibold leading-tight text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-1.5 max-w-xl text-sm leading-6 text-muted-foreground">
                  {feature.body}
                </p>
              </div>
              <span className="hidden font-heading text-lg text-primary/35 sm:block" aria-hidden="true">
                0{index + 1}
              </span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
