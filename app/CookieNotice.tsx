"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "mbl-cookie-notice-dismissed";
const CHANGED = "mbl-cookie-notice-change";

/** Staff tools are left alone: an umpire mid-scorecard does not need a banner over the controls. */
const STAFF_PATH = /^\/(admin|umpire|head-umpire|gm|setup)(\/|$)/;

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGED, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGED, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function isDismissed() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    // Storage blocked (private mode, strict settings). Showing the notice on
    // every visit would be worse than not showing it.
    return true;
  }
}

/**
 * Tells visitors what the site stores, once.
 *
 * This is a notice rather than a consent prompt, on purpose. The only cookies
 * the site sets sign league staff in, which is strictly necessary, and the
 * analytics are cookieless - neither needs permission, so offering an
 * "accept" or "reject" would pretend to a choice that changes nothing.
 *
 * The server renders it hidden, since it cannot see the visitor's storage; the
 * browser then shows it if it has not been dismissed.
 */
export function CookieNotice() {
  const pathname = usePathname();
  const dismissed = useSyncExternalStore(subscribe, isDismissed, () => true);

  if (dismissed || STAFF_PATH.test(pathname)) return null;

  function dismiss() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Nothing to do - it simply comes back next visit.
    }
    window.dispatchEvent(new Event(CHANGED));
  }

  return (
    <div
      role="region"
      aria-label="Cookie notice"
      // Sits above the mobile action bar, which occupies the bottom edge below sm.
      className="fixed inset-x-3 bottom-[4.5rem] z-[45] mx-auto max-w-xl rounded-lg border border-slate-700 bg-slate-900/95 p-4 text-sm text-slate-300 shadow-2xl backdrop-blur sm:bottom-4"
    >
      <p>
        We use cookies only to sign league staff in, and cookieless analytics to count visits.
        No advertising or tracking cookies.{" "}
        <Link href="/privacy" className="font-medium text-sky-400 hover:text-sky-300">
          Privacy policy
        </Link>
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="mt-3 rounded-md bg-sky-600 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-sky-500"
      >
        Got it
      </button>
    </div>
  );
}
