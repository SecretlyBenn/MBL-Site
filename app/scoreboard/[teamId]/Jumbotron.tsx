"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Scoreboard, ScoreboardSide } from "@/db/scoreboard";

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

export function Jumbotron({
  initial,
  club,
  leagueName,
  preview,
}: {
  initial: Scoreboard | null;
  club: Club;
  leagueName: string;
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

  const view = useMemo(() => merge(board, plugin, club, leagueName), [board, plugin, club, leagueName]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-950 font-sans text-white select-none">
      <style>{KEYFRAMES}</style>

      <header className="flex h-[7vh] items-center justify-between px-[2vw]">
        <div className="flex items-center gap-[1vw]">
          {view.leagueLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={view.leagueLogo} alt="" className="h-[5vh] object-contain" />
          ) : null}
          <span className="text-[1.6vw] font-black uppercase tracking-[0.25em] text-slate-400">
            {view.leagueName}
          </span>
        </div>
        <span className="text-[1.4vw] font-bold uppercase tracking-[0.2em] text-slate-500">
          {view.venue}
        </span>
      </header>

      {view.live ? (
        <>
          <main className="flex h-[58vh] items-stretch gap-[1.5vw] px-[2vw]">
            <TeamPanel side={view.away} score={view.awayScore} batting={view.top} label="Away" />

            <section className="flex w-[30vw] shrink-0 flex-col items-center justify-center gap-[2vh] rounded-[1vw] border-2 border-slate-800 bg-slate-900/60 px-[1vw]">
              <div className="text-[4.5vw] font-black leading-none tracking-tight">
                <span className="text-slate-400">{view.top ? "TOP" : "BOT"}</span>{" "}
                <span>{view.inning}</span>
              </div>

              <Diamond bases={view.bases} tint={view.battingColor} />

              <div className="flex items-end gap-[2.4vw]">
                <Counter label="B" value={view.balls} />
                <Counter label="S" value={view.strikes} />
                <Counter label="O" value={view.outs} amber />
              </div>
            </section>

            <TeamPanel side={view.home} score={view.homeScore} batting={!view.top} label="Home" />
          </main>

          <section className="flex h-[13vh] items-center justify-between gap-[2vw] px-[2vw]">
            <Role title="At bat" name={view.batter?.name} detail={view.batterDetail} />
            <Role title="Pitching" name={view.pitcher?.name} detail={view.pitcherDetail} />
          </section>

          <section className="flex h-[19vh] flex-col justify-center gap-[1vh] border-t-2 border-slate-800 px-[2vw]">
            <div className="text-[1.2vw] font-black uppercase tracking-[0.25em] text-slate-500">
              {view.battingSide?.name ?? ""} batting
            </div>
            <ol className="flex items-stretch gap-[0.6vw]">
              {(view.battingSide?.lineup ?? []).map((row) => (
                <li
                  key={row.playerId}
                  className={`flex-1 rounded-[0.4vw] px-[0.6vw] py-[0.8vh] ${
                    row.playerId === view.batter?.playerId
                      ? "bg-white text-slate-950"
                      : "bg-slate-900/70 text-slate-300"
                  }`}
                >
                  <div className="text-[1.05vw] font-black uppercase tracking-wider opacity-60">
                    {row.slot} {row.position}
                  </div>
                  <div className="truncate text-[1.45vw] font-bold">{row.name}</div>
                </li>
              ))}
            </ol>
          </section>
        </>
      ) : (
        <Idle club={view.club} />
      )}

      {event ? (
        <div
          key={event.id}
          className="absolute inset-0 flex flex-col items-center justify-center gap-[3vh] bg-slate-950/85"
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
            className="text-center text-[8vw] font-black uppercase leading-none tracking-tight"
            style={{ color: view.battingColor ?? "#ffffff", textShadow: "0 0 3vw rgba(0,0,0,0.9)" }}
          >
            {event.label}
          </div>
        </div>
      ) : null}

      {preview ? (
        <div className="absolute bottom-[1vh] right-[1vw] rounded bg-slate-800/80 px-[0.8vw] py-[0.4vh] text-[0.9vw] font-bold uppercase tracking-widest text-slate-400">
          Preview · {plugin ? "plugin connected" : "no plugin"}
        </div>
      ) : null}
    </div>
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

  const battingColor =
    safeColor(battingSide?.color) ??
    safeColor(top ? plugin?.awayColor : plugin?.homeColor) ??
    null;

  return {
    live,
    club,
    leagueName,
    leagueLogo: plugin?.leagueLogo || null,
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
    batterDetail: batter ? `#${batter.slot ?? ""} ${battingSide?.abbreviation ?? ""}`.trim() : "",
    pitcherDetail: fieldingSide?.abbreviation ?? "",
  };
}

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
  };
}

