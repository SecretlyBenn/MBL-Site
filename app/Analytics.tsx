import { SITE } from "./site";

/**
 * Cloudflare Web Analytics.
 *
 * Chosen over the usual alternatives for three reasons that matter here: it
 * sets no cookies and fingerprints nobody, so it needs no consent prompt; the
 * beacon reports straight to Cloudflare rather than through this Worker, so it
 * costs none of the site's request or database allowance; and it is free.
 *
 * Renders nothing until a token is set in site.ts.
 */
export function Analytics() {
  if (!SITE.analyticsToken) return null;
  return (
    <script
      defer
      src="https://static.cloudflareinsights.com/beacon.min.js"
      data-cf-beacon={JSON.stringify({ token: SITE.analyticsToken })}
    />
  );
}
