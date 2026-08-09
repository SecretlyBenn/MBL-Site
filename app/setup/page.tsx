"use client";

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
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-bold">First-time setup</h1>
      <p className="text-gray-500">
        No league accounts exist yet. If this is the first time this site is
        being set up, sign in with Discord above, then claim the admin role
        below. This only works once - it does nothing if any account already
        exists.
      </p>
      <button
        type="button"
        onClick={claimAdmin}
        disabled={status === "working" || status === "done"}
        className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {status === "working" ? "Setting up..." : "Claim admin role"}
      </button>
      {message && (
        <p className={status === "error" ? "text-red-600" : "text-green-600"}>{message}</p>
      )}
      {status === "done" && (
        <a href="/admin" className="text-blue-600 hover:underline">
          Go to admin page
        </a>
      )}
    </main>
  );
}
