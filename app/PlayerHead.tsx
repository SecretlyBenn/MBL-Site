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
 *
 * A player with no account on file but a name that Mojang could have issued is
 * asked for by name instead, through `/api/head/by-name`. That route looks the
 * account up, writes it down and redirects here, so the first page anybody
 * loads him on is what files his account - and every page after that uses his
 * uuid like anyone else's. It is the way into the six-hourly refresh for a
 * player who could not otherwise reach it, because that refresh is keyed by a
 * uuid he has not got. The alternative was a migration per player, and two had
 * to be written before this existed.
 */

/** A Minecraft name, so a nickname from the archive is not sent to the relay. */
const MINECRAFT_NAME = /^\w{3,16}$/;
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

  // No account and no name worth asking about: the MCBA's hand-typed
  // nicknames and the Discord names from Season VI and earlier are not
  // usernames and never will be, so they get the block rather than a lookup.
  if (!uuid && !(name && MINECRAFT_NAME.test(name))) {
    return (
      <span
        aria-hidden
        style={{ width: size, height: size }}
        className={`${box} inline-block bg-slate-700/70 ring-1 ring-inset ring-slate-600/50`}
      />
    );
  }

  const src = uuid
    ? `/api/head/${uuid}`
    : `/api/head/by-name/${encodeURIComponent(name as string)}`;
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
