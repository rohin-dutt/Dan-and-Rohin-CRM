import {
  AddTeamIcon,
  ArrowRight02Icon,
  CalendarLove02Icon,
  Leaf01Icon,
  Notification02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

const steps = [
  {
    icon: AddTeamIcon,
    number: "01",
    eyebrow: "Plant your roots",
    title: "Bring in your people",
    body: "Choose the friends, family, mentors, and neighbors you genuinely want to keep close. Start with five; grow from there.",
    note: "Import only who matters",
  },
  {
    icon: CalendarLove02Icon,
    number: "02",
    eyebrow: "Choose your rhythm",
    title: "Make care feel natural",
    body: "Set a pace that fits each relationship, then jot down the moments and details you want to remember next time.",
    note: "Your cadence, your way",
  },
  {
    icon: Notification02Icon,
    number: "03",
    eyebrow: "Let Roots remember",
    title: "Reach out at the right time",
    body: "Get a quiet nudge when someone needs attention, with the context to make your next message feel thoughtful.",
    note: "Gentle, useful reminders",
  },
];

export function HowItWorks() {
  return (
    <section className="px-6 py-20 sm:py-28">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/65">
            How Roots works
          </p>
          <h2 className="mt-4 font-heading text-[clamp(2.35rem,5vw,3.4rem)] font-semibold leading-tight text-foreground">
            A little intention goes a long way.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-muted-foreground">
            Roots stays quietly in the background until there’s a good reason to bring someone back to mind.
          </p>
        </div>

        <div className="relative mt-14 grid gap-5 lg:grid-cols-3 lg:gap-7">
          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              <article className="group flex h-full flex-col rounded-[2rem] border border-border bg-card p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md sm:p-8">
                <div className="flex items-center justify-between">
                  <span className="flex h-13 w-13 items-center justify-center rounded-full bg-secondary text-primary">
                    <HugeiconsIcon icon={step.icon} size={23} strokeWidth={1.7} />
                  </span>
                  <span className="font-heading text-2xl text-primary/25">{step.number}</span>
                </div>
                <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/60">
                  {step.eyebrow}
                </p>
                <h3 className="mt-2 font-heading text-[1.65rem] font-semibold leading-tight text-foreground">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{step.body}</p>
                <div className="mt-7 border-t border-border pt-5 lg:mt-auto">
                  <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-[11px] font-semibold text-primary">
                    <HugeiconsIcon icon={Leaf01Icon} size={14} strokeWidth={1.8} />
                    {step.note}
                  </span>
                </div>
              </article>

              {index < steps.length - 1 && (
                <span className="absolute -right-5 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background text-primary shadow-sm lg:flex" aria-hidden="true">
                  <HugeiconsIcon icon={ArrowRight02Icon} size={17} strokeWidth={2} />
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-5 rounded-[1.75rem] bg-secondary px-6 py-6 text-center sm:flex-row sm:px-8 sm:text-left">
          <div className="flex items-center gap-4">
            <span className="hidden h-11 w-11 items-center justify-center rounded-full bg-card text-primary shadow-sm sm:flex">
              <HugeiconsIcon icon={Leaf01Icon} size={20} strokeWidth={1.7} />
            </span>
            <div>
              <p className="font-heading text-xl font-semibold text-foreground">Built around people, not productivity.</p>
              <p className="mt-1 text-sm text-muted-foreground">No streaks to protect. No inbox to clear. Just relationships worth tending.</p>
            </div>
          </div>
          <span className="whitespace-nowrap text-xs font-semibold uppercase tracking-[0.18em] text-primary/65">Quietly thoughtful</span>
        </div>
      </div>
    </section>
  );
}
