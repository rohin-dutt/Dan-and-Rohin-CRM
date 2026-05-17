import Link from "next/link";
import { SiteNav } from "../_components/SiteNav";
import { SiteFooter } from "../_components/SiteFooter";

export const metadata = { title: "Terms - Roots" };

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-14">
        <h1 className="font-heading text-3xl font-semibold text-foreground">
          Terms of service
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Last updated: May 2026
        </p>
        <div className="mt-8 max-w-prose space-y-8 text-sm leading-7 text-muted-foreground">
          <section>
            <h2 className="font-medium text-foreground">Using Roots</h2>
            <p className="mt-2">
              Roots is provided as a private relationship management tool. You
              are responsible for the information you add to your account and
              for using the service lawfully and respectfully.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">Your account</h2>
            <p className="mt-2">
              Keep your login credentials secure. You can export your data or
              delete your account from Settings at any time.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">Service changes</h2>
            <p className="mt-2">
              Roots may change over time as features are added, revised, or
              removed. We aim to preserve access to your data through export
              tools whenever practical.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">Privacy</h2>
            <p className="mt-2">
              Our{" "}
              <Link
                href="/privacy"
                className="text-primary underline underline-offset-2"
              >
                privacy policy
              </Link>{" "}
              explains what data Roots collects and how it is used.
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
