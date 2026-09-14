import type { Metadata } from "next";
import { PageShell } from "@/app/SiteNav";

// The setup page is a client component, which cannot export metadata itself -
// or render the site frame, whose sign-in button reads the session on the
// server. Both live here instead.
export const metadata: Metadata = {
  title: "First-time Setup",
  robots: { index: false },
};

export default function SetupLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageShell title="First-time setup" subtitle="Claim the admin role on a brand-new site">
      {children}
    </PageShell>
  );
}
