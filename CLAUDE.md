# The Minecraft Baseball League site

A Next.js site on Cloudflare Workers with a D1 database, run by one person for
a Minecraft baseball league. Read this before changing anything.

## What this is

- `mbl-site` is the Worker. It is live at <https://mbl-site.benmerlin11.workers.dev>.
- `mbl-site-db` is the D1 database, id `367d7104-bb21-4f11-bf01-2338213f1ac8`.
- Next.js is built for Workers by **vinext**, not by `@cloudflare/next-on-pages`.
- The league is real and the data is live. Seasons IV-XII are published history
  that people read; there is no staging copy of it.

**The site holds two competitions**, not one: the MBL and the Minecraft
Collegiate Baseball Association, whose fourteen seasons were imported from
MyStatsOnline. The MiBL's clubs sit under the MCBA, which is where their games
are played. Every public page lives under `app/[league]/` and takes its league
from the address - `/mbl/standings`, `/mcba/standings`.

Which league a row belongs to is recorded in exactly two places:

- **`historical_seasons.league_id`** for the archive. Everything archived hangs
  off a season, so one column tells the whole archive apart.
- **`teams.league_id`** for the live side. Nothing live hangs off a season, so
  players, fixtures and roles reach their league through the club they point
  at.

`users.league_id` is a third, but it means something different: which
competition an official's role covers, **null meaning both**, which is the
usual case. A GM ignores it and takes their league from the club they manage.

The two are kept apart on purpose. A player who appears in both gets a tab for
each and their records are never added together - see `PlayerLeagues`.

## Deploying

Three commands, in this order:

```bash
npm run build
node scripts/apply-d1-binding.mjs
npx --no-install wrangler deploy
```

The build writes `dist/server/wrangler.json` with a placeholder database id;
the second command patches the real one in, along with the account to deploy
to. **Do not add a root `wrangler.jsonc`** - it bound D1 twice and broke the
deploy. `package.json` has no deploy script on purpose; the league's owner
declined one.

The Cloudflare login on this machine can reach two accounts: the one the site
runs in (`b690333da05f8e1aea40b7e68f6ff519`, the owner's personal account) and
the league's own (`38532e1647aeaa4803a5457a769f8087`, which holds
minecraftbaseball.com and is where the site is meant to end up). Wrangler will
not guess between them, so anything that talks to the API needs the account
named - a deploy takes it from the stamped config, and a D1 command needs it in
the environment. `D1_DATABASE_ID` and `CLOUDFLARE_ACCOUNT_ID` both override the
defaults in `scripts/apply-d1-binding.mjs`, which is how the site will move.

## The database

Run SQL against production with:

