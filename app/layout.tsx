import type { Metadata, Viewport } from "next";
import { Analytics } from "./Analytics";
import { CookieNotice } from "./CookieNotice";
import { LeaguesProvider } from "./Leagues";
import { LogoOverridesProvider } from "./LogoOverrides";
import { OffBoard } from "./OffBoard";
import { getLogoOverrides } from "@/db/logos";
import { getLeagues } from "@/db/queries";
import { SITE } from "./site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.shortName} | ${SITE.name}`,
    // Pages supply their own subject; the league name follows it, so a browser
    // tab or search result leads with what the page is about.
    template: `%s | ${SITE.shortName}`,
  },
  description: SITE.description,
  applicationName: SITE.shortName,
  openGraph: {
    type: "website",
    siteName: SITE.name,
    locale: "en_US",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#020617",
  colorScheme: "dark",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* The typefaces are declared in globals.css rather than loaded through
          next/font, which writes an address no browser will fetch - see the
          comment there. --font-geist-sans and --font-geist-mono, which the
          class on this element used to define, are set on :root instead. */}
      <body className="font-sans bg-slate-950 antialiased">
        {/* Uploaded logos are read once here, as a handful of names and URLs,
            and every TeamLogo below looks itself up in them. */}
        {/* Two rows, read once, so the bar at the top of every page knows which
            leagues exist and which one the reader is in. */}
        <LeaguesProvider value={await getLeagues()}>
          <LogoOverridesProvider value={await getLogoOverrides()}>{children}</LogoOverridesProvider>
        </LeaguesProvider>
        {/* Neither belongs on a stadium jumbotron - see OffBoard. */}
        <OffBoard>
          <CookieNotice />
          <Analytics />
        </OffBoard>
      </body>
    </html>
  );
}
