"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  BatterGameLine,
  Linescore,
  PitcherGameLine,
  Scoreboard,
  ScoreboardSide,
} from "@/db/scoreboard";

/**
 * A stadium jumbotron, drawn from two sources that each know half the game.
 *
 * The Minecraft plugin pushes the count, the outs, the score and the inning
 * straight into this page by calling window.mblJumbotron.updateState - that is
 * what the umpire is typing at the plate, and it arrives within a tick with no
 * request to the site at all. The site supplies everything with a name on it:
 * the clubs, the crests, who is on the bases, who is up and who is pitching.
 *
 * Nothing here polls. A browser source that fetched on a timer would be one
 * poller per player watching, and this site has a hundred thousand requests a
 * day for everybody. Preview mode is the exception, and says so.
 *
 * It is laid out the way a ballpark board is laid out, because that is what
 * people expect to be able to read at a glance: both orders down the sides, the
 * man at the plate in the middle, and along the bottom the line score and the
 * count. The line score is the part that makes it look like a scoreboard rather
 * than a web page, and it costs nothing - `deriveBoxScore` works the innings
 * out anyway.
 *
 * Everything is sized in `vh` rather than `vw`. A jumbotron is wide, so height
 * is what runs out first; sizing from the width made the type grow on a long
 * screen until the panels collided.
 */

/** What the mod pushes in. Matches ScoreboardState in the jumbotron mod. */
type PluginState = {
  arena?: string;
  home?: string;
  away?: string;
  homeScore?: number;
  awayScore?: number;
  inning?: number;
  top?: boolean;
  inningTopOrBottom?: boolean;
  balls?: number;
  strikes?: number;
  outs?: number;
  homeLogo?: string;
  awayLogo?: string;
  homeColor?: string;
  awayColor?: string;
  leagueLogo?: string;
  /**
   * The site's half of the board, relayed by the plugin rather than fetched
   * here. Without it the names would be whatever they were when the page was
   * opened, for the rest of the game.
   */
  site?: Scoreboard | null;
  /** False when the site answered and no game was on; absent when it has not answered. */
  siteLive?: boolean;
};

type Club = { id: number; name: string; abbreviation: string; color: string | null; logo: string | null };

const EVENT_LABELS: Record<string, string> = {
  HOME_RUN: "HOME RUN!",
  GRAND_SLAM: "GRAND SLAM!",
  STRIKEOUT: "STRIKEOUT!",
  DOUBLE_PLAY: "DOUBLE PLAY!",
  WALK: "TAKE YOUR BASE",
  BALK: "BALK!",
  EJECTED: "EJECTED!",
  PLAY_BALL: "PLAY BALL!",
  UNDER_REVIEW: "UNDER REVIEW",
  SAFE: "SAFE!",
  OUT: "OUT!",
  TIME: "TIME",
};

/** How long each call stays on screen. Long enough to read across a ballpark. */
const EVENT_MS = 4200;

const isVideo = (url: string) => /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url);

/**
 * A hex colour the panels can safely be tinted with, or null for the default.
 *
 * Always returned in the six-digit form. The panels build a gradient by
 * appending an alpha pair, and "#abc" plus "44" is not a colour at all - the
 * panel silently lost its tint rather than failing where anyone would see it.
 */
