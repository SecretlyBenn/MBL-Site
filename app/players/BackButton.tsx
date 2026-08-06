"use client";

import { useRouter } from "next/navigation";

export function BackButton() {
  const router = useRouter();
  return <button type="button" onClick={() => router.back()} className="text-sm text-slate-400 hover:text-white">← Go back</button>;
}
