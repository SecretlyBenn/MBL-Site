import { PlayerHead } from "@/app/PlayerHead";

/**
 * A draft board.
 *
 * Laid out as a grid of rounds rather than one long column, because a draft of
 * any length is a few hundred picks and a list that tall is a thing nobody
 * reads - the question somebody opens this page with is "who went where", and
 * a grid answers it at a glance where a column makes them scroll for it.
 *
 * Every pick carries its club's colour down one edge, so a club's night can be
 * followed down the board without reading a single name.
 */

export type Pick = {
  id: number;
  overall: number;
  round: number;
  teamId: number;
  teamName: string;
  teamAbbreviation: string;
  teamColor: string | null;
  playerId: number | null;
  playerName: string | null;
};

/** A club's crest, resolved on the server so a board is not a hundred islands. */
export function Crest({ src, name, className }: { src?: string; name: string; className: string }) {
  if (!src) {
    return (
      <span
        aria-hidden
        className={`${className} shrink-0 rounded-sm bg-slate-800`}
        title={name}
      />
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" title={name} className={`${className} shrink-0 object-contain`} />;
}

/** One pick: who had it, and who they took. */
function PickCard({
  pick,
  crest,
  onClock,
}: {
  pick: Pick;
  crest?: string;
  onClock: boolean;
}) {
  const colour = pick.teamColor ?? "#475569";
  return (
    <li
      // The colour is the club's own, so it cannot be a utility class.
      style={{ borderLeftColor: colour }}
      className={`flex min-w-0 flex-col gap-1.5 rounded-r-lg border-l-4 px-3 py-2 ${
        onClock
          ? "bg-sky-950/60 ring-1 ring-inset ring-sky-500/60"
          : pick.playerName
            ? "bg-slate-900/60"
            : "bg-slate-900/25"
      }`}
    >
      <span className="flex items-center gap-1.5">
        <span className="font-mono text-[11px] font-bold text-slate-500">{pick.overall}</span>
        <Crest src={crest} name={pick.teamName} className="h-4 w-4" />
        <span
          title={pick.teamName}
          className="min-w-0 flex-1 truncate text-[11px] font-bold uppercase tracking-wider text-slate-400"
        >
          {pick.teamAbbreviation}
        </span>
      </span>

      {pick.playerName ? (
        <span className="flex min-w-0 items-center gap-2">
          <PlayerHead name={pick.playerName} size={22} />
          <span className="min-w-0 truncate text-sm font-bold text-slate-100">{pick.playerName}</span>
        </span>
      ) : (
        <span className="flex h-[22px] items-center text-xs font-semibold text-slate-600">
          {onClock ? <span className="text-sky-300">On the clock</span> : "—"}
        </span>
      )}
    </li>
  );
}

export function Board({
  board,
  crests,
  clockOverall,
}: {
  board: Pick[];
  crests: Map<number, string>;
  clockOverall?: number;
}) {
  const rounds = [...new Set(board.map((pick) => pick.round))].sort((a, b) => a - b);

  return (
    <div className="flex flex-col gap-5">
      {rounds.map((round) => {
        const picks = board.filter((pick) => pick.round === round);
        const made = picks.filter((pick) => pick.playerName).length;
        return (
          <section key={round}>
            <div className="mb-2 flex items-center gap-3">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-300">
                Round {round}
              </h2>
              <span className="h-px flex-1 bg-slate-800" />
              <span className="text-[11px] font-semibold text-slate-500">
                {made} of {picks.length}
              </span>
            </div>
            <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {picks.map((pick) => (
                <PickCard
                  key={pick.id}
                  pick={pick}
                  crest={crests.get(pick.teamId)}
                  onClock={pick.overall === clockOverall}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
