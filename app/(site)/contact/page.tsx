import { SiteNav } from "../_components/SiteNav";
import { SiteFooter } from "../_components/SiteFooter";

export const metadata = { title: "Contact — Roots" };

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-14">
        <h1 className="font-heading text-3xl font-semibold text-foreground">
          Contact
        </h1>
        <p className="mt-5 max-w-prose leading-7 text-muted-foreground">
          Have a question, found a bug, or just want to say hello? Send us an
          email at{" "}
          <a
            href="mailto:hello@roots.app"
            className="text-primary underline underline-offset-2"
          >
            hello@roots.app
          </a>
          . We read every message and typically reply within a day or two.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
