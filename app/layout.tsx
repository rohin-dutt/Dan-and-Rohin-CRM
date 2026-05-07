import type { Metadata } from "next";
import type { CSSProperties } from "react";
import "./globals.css";

const fontVariables = {
  "--font-sans":
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  "--font-geist-mono":
    '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
} as CSSProperties;

export const metadata: Metadata = {
  title: "Personal CRM",
  description: "A private relationship tracker for personal follow-ups.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased font-sans"
      style={fontVariables}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
