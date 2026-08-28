"use client";

import Image from "next/image";
import { useRef, useState } from "react";

type Screen = {
  src: string;
  alt: string;
};

export function PhoneCarousel({ screens }: { screens: Screen[] }) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  function goTo(next: number) {
    setIndex((next + screens.length) % screens.length);
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) {
      goTo(delta > 0 ? index - 1 : index + 1);
    }
    touchStartX.current = null;
  }

  return (
    <div className="relative mx-auto w-full max-w-[320px]">
      <div className="relative aspect-[9/19.5] overflow-hidden rounded-[2.75rem] border-[10px] border-foreground bg-foreground shadow-2xl">
        <div
          className="absolute left-1/2 top-0 z-20 h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-foreground"
          aria-hidden="true"
        />

        <div
          className="flex h-full w-full touch-pan-y transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {screens.map((screen) => (
            <div key={screen.alt} className="relative h-full w-full flex-shrink-0">
              {screen.src ? (
                <Image
                  src={screen.src}
                  alt={screen.alt}
                  fill
                  sizes="320px"
                  className="object-cover"
                />
              ) : (
                <div className="h-full w-full bg-secondary" />
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => goTo(index - 1)}
          aria-label="Previous screenshot"
          className="absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-background/80 p-1.5 text-foreground shadow-sm transition hover:bg-background"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => goTo(index + 1)}
          aria-label="Next screenshot"
          className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-background/80 p-1.5 text-foreground shadow-sm transition hover:bg-background"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>

        <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
          {screens.map((screen, i) => (
            <button
              key={screen.alt}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to screenshot ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-4 bg-background" : "w-1.5 bg-background/50"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
