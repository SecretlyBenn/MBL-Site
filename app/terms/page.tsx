import type { Metadata } from "next";
import Link from "next/link";
import { ContactMethods, LegalProse } from "../LegalProse";
import { PageShell } from "../SiteNav";
import { SITE } from "../site";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: `The terms for using the ${SITE.name} website and its staff tools.`,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <PageShell title="Terms of Use">
      <LegalProse updated={SITE.policiesUpdated}>
        <p>
          By using the {SITE.name} website you agree to these terms. If you don&apos;t agree, please
          don&apos;t use the site.
        </p>

        <h2>What the site is</h2>
        <p>
          A community-run home for the {SITE.name}: schedules, scores, standings, rosters and
          statistics for a baseball league played in Minecraft. It&apos;s run by volunteers, for fun.
        </p>

        <h2>Not affiliated with Mojang or Microsoft</h2>
        <p>
          NOT AN OFFICIAL MINECRAFT SERVICE. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.
          Minecraft is a trademark of Mojang Studios. The league is also not affiliated with any
          professional baseball organisation.
        </p>

        <h2>Staff accounts</h2>
        <ul>
          <li>Staff tools are for people the league has given a role. Signing in with Discord doesn&apos;t grant access by itself.</li>
          <li>Only enter scores, rosters and other information you believe to be accurate. Don&apos;t knowingly submit false results.</li>
          <li>Don&apos;t share your access, or use anyone else&apos;s.</li>
          <li>Changes made through staff tools are recorded against your account.</li>
          <li>League admins can change or remove a role at any time.</li>
        </ul>

        <h2>Acceptable use</h2>
        <p>Don&apos;t:</p>
        <ul>
          <li>try to get into parts of the site, or data, you haven&apos;t been given access to</li>
          <li>interfere with the site, overload it, or scrape it in a way that degrades it for others</li>
          <li>use the site to harass anyone</li>
        </ul>
        <p>We may remove access for anyone who does.</p>

        <h2>Statistics and content</h2>
        <p>
          We work to keep records accurate, but statistics are entered by people and can contain
          mistakes. If you spot one, tell us and we&apos;ll look into it. Records are provided as-is,
          without any guarantee of accuracy or completeness.
        </p>
        <p>
          Team logos, the league name and site design belong to the league or their creators. Player
          usernames and Minecraft skins belong to their owners.
        </p>

        <h2>Availability</h2>
        <p>
          The site is provided as-is, without warranties. It may be unavailable at times, and we may
          change or discontinue features. To the extent the law allows, the league isn&apos;t liable for
          losses arising from use of the site.
        </p>

        <h2>Privacy</h2>
        <p>
          How we handle data is described in the <Link href="/privacy">Privacy Policy</Link>.
        </p>

        <h2>Changes and contact</h2>
        <p>
          We may update these terms; the date at the top shows the latest revision, and continuing
          to use the site means accepting it. Questions go through <ContactMethods />.
        </p>
      </LegalProse>
    </PageShell>
  );
}
