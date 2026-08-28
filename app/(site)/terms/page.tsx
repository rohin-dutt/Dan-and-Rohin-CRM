import Link from "next/link";
import { SiteNav } from "../_components/SiteNav";
import { SiteFooter } from "../_components/SiteFooter";

export const metadata = { title: "Terms of Service — Roots" };

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteNav />
      <main className="mx-auto w-full max-w-[720px] flex-1 px-6 py-16 sm:py-20">
        <h1 className="text-center font-heading text-4xl font-semibold text-foreground sm:text-5xl">
          Terms of Service
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Last updated: July 2026
        </p>
        <div className="mx-auto mt-12 max-w-prose space-y-12 text-sm leading-7 text-muted-foreground [&_h2]:text-base [&_ul]:pl-5 [&_ul]:marker:text-ring">
          <section>
            <h2 className="font-medium text-foreground">
              Acceptance of Terms
            </h2>
            <p className="mt-2">
              By downloading, installing, or using the Roots mobile
              application or website at useroots.app (collectively, the
              &quot;Service&quot;), you agree to be bound by these Terms of Service.
              If you do not agree to these terms, do not use the Service.
            </p>
            <p className="mt-4">
              Roots is currently operated by its two co-founders (the
              &quot;Founders&quot;). We intend to transfer operation of the
              Service to Root Labs LLC, a Delaware limited liability company
              we plan to form at or before public launch. In these Terms,
              &quot;Roots,&quot; &quot;we,&quot; &quot;our,&quot;
              &quot;us,&quot; refer to the Founders until that transfer
              occurs, and to Root Labs LLC after it occurs. You can reach us
              at dan.rohin.crm@gmail.com. We will update these Terms —
              including adding the Founders&apos; full legal names and
              business address — to reflect the Root Labs LLC transfer when
              it happens.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">
              Description of Service
            </h2>
            <p className="mt-2">
              Roots is an app that helps you stay close to the people who
              matter most to you. It allows you to add people to your
              personal network, log interactions, set reminders, and receive
              nudges to reach out before relationships go quiet. Roots is
              intended for personal, non-commercial use and is currently
              available only to users in the United States.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">Eligibility</h2>
            <p className="mt-2">
              You must be at least 18 years old to create a Roots account and
              use the Service. By using the Service, you represent that you
              meet this requirement.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">Your Account</h2>
            <p className="mt-2">You are responsible for:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Providing accurate information when creating your account</li>
              <li>Taking reasonable steps to secure your account and device</li>
              <li>Activity you authorize under your account</li>
              <li>
                Notifying us immediately at dan.rohin.crm@gmail.com if you
                suspect unauthorized access to your account
              </li>
            </ul>
            <p className="mt-4">
              We reserve the right to suspend or terminate accounts that we
              reasonably believe have been compromised or are being used in
              violation of these Terms.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">
              Your Data and Content
            </h2>
            <p className="mt-2">
              You own all data and content you enter into Roots — your
              contacts, notes, interaction history, and all other
              relationship data. We do not claim ownership of your content.
              By using the Service, you grant us a limited license to host,
              store, reproduce, back up, secure, and process your data as
              necessary to provide, maintain, troubleshoot, and support the
              Service, and to comply with applicable law. This license ends
              when you delete your account, except for temporary backup
              copies and any records we are required to retain as described
              in our Privacy Policy.
            </p>
            <p className="mt-4">
              By adding information about other people, you represent that
              you have the rights and lawful basis necessary to record that
              information for personal, household, or individual
              relationship-management purposes, and that doing so does not
              violate their privacy or other legal rights. You agree not to
              use Roots for bulk lead generation, sales prospecting, employee
              monitoring, data brokerage, covert surveillance, doxxing, spam,
              harassment, or discriminatory profiling.
            </p>
            <p className="mt-4">
              Please do not use Roots to store passwords, government
              identification numbers, payment card information, or detailed
              medical records — the notes fields are not designed to
              securely hold this type of data.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">Acceptable Use</h2>
            <p className="mt-2">You agree not to use Roots to:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Violate any applicable law or regulation</li>
              <li>Infringe the rights of any third party</li>
              <li>
                Attempt to gain unauthorized access to any part of the
                Service or other users&apos; accounts
              </li>
              <li>
                Use automated tools to scrape, crawl, or extract data from
                the Service
              </li>
              <li>
                Reverse engineer, decompile, or disassemble the app, except
                to the extent such restriction is prohibited by applicable
                law
              </li>
              <li>
                Use the Service for commercial data collection, solicitation,
                or spam
              </li>
              <li>Harass, stalk, or harm any individual</li>
              <li>Impersonate any person or entity</li>
            </ul>
          </section>
          <section>
            <h2 className="font-medium text-foreground">
              Intellectual Property
            </h2>
            <p className="mt-2">
              The Roots name, logo, design, and all content created by us are
              our intellectual property. Nothing in these Terms grants you
              any right to use our trademarks, logos, or brand assets without
              our prior written consent.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">
              Subscriptions and Payments
            </h2>
            <p className="mt-2">
              Roots is currently free to use. If we introduce paid features
              or subscription tiers in the future, additional terms
              governing pricing, billing, and cancellation will be presented
              to you at the time those features become available, and your
              continued use of any paid feature will constitute acceptance
              of those additional terms.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">
              Third-Party Services
            </h2>
            <p className="mt-2">
              Roots relies on third-party infrastructure and service
              providers, including Supabase, Expo, Resend, Mapbox, and
              Vercel. Their services may affect the availability and
              operation of Roots. Third-party terms apply to you only where
              you separately access or agree to a third-party product or
              service. We remain responsible to you for the Service to the
              extent required by these Terms and applicable law.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">
              Apple App Store Terms
            </h2>
            <p className="mt-2">
              If you downloaded Roots from the Apple App Store, your license
              to use the Roots app is also governed by Apple&apos;s Standard
              End User License Agreement, available at
              https://www.apple.com/legal/internet-services/itunes/dev/stdeula/.
              If there is a conflict between these Terms and Apple&apos;s
              Standard EULA regarding your license to use the app on your
              device, Apple&apos;s Standard EULA controls that license; these
              Terms otherwise continue to govern your Roots account and your
              use of the Roots online service. You acknowledge that:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                These Terms are between you and us, not Apple, and Apple is
                not responsible for the Service or its content
              </li>
              <li>
                Apple has no obligation to provide maintenance or support for
                the Service
              </li>
              <li>
                Apple is a third-party beneficiary of these Terms and may
                enforce them against you
              </li>
            </ul>
          </section>
          <section>
            <h2 className="font-medium text-foreground">Disclaimers</h2>
            <p className="mt-2">
              Nothing in these Terms excludes or limits any right or
              liability that cannot lawfully be excluded or limited under
              applicable law.
            </p>
            <p className="mt-4">
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT
              WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT
              LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
              PARTICULAR PURPOSE, OR NON-INFRINGEMENT. We do not warrant that
              the Service will be uninterrupted, error-free, or completely
              secure. We strongly recommend using the export feature in
              Settings to maintain your own backup of your data.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">
              Limitation of Liability
            </h2>
            <p className="mt-2">
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, WE SHALL NOT
              BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL,
              OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF DATA,
              LOSS OF PROFITS, OR ANY OTHER DAMAGES ARISING FROM YOUR USE OF
              OR INABILITY TO USE THE SERVICE, EVEN IF WE HAVE BEEN ADVISED
              OF THE POSSIBILITY OF SUCH DAMAGES. OUR TOTAL LIABILITY TO YOU
              FOR ANY CLAIMS ARISING FROM THESE TERMS OR YOUR USE OF THE
              SERVICE SHALL NOT EXCEED THE AMOUNT YOU HAVE PAID US IN THE
              TWELVE MONTHS PRECEDING THE CLAIM (OR $100 IF YOU HAVE MADE NO
              PAYMENTS).
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">Indemnification</h2>
            <p className="mt-2">
              You agree to indemnify and hold harmless Roots and its
              Founders from third-party claims, damages, losses, or
              reasonable legal fees arising from: (a) content you submit
              that violates these Terms or applicable law; (b) your
              violation of these Terms; or (c) your infringement of another
              person&apos;s rights. We will provide you with prompt notice
              of any such claim and a reasonable opportunity to participate
              in its defense.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">Termination</h2>
            <p className="mt-2">
              You may stop using the Service and delete your account at any
              time from Settings → Delete Account. All your data will be
              permanently deleted upon account deletion, subject to the
              retention terms in our Privacy Policy. We may suspend or
              terminate your access to the Service for reasons including
              material breach of these Terms, illegal or abusive use,
              security risk, fraud, legal requirement, or discontinuation of
              the Service. Except where we reasonably believe immediate
              action is necessary to protect the Service or other users, we
              will make reasonable efforts to notify you first and give you
              an opportunity to export your data.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">
              Changes to Terms
            </h2>
            <p className="mt-2">
              We may update these Terms from time to time. For material
              changes, we will provide advance notice by email or in-app
              notice before the change takes effect, and where appropriate,
              ask you to affirmatively accept the updated Terms. Changes will
              not apply retroactively to a dispute that arose before the
              change took effect. If you do not agree to updated Terms, you
              may stop using the Service and delete your account.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">
              Governing Law and Disputes
            </h2>
            <p className="mt-2">
              These Terms are governed by the laws of the State of Delaware,
              without regard to conflict-of-law principles. Any dispute
              arising out of or relating to these Terms or the Service will
              be resolved in the state or federal courts located in
              Delaware, and you consent to personal jurisdiction there. This
              choice of law does not deprive you of any consumer protection
              you are entitled to under the law of your place of residence.
              Nothing in these Terms prevents you from bringing a claim in
              small claims court where available, or from filing a complaint
              with a consumer protection agency.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">Severability</h2>
            <p className="mt-2">
              If any provision of these Terms is found to be unenforceable or
              invalid, that provision will be limited or eliminated to the
              minimum extent necessary, and the remaining provisions will
              remain in full force and effect.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">
              Entire Agreement
            </h2>
            <p className="mt-2">
              These Terms, together with our Privacy Policy, constitute the
              entire agreement between you and Roots regarding your use of
              the Service and supersede any prior agreements.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">Contact</h2>
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
