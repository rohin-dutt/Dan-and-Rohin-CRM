import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import "./globals.css";

const fontVariables = {
  "--font-sans":
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  "--font-geist-mono":
    '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
} as CSSProperties;

export const viewport: Viewport = {
  themeColor: '#1D9E75',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Personal CRM",
  description: "Your personal relationship manager",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Personal CRM",
  },
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
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Personal CRM" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="theme-color" content="#1D9E75" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
