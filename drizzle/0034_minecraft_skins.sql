-- Which skin each Minecraft account is wearing, as Mojang last reported it.
--
-- Heads used to come from third-party avatar services, and those served the
-- default Steve for accounts Mojang confirms have a custom skin. The head route
-- now asks Mojang's session server for the account's texture and fetches the
-- skin from Mojang's own CDN. The session server is rate limited, so what it
-- said is kept here and asked again only when it is a few hours old - which is
-- also how a changed skin or a renamed account is picked up without anyone
-- editing anything.
--
-- skin_url is NULL when the account wears one of the default skins.
CREATE TABLE IF NOT EXISTS minecraft_skins (
  uuid text PRIMARY KEY NOT NULL,
  name text,
  skin_url text,
  checked_at text NOT NULL
);
