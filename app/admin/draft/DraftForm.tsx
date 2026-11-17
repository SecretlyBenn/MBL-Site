"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type League = { id: number; name: string; slug: string; abbreviation: string; isTournament: boolean };
type Team = { id: number; name: string; leagueId: number | null };
type Draft = {
  id: number;
  leagueId: number;
  name: string;
  rounds: number;
  teamIds: number[];
  pickSeconds: number | null;
  startedAt: string | null;
  signupsOpen: boolean;
  poolSource: "ALL" | "SIGNUPS";
  /** What each round does differently: whose players, and which way round. */
  rounds_: Rule[];
  /** Whether its picks exist yet. A draft can be made before they do. */
  laidOut: boolean;
};

type Rule = { round: number; leagueIds: number[]; reversed: boolean };

/**
 * A draft's shape: which competition, how many rounds, straight or a snake,
 * and the clubs in the order they pick.
 *
 * The same form sets one up and changes one that is already running, because
 * they are the same four questions and a draft often needs the order corrected
 * once it has started - somebody is missing, or two clubs are the wrong way
 * round. Changing it leaves the picks already made alone and lays the rest out
 * again.
 *
 * The order is a list with arrows rather than a drag, which works on a phone
 * and on a keyboard without anything being imported to do it.
 */
