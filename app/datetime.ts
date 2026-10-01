import { EASTERN_LABEL } from "./eastern";

/**
 * A `datetime-local` value ("2026-09-13T19:00") spelled out in words, or null
 * when there is nothing to describe.
 *
 * The browser's date picker lays its fields out in the order of the viewer's
 * region, so on a day-first machine the second box is the month - and typing a
 * day into it silently clamps to 12. Naming the month in full under the picker
 * makes a swapped day and month obvious before anything is saved.
 *
 * Read exactly as typed and labelled ET, because that is what the box means on
 * this site: the boxes hold the league's time, not the reader's. It used to be
 * built as a local Date and printed unlabelled, which described a time in the
 * viewer's own zone and so disagreed with every other time on the page.
 */
export function describeEastern(value: string): string | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match.map(Number);

  // Built in UTC and printed in UTC so the words are the digits that were
  // typed, whatever zone the machine rendering this happens to be in - the
  // server and the browser have to agree or React discards the markup.
  const when = new Date(Date.UTC(year, month - 1, day, hour, minute));
  if (Number.isNaN(when.valueOf())) return null;

  const text = when.toLocaleString("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return `${text} ${EASTERN_LABEL}`;
}
