-- The off-season's general managers, on the clubs they run.
--
-- A GM in the off-season plays for his own club, so holding the role is
-- enough to be on the roster: nobody should have to draft their own manager.
-- `seatGmOnOwnClub` does that from now on, whenever an account is given a
-- club. This is the twenty who already had one.
--
-- Additive only, the same as the function. A man already on another club in
-- this tournament got there by being drafted, and quietly moving him would
-- lose a pick nobody could see had gone - so he is skipped here and the two
-- clubs are a question for a person.
--
-- The account and the player are matched on the name, which is all the two
-- have in common: a league account is a Discord identity and a player is an
-- in-game name. Four of the twenty match nothing, which means the league has
-- people running clubs who have never played here. They are left alone -
-- inventing a player for a name nobody recognises is exactly the mistake the
-- archive is hardest to undo.
--
-- Running it twice is the same as running it once: the second run finds
-- everybody already seated.

INSERT INTO roster_spots (player_id, team_id)
SELECT p.id, t.id
FROM users u
JOIN teams t ON t.id = u.team_id
JOIN leagues l ON l.id = t.league_id AND l.is_tournament = 1
JOIN user_roles r ON r.user_id = u.id AND r.role = 'GM'
JOIN players p ON lower(p.display_name) = lower(u.display_name)
WHERE NOT EXISTS (
  -- Not already on any club in this tournament, which covers both "already
  -- seated here" and "drafted somewhere else".
  SELECT 1 FROM roster_spots rs
  JOIN teams rt ON rt.id = rs.team_id
  WHERE rs.player_id = p.id AND rt.league_id = l.id
);

-- Written down the way a signing is, so a roster says how each man got there.
-- The acting user is the GM himself, because that is whose role put him on it.
INSERT INTO roster_moves (player_id, team_id, move_type, acting_user_id, note)
SELECT p.id, t.id, 'SIGN', u.id, 'Runs this club'
FROM users u
JOIN teams t ON t.id = u.team_id
JOIN leagues l ON l.id = t.league_id AND l.is_tournament = 1
JOIN user_roles r ON r.user_id = u.id AND r.role = 'GM'
JOIN players p ON lower(p.display_name) = lower(u.display_name)
JOIN roster_spots rs ON rs.player_id = p.id AND rs.team_id = t.id
WHERE NOT EXISTS (
  SELECT 1 FROM roster_moves m
  WHERE m.player_id = p.id AND m.team_id = t.id AND m.note = 'Runs this club'
);
