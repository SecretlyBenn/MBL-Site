import type { Metadata } from "next";
import { PageShell } from "../SiteNav";
import { SITE } from "../site";

export const metadata: Metadata = {
  title: "Rules",
  description: `The ${SITE.name} rulebook and community rules.`,
  alternates: { canonical: "/rules" },
};

/**
 * Both of the league's own documents in one place.
 *
 * They live in Google Docs, where the commissioners write them, rather than
 * being copied in here - a copy would be out of date the first time a rule
 * changed, and the league would have two versions of its own rulebook.
 */
const DOCUMENTS = [
  {
    href: SITE.rulebookUrl,
    title: "Rulebook",
    body: "How the game is played: the field, the count, what the umpire calls and everything the league has settled on.",
  },
  {
    href: SITE.communityRulesUrl,
    title: "Community rules",
    body: "What is expected of everyone in the league, and the penalties for cheating, abuse or misusing a staff role. They apply here as well as on Discord.",
  },
];

export default function RulesPage() {
  return (
    <PageShell title="Rules" subtitle="Kept by the league's commissioners">
      <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
        {DOCUMENTS.map((document) => (
          <a
            key={document.href}
            href={document.href}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-5 transition-colors hover:border-slate-700 hover:bg-slate-900"
          >
            <p className="text-lg font-bold text-slate-100">{document.title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">{document.body}</p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-sky-400">
              Open the document
            </p>
          </a>
        ))}
      </div>
    </PageShell>
  );
}
