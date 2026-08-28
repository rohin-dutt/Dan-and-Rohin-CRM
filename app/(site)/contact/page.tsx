import { SiteNav } from "../_components/SiteNav";
import { SiteFooter } from "../_components/SiteFooter";
import { ContactForm } from "./ContactForm";

export const metadata = { title: "Contact — Roots" };

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteNav />
      <main className="mx-auto w-full max-w-[720px] flex-1 px-6 py-16 sm:py-20">
        <h1 className="text-center font-heading text-4xl font-semibold text-foreground sm:text-5xl">
          Contact
        </h1>
        <p className="mx-auto mt-5 max-w-prose text-center leading-7 text-muted-foreground">
          Have a question, found a bug, or just want to say hello? Send us a message below. We read every message and typically reply within a day or two.
        </p>
        <div className="mx-auto mt-10 max-w-prose">
          <ContactForm />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
