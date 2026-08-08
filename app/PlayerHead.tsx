/**
 * A player's Minecraft head.
 *
 * Rendered from the account UUID rather than the username, because the archive
 * stores whatever name a player used at the time and plenty have since renamed
 * - a username-based avatar would silently show the wrong skin, or none.
 *
 * Players with no resolved account fall back to a neutral block, so a missing
 * mapping reads as "unknown player" rather than a broken image.
 */
const HEAD_SERVICE = "https://mc-heads.net/avatar";

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
  const style = { width: size, height: size };

  if (!uuid) {
    return (
      <span
        aria-hidden
        style={style}
        className={`${box} inline-block bg-slate-700/70 ring-1 ring-inset ring-slate-600/50`}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${HEAD_SERVICE}/${uuid}/${size * 2}`}
      alt={name ? `${name}'s Minecraft skin` : ""}
      width={size}
      height={size}
      loading="lazy"
      style={style}
      // Skins are pixel art: smoothing them turns a crisp 8x8 face to mush.
      className={`${box} [image-rendering:pixelated]`}
    />
  );
}
