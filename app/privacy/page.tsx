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
 * Written against what the code does, not a template: if sign-in scopes,
 * cookies, analytics or where data is hosted change, this page has to change
 * with them.
 */
export default function PrivacyPage() {
  return (
    <PageShell title="Privacy Policy">
      <LegalProse updated={SITE.policiesUpdated}>
        <p>
          This policy covers the {SITE.name} (&ldquo;MBL&rdquo;, &ldquo;the league&rdquo;,
          &ldquo;we&rdquo;) website. It is short because we collect very little.
        </p>

        <h2>If you just browse</h2>
        <p>
          You can read scores, standings, rosters and statistics without an account. We don&apos;t
          ask for your name, email or anything else, and we don&apos;t set cookies on your visit.
        </p>
        <p>
          We use <strong>Cloudflare Web Analytics</strong> to count visits and see which pages are
          popular. It sets no cookies, doesn&apos;t use local storage to identify you, and doesn&apos;t
          track you across other sites. It records things like the page viewed, the referring site,
          and your country and browser type, in aggregate.
        </p>
        <p>
          Like every website, our host (Cloudflare) processes your IP address to deliver pages and
          protect the site from abuse. We don&apos;t store it.
        </p>

        <h2>If you&apos;re league staff and sign in</h2>
        <p>
          Umpires, general managers and admins sign in with Discord. We request only Discord&apos;s{" "}
          <strong>identify</strong> permission, which gives us your Discord user ID, username and
          display name. We never see your email address or password.
        </p>
        <p>We store:</p>
        <ul>
          <li>your Discord user ID and display name</li>
          <li>your league role, and for a general manager, which team you manage</li>
          <li>a record of changes you make through staff tools (for example approving a scorecard or editing a roster), so the league can see who changed what</li>
        </ul>
        <p>Signing in sets two cookies, both strictly necessary for signing in to work:</p>
        <ul>
          <li><strong>mbl_oauth_state</strong>: protects the sign-in handoff with Discord. Deleted when sign-in completes, and expires after 10 minutes regardless.</li>
          <li><strong>mbl_session</strong>: keeps you signed in. Expires after 14 days, or when you sign out.</li>
        </ul>
        <p>
          The site also remembers in your browser that you dismissed the cookie notice, so it
          doesn&apos;t appear again. That value never leaves your device.
        </p>

        <h2>Players and statistics</h2>
        <p>
          The point of the site is a public record of league play, so player usernames, rosters and
          game statistics are published openly. Player heads are shown by looking up the Minecraft
          account&apos;s public skin; we store the account&apos;s UUID and current username to do that.
        </p>

        <h2>Who we share data with</h2>
        <p>We don&apos;t sell or share personal data. It passes through only the services that run the site:</p>
        <ul>
          <li><strong>Cloudflare</strong>: hosting, the database, and analytics</li>
          <li><strong>Discord</strong>: signing staff in</li>
          <li><strong>Minecraft skin services</strong>: fetching the public skins used for player heads</li>
        </ul>

        <h2>Keeping and removing your data</h2>
        <p>
          Staff account records are kept while you hold a league role. Ask and we&apos;ll remove your
          account. Game statistics are part of the league&apos;s historical record and are normally kept,
          but if you want your username removed or anonymised, contact us and we&apos;ll work it out
          with you.
        </p>

        <h2>Children</h2>
        <p>
          The site isn&apos;t directed at children under 13, and staff sign-in relies on a Discord
          account, which Discord requires users to be at least 13 to hold.
        </p>

        <h2>Changes and contact</h2>
        <p>
          If this policy changes, the date at the top will change with it. Questions or requests go
          through <ContactMethods />.
        </p>
      </LegalProse>
    </PageShell>
  );
}
