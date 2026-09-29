"use client";

import { usePathname } from "next/navigation";

/** The stadium scoreboards, which are screens in Minecraft and not web pages a person browses. */
export const BOARD_PATH = /^\/scoreboard(\/|$)/;

/**
 * Site furniture that a stadium jumbotron must not show.
 *
 * A scoreboard is rendered by a Chromium instance inside Minecraft and read
 * from across a ballpark. A cookie notice over the score would be absurd, and
 * the analytics beacon would count every player's client as a visitor, which
 * quietly turns the league's own numbers into nonsense.
 *
 * The board still renders inside the root layout - Next.js only allows one -
 * so the things that do not belong there opt out here rather than the board
 * opting out of everything.
 */
export function OffBoard({ children }: { children: React.ReactNode }) {
  return BOARD_PATH.test(usePathname()) ? null : <>{children}</>;
}