function safeColor(value: string | null | undefined) {
  if (typeof value !== "string") return null;
  const hex = value.trim();
  if (!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return null;
  return hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
}

/**
 * Black or white, whichever can be read on top of a club's colour.
 *
 * Clubs here pick their own, and several are yellows and pale blues. White
 * lettering on those is a smear from any distance at all, which on a screen
 * people read from the outfield is the whole problem.
 */
function readableOn(hex: string | null) {
  if (!hex) return "#ffffff";
  const channel = (at: number) => parseInt(hex.slice(at, at + 2), 16) / 255;
  const linear = (value: number) =>
    value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  const luminance =
    0.2126 * linear(channel(1)) + 0.7152 * linear(channel(3)) + 0.0722 * linear(channel(5));
  return luminance > 0.42 ? "#06080c" : "#ffffff";
}

/** A pitcher's innings the way a scoreboard writes them: 4.2, not 4.667. */
const inningsPitched = (outs: number) => `${Math.floor(outs / 3)}.${outs % 3}`;

/**
 * A batter's day in the shorthand a board uses: "2 FOR 3", or "BB" for somebody
 * who has only walked, or his first time up.
 */
function dayLine(line: BatterGameLine) {
  if (line.atBats > 0) return `${line.hits} FOR ${line.atBats}`;
  if (line.walks > 0) return line.walks === 1 ? "WALKED" : `${line.walks} WALKS`;
  return "FIRST UP";
}

/** The parts of a day worth calling out beside it, in the order a board shows them. */
function dayNotes(line: BatterGameLine) {
  const notes: string[] = [];
  if (line.homeRuns > 0) notes.push(line.homeRuns === 1 ? "HR" : `${line.homeRuns} HR`);
  if (line.rbis > 0) notes.push(`${line.rbis} RBI`);
  if (line.runs > 0) notes.push(`${line.runs} R`);
  if (line.atBats > 0 && line.walks > 0) notes.push(`${line.walks} BB`);
  if (line.strikeouts > 0) notes.push(`${line.strikeouts} K`);
  return notes;
}

/** The short form beside a name in the order - what he has done today. */
const shortLine = (line: BatterGameLine) =>
  line.atBats > 0 ? `${line.hits}-${line.atBats}` : line.walks > 0 ? "BB" : "";

export function Jumbotron({
  initial,
  club,
  leagueName,
  leagueLogo,
  origin,
  preview,
}: {
  initial: Scoreboard | null;
  club: Club;
  leagueName: string;
  /** The site's own league crest. The plugin can override it, but rarely should. */
  leagueLogo: string | null;
  /**
   * Where to ask for player heads. Absolute for the same reason the crests are:
   * the mod's own bundled page is a file:// document, where a path beginning
   * with a slash points at the player's own disk.
   */
  origin: string;
  preview: boolean;
}) {
  const [board, setBoard] = useState<Scoreboard | null>(initial);
  const [plugin, setPlugin] = useState<PluginState | null>(null);
  const [event, setEvent] = useState<{ id: number; label: string; image: string } | null>(null);
  const eventId = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playEvent = useCallback((incoming: unknown) => {
    const payload = (typeof incoming === "object" && incoming !== null ? incoming : {}) as {
      event?: string;
      image?: string;
    };
    const raw = typeof payload.event === "string" ? payload.event.trim() : "";
    if (!raw) return;
    const key = raw.toUpperCase();
    const label = EVENT_LABELS[key] ?? key.replace(/[_-]+/g, " ");
    const id = ++eventId.current;

    setEvent({ id, label, image: typeof payload.image === "string" ? payload.image.trim() : "" });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      // Only clear if nothing newer has started, or a second call would cut the
      // first one's animation short and leave the overlay half-open.
      setEvent((current) => (current && current.id === id ? null : current));
    }, EVENT_MS);
  }, []);

  useEffect(() => {
    window.mblJumbotron = {
      updateState: (state: PluginState) => {
        if (state && typeof state === "object") setPlugin(state);
      },
      playEvent,
    };
    return () => {
      delete window.mblJumbotron;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [playEvent]);

  // Preview only. Opening the link in a real browser has no plugin behind it,
  // so this is the only way to watch it move - and it is opt-in precisely
  // because forty Minecraft clients doing it would cost the site its day.
  useEffect(() => {
    if (!preview) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const response = await fetch(`/api/scoreboard/${club.id}`, { cache: "no-store" });
        const body = (await response.json()) as { scoreboard: Scoreboard | null };
        if (!cancelled) setBoard(body.scoreboard);
      } catch {
        // A failed poll leaves the last good board up rather than blanking it.
      }
    };
    const handle = setInterval(tick, 5000);
    return () => {
      cancelled = true;
      clearInterval(handle);
    };
  }, [preview, club.id]);

  const view = useMemo(
    () => merge(board, plugin, club, leagueName, leagueLogo),
    [board, plugin, club, leagueName, leagueLogo],
  );

  return (
    <div
      className="relative flex h-screen w-screen flex-col overflow-hidden bg-[#05070c] text-white select-none"
      // Everything on this board is sized in multiples of --u rather than in
      // vh or vw directly, because a screen in Minecraft is whatever shape
      // somebody built it. Height alone shrank the panels to nothing on a long
      // screen; width alone made the type so large on a near-square one that
      // every name truncated to four letters. This is a hundredth of the
      // height, capped so it can never outgrow the width - at the usual
      // sixteen-by-nine the two agree, and either shape away from it the
      // tighter dimension takes over.
      style={
        {
          "--u": "min(1.25vh, 0.58vw)",
          // Declared in globals.css rather than loaded through next/font,
          // which writes an address no browser will fetch - see the comment
          // there. The whole layout below is measured against this face, so a
          // fallback to an ordinary sans truncates half the names on the board.
          fontFamily: '"Barlow Condensed", ui-sans-serif, system-ui, sans-serif',
        } as React.CSSProperties
      }
    >
      <style>{KEYFRAMES}</style>

      {/* A thin nameplate during a game, because the score is what people are
          looking at then and this is only a title bar. With nothing on, the
          header is most of what there is, so it gets the room. */}
      <header
        className={`flex shrink-0 items-center justify-between gap-[calc(var(--u)*2)] border-b-[calc(var(--u)*0.3)] border-white/15 bg-black/50 px-[calc(var(--u)*1.4)] ${
          view.live ? "py-[calc(var(--u)*0.7)]" : "py-[calc(var(--u)*2)]"
        }`}
      >
        <div className="flex min-w-0 items-center gap-[calc(var(--u)*1.4)]">
          {view.leagueLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={view.leagueLogo}
              alt=""
              className={`shrink-0 object-contain drop-shadow-[0_0_1vh_rgba(0,0,0,0.6)] ${
                view.live ? "h-[calc(var(--u)*6)]" : "h-[calc(var(--u)*12)]"
              }`}
            />
          ) : null}
          <span
            className={`truncate font-black uppercase tracking-[0.18em] text-white ${
              view.live ? "text-[length:calc(var(--u)*3)]" : "text-[length:calc(var(--u)*5)]"
            }`}
          >
            {view.leagueName}
          </span>
        </div>

        {view.live ? (
          <div className="flex shrink-0 items-baseline gap-[calc(var(--u)*1.4)]">
            <span className="text-[length:calc(var(--u)*2.4)] font-bold uppercase tracking-[0.2em] text-white/55">
              {view.away.abbreviation} at {view.home.abbreviation}
            </span>
            <span className="text-[length:calc(var(--u)*3.4)] font-black uppercase leading-none tracking-tight text-amber-300">
              {view.top ? "TOP" : "BOT"} {ordinal(view.inning)}
            </span>
          </div>
        ) : (
          <span className="shrink-0 text-[length:calc(var(--u)*4)] font-bold uppercase tracking-[0.18em] text-white/50">
            {view.club.name}
          </span>
        )}
      </header>

      {view.live ? (
        <>
          <main className="flex min-h-0 flex-1 items-stretch gap-[calc(var(--u)*1.1)] px-[calc(var(--u)*1.1)] py-[calc(var(--u)*1.1)]">
            <LineupCard
              side={view.away}
              score={view.awayScore}
              batting={view.top}
              label="Away"
              batterId={view.batter?.playerId}
              origin={origin}
            />

            <Feature view={view} origin={origin} />

            <LineupCard
              side={view.home}
              score={view.homeScore}
              batting={!view.top}
              label="Home"
              batterId={view.batter?.playerId}
              origin={origin}
            />
          </main>

          <footer className="flex shrink-0 items-stretch gap-[calc(var(--u)*1.1)] border-t-[calc(var(--u)*0.3)] border-white/15 bg-black/60 px-[calc(var(--u)*1.1)] py-[calc(var(--u)*1.1)]">
            <LinescoreBoard
              away={view.away}
              home={view.home}
              awayScore={view.awayScore}
              homeScore={view.homeScore}
              line={view.linescore}
              inning={view.inning}
              top={view.top}
            />
            <CountPanel balls={view.balls} strikes={view.strikes} outs={view.outs} />
          </footer>
        </>
      ) : (
        <Idle club={view.club} />
      )}

      {event ? (
        <div
          key={event.id}
          className="absolute inset-0 flex flex-col items-center justify-center gap-[calc(var(--u)*3)] bg-slate-950/85"
          style={{ animation: `boardEvent ${EVENT_MS}ms ease-out forwards` }}
        >
          {event.image ? (
            isVideo(event.image) ? (
              <video
                src={event.image}
                autoPlay
                muted
                playsInline
                className="max-h-[45vh] max-w-[60vw] object-contain"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={event.image} alt="" className="max-h-[45vh] max-w-[60vw] object-contain" />
            )
          ) : null}
          <div
            className="text-center text-[length:calc(var(--u)*14)] font-black uppercase leading-none tracking-tight"
            style={{ color: view.battingColor ?? "#ffffff", textShadow: "0 0 3vh rgba(0,0,0,0.9)" }}
          >
            {event.label}
          </div>
        </div>
      ) : null}

      {preview ? (
        <div className="absolute bottom-[calc(var(--u)*1)] right-[calc(var(--u)*1)] rounded bg-slate-800/80 px-[calc(var(--u)*1)] py-[calc(var(--u)*0.4)] text-[length:calc(var(--u)*1.6)] font-bold uppercase tracking-widest text-slate-400">
          Preview · {plugin ? "plugin connected" : "no plugin"}
        </div>
      ) : null}
    </div>
  );
}

