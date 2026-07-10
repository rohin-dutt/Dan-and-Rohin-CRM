import Link from "next/link";
import { SiteNav } from "../_components/SiteNav";
import { SiteFooter } from "../_components/SiteFooter";

export const metadata = { title: "Terms of Service — Roots" };

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-14">
        <h1 className="font-heading text-3xl font-semibold text-foreground">
          Terms of Service
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Last updated: June 2026
        </p>
        <div className="mt-8 max-w-prose space-y-8 text-sm leading-7 text-muted-foreground">
          <section>
            <h2 className="font-medium text-foreground">Acceptance</h2>
            <p className="mt-2">
              By creating an account and using Roots you agree to these terms.
              If you do not agree, do not use the service.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">The service</h2>
            <p className="mt-2">
              Roots is an app that helps you stay close to the people who matter most. It surfaces who you haven't talked to in a while, reminds you of important moments, and helps you follow through on the connections that matter. We
              reserve the right to modify or discontinue the service at any
              time with reasonable notice.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">Your account</h2>
            <p className="mt-2">
              You are responsible for maintaining the security of your account
              and password. You must provide accurate information when creating
              your account. You may not use Roots for any unlawful purpose.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">Your data</h2>
            <p className="mt-2">
              You own all data you enter into Roots. We do not claim ownership
              of your contacts, notes, or interaction history. You can export
              or delete your data at any time from Settings.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">Acceptable use</h2>
            <p className="mt-2">
              You agree not to: attempt to access other users&apos; data, reverse
              engineer the service, use the service to send spam or unsolicited
              messages, or use automated tools to scrape or abuse the service.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">Disclaimer</h2>
            <p className="mt-2">
              Roots is provided as-is without warranties of any kind. We are
              not liable for any loss of data or damages arising from use of
              the service. We strongly recommend using the export feature to
              keep a backup of your data.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">Termination</h2>
            <p className="mt-2">
              You may delete your account at any time from Settings. We reserve
              the right to suspend or terminate accounts that violate these
              terms.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">Contact</h2>
            <p className="mt-2">
              Questions about these terms? Reach out via the{" "}
              <Link
                href="/contact"
                className="text-primary underline underline-offset-2"
              >
                contact page
              </Link>
              .
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