function TeamPanel({
  side,
  score,
  batting,
  label,
}: {
  side: ReturnType<typeof sideView>;
  score: number;
  batting: boolean;
  label: string;
}) {
  const tint = side.color;
  return (
    <section
      className={`flex flex-1 flex-col items-center justify-center gap-[1.5vh] rounded-[1vw] border-2 px-[1vw] ${
        batting ? "border-white/70" : "border-slate-800"
      }`}
      style={
        tint
          ? { background: `linear-gradient(160deg, ${tint}, ${tint}44)` }
          : { background: "rgb(15 23 42 / 0.6)" }
      }
    >
      <div className="flex items-center gap-[1vw]">
        {side.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={side.logo} alt="" className="h-[14vh] object-contain drop-shadow-lg" />
        ) : null}
        <div className="text-left">
          <div className="text-[1vw] font-black uppercase tracking-[0.3em] text-white/50">{label}</div>
          <div className="text-[3.6vw] font-black uppercase leading-none tracking-tight">
            {side.abbreviation}
          </div>
        </div>
      </div>
      <div className="text-[11vw] font-black leading-[0.8] tabular-nums tracking-tighter">{score}</div>
    </section>
  );
}

/**
 * Bases as the scoreboard draws them: three diamonds, lit when occupied.
 *
 * Laid out as rows rather than by absolute position. Three squares each placed
 * at fifty percent of a box overlap once they are rotated, and second and third
 * ran into each other as one shape - which reads as a runner on a base that
 * does not exist.
 */
function Diamond({
  bases,
  tint,
}: {
  bases: { base: string; name: string }[];
  tint: string | null;
}) {
  const lit = tint ?? "#ffffff";
  const base = (which: string) => {
    const on = bases.some((runner) => runner.base === which);
    return (
      <span
        className="h-[5.2vh] w-[5.2vh] rotate-45 border-[0.4vh]"
        style={
          on
            ? { background: lit, borderColor: "#ffffff" }
            : { background: "transparent", borderColor: "rgb(71 85 105)" }
        }
      />
    );
  };

  return (
    <div className="flex w-[20vh] flex-col items-center gap-[1.4vh]">
      {base("second")}
      <div className="flex w-full items-center justify-between">
        {base("third")}
        {base("first")}
      </div>
    </div>
  );
}

/**
 * One number of the count, as a numeral rather than a row of lights.
 *
 * A ball-strike count drawn as dots is three or four pixels a light on a screen
 * being read from the outfield. The numeral is the thing people are squinting
 * at, so it gets the size.
 */
function Counter({ label, value, amber = false }: { label: string; value: number; amber?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div className="text-[1.3vw] font-black uppercase tracking-[0.3em] text-slate-500">{label}</div>
      <div
        className={`text-[4.2vw] font-black leading-none tabular-nums ${
          amber ? "text-amber-400" : "text-white"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function Role({ title, name, detail }: { title: string; name?: string; detail?: string }) {
  return (
    <div className="flex flex-1 items-baseline gap-[1.2vw] overflow-hidden">
      <span className="shrink-0 text-[1.2vw] font-black uppercase tracking-[0.25em] text-slate-500">
        {title}
      </span>
      <span className="truncate text-[2.8vw] font-black leading-none">{name ?? "—"}</span>
      {detail ? (
        <span className="shrink-0 text-[1.3vw] font-bold uppercase tracking-widest text-slate-500">
          {detail}
        </span>
      ) : null}
    </div>
  );
}

/** What the screen shows on a night with no game on it. */
function Idle({ club }: { club: Club }) {
  return (
    <main className="flex h-[93vh] flex-col items-center justify-center gap-[4vh]">
      {club.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={club.logo} alt="" className="h-[36vh] object-contain opacity-90" />
      ) : null}
      <div className="text-[5vw] font-black uppercase leading-none tracking-tight">{club.name}</div>
      <div className="text-[1.8vw] font-bold uppercase tracking-[0.35em] text-slate-500">
        No game in progress
      </div>
    </main>
  );
}

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