```bash
CLOUDFLARE_ACCOUNT_ID=b690333da05f8e1aea40b7e68f6ff519 npx --no-install wrangler d1 execute mbl-site-db --remote --command "SELECT 1"
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
- **D1 caps bound parameters per statement at 100.** `db/publish.ts` inserts
  box scores in slices for this reason, and `getAvatarsFor` in `db/queries.ts`
  looks player heads up in batches - a season's statistics page names 207
  players, and asking for them in one `IN (...)` returned a 500 on every page
  that showed a full season while the current season, being small, worked.
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
- **A scorecard's lineup is where players are now, not where they started.**
  Position changes and substitutions overwrite it. Time in the field is built
  by `app/fielding-history.ts` from `starting_player_id`/`starting_position`
  plus every row in `fielding_changes` (a player leaving is a `BENCH` move).
  Any new route that moves a player must record a move there, or the box score
  will credit the whole game to the final alignment - see `drizzle/0044`.
- **A fixture takes its league from the clubs playing it**, so both have to be
  in the same one, and a season fixture's clubs must be in the season's own
  competition. `fixtureClubs` in `db/queries.ts` is the check, and it treats
  two clubs with *no* league as disagreeing rather than matching - otherwise an
  unfiled club could be scheduled against anything.
- **A failure to write an audit row must never fail the action it describes.**
  The row is written after the change has already happened, so throwing there
  reported "Nothing was changed" about a change that had gone through, and sent
  an admin back to redo finished work. `logAudit` logs and carries on. When a
  route does fail, `apiError` logs the whole `cause` chain: the outer message is
  only the query, and the reason is one level down.
- **Merging two names is not renaming.** `/api/players/rename` refuses to
  rename onto an existing name for that reason. A merge is a hand-written
  migration, and which kind depends on the data: 0039, 0048, 0049, 0052 and
  0053 are plain renames because the two names share no club-season, while
  0051, 0054 and 0055 have to *add the two lines together* because they do. No
  player in the archive has two lines for one club-season; check before
  assuming a rename is safe. Before merging at all, check the two names never
  appear in the same game - that proves they are two people, and it caught two
  wrong merges in 0053.
- Never invent data. Fabricated playoff dates, guessed forfeits and a partial
  score import have each had to be undone by hand afterwards.

## Cloudflare limits

The Worker is on the **free plan** and the owner has not bought the $5/month
Workers Paid plan.

This section used to say a page had 10ms of CPU and that several were failing
with Error 1102. That is no longer what happens. Measured from `wrangler tail`
on 2026-09-28, every page answered `ok`:

| page | CPU | wall |
| --- | --- | --- |
| `/mcba/statistics/batting` | 251ms | 812ms |
| `/mbl/schedule` | 199ms | 1262ms |
| `/mbl/statistics/batting` | 178ms | 1243ms |
| `/mcba/schedule` | 155ms | 2567ms |
| `/mcba` | 123ms | 1297ms |
| `/mcba/standings` | 66ms | 1416ms |

So the ceiling is well above 10ms now and 1102 is not the live problem it was.
Measure before believing either number: check with `wrangler tail --format
json`, which reports `cpuTime` and `wallTime` per request, rather than trusting
this table as it ages.

What is still worth caring about is the **wall** column - one to two and a half
seconds before a reader sees anything. That is query count and query cost, not
CPU, and `wrangler d1 insights` is what shows which query is responsible. The
D1 limits below are the real constraints.

## Minecraft accounts and heads

- `minecraft_profiles` maps a site name to an account UUID; heads are drawn
  from the UUID, never from the name, because names get reused by strangers.
- **Mojang refuses requests from Cloudflare's servers.** Every lookup from the
  live site falls back to playerdb.co, which relays the same data. See
  `db/minecraft.ts`. Locally Mojang answers, so a lookup can work on your
  machine and fail in production - test the fallback, not just the happy path.
- Bulk lookups of many names are cheaper to run from a developer's machine than
  from the Worker; several migrations were written that way.
- **Renames and new skins reach the site on their own.** `/api/head/[uuid]`
  refreshes a skin every six hours, and when it finds the account renamed it
  writes the new name into `minecraft_profiles.current_name`. Nothing needs a
  cron or an admin. The player pages lead with that name and keep the archived
  one underneath; the stat tables keep the name used at the time, because that
  is what the box scores and the season's own screenshots say.
- **One account often holds two site names**, because each competition filed a
  player under whatever they used there - `Purpeyy` and `_purp__` are one man.
  The account id is the only thing tying them together, which is what
  `getAccountNames` uses. If a name you are about to link already belongs to
  another name's account, that is a merge waiting to happen, or a mistake.
- **Mojang dropped the name-history API in 2022.** For a name whose account has
  since been renamed, NameMC's owner history is the way back - look the name up
  there, then resolve the account it names through Mojang so the id comes from
  Mojang rather than a scraped page. laby.net and crafty.gg are both gated.
  NameMC shows `[Hidden Result]` for accounts whose owner opted out; those
  cannot be resolved and should be left alone.
- **Do not chase names from MBL Season VI or earlier.** The league only started
  requiring Discord nicknames to match in-game names around Season VII, so
  those are Discord nicknames and often not Minecraft usernames at all - a name
  with a space or a dot in it is from this era. They are untraceable; say so
  and move on.
- A player with no account gets a neutral block from `PlayerHead`, not a broken
  image. A blank head is the right answer when the alternative is a stranger's
  face.

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
- Writers never see that text format. `app/newsroom/[id]/RichEditor.tsx` is a
  document-style editor that converts what is on screen back into it on every
  change, so the stored article is always the safe text, whatever is pasted.
  If you add a formatting button, add the mark to `INLINE` in `render.tsx`
  and to both directions of the conversion in the editor.
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

- `scripts/` holds scrapers for the old mystatsonline site. They exist for the
  Season XII import and the MCBA's fourteen seasons; seasons run here are
  entered on the site itself. Do not build on them. Two of them -
  `import-mso.mjs` and `import-boxscores.mjs` - open with wholesale
  `DELETE FROM historical_*` and would destroy every league's history; the
  additive importers written for the MCBA are the ones to copy.
- minecraftbaseball.com is not pointed at this site yet. The contact address is
  now in `app/site.ts`. The domain, the Workers Paid plan and the Discord OAuth
  redirect URLs are all waiting on the owner for launch day.
- The MCBA has fourteen archived seasons but **no live clubs**, so nothing is
  scored there yet. `/admin`, `/umpire` and `/gm` still list clubs from both
  competitions in one list, which is right while every live club is the MBL's
  and will want revisiting when that changes.
- `/[league]/teams/[teamId]` is a live club's page. Nothing links to it yet.
