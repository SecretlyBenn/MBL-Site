/**
 * The modpack every Sports Launcher installs.
 *
 * This one small file is the whole modpack. The launcher reads it on every
 * start, downloads exactly what it lists from Modrinth, and plays. So adding a
 * mod for the entire league is editing the list below and deploying - no new
 * launcher, and nobody reinstalls anything. Changing the *launcher* is the
 * expensive one, because its self-update has never worked and every player
 * re-downloads it by hand.
 *
 * It was copied from what `dl.minecraftbaseball.com/client/json` was serving on
 * 2026-10-23, which at the time forwarded to a server outside the league. It
 * was deliberately not copied from `client-fabric`'s `mods.json5`, which is the
 * file that supposedly generates this one: six of the ten mods were pinned to
 * older builds there, because the hosted copy had been edited by hand and the
 * repository never caught up. Taking the hosted copy means the league keeps
 * what players are actually running rather than quietly rolling six mods back.
 *
 * When `client-fabric` cuts a release it publishes MBL Utils to Modrinth and
 * attaches a regenerated `client.json` to its GitHub release, but nothing
 * uploads that anywhere - a person does. So after a release, update MBL Utils'
 * `versionId` here from that attached file, or the league stays on the old
 * build of its own mod.
 */

/**
 * One mod, named the way Modrinth names things: the project, then the exact
 * build of it. `versionId` is required rather than optional on purpose. The
 * launcher refuses a Modrinth mod that has no build pinned, and two mods in
 * `client-fabric`'s list spell the key `version` instead, which parses as no
 * build at all - this type makes that spelling impossible to commit.
 */
type Mod = {
  id: string;
  versionId: string;
  source: "modrinth";
};

export type Modpack = {
  gameVersion: string;
  loaderVersion: string;
  apiVersion: string;
  mods: Mod[];
};

export const MODPACK: Modpack = {
  gameVersion: "1.21.8",
  loaderVersion: "0.19.3",
  apiVersion: "0.136.1+1.21.8",
  mods: [
    { id: "P7dR8mSH", versionId: "g58ofrov", source: "modrinth" }, // Fabric API
    { id: "AANobbMI", versionId: "7pwil2dy", source: "modrinth" }, // Sodium
    { id: "YL57xq9U", versionId: "Rhzf61g1", source: "modrinth" }, // Iris
    { id: "Ha28R6CL", versionId: "2i87JpYj", source: "modrinth" }, // Fabric Kotlin
    { id: "1eAoo2KR", versionId: "iPLhsWMM", source: "modrinth" }, // YetAnotherConfigLib
    { id: "w7ThoJFB", versionId: "LpSqZyo1", source: "modrinth" }, // Zoomify
    { id: "4das1Fjq", versionId: "9YgAwnpm", source: "modrinth" }, // Flashback
    { id: "o1tyE5vJ", versionId: "dDET2Io1", source: "modrinth" }, // Custom Crosshair
    { id: "M08ruV16", versionId: "b4wSwWuv", source: "modrinth" }, // Bobby
    { id: "BilUu32Q", versionId: "LstGz0vN", source: "modrinth" }, // MBL Utils, the league's own
  ],
};
