import Link from "next/link";
import { SiteNav } from "../_components/SiteNav";
import { SiteFooter } from "../_components/SiteFooter";

export const metadata = { title: "Privacy — Roots" };

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-14">
        <h1 className="font-heading text-3xl font-semibold text-foreground">
          Privacy policy
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Last updated: May 2026
        </p>
        <div className="mt-8 max-w-prose space-y-8 text-sm leading-7 text-muted-foreground">
          <section>
            <h2 className="font-medium text-foreground">What we collect</h2>
            <p className="mt-2">
              We collect the information you provide directly: your email
              address, and the relationship data you enter (names, notes,
              interactions, follow-ups). We do not collect behavioral analytics
              or sell your data to third parties.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">How we use it</h2>
            <p className="mt-2">
              Your data is used solely to provide the Roots service to you. We
              use Supabase to store your data securely with row-level security
              so only your account can access your records.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">Data portability</h2>
            <p className="mt-2">
              You can export all of your data from the Settings page at any time
              as a JSON file. You can also delete your account and all
              associated data at any time.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">Cookies</h2>
            <p className="mt-2">
              We use cookies solely for authentication and session management. We
              do not use tracking or advertising cookies.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">Data retention</h2>
            <p className="mt-2">
              When you delete your account, all associated data including
              contacts, interactions, tags, and settings is permanently and
              immediately deleted from our systems.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">Children</h2>
            <p className="mt-2">
              Roots is not intended for users under 13 years of age. We do not
              knowingly collect personal data from children under 13.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">Changes to this policy</h2>
            <p className="mt-2">
              We may update this policy from time to time. We will notify users
              of significant changes via email. Continued use of Roots after
              changes constitutes acceptance of the updated policy.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">Jurisdiction</h2>
            <p className="mt-2">
              Roots is operated from the United States. By using the service you
              agree that your data is processed in the United States in
              accordance with this policy.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">Contact</h2>
            <p className="mt-2">
              Questions about this policy? Reach out via the{" "}
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
