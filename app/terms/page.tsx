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

/**
 * Deliberately short. Conduct is the community rules' job, and repeating them
 * here would only create a second version to keep in step with the first.
 */
export default function TermsPage() {
  return (
    <PageShell title="Terms of Use">
      <LegalProse updated={SITE.policiesUpdated}>
        <p>
          This is the {SITE.name}&apos;s own site: schedules, scores, standings, rosters and
          statistics for a baseball league played in Minecraft, run by volunteers. Using it means
          accepting what follows.
        </p>

        <h2>Not affiliated with Mojang or Microsoft</h2>
        <p>
          NOT AN OFFICIAL MINECRAFT SERVICE. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.
          Minecraft is a trademark of Mojang Studios, and the league is not affiliated with any
          professional baseball organisation.
        </p>

        <h2>Conduct</h2>
        <p>
          The league&apos;s <Link href="/rules">community rules</Link> apply here as well as on
          Discord, comments included. Anything that breaks them can be removed, and so can access to
          the site. Don&apos;t attack the site itself either - overloading it or going after data you
          haven&apos;t been given spoils it for everyone.
        </p>

        <h2>Staff accounts</h2>
        <p>
          Staff tools belong to whoever the league gave the role to: signing in with Discord grants
          nothing on its own. Don&apos;t share your access or use anyone else&apos;s, enter only what you
          believe to be true, and remember that changes are recorded against your account. A role
          can be changed or taken back at any time.
        </p>

        <h2>Statistics</h2>
        <p>
          Records are entered by people and can be wrong. Tell us and we&apos;ll look into it. They
          are published as-is, as is the site itself, which may be unavailable or change without
          notice; to the extent the law allows, the league isn&apos;t liable for what follows from
          using it. Logos, the league name and the site&apos;s design belong to the league or their
          creators, and usernames and skins to their owners.
        </p>

        <p>
          Data is covered by the <Link href="/privacy">Privacy Policy</Link>. If these terms change,
          the date above changes with them. Questions go through <ContactMethods />.
        </p>
      </LegalProse>
    </PageShell>
  );
}
