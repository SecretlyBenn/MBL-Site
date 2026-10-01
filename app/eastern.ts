/**
 * The league runs on Eastern time, and every time the site shows is in it.
 *
 * Nobody reads this site in their own timezone on purpose. Games are arranged
 * in Eastern in Discord, the schedule is published in Eastern, and a player in
 * California knows to take three hours off. Showing each reader their own clock
 * instead meant two people looking at the same fixture saw different times and
 * neither label said which was which - and a game time that is wrong by hours
 * is a game somebody misses.
 *
 * The label is always "ET", never "EDT" or "EST". The offset behind it does
 * follow the clocks, because otherwise the hour shown would be wrong for half
 * the year; it is only the name that stays put, so the schedule reads the same
 * in June and December.
 */

export const EASTERN = "America/New_York";

/** What the site writes next to a time. Deliberately season-independent. */
export const EASTERN_LABEL = "ET";

/**
 * How far Eastern is from UTC at a given instant, in milliseconds.
 *
 * Worked out by asking Intl what the wall clock there reads and comparing, so
 * the daylight-saving rules come from the platform rather than from a table
 * here that would rot.
 */
function offsetAt(instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(instant);

  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const asIfUtc = Date.UTC(
    read("year"),
    read("month") - 1,
    read("day"),
    // Intl renders midnight as 24 in some environments.
    read("hour") % 24,
    read("minute"),
    read("second"),
  );
  return asIfUtc - instant.getTime();
}

/**
 * An Eastern wall-clock time as the instant it actually happened.
 *
 * Two passes: the first guesses the offset from the naive value, the second
 * corrects it using the instant that guess produced. That second pass is what
 * gets the hour right on the two days a year the clocks move, when the offset
 * before and after the time in question is not the same.
 */
export function easternWallClockToInstant(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  const naive = Date.UTC(year, month - 1, day, hour, minute);
  const first = naive - offsetAt(new Date(naive));
  const second = naive - offsetAt(new Date(first));
  return new Date(second);
}

/**
 * Reads a stored `scheduled_at` into a real instant.
 *
 * Two shapes exist in the database. Anything with a Z or an offset is a proper
 * instant and is taken at face value. The older rows are bare wall-clock
 * strings from the archive import ("2026-09-13T22:30") with no zone at all;
 * those were written in the league's own time, so they are read as Eastern.
 * Reading them as UTC - which the site used to do - moved every one of them by
 * four or five hours.
 */
export function instantFrom(stored: string): Date | null {
  if (!stored) return null;

  if (/[zZ]|[+-]\d\d:?\d\d$/.test(stored)) {
    const parsed = new Date(stored);
    return Number.isNaN(parsed.valueOf()) ? null : parsed;
  }

  const match = stored.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (!match) {
    const parsed = new Date(stored);
    return Number.isNaN(parsed.valueOf()) ? null : parsed;
  }
  const [, year, month, day, hour, minute] = match.map(Number);
  return easternWallClockToInstant(year, month, day, hour, minute);
}

type Style = "full" | "short" | "dateOnly";

const STYLES: Record<Style, Intl.DateTimeFormatOptions> = {
  full: { weekday: "long", month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" },
  short: { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" },
  dateOnly: { month: "long", day: "numeric", year: "numeric" },
};

/**
 * A stored time written out in Eastern, with "ET" after it.
 *
 * The label is left off a date with no time on it, where there is no hour for
 * a timezone to be about.
 */
export function inEastern(stored: string | null | undefined, style: Style = "short"): string {
  if (!stored) return "";
  const instant = instantFrom(stored);
  if (!instant) return stored;

  const text = instant.toLocaleString("en-US", { timeZone: EASTERN, ...STYLES[style] });
  return style === "dateOnly" ? text : `${text} ${EASTERN_LABEL}`;
}

/**
 * The value a `datetime-local` input should hold to show a stored time, in
 * Eastern - so an admin opening a fixture sees the hour the league agreed,
 * not the hour their own laptop happens to be on.
 */
export function toEasternInputValue(stored: string | null | undefined): string {
  if (!stored) return "";
  const instant = instantFrom(stored);
  if (!instant) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: EASTERN,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(instant);
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  const hour = String(Number(read("hour")) % 24).padStart(2, "0");
  return `${read("year")}-${read("month")}-${read("day")}T${hour}:${read("minute")}`;
}

/**
 * What an admin typed into a `datetime-local` box, stored as an instant.
 *
 * The box has no timezone in it, so something has to decide what the typed
 * hour means. It means Eastern, because that is what the person was told to
 * enter - `new Date(value)` read it as the browser's own zone instead, which
 * is how a game entered as ten at night in California was filed as five in the
 * morning the next day.
 */
export function easternInputToIso(value: string): string | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match.map(Number);
  return easternWallClockToInstant(year, month, day, hour, minute).toISOString();
}
