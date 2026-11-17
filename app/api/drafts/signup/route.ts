import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { logAudit } from "@/db/audit";
import { draftSignups, drafts, leagues, players } from "@/db/schema";
import { POSITIONS } from "@/app/scoring";
import { apiError } from "@/app/api-errors";
import { getSession } from "@/app/session";
import { getLeagueUser, hasRole } from "@/app/roles";
import { rateLimit } from "@/db/rate-limit";

/**
 * Putting your name down for a draft.
 *
 * This is the one thing on the site a player does for themselves, so it asks
 * for a Discord account and nothing else - no league role, no row in `users`.
 * Being signed in is what stops the form being filled in a thousand times by
 * nobody.
 *
 * It cannot tell who you are on its own. The site has no Discord id for a
 * player: the only thing it and the roster bot have ever shared is the name in
 * game. So the sign-up asks for that name, matches it if it can, and records
 * it unmatched if it cannot rather than creating a player - a typo would
 * otherwise open a second career for somebody who already has one, which is
 * the mistake the archive is hardest to undo.
 */

const MAX_NAME = 40;

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Sign in with Discord first." }, { status: 401 });

    // Per account rather than per address: a house with four players in it
    // shares an address, and signing up is once each anyway.
    const verdict = await rateLimit(`signup:${session.discordId}`, { limit: 20, windowSeconds: 300 });
    if (!verdict.ok) {
      return Response.json({ error: "That is happening too often. Wait a moment." }, { status: 429 });
    }

    const { draftId, name, leagueId, positions } = (await request.json()) as {
      draftId: number;
      name: string;
      leagueId?: number;
      positions?: string[];
    };
    if (!Number.isInteger(draftId)) {
      return Response.json({ error: "Which draft?" }, { status: 400 });
    }
    const typedName = name?.trim();
    if (!typedName) return Response.json({ error: "Give the name you play under." }, { status: 400 });
    if (typedName.length > MAX_NAME) {
      return Response.json({ error: "That is longer than a name can be." }, { status: 400 });
    }

    const db = getDb();
    const draft = await db.query.drafts.findFirst({ where: eq(drafts.id, draftId) });
    if (!draft) return Response.json({ error: "No such draft." }, { status: 404 });
    if (!draft.signupsOpen) {
      return Response.json({ error: "Sign-ups for that draft are closed." }, { status: 409 });
    }

    // Which competition they play in. Asked rather than looked up because the
    // people this matters for are the ones with no player row to look it up
    // from, and a tournament is not an answer - it owns no players.
    const competition = Number.isInteger(leagueId)
      ? await db.query.leagues.findFirst({ where: eq(leagues.id, leagueId!) })
      : null;
    if (!competition || competition.isTournament) {
      return Response.json({ error: "Say which competition you play in." }, { status: 400 });
    }

    // Kept to the list a lineup uses, in that order, so a club reading the
    // sign-ups sees the same words in the same order every time.
    const wanted = Array.isArray(positions) ? positions : [];
    const played = POSITIONS.filter((position) => wanted.includes(position));
    if (played.length === 0) {
      return Response.json({ error: "Pick at least one position you can play." }, { status: 400 });
    }

    // Matched on the name as it stands, ignoring case, because that is the
    // only thing the two sides of this league have ever shared. No match is
    // not a refusal - an admin sorts those out, and somebody whose name we do
    // not know yet should still be able to put it down.
    const found = await db
      .select({ id: players.id, displayName: players.displayName })
      .from(players)
      .where(sql`lower(${players.displayName}) = lower(${typedName})`)
      .limit(1);
    const player = found[0] ?? null;

    // Changing the name you gave edits the sign-up you already have. The
    // unique index says one each; this is what makes a correction work rather
    // than fail on it.
    const already = await db
      .select({ id: draftSignups.id })
      .from(draftSignups)
      .where(and(eq(draftSignups.draftId, draftId), eq(draftSignups.discordId, session.discordId)))
      .limit(1);

    if (already[0]) {
      await db
        .update(draftSignups)
        .set({
          typedName,
          playerId: player?.id ?? null,
          discordName: session.displayName,
          leagueId: competition.id,
          positions: played.join(","),
        })
        .where(eq(draftSignups.id, already[0].id));
    } else {
      await db.insert(draftSignups).values({
        draftId,
        discordId: session.discordId,
        discordName: session.displayName,
        typedName,
        playerId: player?.id ?? null,
        leagueId: competition.id,
        positions: played.join(","),
      });
    }

    return Response.json({
      ok: true,
      matched: player?.displayName ?? null,
      changed: Boolean(already[0]),
    });
  } catch (error) {
    return apiError(error);
  }
}

/**
 * Withdrawing. Yours by Discord id; anybody's if you are an admin, which is
 * how a sign-up nobody can identify gets cleared off the list.
 */
