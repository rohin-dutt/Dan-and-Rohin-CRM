type IconProps = { className?: string };

function UserPlusIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" />
    </svg>
  );
}

function ChatIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function BellIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

const steps = [
  { icon: <UserPlusIcon className="h-6 w-6" />, title: "Add the people who matter" },
  { icon: <ChatIcon className="h-6 w-6" />, title: "Log a chat whenever you connect" },
  { icon: <BellIcon className="h-6 w-6" />, title: "Get a gentle nudge when it's time to reach out" },
];

export function HowItWorks() {
  return (
    <section className="px-6 py-20 sm:py-24">
      <div className="mx-auto w-full max-w-5xl">
        <h2 className="text-center font-heading text-3xl font-semibold text-foreground sm:text-4xl">
          How it works
        </h2>
        <div className="relative mt-14 grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-6">
          <div
            aria-hidden="true"
            className="absolute left-0 right-0 top-7 hidden h-px bg-border sm:block"
          />
          {steps.map((step) => (
            <div key={step.title} className="relative flex flex-col items-center text-center">
              <span className="relative z-10 inline-flex h-14 w-14 items-center justify-center rounded-full border border-border bg-background text-primary">
                {step.icon}
              </span>
              <p className="mx-auto mt-4 max-w-[220px] text-base font-medium text-foreground">
                {step.title}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
