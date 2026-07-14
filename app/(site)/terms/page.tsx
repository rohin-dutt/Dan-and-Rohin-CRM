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
          Last updated: July 14 2026
        </p>
        <div className="mt-8 max-w-prose space-y-8 text-sm leading-7 text-muted-foreground">
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
              intended for personal, non-commercial use.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">Eligibility</h2>
            <p className="mt-2">
              You must be at least 13 years old to use Roots. By using the
              Service you represent that you meet this requirement. If you
              are between 13 and 18 years old, you represent that you have
              your parent or guardian&apos;s permission to use the Service.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">Your Account</h2>
            <p className="mt-2">You are responsible for:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Providing accurate information when creating your account</li>
              <li>Maintaining the confidentiality of your password</li>
              <li>All activity that occurs under your account</li>
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
              By using the Service, you grant us a limited license to store
              and process your data solely for the purpose of providing the
              Service to you. This license terminates when you delete your
              account. You are responsible for ensuring that any data you
              enter into Roots does not violate the privacy rights of third
              parties. By adding information about other people, you
              represent that you have a legitimate personal relationship
              with them and are not using Roots for commercial data
              collection, stalking, harassment, or any other harmful purpose.
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
              <li>Reverse engineer, decompile, or disassemble the app</li>
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
              Third-Party Services
            </h2>
            <p className="mt-2">
              Roots integrates with third-party services including Supabase,
              Expo, Resend, Mapbox, and Vercel. Your use of these services
              through Roots is subject to their respective terms of service.
              We are not responsible for the practices of these third-party
              providers.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">Disclaimers</h2>
            <p className="mt-2">
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
              You agree to indemnify and hold harmless Roots and its founders
              from any claims, damages, losses, or expenses (including
              reasonable legal fees) arising from your use of the Service,
              your violation of these Terms, or your violation of any third
              party&apos;s rights.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">Termination</h2>
            <p className="mt-2">
              You may stop using the Service and delete your account at any
              time from Settings → Delete Account. All your data will be
              permanently deleted upon account deletion. We reserve the
              right to suspend or terminate your access to the Service at
              any time for any reason, including violation of these Terms.
              We will make reasonable efforts to notify you before
              termination unless we determine that immediate termination is
              necessary to protect the Service or other users.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">
              Changes to Terms
            </h2>
            <p className="mt-2">
              We may update these Terms from time to time. We will notify
              you of significant changes by email or through a notice in the
              app. Your continued use of the Service after changes are
              posted constitutes your acceptance of the updated Terms.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-foreground">Governing Law</h2>
            <p className="mt-2">
              These Terms are governed by the laws of the United States. Any
              disputes arising from these Terms or your use of the Service
              shall be resolved through good-faith negotiation between the
              parties before pursuing any other remedy.
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
              For questions about these Terms, please contact us at:
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
