import type { Metadata } from "next";

/**
 * Any picture, drawn to fill a stadium screen.
 *
 * A board can be pointed at any address, and pointing one straight at a gif
 * does not do what anybody expects: Chromium draws an image file at its own
 * pixel size in the middle of a black page, so a 400-pixel gif is a stamp in
 * the middle of a wall. There is nothing to configure about that, because the
 * picture is the whole page - none of the board's own code is loaded.
 *
 * So this is a page whose only job is to hold one. Point a board at
 * /scoreboard/picture?src=<address> and the picture is fitted to the screen
 * however the screen is built.
 *
 * It lives under /scoreboard because that is the path the cookie notice and
 * the analytics beacon already stay off - a banner over a ballpark screen, and
 * every player in the stands counted as a visitor, are both things nobody
 * thinks to check.
 */

export const metadata: Metadata = {
  title: "Picture",
  // A screen inside a video game is not a page anyone should find in a search.
  robots: { index: false, follow: false },
};

/** Only an address a browser would fetch, and nothing this server fetches itself. */
function pictureAt(src: string | undefined): string | null {
  if (!src) return null;
  try {
    const address = new URL(src);
    return address.protocol === "http:" || address.protocol === "https:" ? address.toString() : null;
  } catch {
    return null;
  }
}

function isVideo(src: string) {
  return /\.(mp4|webm|ogv)(\?|#|$)/i.test(src);
}

export default async function PicturePage({
  searchParams,
}: {
  searchParams: Promise<{ src?: string; fit?: string }>;
}) {
  const asked = await searchParams;
  const src = pictureAt(asked.src);
  // Contain by default, because a picture nobody can see the edges of is
  // usually a mistake and cropping one is usually a choice. `fit=cover` fills
  // the screen and loses whatever hangs over the sides, which is what a
  // background wants and a logo does not.
  const fit = asked.fit === "cover" ? "cover" : "contain";

  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      {src ? (
        isVideo(src) ? (
          <video
            src={src}
            autoPlay
            muted
            loop
            playsInline
            className="h-full w-full"
            style={{ objectFit: fit }}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="h-full w-full" style={{ objectFit: fit }} />
        )
      ) : (
        // A board showing nothing is better than a board showing an error, but
        // somebody standing in front of it needs to know which it is.
        <div className="flex h-full w-full items-center justify-center p-[4vmin] text-center text-[3vmin] font-bold uppercase tracking-widest text-slate-600">
          No picture. Add ?src=https://...
        </div>
      )}
    </div>
  );
}
