"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * The part of an article readers take part in: the like, and the comments.
 *
 * Signing in with Discord is what it takes to join in. A signed-out reader
 * sees the count and the conversation, and a line telling them how to join it,
 * rather than buttons that would only turn them away.
 */

type Comment = {
  id: number;
  discordId: string;
  displayName: string;
  body: string;
  createdAt: string;
};

function when(value: string) {
  const date = new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function Reactions({
  articleId,
  likes,
  comments,
  signedIn,
  me,
  isAdmin,
}: {
  articleId: number;
  likes: { total: number; liked: boolean };
  comments: Comment[];
  signedIn: boolean;
  me: string | null;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(likes.liked);
  const [total, setTotal] = useState(likes.total);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send(url: string, method: "POST" | "DELETE", body: unknown) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string } & Record<string, unknown>;
      if (!response.ok) throw new Error(data.error ?? `Request failed (${response.status})`);
      return data;
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Something went wrong.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function like() {
    // The count moves as soon as it is pressed and is put back if the request
    // fails, so the button never feels slower than the click.
    const before = { liked, total };
    setLiked(!liked);
    setTotal(total + (liked ? -1 : 1));
    const data = await send("/api/news/likes", "POST", { articleId });
    if (!data) {
      setLiked(before.liked);
      setTotal(before.total);
    } else {
      setLiked(Boolean(data.liked));
      setTotal(Number(data.total));
    }
  }

  async function comment(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.trim()) return;
    if (await send("/api/news/comments", "POST", { articleId, body: draft })) {
      setDraft("");
      router.refresh();
    }
  }

  async function hide(id: number) {
    if (!confirm("Remove this comment?")) return;
    if (await send("/api/news/comments", "DELETE", { id })) router.refresh();
  }

  return (
    <section className="mt-10 border-t border-slate-800 pt-6">
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={signedIn ? like : undefined}
          disabled={busy || !signedIn}
          aria-pressed={liked}
          title={signedIn ? undefined : "Sign in with Discord to like this"}
          className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
            liked
              ? "border-rose-500/50 bg-rose-500/15 text-rose-300"
              : "border-slate-700 text-slate-300 hover:border-slate-600 hover:text-white"
          } ${signedIn ? "" : "cursor-default opacity-70"}`}
        >
          <span aria-hidden>{liked ? "♥" : "♡"}</span>
          {total} {total === 1 ? "like" : "likes"}
        </button>
        <span className="text-sm text-slate-500">
          {comments.length} {comments.length === 1 ? "comment" : "comments"}
        </span>
      </div>

      {signedIn ? (
        <form onSubmit={comment} className="mt-5 flex flex-col gap-2">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Say something about this piece…"
            className="ui-input w-full resize-y"
          />
          <button type="submit" disabled={busy || !draft.trim()} className="ui-button-primary self-start">
            {busy ? "Posting…" : "Post comment"}
          </button>
        </form>
      ) : (
        <p className="mt-5 text-sm text-slate-400">
          <a href="/api/auth/discord?returnTo=%2Fnews" className="ui-link font-semibold">
            Sign in with Discord
          </a>{" "}
          to like this article or leave a comment.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-rose-400">
          {error}
        </p>
      )}

      <ul className="mt-6 flex flex-col gap-3">
        {comments.map((row) => (
          <li key={row.id} className="rounded-lg border border-slate-800/80 bg-slate-900/40 px-4 py-3">
            <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
              <span className="font-semibold text-slate-200">{row.displayName}</span>
              <span className="text-xs text-slate-500">{when(row.createdAt)}</span>
              {(isAdmin || row.discordId === me) && (
                <button
                  type="button"
                  onClick={() => hide(row.id)}
                  disabled={busy}
                  className="ml-auto text-xs text-slate-500 hover:text-rose-400"
                >
                  Remove
                </button>
              )}
            </p>
            {/* Whitespace is kept so a comment reads the way it was typed, and
                it stays text - nothing here is ever treated as markup. */}
            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-300">{row.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
