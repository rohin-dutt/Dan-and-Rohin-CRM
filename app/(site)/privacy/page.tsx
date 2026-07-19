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
          Last updated: July 2026
        </p>
        <div className="mt-8 max-w-prose space-y-8 text-sm leading-7 text-muted-foreground">
          <section>
            <h2 className="font-medium text-foreground">Introduction</h2>
            <p className="mt-2">
              This Privacy Policy explains how Roots (&quot;Roots,&quot;
              &quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) collects,
              uses, discloses, retains, and protects personal information
              when you use the Roots mobile application and website at
              useroots.app (collectively, the &quot;Service&quot;).
            </p>
            <p className="mt-4">
              Roots is currently operated by its two co-founders (the
              &quot;Founders&quot;). We intend to transfer operation of the
              Service to Root Labs LLC, a Delaware limited liability company
              we plan to form at or before public launch. In this Privacy
              Policy, &quot;Roots,&quot; &quot;we,&quot; &quot;our,&quot; and
              &quot;us&quot; refer to the Founders until that transfer
              occurs, and to Root Labs LLC after it occurs. You can reach us
              at dan.rohin.crm@gmail.com. We will update this policy —
              including adding the Founders&apos; full legal names and
              business address — to reflect the Root Labs LLC transfer when
              it happens.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">
              Where Roots Is Available
            </h2>
            <p className="mt-2">
              Roots is currently available only to users in the United
              States. This policy reflects that scope. If we expand to other
              countries or regions, we will update this policy and add any
              additional disclosures or rights required by law in those
              places before making the Service available there.
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
              <li>
                Basic operational data such as device type, app version, and
                request logs, generated automatically by our infrastructure
                providers as part of running the Service
              </li>
            </ul>
            <p className="mt-4 font-medium text-foreground">
              Information from your device (with your permission)
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                Contacts: if you grant access, we read your device contacts
                solely to help you add people you already know to Roots.
                Roots does not upload or store your full address book. When
                you select a contact to import, only the specific fields you
                confirm (such as name, phone number, or birthday) are
                transmitted to and stored in your Roots account as a
                relationship record. We do not continuously access or sync
                your contacts in the background, contact the people you
                import, send them invitations on your behalf, or match
                contacts across Roots accounts.
              </li>
            </ul>
            <p className="mt-4">
              We do not currently use any analytics, crash-reporting, or
              advertising SDKs. If that changes, we will update this policy
              and our App Store privacy disclosures before any such tool goes
              into production.
            </p>
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
              Information About People Who Aren&apos;t Roots Users
            </h2>
            <p className="mt-2">
              Roots lets you record information about people in your life —
              such as names, birthdays, or notes — who may not themselves be
              Roots users and may never see this policy. That information is
              provided by the Roots account holder, is stored as part of
              their account, and is used only to help them stay in touch
              with the people they care about. It is never visible to anyone
              besides the account holder. If you are not a Roots user but
              believe someone has stored information about you in Roots and
              have a question or request about it, contact us at
              dan.rohin.crm@gmail.com.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">
              Third-Party Services
            </h2>
            <p className="mt-2">
              Roots uses the following third-party services to operate. Each
              has its own privacy policy, and each may process limited
              technical data (such as IP addresses or request logs) as part
              of providing their service to us:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                Supabase (supabase.com) — database and authentication. Your
                data is stored on Supabase&apos;s servers with row-level
                security policies designed to prevent one user&apos;s account
                from accessing another&apos;s records.
              </li>
              <li>
                Expo / EAS (expo.dev) — mobile app build and delivery
                infrastructure, and delivery of push notifications.
                Expo&apos;s push service receives your device&apos;s push
                token and the content of the notification in order to
                deliver it.
              </li>
              <li>
                Resend (resend.com) — email delivery for weekly digest emails
                (if enabled)
              </li>
              <li>
                Mapbox (mapbox.com) — location search and autocomplete when
                adding location information for your contacts. Mapbox
                receives the text of your search query to return
                suggestions.
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
              Your Privacy Rights
            </h2>
            <p className="mt-2">
              We extend the following rights to all users of Roots:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                The right to know what personal information we collect and
                how it is used (described in this policy)
              </li>
              <li>
                The right to delete your personal information, at any time,
                from Settings → Delete Account
              </li>
              <li>
                The right to correct inaccurate information you have entered
              </li>
              <li>
                The right to opt out of the sale of personal information — we
                do not sell personal information, and have not sold personal
                information in the preceding 12 months
              </li>
              <li>
                The right to non-discrimination for exercising any of these
                rights
              </li>
            </ul>
            <p className="mt-4">
              If we expand outside the United States in the future, we will
              update this policy to reflect the additional rights and legal
              bases applicable to users in those regions before making the
              Service available there.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">
              Data Storage and Security
            </h2>
            <p className="mt-2">
              Your data is stored in the United States on Supabase&apos;s
              infrastructure. We use technical and organizational safeguards
              designed to protect your data, including database access
              controls (row-level security) intended to prevent one user
              from accessing another user&apos;s records, encrypted data
              transmission, and restricted administrative access. Authorized
              personnel and service providers may access information when
              reasonably necessary to operate, secure, support, or
              troubleshoot the Service, or to comply with legal obligations.
              No method of electronic storage or transmission is 100% secure,
              and we cannot guarantee absolute security.
            </p>
            <p className="mt-4">
              In the event of a data breach affecting your personal
              information, we will notify affected users without undue delay
              via email and/or an in-app notice, as required by applicable
              law.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">Data Retention</h2>
            <p className="mt-2">
              We retain your data for as long as your account is active.
              When you delete your account, we delete your relationship
              data, notes, interactions, tags, and settings from our active
              production systems immediately. We do not currently maintain
              automated backups of this data. If we enable database backups
              in the future for disaster-recovery purposes, any residual
              copies in those backups will be isolated from normal use and
              fully overwritten within 14 days. We do not restore or
              reactivate a deleted account from a backup except as necessary
              to comply with a legal obligation. We may retain limited
              records beyond this period where required for security, fraud
              prevention, dispute resolution, or legal compliance.
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
              add people you already know. This permission is optional, and
              you can add people manually without granting it. You can
              revoke this permission at any time from your iPhone Settings →
              Roots.
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
              Sensitive Information
            </h2>
            <p className="mt-2">
              Roots&apos; notes fields let you write freely, but they are not
              designed to securely store highly sensitive data. Please do
              not use Roots to store passwords, government identification
              numbers, payment card information, or detailed medical
              records. Please also avoid recording intimate or highly
              sensitive details about another person without their
              permission.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">
              Age Requirement and Children&apos;s Privacy
            </h2>
            <p className="mt-2">
              Roots is intended for use by adults and is not directed at
              children. You must be at least 18 years old to use the
              Service. We do not knowingly collect personal information from
              anyone under 18. If you believe someone under 18 has created
              an account or provided us with personal information, please
              contact us at dan.rohin.crm@gmail.com and we will delete it
              promptly.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">
              Business Transfers
            </h2>
            <p className="mt-2">
              If Roots is involved in a merger, acquisition, financing,
              reorganization, or transfer of assets — including the
              anticipated transfer of operations to Root Labs LLC once
              formed — your information may be transferred as part of that
              transaction. We will provide notice before your information
              becomes subject to a different privacy policy or controller as
              a result.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">
              Changes to This Policy
            </h2>
            <p className="mt-2">
              We may update this Privacy Policy from time to time. We will
              notify you of significant changes by email or an in-app notice
              before the change takes effect. Where a change materially
              expands how we use your information, we will ask for your
              acknowledgment before it applies to you.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">Contact Us</h2>
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
