"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Starts an article.
 *
 * Only a headline to begin with: the piece is created as a draft and opens in
 * the editor, so writing starts one click after the idea.
 */
export function NewArticleForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        article?: { id: number };
      };
      if (!response.ok || !data.article) {
        throw new Error(data.error ?? `Request failed (${response.status})`);
      }
      router.push(`/newsroom/${data.article.id}`);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={create} className="ui-card flex flex-col gap-2.5 p-4">
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">Start an article</h3>
      <p className="text-xs leading-relaxed text-slate-400">
        A headline to begin with. It can be changed at any time, and nothing is public until you
        publish it.
      </p>
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        maxLength={140}
        placeholder="Knights take the series in four"
        className="ui-input w-full"
        required
      />
      <button type="submit" disabled={busy || !title.trim()} className="ui-button-primary self-start">
        {busy ? "Starting…" : "Start writing"}
      </button>
      {error && (
        <p role="alert" className="text-xs text-rose-400">
          {error}
        </p>
      )}
    </form>
  );
}