/** 1st, 2nd, 3rd - the inning is always read aloud this way. */
function ordinal(value: number) {
  const tens = value % 100;
  if (tens >= 11 && tens <= 13) return `${value}TH`;
  return `${value}${["TH", "ST", "ND", "RD"][value % 10] ?? "TH"}`;
}

/**
 * A Minecraft head, cut out of the account's skin.
 *
 * The same trick `PlayerHead` uses - a 64px skin sheet scaled so eight skin
 * pixels fill the box, slid so the face sits in the window, with the hat layer
 * over it. Written out again here rather than reused because this one is sized
 * in `vh` so it scales with the screen, and because the address has to be
 * absolute: the mod can be pointed at a bundled file:// page, where a path
 * beginning with a slash is the player's own disk.
 */
function Head({
  uuid,
  size,
  origin,
  className = "",
}: {
  uuid: string | null | undefined;
  /** Any CSS length - the layers are worked out from it with calc. */
  size: string;
  origin: string;
  className?: string;
}) {
  if (!uuid) {
    return (
      <span
        aria-hidden
        style={{ width: size, height: size }}
        className={`shrink-0 bg-white/[0.06] ${className}`}
      />
    );
  }

  const src = `${origin}/api/head/${uuid}`;
  const layer = (column: number) =>
    ({
      position: "absolute",
      left: `calc(${size} * ${-column})`,
      top: `calc(${size} * -1)`,
      width: `calc(${size} * 8)`,
      maxWidth: "none",
      height: "auto",
      // Skins are pixel art: smoothing them turns a crisp 8x8 face to mush.
      imageRendering: "pixelated",
    }) as const;

  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className={`relative inline-block shrink-0 overflow-hidden bg-black/40 ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" style={layer(1)} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" style={layer(5)} />
    </span>
  );
}

/**
 * One club's order down the side of the board, the way a ballpark lists it.
 *
 * The pitcher is added underneath when he is not in the order himself, which is
 * every side batting a designated hitter. A board that simply left him off
 * would be the only place in the stadium not naming the man on the mound.
 */
function LineupCard({
  side,
  score,
  batting,
  label,
  batterId,
  origin,
}: {
  side: SideView;
  score: number;
  batting: boolean;
  label: string;
  batterId?: number;
  origin: string;
}) {
  const tint = side.color ?? "#1e293b";
  const ink = readableOn(side.color);
  const inOrder = new Set(side.lineup.map((row) => row.playerId));
  const pitcher = side.pitcher && !inOrder.has(side.pitcher.playerId) ? side.pitcher : null;

  return (
    <section
      className="flex w-[23%] shrink-0 flex-col overflow-hidden rounded-[calc(var(--u)*0.8)] bg-black/40"
      style={{ boxShadow: `inset 0 0 0 0.3vh ${batting ? "#ffffff" : "rgba(255,255,255,0.14)"}` }}
    >
      <div
        className="flex shrink-0 items-center gap-[calc(var(--u)*1)] px-[calc(var(--u)*1)] py-[calc(var(--u)*0.7)]"
        style={{ background: tint, color: ink }}
      >
        {side.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={side.logo} alt="" className="h-[calc(var(--u)*7)] w-[calc(var(--u)*7)] shrink-0 object-contain" />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="text-[length:calc(var(--u)*1.6)] font-bold uppercase leading-none tracking-[0.3em] opacity-60">
            {label}
          </div>
          <div className="truncate text-[length:calc(var(--u)*4.2)] font-black uppercase leading-none tracking-tight">
            {side.abbreviation}
          </div>
        </div>
        <div className="text-[length:calc(var(--u)*7)] font-black leading-[0.8] tabular-nums tracking-tighter">
          {score}
        </div>
      </div>

      <ol className="flex min-h-0 flex-1 flex-col">
        {side.lineup.map((row) => (
          <LineupRow
            key={row.playerId}
            slot={row.slot}
            name={row.name}
            position={row.position}
            uuid={row.uuid}
            detail={shortLine(row.line)}
            up={row.playerId === batterId}
            origin={origin}
          />
        ))}
        {pitcher ? (
          <LineupRow
            key={pitcher.playerId}
            slot={null}
            name={pitcher.name}
            position="P"
            uuid={pitcher.uuid}
            detail={inningsPitched(pitcher.line.outs)}
            up={false}
            origin={origin}
          />
        ) : null}
      </ol>
    </section>
  );
}

function LineupRow({
  slot,
  name,
  position,
  uuid,
  detail,
  up,
  origin,
}: {
  slot: number | null;
  name: string;
  position: string;
  uuid: string | null;
  detail: string;
  up: boolean;
  origin: string;
}) {
  return (
    <li
      className={`flex min-h-0 flex-1 items-center gap-[calc(var(--u)*0.7)] px-[calc(var(--u)*0.8)] ${
        up ? "bg-white text-[#05070c]" : "text-white/85 even:bg-white/[0.04]"
      }`}
    >
      <span
        className={`w-[calc(var(--u)*2.2)] shrink-0 text-right text-[length:calc(var(--u)*2.1)] font-bold tabular-nums ${
          up ? "opacity-70" : "text-white/40"
        }`}
      >
        {slot ?? "·"}
      </span>
      <Head uuid={uuid} size="calc(var(--u)*3)" origin={origin} />
      <span className="min-w-0 flex-1 truncate text-[length:calc(var(--u)*2.6)] font-bold uppercase tracking-tight">
        {name}
      </span>
      <span
        className={`w-[calc(var(--u)*3.2)] shrink-0 text-[length:calc(var(--u)*1.9)] font-bold uppercase ${
          up ? "opacity-70" : "text-white/45"
        }`}
      >
        {position}
      </span>
      <span
        className={`w-[calc(var(--u)*4.2)] shrink-0 text-right text-[length:calc(var(--u)*2)] font-bold tabular-nums ${
          up ? "opacity-80" : "text-amber-300/80"
        }`}
      >
        {detail}
      </span>
    </li>
  );
}

/**
 * The middle of the board: who is up, where the runners are, and who is
 * pitching to him. A real jumbotron gives this the most room, because it is the
 * only part that changes between pitches in a way a crowd reacts to.
 */
function Feature({ view, origin }: { view: BoardView; origin: string }) {
  const batter = view.batter;
  const pitcher = view.pitcher;
  const tint = view.battingColor ?? "#1e293b";
  const ink = readableOn(view.battingColor);
  const notes = batter ? dayNotes(batter.line) : [];

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-[calc(var(--u)*1)]">
      <div
        className="flex shrink-0 items-baseline justify-between rounded-[calc(var(--u)*0.6)] px-[calc(var(--u)*1.2)] py-[calc(var(--u)*0.5)]"
        style={{ background: tint, color: ink }}
      >
        <span className="text-[length:calc(var(--u)*2.2)] font-black uppercase tracking-[0.3em]">At bat</span>
        <span className="truncate text-[length:calc(var(--u)*2.4)] font-bold uppercase tracking-wider opacity-80">
          {view.battingSide?.name ?? ""}
        </span>
      </div>

      <div
        className="flex shrink-0 items-center gap-[calc(var(--u)*1.6)] rounded-[calc(var(--u)*0.6)] p-[calc(var(--u)*1)]"
        style={{ background: `linear-gradient(90deg, ${tint}59, transparent 70%)` }}
      >
        <Head uuid={batter?.uuid} size="calc(var(--u)*16)" origin={origin} className="rounded-[calc(var(--u)*0.5)]" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-[calc(var(--u)*1.2)]">
            <span className="shrink-0 text-[length:calc(var(--u)*6)] font-black leading-none tabular-nums text-white/30">
              {batter?.slot ?? "·"}
            </span>
            <span className="min-w-0 truncate text-[length:calc(var(--u)*6)] font-black uppercase leading-none tracking-tight">
              {batter?.name ?? "—"}
            </span>
            <span className="shrink-0 text-[length:calc(var(--u)*2.6)] font-bold uppercase text-white/50">
              {batter?.position ?? ""}
            </span>
          </div>
          <div className="mt-[calc(var(--u)*0.8)] flex items-baseline gap-[calc(var(--u)*1)]">
            <span className="shrink-0 text-[length:calc(var(--u)*3.2)] font-black uppercase tracking-tight text-amber-300">
              {batter ? dayLine(batter.line) : ""}
            </span>
            {notes.map((note) => (
              <span
                key={note}
                className="shrink-0 rounded-[calc(var(--u)*0.4)] bg-white/10 px-[calc(var(--u)*0.8)] py-[calc(var(--u)*0.2)] text-[length:calc(var(--u)*2.1)] font-bold uppercase tracking-wider text-white/80"
              >
                {note}
              </span>
            ))}
          </div>
        </div>
      </div>

      <Bases bases={view.bases} onDeck={view.onDeck} />

      <div className="flex shrink-0 items-center gap-[calc(var(--u)*1.4)] rounded-[calc(var(--u)*0.6)] bg-white/[0.05] px-[calc(var(--u)*1.2)] py-[calc(var(--u)*0.8)]">
        <span className="shrink-0 text-[length:calc(var(--u)*1.9)] font-black uppercase tracking-[0.2em] text-white/45">
          Pitching
        </span>
        <Head uuid={pitcher?.uuid} size="calc(var(--u)*6)" origin={origin} className="rounded-[calc(var(--u)*0.4)]" />
        <span className="min-w-0 flex-1 truncate text-[length:calc(var(--u)*3.6)] font-black uppercase leading-none tracking-tight">
          {pitcher?.name ?? "—"}
        </span>
        {pitcher ? <PitcherLine line={pitcher.line} /> : null}
      </div>
    </section>
  );
}

/** The pitcher's day, as the column of figures a ballpark board puts up. */
function PitcherLine({ line }: { line: PitcherGameLine }) {
  const columns: [string, string | number][] = [
    ["IP", inningsPitched(line.outs)],
    ["H", line.hits],
    ["R", line.runs],
    ["ER", line.earnedRuns],
    ["BB", line.walks],
    ["K", line.strikeouts],
  ];
  return (
    <div className="flex shrink-0 gap-[calc(var(--u)*0.9)]">
      {columns.map(([label, value]) => (
        <div key={label} className="flex w-[calc(var(--u)*5.2)] flex-col items-center">
          <span className="text-[length:calc(var(--u)*1.6)] font-bold uppercase tracking-widest text-white/40">
            {label}
          </span>
          <span className="text-[length:calc(var(--u)*3)] font-black leading-none tabular-nums">{value}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * The bases, drawn as a diamond, with whoever is standing on them named beside
 * it. The names are the site's own contribution: the plugin has no idea who any
 * of these people are, and a crowd watching wants to know who is on second.
 *
 * Laid out as rows rather than by absolute position. Three squares each placed
 * at fifty percent of a box overlap once they are rotated, and second and third
 * ran into each other as one shape - which reads as a runner on a base that
 * does not exist.
 */
function Bases({
  bases,
  onDeck,
}: {
  bases: { base: string; name: string }[];
  onDeck: string | null;
}) {
  const runner = (which: string) => bases.find((row) => row.base === which) ?? null;
  // Lit bases are amber, not the batting club's colour. A club's own colour is
  // whatever they chose - several are dark blues and purples, which on a black
  // panel is barely brighter than an empty base, and whether a base is occupied
  // is the one thing on this part of the board that has to be unmistakable.
  const base = (which: string) => {
    const on = runner(which) !== null;
    return (
      <span
        className="h-[calc(var(--u)*6.4)] w-[calc(var(--u)*6.4)] rotate-45 border-[calc(var(--u)*0.4)]"
        style={
          on
            ? { background: "#fbbf24", borderColor: "#ffffff", boxShadow: "0 0 2vh #fbbf24aa" }
            : { background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.3)" }
        }
      />
    );
  };

  const aboard = (["third", "second", "first"] as const).filter((which) => runner(which));

  return (
    <div className="flex min-h-0 flex-1 items-center gap-[calc(var(--u)*2.6)] rounded-[calc(var(--u)*0.6)] bg-white/[0.04] px-[calc(var(--u)*1.8)] py-[calc(var(--u)*1)]">
      <div className="flex w-[calc(var(--u)*22)] shrink-0 flex-col items-center gap-[calc(var(--u)*2.2)]">
        {base("second")}
        <div className="flex w-full items-center justify-between">
          {base("third")}
          {base("first")}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-[calc(var(--u)*0.5)]">
        {aboard.length === 0 ? (
          <span className="text-[length:calc(var(--u)*2.8)] font-bold uppercase tracking-[0.3em] text-white/35">
            Bases empty
          </span>
        ) : (
          aboard.map((which) => (
            <div key={which} className="flex min-w-0 items-baseline gap-[calc(var(--u)*1.2)]">
              <span className="w-[calc(var(--u)*4.6)] shrink-0 text-[length:calc(var(--u)*2.2)] font-black uppercase tracking-widest text-amber-300">
                {BASE_LABELS[which]}
              </span>
              <span className="min-w-0 truncate text-[length:calc(var(--u)*3.2)] font-bold uppercase tracking-tight">
                {runner(which)?.name}
              </span>
            </div>
          ))
        )}
        {/* Who is coming, which every ballpark board carries and which costs
            nothing: it is the next name down the order already on screen. */}
        {onDeck ? (
          <div className="mt-[calc(var(--u)*0.8)] flex min-w-0 items-baseline gap-[calc(var(--u)*1.2)] border-t-[calc(var(--u)*0.2)] border-white/10 pt-[calc(var(--u)*0.8)]">
            <span className="shrink-0 text-[length:calc(var(--u)*2)] font-bold uppercase tracking-[0.25em] text-white/40">
              On deck
            </span>
            <span className="min-w-0 truncate text-[length:calc(var(--u)*2.8)] font-bold uppercase tracking-tight text-white/75">
              {onDeck}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const BASE_LABELS: Record<string, string> = { first: "1B", second: "2B", third: "3B" };

/**
 * The line score: runs by inning, then runs, hits and errors.
 *
 * The runs column is the plugin's, not the sum of the innings beside it. The
 * plugin is what the umpire is driving and is normally a play ahead, so for a
 * second or two after a run scores the total is right and the inning it
 * belongs to is still a nought. Showing the site's total instead would make the
 * big score in the club's own panel disagree with this one, which is worse.
 *
 * A half-inning that has not been played is a dot rather than a nought - the
 * difference between being held scoreless and still being in the dugout.
 */
function LinescoreBoard({
  away,
  home,
  awayScore,
  homeScore,
  line,
  inning,
  top,
}: {
  away: SideView;
  home: SideView;
  awayScore: number;
  homeScore: number;
  line: Linescore | null;
  inning: number;
  top: boolean;
}) {
  const regulation = line?.regulation ?? 6;
  const columns = Math.max(regulation, line?.away.length ?? 0, line?.home.length ?? 0, inning);
  const frames = Array.from({ length: columns }, (_, index) => index + 1);

  const cell = (runs: number[] | undefined, frame: number) =>
    runs && frame <= runs.length ? runs[frame - 1] : "·";

  const row = (
    side: SideView,
    runs: number[] | undefined,
    score: number,
    hits: number,
    errors: number,
    live: boolean,
  ) => (
    <>
      <div
        className="flex items-center gap-[calc(var(--u)*0.8)] border-l-[calc(var(--u)*0.6)] px-[calc(var(--u)*0.8)]"
        style={{ borderColor: side.color ?? "rgba(255,255,255,0.25)" }}
      >
        {side.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={side.logo} alt="" className="h-[calc(var(--u)*3.6)] w-[calc(var(--u)*3.6)] shrink-0 object-contain" />
        ) : null}
        <span className="truncate text-[length:calc(var(--u)*3)] font-black uppercase tracking-tight">
          {side.abbreviation}
        </span>
      </div>
      {frames.map((frame) => (
        <div
          key={frame}
          className={`flex items-center justify-center text-[length:calc(var(--u)*3)] font-bold tabular-nums ${
            live && frame === inning ? "bg-amber-300/20 text-amber-200" : "text-white/80"
          }`}
        >
          {cell(runs, frame)}
        </div>
      ))}
      <div className="flex items-center justify-center border-l-[calc(var(--u)*0.3)] border-white/20 text-[length:calc(var(--u)*3.6)] font-black tabular-nums">
        {score}
      </div>
      <div className="flex items-center justify-center text-[length:calc(var(--u)*3)] font-bold tabular-nums text-white/70">
        {hits}
      </div>
      <div className="flex items-center justify-center text-[length:calc(var(--u)*3)] font-bold tabular-nums text-white/70">
        {errors}
      </div>
    </>
  );

  return (
    <div
      className="grid min-w-0 flex-1 overflow-hidden rounded-[calc(var(--u)*0.6)] bg-black/50 ring-[calc(var(--u)*0.25)] ring-white/15"
      style={{
        gridTemplateColumns: `minmax(0, 7fr) repeat(${columns}, minmax(0, 2.2fr)) 2.8fr 2.2fr 2.2fr`,
        gridTemplateRows: "auto 1fr 1fr",
      }}
    >
      <div className="bg-white/[0.06]" />
      {frames.map((frame) => (
        <div
          key={frame}
          className={`flex items-center justify-center bg-white/[0.06] py-[calc(var(--u)*0.2)] text-[length:calc(var(--u)*2)] font-bold tabular-nums ${
            frame === inning ? "text-amber-300" : "text-white/45"
          }`}
        >
          {frame}
        </div>
      ))}
      {["R", "H", "E"].map((label) => (
        <div
          key={label}
          className="flex items-center justify-center bg-white/[0.06] py-[calc(var(--u)*0.2)] text-[length:calc(var(--u)*2)] font-black uppercase tracking-widest text-white/45"
        >
          {label}
        </div>
      ))}

      {row(away, line?.away, awayScore, line?.awayHits ?? 0, line?.awayErrors ?? 0, top)}
      {row(home, line?.home, homeScore, line?.homeHits ?? 0, line?.homeErrors ?? 0, !top)}
    </div>
  );
}

/**
 * Balls, strikes and outs, in the order and the words every ballpark uses.
 *
 * Numerals rather than rows of lights: a count drawn as dots is three or four
 * pixels a light on a screen being read from the outfield, and the count is
 * precisely what people are squinting at.
 */
function CountPanel({ balls, strikes, outs }: { balls: number; strikes: number; outs: number }) {
  // Each column is as wide as its own word needs plus a margin, rather than a
  // fixed width: "strike" is half as long again as "ball", and pinning all
  // three to one width ran the labels into each other.
  const column = (label: string, value: number, amber: boolean) => (
    <div className="flex flex-col items-center justify-center px-[calc(var(--u)*1.4)]">
      <span className="whitespace-nowrap text-[length:calc(var(--u)*1.9)] font-bold uppercase tracking-[0.18em] text-white/45">
        {label}
      </span>
      <span
        className={`text-[length:calc(var(--u)*8)] font-black leading-[0.9] tabular-nums ${
          amber ? "text-amber-300" : "text-white"
        }`}
      >
        {value}
      </span>
    </div>
  );

  return (
    <div className="flex shrink-0 items-stretch divide-x-[calc(var(--u)*0.2)] divide-white/10 rounded-[calc(var(--u)*0.6)] bg-black/50 px-[calc(var(--u)*0.6)] ring-[calc(var(--u)*0.25)] ring-white/15">
      {column("Ball", balls, false)}
      {column("Strike", strikes, false)}
      {column("Out", outs, true)}
    </div>
  );
}

/** What the screen shows on a night with no game on it. */
function Idle({ club }: { club: Club }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-[calc(var(--u)*4)] px-[calc(var(--u)*2)]">
      {club.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={club.logo} alt="" className="h-[42vh] object-contain" />
      ) : null}
      {/* The whole screen is free, so the club's name may as well fill it. */}
      <div className="text-center text-[length:calc(var(--u)*13)] font-black uppercase leading-[0.9] tracking-tight">
        {club.name}
      </div>
      <div className="text-[length:calc(var(--u)*4)] font-bold uppercase tracking-[0.35em] text-white/40">
        No game in progress
      </div>
    </main>
  );
}

/**
 * The two halves put together.
 *
 * Where they disagree the plugin wins on anything it owns - it is what the
 * umpire is driving in real time, and it is normally a play ahead of the site.
 * The site wins on everything with a name, because the plugin only knows a
 * three-letter abbreviation from its own config.
 */
function merge(
  initial: Scoreboard | null,
  plugin: PluginState | null,
  club: Club,
  leagueName: string,
  leagueLogo: string | null,
) {
  const connected = plugin !== null;
  const pluginTop = plugin?.top ?? plugin?.inningTopOrBottom;

  // What the server last read off the site beats what this page was rendered
  // with, which is only the first paint. When the server has not managed to
  // reach the site at all, the first paint is still better than nothing.
  const board = plugin?.site ?? (plugin?.siteLive === false ? null : initial);

  const live = board !== null;
  const top = connected && pluginTop !== undefined ? pluginTop : board ? !board.isHomeBatting : true;
  const inning = (connected ? plugin?.inning : undefined) ?? board?.inning ?? 1;

  // The site's runners belong to the half-inning the site thinks is being
  // played. Once the plugin has moved on - the third out was called on the
  // field before it was written down - they are last half's runners, and
  // showing them would put a man on second who is already in the dugout. An
  // empty diamond is the honest answer for the second or two it takes the
  // umpire to record the play.
  const sameHalf =
    !connected || (board !== null && inning === board.inning && top === !board.isHomeBatting);
  const bases = sameHalf ? board?.bases ?? [] : [];

  const battingSide = board ? (top ? board.away : board.home) : null;
  const fieldingSide = board ? (top ? board.home : board.away) : null;
  const batter = battingSide?.nextBatter ?? null;
  const pitcher = fieldingSide?.pitcher ?? null;

  // The next name down the order, wrapping back to the top. Worked out here
  // rather than asked of the site: the order is already on screen, and the site
  // only ever names the man who is up.
  const order = battingSide?.lineup ?? [];
  const at = batter ? order.findIndex((row) => row.playerId === batter.playerId) : -1;
  const onDeck = at >= 0 && order.length > 1 ? order[(at + 1) % order.length].name : null;

  const battingColor =
    safeColor(battingSide?.color) ??
    safeColor(top ? plugin?.awayColor : plugin?.homeColor) ??
    null;

  return {
    live,
    club,
    leagueName,
    // The site's own crest, unless the plugin was deliberately pointed elsewhere.
    leagueLogo: plugin?.leagueLogo || leagueLogo,
    venue: live && board ? `${board.away.name} at ${board.home.name}` : club.name,
    away: sideView(board?.away, plugin?.away, plugin?.awayLogo, plugin?.awayColor),
    home: sideView(board?.home, plugin?.home, plugin?.homeLogo, plugin?.homeColor),
    awayScore: (connected ? plugin?.awayScore : undefined) ?? board?.awayScore ?? 0,
    homeScore: (connected ? plugin?.homeScore : undefined) ?? board?.homeScore ?? 0,
    inning,
    top,
    outs: (connected ? plugin?.outs : undefined) ?? board?.outs ?? 0,
    balls: plugin?.balls ?? 0,
    strikes: plugin?.strikes ?? 0,
    bases,
    battingSide,
    battingColor,
    batter,
    pitcher,
    onDeck,
    linescore: board?.linescore ?? null,
  };
}

type BoardView = ReturnType<typeof merge>;

function sideView(
  side: ScoreboardSide | undefined,
  fallbackName: string | undefined,
  fallbackLogo: string | undefined,
  fallbackColor: string | undefined,
) {
  return {
    name: side?.name ?? "",
    abbreviation: side?.abbreviation ?? fallbackName ?? "",
    logo: side?.logo ?? (fallbackLogo || null),
    color: safeColor(side?.color) ?? safeColor(fallbackColor),
    lineup: side?.lineup ?? [],
    pitcher: side?.pitcher ?? null,
  };
}

type SideView = ReturnType<typeof sideView>;

const KEYFRAMES = `
@keyframes boardEvent {
  0%   { opacity: 0; transform: scale(0.82) rotate(-6deg); }
  8%   { opacity: 1; transform: scale(1.04) rotate(0deg); }
  14%  { transform: scale(1) rotate(0deg); }
  86%  { opacity: 1; transform: scale(1) rotate(0deg); }
  100% { opacity: 0; transform: scale(1.7) rotate(3deg); }
}
`;

declare global {
  interface Window {
    mblJumbotron?: {
      updateState: (state: PluginState) => void;
      playEvent: (event: unknown) => void;
    };
  }
}
