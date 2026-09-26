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
 * A sentence per section, and nothing that is said elsewhere. Conduct belongs
 * to the community rules; repeating any of it here would only create a second
 * version to keep in step with the first.
 */
export default function TermsPage() {
  return (
    <PageShell title="Terms of Use">
      <LegalProse updated={SITE.policiesUpdated}>
        <p>Using this site means accepting these terms.</p>

        <h2>Not affiliated with Mojang or Microsoft</h2>
        <p>
          NOT AN OFFICIAL MINECRAFT SERVICE. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.
          Nor with any professional baseball organisation.
        </p>

        <h2>Conduct</h2>
        <p>
          The league&apos;s <Link href="/mbl/rules">community rules</Link> apply here as well as on
          Discord, comments included, and anything that breaks them can be removed.
        </p>

        <h2>Staff accounts</h2>
        <p>
          Staff tools are for whoever the league gave the role to, so don&apos;t share your access -
          every change is recorded against your account.
        </p>

        <h2>Statistics</h2>
        <p>
          Records are entered by people and can be wrong: tell us and we&apos;ll fix it.
        </p>

        <p>
          The site is provided as-is, data is covered by the{" "}
          <Link href="/privacy">Privacy Policy</Link>, and questions go through <ContactMethods />.
        </p>
      </LegalProse>
    </PageShell>
  );
}
