"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type League = { id: number; name: string; slug: string };
type Team = { id: number; name: string; leagueId: number | null };
type Draft = {
  id: number;
  leagueId: number;
  name: string;
  rounds: number;
  mode: "STRAIGHT" | "SNAKE";
  teamIds: number[];
};

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
  const [rounds, setRounds] = useState(String(draft?.rounds ?? 10));
  const [mode, setMode] = useState<"STRAIGHT" | "SNAKE">(draft?.mode ?? "STRAIGHT");
  const [order, setOrder] = useState<number[]>(draft?.teamIds ?? []);
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
          mode,
          teamIds: order,
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

  async function act(path: string, body: object, ask: string) {
    if (!confirm(ask)) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(path, {
        method: "DELETE",
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
            {draft.mode === "SNAKE" ? "Snake" : "Straight"} · {draft.rounds} rounds
          </span>
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

        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Mode
          <select
            className="ui-select font-normal normal-case tracking-normal"
            value={mode}
            onChange={(event) => setMode(event.target.value as "STRAIGHT" | "SNAKE")}
          >
            <option value="STRAIGHT">Straight — same order every round</option>
            <option value="SNAKE">Snake — order turns round each round</option>
          </select>
        </label>
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
          disabled={busy || !name.trim() || order.length < 2}
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
      {order.length < 2 && (
        <p className="text-xs text-amber-400">A draft needs at least two clubs in the order.</p>
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
