import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/app/SiteNav";

export const metadata: Metadata = {
  title: "Access denied",
  robots: { index: false },
};

export default function UnauthorizedPage() {
  return (
    <PageShell title="Not authorized">
      <div className="ui-card mx-auto flex max-w-lg flex-col gap-3 p-6">
        <p className="text-sm leading-relaxed text-slate-300">
          Your account doesn&apos;t have access to this page. Signing in with Discord shows who you
          are, but each portal - umpire, head umpire, GM and admin - also needs a league admin to
          give your account that role.
        </p>
        <p className="text-sm text-slate-400">
          If you think this is a mistake, ask a league admin in Discord. If you were signed out of
          every browser, sign in again to pick up where you left off.
        </p>
        <div className="mt-1 flex flex-wrap gap-4">
          <Link href="/" className="ui-link text-sm">
            ← Back to home
          </Link>
          <a href="/api/auth/discord?returnTo=%2F" className="ui-link text-sm">
            Sign in again
          </a>
          <Link href="/contact" className="ui-link text-sm">
            Contact the league
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
