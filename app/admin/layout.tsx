import type { Metadata } from "next";
import { PageShell } from "@/app/SiteNav";
import { AdminTabs } from "./AdminTabs";

export const metadata: Metadata = {
  title: { default: "League Admin", template: "%s · Admin | MBL" },
  robots: { index: false },
};

/**
 * The frame every admin page sits in. Each page still checks the visitor is an
 * admin itself - a layout is not re-run on every navigation, so it cannot be
 * the only gate.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageShell wide title="League Admin" subtitle="Run the league without touching the database">
      <AdminTabs />
      {children}
    </PageShell>
  );
}
