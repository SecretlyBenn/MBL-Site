"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * The pieces every admin form is built from, so the admin pages look like the
 * rest of the site and behave the same way: a request is sent, the button says
 * so, an error is shown in red and announced, and the page refreshes on
 * success.
 */

export function useRequest() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send<T = Record<string, unknown>>(
    method: "POST" | "PATCH" | "DELETE",
    url: string,
    body?: unknown,
  ): Promise<T | null> {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(url, {
        method,
        headers: body === undefined ? undefined : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const data = (await response.json().catch(() => ({}))) as T & { error?: string };
      if (!response.ok) throw new Error(data.error ?? `Request failed (${response.status})`);
      router.refresh();
      return data;
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Unexpected error");
      return null;
    } finally {
      setBusy(false);
    }
  }

  return { send, busy, error, setError };
}

/** A boxed form with a heading and a line saying what it is for. */
export function FormCard({
  title,
  help,
  children,
  onSubmit,
}: {
  title: string;
  help?: React.ReactNode;
  children: React.ReactNode;
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.(event);
      }}
      className="ui-card flex flex-col gap-2.5 p-4"
    >
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">{title}</h3>
      {help && <p className="text-xs leading-relaxed text-slate-400">{help}</p>}
      {children}
    </form>
  );
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  return children ? (
    <p role="alert" className="text-xs text-rose-400">
      {children}
    </p>
  ) : null;
}

export function DoneText({ children }: { children: React.ReactNode }) {
  return children ? (
    <p role="status" className="text-xs text-emerald-400">
      {children}
    </p>
  ) : null;
}

/** A delete button that asks first and reports why it could not delete. */
export function DeleteButton({
  url,
  confirmText,
  label = "Delete",
}: {
  url: string;
  confirmText: string;
  label?: string;
}) {
  const { send, busy, error } = useRequest();
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          if (confirm(confirmText)) void send("DELETE", url);
        }}
        className="ui-button-danger"
      >
        {busy ? "…" : label}
      </button>
      {error && (
        <span role="alert" className="max-w-xs text-right text-[11px] text-rose-400">
          {error}
        </span>
      )}
    </span>
  );
}

export type Option = { id: number; name: string };
