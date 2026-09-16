# The Minecraft Baseball League site

A Next.js site on Cloudflare Workers with a D1 database, run by one person for
a Minecraft baseball league. Read this before changing anything.

## What this is

- `mbl-site` is the Worker. It is live at <https://mbl-site.benmerlin11.workers.dev>.
- `mbl-site-db` is the D1 database, id `367d7104-bb21-4f11-bf01-2338213f1ac8`.
- Next.js is built for Workers by **vinext**, not by `@cloudflare/next-on-pages`.
- The league is real and the data is live. Seasons IV-XII are published history
  that people read; there is no staging copy of it.

## Deploying

Three commands, in this order:

```bash
npm run build
node scripts/apply-d1-binding.mjs
npx --no-install wrangler deploy
```

The build writes `dist/server/wrangler.json` with a placeholder database id;
the second command patches the real one in. **Do not add a root
`wrangler.jsonc`** - it bound D1 twice and broke the deploy. `package.json` has
no deploy script on purpose; the league's owner declined one.

## The database

Run SQL against production with:

```bash
npx --no-install wrangler d1 execute mbl-site-db --remote --command "SELECT 1"
```

Use `--file drizzle/00NN_name.sql` for anything longer. `--file` prints only a
summary, so read results with `--command`. Occasional `Authentication error
[code: 10000]` responses are transient - retry.

Locally the same database is a SQLite file under
`.wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite` (the largest one).
It holds a partial copy of production, so a page can render empty locally and
be fine live.

Rules learned the hard way:

- **Migrations are hand-written SQL in `drizzle/`, numbered in order, and
  applied by hand.** `drizzle/meta/_journal.json` stopped being updated at
  0011; do not trust it, and do not run `drizzle-kit push` against production.
- **D1 caps a compound SELECT at 5 `UNION ALL` terms.** Past that it fails with
  "too many terms in compound SELECT" - use scalar subqueries instead.
- **D1 caps bound parameters per statement.** `db/publish.ts` inserts box
  scores in slices for this reason.
- Correlated subqueries over the archive read tens of thousands of rows. The
  free tier allows 5M reads a day, and an unindexed import has exhausted it
  before, which takes the whole site down until it resets.

## What is fragile

- **The archive is keyed by player *name*, not id** (`historical_player_stats`,
  `historical_game_stats`, `historical_roster_entries`). Renaming a player
  means updating every one of those tables plus `players` and
  `minecraft_profiles`. `/api/players/rename` does this and deliberately
  refuses to rename onto an existing name, because that is a merge, not a
  rename - see `drizzle/0036` and `0039` for how merges are done.
- **`recomputeSeason` in `db/publish.ts` rebuilds a season's totals from its
  box scores.** Anything a box score does not carry (fielding, saves, holds)
  is preserved only when *no* box score in that season carries it. A recompute
  once wiped Season XII's fielding stats this way. Check before recomputing.
- **A game already on a published schedule belongs to that season.**
  Publishing uses the fixture's season and falls back to the current-season
  setting only for a game the archive has never seen. Playoffs are their own
  season, so this matters.
- Never invent data. Fabricated playoff dates, guessed forfeits and a partial
  score import have each had to be undone by hand afterwards.

## Cloudflare limits

The Worker is on the **free plan**: 10ms CPU per request. Several pages use
26-102ms, so they intermittently fail with Error 1102 - the umpire page's game
list is the worst. The fix is the $5/month Workers Paid plan, which the owner
has not bought yet; until then, prefer fewer and cheaper queries per page over
anything clever. Do not add work to a page's render path without checking what
it costs.

## Minecraft accounts and heads

- `minecraft_profiles` maps a site name to an account UUID; heads are drawn
  from the UUID, never from the name, because names get reused by strangers.
- **Mojang refuses requests from Cloudflare's servers.** Every lookup from the
  live site falls back to playerdb.co, which relays the same data. See
  `db/minecraft.ts`. Locally Mojang answers, so a lookup can work on your
  machine and fail in production - test the fallback, not just the happy path.
- Bulk lookups of many names are cheaper to run from a developer's machine than
  from the Worker; several migrations were written that way.

## Access and security

- Sign-in is Discord OAuth. Being signed in proves identity only; access needs
  a row in `users` created by an admin.
- Sessions are signed cookies, not rows. Each carries the account's
  `session_epoch`; Admin -> Accounts -> "Sign out everywhere" bumps it and
  every older cookie stops working.
- Every admin API call passes through `requireRoleForApi`, which rate limits
  per account (240/minute). Sign-in is limited per IP address.
- There is no self-signup and no setup route. **The first admin is created by
  hand:**

  ```bash
  npx --no-install wrangler d1 execute mbl-site-db --remote --command "INSERT INTO users (discord_id, display_name, role) VALUES ('<discord id>', '<name>', 'ADMIN')"
  ```

## News

- `/news` is public; `/newsroom` is where articles are written. The `WRITER`
  role can write and publish its own articles and nothing else; `ADMIN` can
  manage every article and remove any comment.
- **Article bodies are plain text rendered by `app/news/render.tsx`, never
  HTML.** Do not switch it to markdown-to-HTML or `dangerouslySetInnerHTML`:
  anyone with the WRITER role would then be able to put scripts on the site.
  Links are only made for `http(s)` and on-site addresses for the same reason.
- Pictures live in `news_images` as base64, like team logos, resized in the
  browser first. There is no file storage on this plan.
- Anyone signed in with Discord can like and comment, with no league role
  needed. Comments are hidden, not deleted, and are rate limited per account.

## House style

- Comments explain **why**, in plain English, in whole sentences. They are for
  the league's owner and a future maintainer, not for a reviewer.
- Prose in the interface is plain and direct. No exclamation marks, no
  cheerleading, no "oops".
- Match the surrounding code rather than introducing new patterns.
- Everything an admin might need should be doable **through the site**. That is
  the standing goal: any time a task needs a developer or a SQL command, that
  is a gap worth closing.

## Things that are deliberately not done

- `scripts/` holds scrapers for the old mystatsonline site. They exist only for
  the Season XII import; Season XIII is being entered on the site itself. Do
  not build on them.
- minecraftbaseball.com is not pointed at this site yet, and there is no
  contact email listed. Both are waiting on the owner.
