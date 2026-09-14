import { SITE } from "./site";

/**
 * Long-form text styling for the policy and contact pages. The site has no
 * typography plugin, and these are the only pages that are mostly paragraphs.
 */
export function LegalProse({ updated, children }: { updated?: string; children: React.ReactNode }) {
  return (
    <div className="max-w-3xl space-y-4 text-[15px] leading-7 text-slate-300 [&_a]:text-sky-400 [&_a:hover]:text-sky-300 [&_h2]:mt-9 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-slate-100 [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-slate-100 [&_ul]:space-y-1.5">
      {updated && <p className="text-sm text-slate-500">Last updated {updated}</p>}
      {children}
    </div>
  );
}

/** How to reach the league, in a sentence. Includes the email only when one is set. */
export function ContactMethods() {
  return (
    <>
      <a href={SITE.discordUrl} target="_blank" rel="noreferrer">
        the league Discord
      </a>
      {SITE.contactEmail && (
        <>
          {" "}or by email at <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>
        </>
      )}
    </>
  );
}
