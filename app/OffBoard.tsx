"use client";

import { usePathname } from "next/navigation";

/**
 * The boards that are not web pages a person browses: the stadium scoreboards,
 * which are screens inside Minecraft, and the stream scorebugs, which are a
 * browser source composited over somebody's broadcast. A cookie banner on
 * either would end up on screen in front of an audience.
 */
export const BOARD_PATH = /^\/(scoreboard|scorebug)(\/|$)/;

/**
 * Site furniture that a stadium jumbotron must not show.
 *
 * A scoreboard is rendered by a Chromium instance inside Minecraft and read
 * from across a ballpark. A cookie notice over the score would be absurd, and
 * the analytics beacon would count every player's client as a visitor, which
 * quietly turns the league's own numbers into nonsense. A scorebug is the same
 * argument from the other direction: it is a layer over a video, and anything
 * the site draws there goes out to everyone watching the stream.
 *
 * The board still renders inside the root layout - Next.js only allows one -
 * so the things that do not belong there opt out here rather than the board
 * opting out of everything.
 */
export function OffBoard({ children }: { children: React.ReactNode }) {
  return BOARD_PATH.test(usePathname()) ? null : <>{children}</>;
}
