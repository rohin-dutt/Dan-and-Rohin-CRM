import { SiteNav } from "../_components/SiteNav";
import { SiteFooter } from "../_components/SiteFooter";

export const metadata = { title: "FAQ — Roots" };

const faqs = [
  {
    q: "What is Roots?",
    a: "Roots is an app that helps you stay close to the people who matter most to you. Think of it as a gentle reminder system for your real relationships — the friends you mean to call, the family you keep meaning to visit, the people who shaped who you are.",
  },
  {
    q: "How does it work?",
    a: "Add the people you want to stay close to, set how often you'd like to reach out, and log your interactions when you connect. Roots tracks when you last talked and reminds you when it's been too long. That's the whole idea.",
  },
  {
    q: "How is this different from just using my contacts app?",
    a: "Your contacts app stores information. Roots helps you act on it. It tells you who you haven't talked to in a while, surfaces upcoming birthdays and important moments, and gives you a nudge when a relationship needs attention. It's less about storing contacts and more about maintaining the ones that matter.",
  },
  {
    q: "Can I import my existing contacts?",
    a: "Yes. When you add someone new you can pull their name, phone, and email directly from your phone's contacts so you're not starting from scratch.",
  },
  {
    q: "Is Roots available on Android?",
    a: "Not yet — Roots is currently iOS only. Android is on the roadmap.",
  },
  {
    q: "Is Roots free?",
    a: "Yes, Roots is free to download and use.",
  },
  {
    q: "Is my data private?",
    a: "Yes. Your relationship data is private to you. We do not sell it, share it with third parties, or use it for advertising purposes.",
  },
  {
    q: "Will you sell my data?",
    a: "No. We do not sell, share, or monetize your personal data in any form. Your relationship data exists solely to power your experience in Roots.",
  },
  {
    q: "How do I get started?",
    a: "Download Roots, add a few people who matter to you, and set how often you want to stay in touch. Roots will take it from there.",
  },
  {
    q: "What happens if I delete my account?",
    a: "All of your data is permanently and irreversibly deleted from our systems. We do not retain copies after deletion.",
  },
  {
    q: "What if I want to delete my account?",
    a: "You can delete your account and all associated data directly from the Settings screen in the app at any time.",
  },
];

export default function FaqPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteNav />
      <main className="mx-auto w-full max-w-[720px] flex-1 px-6 py-16 sm:py-20">
        <h1 className="text-center font-heading text-4xl font-semibold text-foreground sm:text-5xl">
          Frequently asked questions
        </h1>
        <dl className="mx-auto mt-12 max-w-prose divide-y divide-border">
          {faqs.map((item) => (
            <div key={item.q} className="py-6 first:pt-0">
              <dt className="font-heading text-lg font-medium text-foreground">{item.q}</dt>
              <dd className="mt-2 text-sm leading-7 text-muted-foreground">
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
