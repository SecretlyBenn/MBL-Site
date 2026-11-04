# Backing the site up, and putting it back

Two different things can be lost, and they are protected differently.

- **The data** is in D1. Cloudflare's own Time Travel covers the last 30 days,
  and `scripts/backup-db.mjs` covers everything past that.
- **The site itself** is the git repository. It is protected by being pushed.
  A commit that only exists on one laptop is not backed up, and the data being
  safe does not help: Time Travel would hand back a database with nothing left
  to serve it.

## If something has just gone wrong

**Stop writing to the database first.** Time Travel restores to a moment, so
every change made while deciding is a change that has to be made again
afterwards.

Then work out *when* it went wrong, because that is the only thing a restore
needs. The audit log and `roster_moves.created_at` are usually enough to put a
time on it.

### Restoring the last 30 days: Time Travel

Find what the database looked like just before the moment in question. This
only reads:

```bash
npx --no-install wrangler d1 time-travel info mbl-site-db --timestamp=2026-10-29T17:40:00Z
```

That prints the bookmark for that moment. Restore it:

```bash
npx --no-install wrangler d1 time-travel restore mbl-site-db --timestamp=2026-10-29T17:40:00Z
```

Both commands need `CLOUDFLARE_ACCOUNT_ID=38532e1647aeaa4803a5457a769f8087` in
the environment, like every other D1 command here.

**A restore is itself a point you can come back from.** It does not erase the
history it restored over - the state you are leaving gets a bookmark too, so
restoring to the wrong minute is a mistake you can undo by restoring forward
again. Write the current bookmark down before you start anyway
(`time-travel info` with no timestamp prints it), because knowing it beats
working it out while something is broken.

**It restores the whole database, not one table.** There is no way to bring
back one club's games and leave everything else. If the damage is narrow -
one bad migration, one wrong name - a hand-written migration that puts that
one thing right is almost always better than rolling the whole league back
past every signing and score that happened since.

### Going back further, or losing the account: the snapshots

```bash
node scripts/backup-db.mjs
```

Exports the live database, checks the dump is actually a dump, compresses it
and keeps it in `%USERPROFILE%\OneDrive\MBL-backups`, which syncs offsite on
its own. About 25MB of SQL, 1MB compressed. The last 14 are kept;
`MBL_BACKUP_DIR` and `MBL_BACKUP_KEEP` override both.

It refuses to keep a dump that is missing its schema or has implausibly few
rows, and leaves that one beside the others named `.rejected` rather than
deleting it. An export cut short by a dropped connection is still a file, and
a file is exactly what a backup looks like until the day somebody needs it.

**Run it before anything irreversible** - a migration that deletes, a
recompute, a season rollover.

Otherwise it runs itself. A Windows scheduled task called **MBL database
snapshot** runs `scripts/backup-db.cmd` at 6pm daily on the league owner's
machine, which starts in the repository and appends everything the run said to
`backup-log.txt` in the backups folder. A snapshot that quietly stopped working
a month ago looks exactly like a working one until the day it is needed, so the
log sits beside the dumps rather than in Task Scheduler, where nobody would
think to look.

It only runs while that machine is awake and signed in - no password is stored
for it - but `StartWhenAvailable` means a day the laptop was shut at six is
caught up when it next starts rather than skipped. To see when it last ran, or
change the hour:

```powershell
Get-ScheduledTaskInfo -TaskName "MBL database snapshot"
Unregister-ScheduledTask -TaskName "MBL database snapshot"
```

Re-registering it on another machine is the one command in
`scripts/backup-db.cmd`'s own comment, with the path to that checkout.

Restoring from one is deliberately not a single command, because it is not
something to do by accident. The dump is a full schema and every row, so it
replays into a *new* database rather than over the live one:

```bash
npx --no-install wrangler d1 create mbl-site-db-restored
npx --no-install wrangler d1 execute mbl-site-db-restored --remote --file restored.sql
```

Then point the site at it by giving `D1_DATABASE_ID` the new id when stamping
the config, and deploy:

```bash
D1_DATABASE_ID=<the new id> node scripts/apply-d1-binding.mjs
npx --no-install wrangler deploy
```

Checking the new database before pointing the site at it is the whole reason
this is three commands instead of one. `SELECT COUNT(*)` on
`historical_game_stats` and `players`, and look at a club's roster.

## What is not covered

- **Secrets.** `BOT_SECRET`, `PLUGIN_SECRET`, `AUTH_SECRET` and the Discord
  credentials live only on the Worker, and Cloudflare will not show them back
  to you. Losing the account means setting new ones and updating the bot and
  the plugin to match. Keep them wherever the league keeps its passwords.
  `PLUGIN_SECRET` is the one exception, because the plugin has to know it too:
  it is `site-secret:` in `jumbotron.yml` on the game server, which is where to
  read it if nobody remembers it. The others exist nowhere but the Worker, so
  there is nothing to read them back from - a lost one is replaced, not found.
- **Team logos and news images** are rows in the database, so they are covered
  by both of the above. There is no file storage to back up separately.
- **The Discord bot's DynamoDB**, which is what the league actually believes
  about rosters. It is a different system with its own backups, and this site
  is the copy, not the original.
