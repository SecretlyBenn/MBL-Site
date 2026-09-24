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
 * Written against what the code actually does, and kept short on purpose: if
 * sign-in scopes, cookies, analytics or where data is hosted change, this page
 * has to change with them, and a page nobody can read is a page nobody checks.
 */
export default function PrivacyPage() {
  return (
    <PageShell title="Privacy Policy">
      <LegalProse updated={SITE.policiesUpdated}>
        <h2>Reading the site</h2>
        <p>
          No account, no cookies, nothing asked of you. Cloudflare hosts the site and sees your IP
          address to deliver pages and block abuse; we don&apos;t store it. Cloudflare Web Analytics
          counts page views without cookies and without following you anywhere else.
        </p>

        <h2>Signing in</h2>
        <p>
          League staff sign in with Discord. We ask Discord only for your user ID and display name -
          never your email or password - and store those, your league role, and a record of the
          changes you make, so the league can see who changed what. Two cookies keep the sign-in
          working: one lasts ten minutes to protect the handoff with Discord, the other keeps you
          signed in for fourteen days or until you sign out.
        </p>

        <h2>Players and statistics</h2>
        <p>
          The site exists to be a public record of league play, so usernames, rosters and game
          statistics are published openly. Player heads come from the Minecraft account&apos;s public
          skin, which means storing its UUID.
        </p>

        <h2>Removing your data</h2>
        <p>
          Nothing is sold or shared; it passes only through Cloudflare, Discord and the Minecraft
          skin services. Ask and we&apos;ll delete your staff account. Statistics are the league&apos;s
          historical record and are normally kept, but if you want your username taken off them,
          ask and we&apos;ll sort it out.
        </p>

        <h2>Children</h2>
        <p>
          Signing in needs a Discord account, which Discord requires you to be at least 13 to hold.
        </p>

        <p>
          If this changes, the date above changes with it. Questions and requests go through{" "}
          <ContactMethods />.
        </p>
      </LegalProse>
    </PageShell>
  );
}
