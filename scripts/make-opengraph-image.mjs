/**
 * Builds app/opengraph-image.jpg - the picture Discord and the like show when
 * someone posts a link to the site.
 *
 * It is a static file rather than a route so that a crawler costs the Worker
 * nothing, and it is generated rather than drawn by hand so it can be rebuilt
 * from the site's own assets when the hero changes. Run it with
 * `node scripts/make-opengraph-image.mjs` and commit the result.
 *
 * The layout deliberately mirrors the home page hero: the same ballpark
 * screenshot, the same crest, the same words, dark on the left where the type
 * sits and the ballpark showing through on the right.
 */
import sharp from "sharp";

const W = 1200;
const H = 630;
const SKY = "#38bdf8";

const logo = await sharp("public/mbl-logo.png").resize(170, 170, { fit: "inside" }).toBuffer();

// Drawn over the photograph: the same left-to-right darkening the hero uses,
// so the headline stays legible while the ballpark is left visible behind it.
const overlay = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#020617" stop-opacity="0.97"/>
      <stop offset="55%" stop-color="#020617" stop-opacity="0.80"/>
      <stop offset="100%" stop-color="#020617" stop-opacity="0.15"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#fade)"/>
  <g font-family="Arial Black, Arial, Helvetica, sans-serif" fill="#ffffff">
    <text x="275" y="232" font-size="21" font-weight="bold" fill="${SKY}" letter-spacing="4">SCORES &#183; STANDINGS &#183; ROSTERS &#183; STATS</text>
    <text x="272" y="305" font-size="61" font-weight="900">MINECRAFT BASEBALL</text>
    <text x="272" y="372" font-size="61" font-weight="900" fill="${SKY}">LEAGUE.</text>
    <text x="275" y="424" font-size="26" font-weight="normal" font-family="Arial, Helvetica, sans-serif" fill="#cbd5e1">Minecraft&#8217;s most realistic baseball league.</text>
  </g>
  <rect x="275" y="452" width="74" height="4" fill="${SKY}"/>
  <text x="275" y="496" font-size="23" font-family="Arial, Helvetica, sans-serif" fill="#94a3b8">Every season since Season IV</text>
</svg>`);

await sharp("public/stadium.jpg")
  .resize(W, H, { fit: "cover", position: "centre" })
  .composite([
    { input: overlay, top: 0, left: 0 },
    { input: logo, top: 232, left: 78 },
  ])
  .jpeg({ quality: 86, mozjpeg: true })
  .toFile("app/opengraph-image.jpg");

console.log("wrote app/opengraph-image.jpg");
