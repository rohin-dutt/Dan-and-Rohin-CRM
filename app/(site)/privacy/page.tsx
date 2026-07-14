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
          Privacy Policy
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Last updated: July 14 2026
        </p>
        <div className="mt-8 max-w-prose space-y-8 text-sm leading-7 text-muted-foreground">
          <section>
            <h2 className="font-medium text-foreground">Introduction</h2>
            <p className="mt-2">
              Roots (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates the Roots mobile
              application and website at useroots.app (collectively, the
              &quot;Service&quot;). This Privacy Policy explains how we collect, use, and
              protect your information when you use our Service. By using
              Roots, you agree to the collection and use of information in
              accordance with this policy.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">
              Information We Collect
            </h2>
            <p className="mt-2 font-medium text-foreground">
              Information you provide directly
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                Account information: your first and last name and email
                address when you create an account
              </li>
              <li>
                Relationship data: names, phone numbers, birthdays,
                locations, notes, interaction history, and other personal
                details you voluntarily enter about people in your life
              </li>
              <li>
                Contact form submissions: your name, email, and message if
                you contact us through our website
              </li>
            </ul>
            <p className="mt-4 font-medium text-foreground">
              Information collected automatically
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                Push notification tokens: if you grant notification
                permission, we store a device token to deliver reminders to
                your device
              </li>
              <li>
                Authentication session data: we use Supabase to manage secure
                authentication sessions
              </li>
            </ul>
            <p className="mt-4 font-medium text-foreground">
              Information from your device (with your permission)
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                Contacts: if you grant access, we read your device contacts
                solely to help you add people you already know to Roots. We
                only access contacts you explicitly select and confirm. We do
                not upload, store, or sync your full contacts list.
              </li>
            </ul>
          </section>
          <section>
            <h2 className="font-medium text-foreground">
              How We Use Your Information
            </h2>
            <p className="mt-2">
              We use the information we collect solely to provide and
              improve the Roots service:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>To create and maintain your account</li>
              <li>To store and display your relationship data within the app</li>
              <li>
                To send you push notifications and email reminders about
                people you want to stay in touch with (only if you enable
                these features)
              </li>
              <li>To respond to your support requests</li>
              <li>To maintain the security and integrity of the Service</li>
            </ul>
            <p className="mt-4">
              We do not use your data for advertising, analytics sold to
              third parties, or any purpose beyond operating the Service for
              you.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">
              Third-Party Services
            </h2>
            <p className="mt-2">
              Roots uses the following third-party services to operate. Each
              has its own privacy policy:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                Supabase (supabase.com) — database and authentication. Your
                data is stored on Supabase&apos;s servers with row-level security
                ensuring only your account can access your records.
              </li>
              <li>
                Expo / EAS (expo.dev) — mobile app build and delivery
                infrastructure
              </li>
              <li>
                Resend (resend.com) — email delivery for weekly digest emails
                (if enabled)
              </li>
              <li>
                Mapbox (mapbox.com) — location search and autocomplete when
                adding location information for your contacts
              </li>
              <li>Vercel (vercel.com) — website and API hosting</li>
            </ul>
            <p className="mt-4">
              We do not sell your data to any third party. We do not share
              your data with advertisers.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">
              Data Storage and Security
            </h2>
            <p className="mt-2">
              Your data is stored in the United States on Supabase&apos;s
              infrastructure. We implement industry-standard security
              measures including row-level security policies that ensure
              your data is only accessible to your account. However, no
              method of electronic storage is 100% secure and we cannot
              guarantee absolute security.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">Data Retention</h2>
            <p className="mt-2">
              We retain your data for as long as your account is active. When
              you delete your account, all associated data including your
              contacts, notes, interactions, tags, and settings is
              permanently and irreversibly deleted from our systems. We do
              not retain copies after deletion.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">
              Your Rights and Choices
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                Access and export: you can export all of your data at any
                time from the Settings screen in the app as a JSON file
              </li>
              <li>
                Correction: you can edit any information you have entered at
                any time within the app
              </li>
              <li>
                Deletion: you can delete your account and all associated data
                at any time from Settings → Delete Account
              </li>
              <li>
                Notification preferences: you can disable push notifications
                and email reminders at any time from Settings → Notifications
                or from your device settings
              </li>
            </ul>
          </section>
          <section>
            <h2 className="font-medium text-foreground">
              Mobile App Specific Disclosures
            </h2>
            <p className="mt-2">
              <span className="font-medium text-foreground">
                Contacts permission:
              </span>{" "}
              Roots may request access to your device contacts to help you
              add people you already know. This permission is optional.
              Contact data is only accessed when you explicitly use the
              import feature and only the contacts you select are processed.
              We do not continuously access or sync your contacts in the
              background.
            </p>
            <p className="mt-4">
              <span className="font-medium text-foreground">
                Push notifications:
              </span>{" "}
              If you grant notification permission, Roots stores a push token
              on our servers to deliver reminders. You can revoke this
              permission at any time from your iPhone Settings →
              Notifications → Roots.
            </p>
            <p className="mt-4">
              <span className="font-medium text-foreground">Location:</span>{" "}
              Roots does not access your device&apos;s GPS or location services.
              Location information in the app (city/region for your
              contacts) is entered manually by you or selected from Mapbox
              search suggestions.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">
              Children&apos;s Privacy
            </h2>
            <p className="mt-2">
              Roots is not intended for users under the age of 13. We do not
              knowingly collect personal information from children under 13.
              If you believe a child under 13 has provided us with personal
              information, please contact us and we will delete it promptly.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">
              Changes to This Policy
            </h2>
            <p className="mt-2">
              We may update this Privacy Policy from time to time. We will
              notify you of significant changes by sending an email to your
              registered address or by displaying a notice in the app. Your
              continued use of Roots after changes are posted constitutes
              your acceptance of the updated policy.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">Contact Us</h2>
            <p className="mt-2">
              If you have questions or concerns about this Privacy Policy or
              our data practices, please contact us at:
            </p>
            <p className="mt-2">
              Email: dan.rohin.crm@gmail.com
              <br />
              Website:{" "}
              <Link
                href="/contact"
                className="text-primary underline underline-offset-2"
              >
                useroots.app/contact
              </Link>
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
