"use client";

import { useRouter } from "next/navigation";

export function BackButton() {
  const router = useRouter();
  return (
    <button type="button" onClick={() => router.back()} className="ui-button">
      <span aria-hidden="true">←</span> Go back
    </button>
  );
}