export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Sign in with Discord first." }, { status: 401 });

    const { draftId, signupId } = (await request.json()) as {
      draftId: number;
      signupId?: number;
    };
    if (!Number.isInteger(draftId)) {
      return Response.json({ error: "Which draft?" }, { status: 400 });
    }

    const db = getDb();
    const user = await getLeagueUser();
    const isAdmin = hasRole(user, "ADMIN");

    if (signupId !== undefined && isAdmin) {
      const [gone] = await db
        .delete(draftSignups)
        .where(and(eq(draftSignups.id, signupId), eq(draftSignups.draftId, draftId)))
        .returning();
      if (!gone) return Response.json({ error: "No such sign-up." }, { status: 404 });
      await logAudit({
        actingUserId: user!.id,
        action: "draft.signup.remove",
        entityType: "draft",
        entityId: draftId,
        detail: { typedName: gone.typedName, discordName: gone.discordName },
      });
      return Response.json({ ok: true });
    }

    // Your own, found by the Discord id on the cookie rather than by an id in
    // the request, so one person cannot withdraw another.
    await db
      .delete(draftSignups)
      .where(and(eq(draftSignups.draftId, draftId), eq(draftSignups.discordId, session.discordId)));
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}

/**
 * Matching a sign-up to a player by hand, for one the name did not find.
 *
 * An admin's job and only an admin's: it decides who a stranger is, and the
 * archive is keyed by name, so getting it wrong welds one man's career onto
 * another's.
 */
export async function PATCH(request: Request) {
  try {
    const user = await getLeagueUser();
    if (!hasRole(user, "ADMIN")) {
      return Response.json({ error: "Admins only." }, { status: 403 });
    }

    const { signupId, playerId, name, create } = (await request.json()) as {
      signupId: number;
      playerId?: number | null;
      name?: string;
      /** Make a player row from the sign-up itself, for somebody new here. */
      create?: boolean;
    };
    if (!Number.isInteger(signupId)) {
      return Response.json({ error: "Which sign-up?" }, { status: 400 });
    }

    const dbFirst = getDb();
    if (create) {
      const row = await dbFirst.query.draftSignups.findFirst({
        where: eq(draftSignups.id, signupId),
      });
      if (!row) return Response.json({ error: "No such sign-up." }, { status: 404 });

      // A name already on the site is a match, not a new player. Creating a
      // second row under it would split one man's career in two, which is the
      // repair the archive is hardest to make.
      const clash = await dbFirst
        .select({ id: players.id })
        .from(players)
        .where(sql`lower(${players.displayName}) = lower(${row.typedName})`)
        .limit(1);
      if (clash.length > 0) {
        return Response.json(
          { error: `${row.typedName} is already on the site. Match them instead.` },
          { status: 409 },
        );
      }

      // No club: they have not been drafted yet, and the pick is what gives
      // them one. The competition is the one they said they play in, which is
      // the whole reason the sign-up asks.
      const [made] = await dbFirst
        .insert(players)
        .values({
          displayName: row.typedName,
          minecraftUsername: row.typedName,
          status: "ACTIVE",
          leagueId: row.leagueId,
        })
        .returning();

      await dbFirst.update(draftSignups).set({ playerId: made.id }).where(eq(draftSignups.id, signupId));
      await logAudit({
        actingUserId: user!.id,
        action: "draft.signup.create",
        entityType: "player",
        entityId: made.id,
        detail: { typedName: row.typedName, leagueId: row.leagueId, fromSignup: signupId },
      });
      return Response.json({ ok: true, playerId: made.id });
    }

    // Given by name, because that is what an admin is reading off the sign-up
    // and the pool is twelve hundred names - a dropdown of it costs more than
    // the page's whole budget. The name has to find exactly one player: two
    // men filed under names that differ only in case is the case where
    // guessing would weld one career onto another.
    const db = getDb();
    let matched: number | null = playerId ?? null;
    if (name !== undefined) {
      const typed = name.trim();
      if (!typed) return Response.json({ error: "Which player?" }, { status: 400 });
      const found = await db
        .select({ id: players.id, displayName: players.displayName })
        .from(players)
        .where(sql`lower(${players.displayName}) = lower(${typed})`)
        .limit(2);
      if (found.length === 0) {
        return Response.json({ error: `Nobody on the site is called ${typed}.` }, { status: 404 });
      }
      if (found.length > 1) {
        return Response.json(
          { error: `More than one player is called ${typed}. Sort that out first.` },
          { status: 409 },
        );
      }
      matched = found[0].id;
    } else if (matched !== null) {
      const player = await db.query.players.findFirst({ where: eq(players.id, matched) });
      if (!player) return Response.json({ error: "No such player." }, { status: 404 });
    }

    const [row] = await db
      .update(draftSignups)
      .set({ playerId: matched })
      .where(eq(draftSignups.id, signupId))
      .returning();
    if (!row) return Response.json({ error: "No such sign-up." }, { status: 404 });

    await logAudit({
      actingUserId: user!.id,
      action: "draft.signup.match",
      entityType: "draft",
      entityId: row.draftId,
      detail: { typedName: row.typedName, playerId: matched },
    });
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
