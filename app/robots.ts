import type { MetadataRoute } from "next";
import { SITE } from "./site";

/**
 * Staff tools and the API are kept out of search results. They are all
 * sign-in protected anyway; this just stops crawlers spending requests on
 * redirects to a login page.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin", "/umpire", "/head-umpire", "/gm", "/newsroom", "/unauthorized"],
    },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
