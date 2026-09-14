"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SetupPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function claimAdmin() {
    setStatus("working");
    try {
      const response = await fetch("/api/bootstrap", { method: "POST" });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        user?: { displayName: string };
      };
      if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status})`);
      setStatus("done");
      setMessage(`You're set up as league admin (${body.user?.displayName}).`);
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unexpected error");
    }
  }

  return (
    <div className="ui-card mx-auto flex max-w-lg flex-col gap-4 p-6">
      <p className="text-sm leading-relaxed text-slate-300">
        No league accounts exist yet. If this is the first time the site is being set up, sign in
        with Discord using the button at the top of the page, then claim the admin role below.
      </p>
      <p className="text-xs text-slate-500">
        This only works once - it does nothing if any account already exists.
      </p>
      <button
        type="button"
        onClick={claimAdmin}
        disabled={status === "working" || status === "done"}
        className="ui-button-primary self-start"
      >
        {status === "working" ? "Setting up…" : "Claim admin role"}
      </button>
      {message && (
        <p
          role={status === "error" ? "alert" : "status"}
          className={`text-sm ${status === "error" ? "text-rose-400" : "text-emerald-400"}`}
        >
          {message}
        </p>
      )}
      {status === "done" && (
        <Link href="/admin" className="ui-link self-start text-sm">
          Go to the admin page →
        </Link>
      )}
    </div>
  );
}