export function DraftForm({
  leagues,
  teams,
  draft,
  status,
  lastPick,
  boardHref,
}: {
  leagues: League[];
  teams: Team[];
  draft?: Draft;
  status?: string;
  lastPick?: string | null;
  boardHref?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(!draft);
  const [leagueId, setLeagueId] = useState<number>(draft?.leagueId ?? leagues[0]?.id ?? 0);
  const [name, setName] = useState(draft?.name ?? "");
  // Blank on a new draft, because how many rounds it runs usually depends on
  // how many people sign up - the draft gets made and opened first, and this
  // is filled in once the league knows what it is working with.
  const [rounds, setRounds] = useState(draft?.rounds ? String(draft.rounds) : "");
  const [order, setOrder] = useState<number[]>(draft?.teamIds ?? []);
  // Minutes on screen, seconds in the database: nobody sets a pick clock in
  // seconds, and nobody wants to read one in minutes-and-a-bit.
  const [clockMinutes, setClockMinutes] = useState(
    draft?.pickSeconds ? String(Math.round(draft.pickSeconds / 60)) : "",
  );
  const [poolSource, setPoolSource] = useState<"ALL" | "SIGNUPS">(draft?.poolSource ?? "ALL");
  const [signupsOpen, setSignupsOpen] = useState(draft?.signupsOpen ?? false);
  const [rules, setRules] = useState<Map<number, Rule>>(
    () => new Map((draft?.rounds_ ?? []).map((rule) => [rule.round, rule])),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const clubs = teams.filter((team) => team.leagueId === leagueId);
  const nameOf = (id: number) => teams.find((team) => team.id === id)?.name ?? `Club ${id}`;
  // Whoever is in the order, in it; then the rest of the competition's clubs,
  // unticked. Changing competition empties the order, because the clubs it
  // named belong to the other one.
  const out = clubs.filter((club) => !order.includes(club.id));

  function chooseLeague(id: number) {
    setLeagueId(id);
    setOrder([]);
  }

  // Half a shape is a mistake rather than a stage: rounds with no clubs, or
  // clubs with no rounds, is somebody who meant to give both.
  const half = (Number(rounds) > 0) !== (order.length > 0);

  const everyRound = Array.from({ length: Math.min(Number(rounds) || 0, 40) }, (_, i) => i + 1);

  /** Changes one thing about one round, leaving the rest of it alone. */
  function setRule(round: number, change: Partial<Rule>) {
    const next = new Map(rules);
    const now = next.get(round) ?? { round, leagueIds: [], reversed: false };
    const merged = { ...now, ...change };
    // A round doing nothing differently keeps no row: it runs the order as
    // entered and takes anybody, which is what no row means.
    if (merged.leagueIds.length === 0 && !merged.reversed) next.delete(round);
    else next.set(round, merged);
    setRules(next);
  }

  /** Adds or removes one competition from a round, leaving the rest alone. */
  function toggleRoundLeague(round: number, leagueId: number) {
    const held = rules.get(round)?.leagueIds ?? [];
    setRule(round, {
      leagueIds: held.includes(leagueId)
        ? held.filter((id) => id !== leagueId)
        : [...held, leagueId],
    });
  }

  function move(index: number, by: number) {
    const next = [...order];
    const to = index + by;
    if (to < 0 || to >= next.length) return;
    [next[index], next[to]] = [next[to], next[index]];
    setOrder(next);
  }

  async function send(method: "POST" | "PATCH") {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/drafts", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: draft?.id,
          leagueId,
          name,
          rounds: Number(rounds),
          teamIds: order,
          pickSeconds: clockMinutes.trim() === "" ? null : Math.round(Number(clockMinutes) * 60),
          poolSource,
          signupsOpen,
          rounds_: [...rules.values()],
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status})`);
      if (!draft) {
        setName("");
        setOrder([]);
      } else {
        setOpen(false);
      }
      router.refresh();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Unexpected error");
    } finally {
      setBusy(false);
    }
  }

  async function act(path: string, body: object, ask: string, method: "POST" | "DELETE" = "DELETE") {
    if (!confirm(ask)) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const answer = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(answer.error ?? `Request failed (${response.status})`);
      router.refresh();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Unexpected error");
    } finally {
      setBusy(false);
    }
  }

  // A draft that is not being edited says where it has got to and offers the
  // two things anybody needs mid-draft: the board, and taking a pick back.
  if (draft && !open) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="min-w-[10rem] flex-1 text-sm font-semibold text-slate-100">{draft.name}</span>
          <span className="text-xs text-slate-400">{status}</span>
          <span className="text-xs text-slate-500">
            {draft.rounds} rounds
            {draft.pickSeconds ? ` · ${Math.round(draft.pickSeconds / 60)} min a pick` : " · no clock"}
            {draft.poolSource === "SIGNUPS" ? " · sign-ups only" : ""}
            {draft.signupsOpen ? " · sign-ups open" : ""}
          </span>
          {!draft.laidOut ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="ui-button-primary !px-3 !py-1 text-xs"
            >
              Set the rounds and order
            </button>
          ) : !draft.startedAt ? (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                act(
                  "/api/drafts/start",
                  { id: draft.id },
                  "Start the draft? Clubs can pick from now, sign-ups close, and the first pick's clock starts.",
                  "POST",
                )
              }
              className="ui-button-primary !px-3 !py-1 text-xs"
            >
              Start the draft
            </button>
          ) : (
            <span className="rounded-md border border-emerald-800/60 bg-emerald-950/30 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
              Running
            </span>
          )}
          {boardHref && (
            <Link href={boardHref} className="ui-button !px-3 !py-1 text-xs">
              Board
            </Link>
          )}
          <button type="button" onClick={() => setOpen(true)} className="ui-button !px-3 !py-1 text-xs">
            Edit
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              act(
                "/api/drafts/pick",
                { draftId: draft.id },
                "Take the last pick back? The player comes off the club that took him.",
              )
            }
            className="ui-button-danger !px-3 !py-1 text-xs"
          >
            Undo last pick
          </button>
        </div>
        {lastPick && <p className="text-xs text-slate-500">Last pick: {lastPick}</p>}
        {error && <p role="alert" className="text-xs text-rose-400">{error}</p>}
      </div>
    );
  }

  return (
    <div className="ui-card flex flex-col gap-3 p-4">
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Competition
          <select
            className="ui-select font-normal normal-case tracking-normal"
            value={leagueId}
            onChange={(event) => chooseLeague(Number(event.target.value))}
            disabled={Boolean(draft)}
          >
            {leagues.map((league) => (
              <option key={league.id} value={league.id}>
                {league.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Name
          <input
            className="ui-input font-normal normal-case tracking-normal"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Off-season draft"
            maxLength={80}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Rounds
          <input
            type="number"
            min={1}
            max={40}
            className="ui-input w-24 font-normal normal-case tracking-normal"
            value={rounds}
            onChange={(event) => setRounds(event.target.value)}
          />
        </label>

      </div>

      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Minutes a pick
          <input
            type="number"
            min={1}
            max={60}
            placeholder="none"
            className="ui-input w-28 font-normal normal-case tracking-normal"
            value={clockMinutes}
            onChange={(event) => setClockMinutes(event.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Pool
          <select
            className="ui-select font-normal normal-case tracking-normal"
            value={poolSource}
            onChange={(event) => setPoolSource(event.target.value as "ALL" | "SIGNUPS")}
          >
            <option value="ALL">Everybody the competition can draft</option>
            <option value="SIGNUPS">Only the players who signed up</option>
          </select>
        </label>

        <label className="flex items-end gap-2 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <input
            type="checkbox"
            checked={signupsOpen}
            onChange={(event) => setSignupsOpen(event.target.checked)}
            className="h-4 w-4 accent-sky-500"
          />
          Sign-ups open
        </label>
      </div>

      {/* Each round says what it does: which way round it runs, and whose
          players it may take. Nothing sits above them - there is no
          straight-or-snake setting any more, because a snake is only rounds
          2, 4, 6 reversed and this league's pattern is neither. One place
          decides the order, so there is nothing for a second one to disagree
          with. */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Each round
        </span>

        {everyRound.length === 0 ? (
          <p className="text-xs text-slate-500">
            Set how many rounds it runs and each one appears here.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {everyRound.map((round) => {
              const rule = rules.get(round);
              return (
                <li
                  key={round}
                  className="flex items-center gap-1.5 rounded-md border border-slate-800 bg-slate-900/60 px-2 py-1 text-xs"
                >
                  <span className="w-7 font-bold text-slate-500">R{round}</span>
                  <select
                    aria-label={`Direction for round ${round}`}
                    className="bg-transparent text-xs text-slate-200 outline-none"
                    value={rule?.reversed ? "R" : "F"}
                    onChange={(event) => setRule(round, { reversed: event.target.value === "R" })}
                  >
                    <option value="F">1 &rarr; {order.length || "n"}</option>
                    <option value="R">{order.length || "n"} &rarr; 1</option>
                  </select>
                  {/* Chips rather than a picker, because a round can take more
                      than one competition's players - both is an ordinary
                      answer and a picker can only ever say one. None ticked
                      takes anybody in the pool. The off-season tournament owns
                      no players, so it is not offered. */}
                  <span className="flex items-center gap-1">
                    {leagues
                      .filter((option) => !option.isTournament)
                      .map((option) => {
                        const on = rule?.leagueIds.includes(option.id) ?? false;
                        return (
                          <label
                            key={option.id}
                            title={`${option.name} players in round ${round}`}
                            className={`cursor-pointer select-none rounded px-1.5 py-0.5 text-[11px] font-bold transition-colors ${
                              on ? "bg-sky-600/30 text-sky-200" : "text-slate-600 hover:text-slate-400"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={on}
                              onChange={() => toggleRoundLeague(round, option.id)}
                              className="sr-only"
                            />
                            {option.abbreviation}
                          </label>
                        );
                      })}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>


      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Order ({order.length} {order.length === 1 ? "club" : "clubs"})
        </span>
        {order.length === 0 ? (
          <p className="text-xs text-slate-500">Add clubs below, in the order they pick.</p>
        ) : (
          <ol className="flex flex-col gap-1">
            {order.map((id, index) => (
              <li
                key={id}
                className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900/60 px-3 py-1.5"
              >
                <span className="w-6 text-xs font-bold text-slate-500">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-slate-200">{nameOf(id)}</span>
                <button
                  type="button"
                  aria-label={`Move ${nameOf(id)} up`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  className="ui-button !px-2 !py-0.5 text-xs disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Move ${nameOf(id)} down`}
                  disabled={index === order.length - 1}
                  onClick={() => move(index, 1)}
                  className="ui-button !px-2 !py-0.5 text-xs disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label={`Take ${nameOf(id)} out of the order`}
                  onClick={() => setOrder(order.filter((other) => other !== id))}
                  className="ui-button !px-2 !py-0.5 text-xs"
                >
                  ✕
                </button>
              </li>
            ))}
          </ol>
        )}

        {out.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {out.map((club) => (
              <button
                key={club.id}
                type="button"
                onClick={() => setOrder([...order, club.id])}
                className="rounded-md border border-slate-700 px-2 py-1 text-xs font-semibold text-slate-400 transition-colors hover:border-sky-600 hover:text-sky-300"
              >
                + {club.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy || !name.trim() || (order.length > 0 && order.length < 2) || half}
          onClick={() => send(draft ? "PATCH" : "POST")}
          className="ui-button-primary"
        >
          {busy ? "Saving…" : draft ? "Save changes" : "Set up the draft"}
        </button>
        {draft && (
          <>
            <button type="button" onClick={() => setOpen(false)} disabled={busy} className="ui-button">
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                act(
                  "/api/drafts",
                  { id: draft.id },
                  "Delete this draft and its picks? The players already drafted stay on the clubs that took them.",
                )
              }
              className="ui-button-danger ml-auto"
            >
              Delete draft
            </button>
          </>
        )}
      </div>

      {/* Said rather than left to a greyed-out button. */}
      {half && (
        <p className="text-xs text-amber-400">
          Give both the rounds and the order, or neither. Neither makes a draft that only
          collects sign-ups, which you can arrange once you know who has put their name down.
        </p>
      )}
      {!half && order.length === 0 && (
        <p className="text-xs text-slate-400">
          No rounds and no order yet: this will be a draft that collects sign-ups, and you can
          set it up once you know how many people are in.
        </p>
      )}
      {draft && (
        <p className="text-xs text-slate-500">
          Changing any of this leaves the picks already made alone and lays the rest out again.
        </p>
      )}
      {error && <p role="alert" className="text-xs text-rose-400">{error}</p>}
    </div>
  );
}
