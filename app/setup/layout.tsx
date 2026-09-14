import type { Metadata } from "next";

// The setup page is a client component, which cannot export metadata itself.
export const metadata: Metadata = {
  title: "First-time Setup",
  robots: { index: false },
};

export default function SetupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
