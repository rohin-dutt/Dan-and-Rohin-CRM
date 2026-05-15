import { SiteNav } from "../_components/SiteNav";
import { SiteFooter } from "../_components/SiteFooter";

export const metadata = { title: "About — Roots" };

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-14">
        <h1 className="font-heading text-3xl font-semibold text-foreground">
          About Roots
        </h1>
        <p className="mt-5 max-w-prose leading-7 text-muted-foreground">
          Roots is a private relationship manager built for people who want to be
          more intentional with the friendships, mentorships, and connections
          that shape their lives. No social network, no public profiles — just a
          quiet, focused workspace for staying close to the people who matter.
        </p>
        <p className="mt-4 max-w-prose leading-7 text-muted-foreground">
          Your data lives in your account and can be exported at any time as
          plain JSON. Roots is built and maintained by two friends who wanted
          something simpler than a spreadsheet and more personal than a sales
          CRM.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
