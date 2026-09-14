/**
 * A player's Minecraft head.
 *
 * Rendered from the account UUID rather than the username, because the archive
 * stores whatever name a player used at the time and plenty have since renamed
 * - a username-based avatar would silently show the wrong skin, or none.
 *
 * /api/head returns the account's whole skin, straight from Mojang, and the
 * face is cut out of it here. A skin is a 64px-wide sheet: the face is the 8px
 * square at (8, 8) and the hat layer drawn over it is the square at (40, 8).
 * Each is shown by scaling the sheet so 8 skin pixels fill the box and sliding
 * it so that square sits in the window. Older 64x32 skins keep both squares in
 * the same place, and the width-only sizing leaves their height to follow.
 *
 * Both layers use the same URL, so the browser fetches the skin once. They stay
 * <img> elements rather than a CSS background so that loading="lazy" still
 * holds: a stats table can list hundreds of players, and only the rows on
 * screen should ask for a head.
 *
 * Players with no resolved account fall back to a neutral block, so a missing
 * mapping reads as "unknown player" rather than a broken image.
 */
export function PlayerHead({
  uuid,
  name,
  size = 20,
  className = "",
}: {
  uuid?: string | null;
  name?: string;
  size?: number;
  className?: string;
}) {
  const box = `shrink-0 rounded-sm ${className}`;

  if (!uuid) {
    return (
      <span
        aria-hidden
        style={{ width: size, height: size }}
        className={`${box} inline-block bg-slate-700/70 ring-1 ring-inset ring-slate-600/50`}
      />
    );
  }

  const src = `/api/head/${uuid}`;
  const layer = (column: number) =>
    ({
      position: "absolute",
      left: -column * size,
      top: -size,
      width: size * 8,
      maxWidth: "none",
      height: "auto",
      // Skins are pixel art: smoothing them turns a crisp 8x8 face to mush.
      imageRendering: "pixelated",
    }) as const;

  return (
    <span
      role="img"
      aria-label={name ? `${name}'s Minecraft skin` : undefined}
      aria-hidden={name ? undefined : true}
      style={{ width: size, height: size }}
      className={`${box} relative inline-block overflow-hidden bg-slate-800/60`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" loading="lazy" style={layer(1)} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" loading="lazy" style={layer(5)} />
    </span>
  );
}
