/**
 * The arithmetic behind the cover cropper, kept apart from the component so it
 * can be checked without a browser.
 *
 * The writer composes in a window of a fixed shape and the picture moves
 * behind it. What has to be worked out is the opposite: which rectangle of the
 * original picture is showing through that window, in the original's own
 * pixels, so it can be drawn to the canvas.
 */

/** What every cover is written out at: 16:9, large enough for the lead slot. */
export const OUT_WIDTH = 1200;
export const OUT_HEIGHT = 675;
/** The window the writer composes in. Its shape has to match the output. */
export const WIN_WIDTH = 512;
export const WIN_HEIGHT = (WIN_WIDTH * OUT_HEIGHT) / OUT_WIDTH;

/** The colour behind a cover that does not fill its frame, matching the page. */
export const BACKDROP = "#020617";

/** The scale at which a picture just covers the window: zoom 1 means no gaps. */
export function baseScale(natural: { width: number; height: number }) {
  return Math.max(WIN_WIDTH / natural.width, WIN_HEIGHT / natural.height);
}

/**
 * How far out the writer may zoom, as a multiple of zoom 1.
 *
 * Zoom 1 is the picture just covering the window, which for anything that is
 * not already 16:9 means losing the overflow - and the first covers posted
 * here were stat graphics where the first and last lines were the overflow.
 * So zooming out far enough to fit the whole picture is allowed, and what is
 * left over is filled with the colour the page already sits on.
 */
export function minZoom(natural: { width: number; height: number }) {
  const contain = Math.min(WIN_WIDTH / natural.width, WIN_HEIGHT / natural.height);
  return contain / baseScale(natural);
}

/**
 * How far the picture may be dragged before an edge would come into the
 * window. Zero on an axis the picture only just covers.
 */
export function room(natural: { width: number; height: number }, scale: number) {
  return {
    x: Math.max(0, (natural.width * scale - WIN_WIDTH) / 2),
    y: Math.max(0, (natural.height * scale - WIN_HEIGHT) / 2),
  };
}

/** The part of the original picture showing through the window. */
export function sourceRect(
  natural: { width: number; height: number },
  scale: number,
  offset: { x: number; y: number },
) {
  const width = WIN_WIDTH / scale;
  const height = WIN_HEIGHT / scale;
  return {
    sx: natural.width / 2 - offset.x / scale - width / 2,
    sy: natural.height / 2 - offset.y / scale - height / 2,
    width,
    height,
  };
}
