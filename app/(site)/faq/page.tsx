import { SiteNav } from "../_components/SiteNav";
import { SiteFooter } from "../_components/SiteFooter";

export const metadata = { title: "FAQ — Roots" };

const faqs = [
  {
    q: "Is Roots free?",
    a: "Yes, Roots is free to use. Create an account and get started in under a minute.",
  },
  {
    q: "Who can see my data?",
    a: "Only you. Your contacts, notes, and interactions are private to your account. We do not sell or share your data.",
  },
  {
    q: "Can I export my data?",
    a: "Yes. From the Settings page you can export everything as a JSON file and re-import it at any time.",
  },
  {
    q: "What are follow-ups?",
    a: "Follow-ups are reminders attached to a person. Set a due date and a note, and Roots will surface them on your dashboard when it's time to act.",
  },
  {
    q: "Is there a mobile app?",
    a: "Roots is a progressive web app. Add it to your home screen from your browser for a native-like experience on iOS and Android.",
  },
];

export default function FaqPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-14">
        <h1 className="font-heading text-3xl font-semibold text-foreground">
          Frequently asked questions
        </h1>
        <dl className="mt-8 space-y-8">
          {faqs.map((item) => (
            <div key={item.q}>
              <dt className="font-medium text-foreground">{item.q}</dt>
              <dd className="mt-2 max-w-prose text-sm leading-6 text-muted-foreground">
                {item.a}
              </dd>
            </div>
          ))}
        </dl>
      </main>
      <SiteFooter />
    </div>
  );
}
