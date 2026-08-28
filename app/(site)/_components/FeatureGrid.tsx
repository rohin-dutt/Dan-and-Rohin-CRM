type IconProps = { className?: string };

function BellIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function BookIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
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

function MapPinIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function HeartIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M19 14c1.5-1.5 3-3.28 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5C2 10.72 3.5 12.5 5 14l7 7z" />
    </svg>
  );
}

function IconCircle({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-primary">
      {children}
    </span>
  );
}

function RootTexture() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 400"
      className="pointer-events-none absolute inset-0 h-full w-full text-ring opacity-[0.08]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M60 400V220c0-30 20-40 50-40s40-20 40-50V40" />
      <path d="M150 400V260c0-25 15-35 40-35" />
      <path d="M110 260c-25 0-45-15-45-45" />
      <path d="M190 130c25 0 40-15 40-40" />
    </svg>
  );
}

const tiles = [
  {
    icon: <BellIcon className="h-5 w-5" />,
    title: "Follow through",
    body: "Set follow-ups and see what's overdue so nothing slips — every commitment, surfaced on time.",
    large: true,
  },
  {
    icon: <BookIcon className="h-5 w-5" />,
    title: "Remember",
    body: "Keep notes, birthdays, tags, and interaction history so you always have context before reaching out.",
  },
  {
    icon: <ChatIcon className="h-5 w-5" />,
    title: "Log a chat in seconds",
    body: "A quick note on how you connected keeps your memory sharp without any extra effort.",
  },
  {
    icon: <MapPinIcon className="h-5 w-5" />,
    title: "See your whole world",
    body: "A map of where the people in your life are.",
  },
  {
    icon: <HeartIcon className="h-5 w-5" />,
    title: "Stay close",
    body: "See which relationships have gone quiet and reach out before the silence becomes permanent.",
  },
];

export function FeatureGrid() {
  return (
    <section className="border-t border-border bg-muted px-6 py-20 sm:py-24">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2">
        {tiles.map((tile) => (
          <article
            key={tile.title}
            className={`relative overflow-hidden rounded-2xl border border-border bg-card p-7 shadow-sm ${
              tile.large ? "lg:col-span-2 lg:row-span-2 lg:p-9" : ""
            }`}
          >
            {tile.large && <RootTexture />}
            <div className="relative">
              <IconCircle>{tile.icon}</IconCircle>
              <h3 className={`mt-5 font-heading font-semibold text-foreground ${tile.large ? "text-2xl" : "text-xl"}`}>
                {tile.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{tile.body}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
