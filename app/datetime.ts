/**
 * A `datetime-local` value ("2026-09-13T19:00") spelled out in words, or null
 * when there is nothing to describe.
 *
 * The browser's date picker lays its fields out in the order of the viewer's
 * region, so on a day-first machine the second box is the month - and typing a
 * day into it silently clamps to 12. Naming the month in full under the picker
 * makes a swapped day and month obvious before anything is saved.
 *
 * Built from the parts rather than handed to Date.parse, so the value is read
 * as the viewer's own clock time exactly as they entered it.
 */
export function describeLocalDateTime(value: string): string | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match.map(Number);
  const when = new Date(year, month - 1, day, hour, minute);
  if (Number.isNaN(when.valueOf())) return null;
  return when.toLocaleString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
