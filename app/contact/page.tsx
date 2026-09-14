import type { Metadata } from "next";
import { PageShell } from "../SiteNav";
import { SITE } from "../site";

export const metadata: Metadata = {
  title: "Contact",
  description: `How to reach the ${SITE.name}: join the Discord, report a stats correction, or ask about your data.`,
  alternates: { canonical: "/contact" },
};

const REASONS = [
  { title: "Join the league", body: "Sign-ups, drafts and announcements all happen in the Discord." },
  { title: "Report a stats mistake", body: "Tell us the game, the player and what looks wrong, and we'll check the scorecard." },
  { title: "Privacy or data requests", body: "Ask to have a staff account removed, or your username anonymised in the records." },
];

export default function ContactPage() {
  return (
    <PageShell title="Contact" subtitle="The league lives on Discord">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-400">Fastest way to reach us</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">Join the MBL Discord</h2>
          <p className="mt-2 text-slate-400">
            Players, umpires, general managers and league admins are all there.
          </p>
          <a
            href={SITE.discordUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-block rounded-md bg-[#5865F2] px-6 py-3 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-[#4752c4]"
          >
            Join Discord
          </a>
          {SITE.contactEmail && (
            <p className="mt-6 border-t border-slate-800/80 pt-5 text-sm text-slate-400">
              Prefer email? Write to{" "}
              <a href={`mailto:${SITE.contactEmail}`} className="font-medium text-sky-400 hover:text-sky-300">
                {SITE.contactEmail}
              </a>
              .
            </p>
          )}
        </div>
        <ul className="space-y-3">
          {REASONS.map((reason) => (
            <li key={reason.title} className="rounded-lg border border-slate-800/80 px-4 py-3">
              <p className="font-semibold text-slate-100">{reason.title}</p>
              <p className="text-sm text-slate-400">{reason.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </PageShell>
  );
}
