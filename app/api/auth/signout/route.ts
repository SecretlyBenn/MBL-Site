import { clearedSessionCookie } from "@/app/session";

export async function POST() {
  return new Response(null, {
    status: 302,
    headers: { Location: "/", "Set-Cookie": clearedSessionCookie },
  });
}
