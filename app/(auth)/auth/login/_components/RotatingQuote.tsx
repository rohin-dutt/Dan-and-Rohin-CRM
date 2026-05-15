"use client"

import { useState, useEffect } from "react"

const quotes = [
  "Someone out there is hoping you'll reach out.",
  "Good relationships don't just happen.",
  "The best time to reconnect was yesterday. The next best time is now.",
  "Stay intentional with the people who matter.",
  "A little effort goes a long way in keeping relationships alive.",
]

export function RotatingQuote() {
  const [quote, setQuote] = useState("")

  useEffect(() => {
    const id = setTimeout(() => {
      setQuote(quotes[Math.floor(Math.random() * quotes.length)])
    }, 0)
    return () => clearTimeout(id)
  }, [])

  if (!quote) return null

  return (
    <p className="mt-4 text-sm italic leading-6 text-muted-foreground">
      &ldquo;{quote}&rdquo;
    </p>
  )
}
