import type { Metadata } from "next";
import { ContactMethods, LegalProse } from "../LegalProse";
import { PageShell } from "../SiteNav";
import { SITE } from "../site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `What the ${SITE.name} website collects, why, and how to have it removed.`,
  alternates: { canonical: "/privacy" },
};

/**
 * A sentence per section, written against what the code does. If sign-in
 * scopes, cookies, analytics or where data is hosted change, this changes with
 * them - which is only likely to happen while it stays short enough to read.
 */
export default function PrivacyPage() {
  return (
    <PageShell title="Privacy Policy">
      <LegalProse updated={SITE.policiesUpdated}>
        <h2>Reading the site</h2>
        <p>
          No account and no cookies: our host, Cloudflare, sees your IP address to serve the pages
          and counts visits without tracking you.
        </p>

        <h2>Signing in</h2>
        <p>
          League staff sign in with Discord, which tells us their user ID and display name - never
          an email or password - and sets a cookie that keeps them signed in for two weeks. The
          changes staff make are recorded against their account.
        </p>

        <h2>Players and statistics</h2>
        <p>
          Usernames, rosters and statistics are published openly, because a public record of league
          play is what the site is for.
        </p>

        <h2>Removing your data</h2>
        <p>
          Nothing is sold or shared, and if you ask we&apos;ll delete your staff account or take
          your username off the records.
        </p>

        <h2>Children</h2>
        <p>Signing in needs a Discord account, which requires you to be at least 13.</p>

        <p>
          Questions and requests go through <ContactMethods />.
        </p>
      </LegalProse>
    </PageShell>
  );
}
