"use client";

import type { ReactNode } from "react";
import { useInView } from "../_lib/use-in-view";

export function Reveal({
  children,
  delayMs = 0,
  className,
}: {
  children: ReactNode;
  delayMs?: number;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delayMs}ms` }}
      className={`transition-all duration-700 ease-out motion-reduce:transition-none motion-reduce:transform-none ${
        inView ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"
      } ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
