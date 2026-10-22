"use client";

import { useState } from "react";

/**
 * A address with a button that copies it.
 *
 * These get typed into a Minecraft plugin's config or pasted into an OBS
 * browser source, neither of which forgives a character. The address is shown
 * in full as well as copied, because somebody setting a board up on a second
 * machine needs to read it off the screen.
 */
export function CopyLink({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="w-20 shrink-0 text-[11px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <code className="min-w-0 flex-1 truncate rounded bg-slate-900/70 px-2 py-1 text-xs text-slate-300">
        {url}
      </code>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            // Clipboard access can be refused, and the address is on screen
            // anyway - so this says nothing rather than throwing up an error
            // about a convenience.
          }
        }}
        className="shrink-0 rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
      >
        {copied ? "Copied" : "Copy"}
      </button>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="shrink-0 text-xs text-sky-400 hover:text-sky-300"
      >
        Open
      </a>
    </div>
  );
}
